import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Memory optimization utilities for WhatsApp Bot
 */

class MemoryManager {
	constructor() {
		this.tempFiles = new Map(); // filePath -> registeredAt timestamp
		this.activeStreams = new Set();
		this.memoryThreshold = 400 * 1024 * 1024; // Reduced to 400MB threshold
		this.maxTempFiles = 100; // Limit temp files tracked
		this.maxActiveStreams = 50; // Limit active streams tracked
		this.maxTempFileAge = 15 * 60 * 1000; // Only GC files older than 15 minutes
		this.downloadStatus = new Map();
		this.orphanThreshold = 3 * 60 * 1000;

		// Auto cleanup every 3 minutes (increased frequency)
		this.cleanupInterval = setInterval(() => {
			this.performGarbageCollection();
		}, 180000);

		// Monitor memory usage every 30 seconds (increased frequency)
		this.memoryCheckInterval = setInterval(() => {
			this.checkMemoryUsage();
		}, 30000);

		// Cleanup orphan temp files older than 1 hour on startup
		setTimeout(() => {
			const tempDir = path.join(__dirname, "..", "temp");
			if (!fs.existsSync(tempDir)) return;
			try {
				const files = fs.readdirSync(tempDir);
				const now = Date.now();
				let cleaned = 0;
				for (const file of files) {
					const filePath = path.join(tempDir, file);
					try {
						const stats = fs.statSync(filePath);
						if (now - stats.mtimeMs > 3600000) {
							fs.unlinkSync(filePath);
							cleaned++;
						}
					} catch (err) { /* skip individual errors */ }
				}
				if (cleaned > 0) console.log(`[MemoryManager] Cleaned ${cleaned} orphan temp files on startup`);
			} catch (err) { /* skip */ }
		}, 5000);
	}

	/**
	 * Register a temporary file for automatic cleanup
	 * @param {string} filePath
	 */
	registerTempFile(filePath) {
		// Cleanup if Set is getting too large
		if (this.tempFiles.size >= this.maxTempFiles) {
			console.log("🧹 TempFiles limit reached, performing cleanup...");
			this.performGarbageCollection();
		}

		this.tempFiles.set(filePath, Date.now());
	}

	/**
	 * Register an active stream for monitoring
	 * @param {Stream} stream
	 */
	registerStream(stream) {
		// Cleanup if Set is getting too large
		if (this.activeStreams.size >= this.maxActiveStreams) {
			console.log("🧹 ActiveStreams limit reached, cleaning up closed streams...");
			this.cleanupClosedStreams();
		}

		this.activeStreams.add(stream);

		// Auto cleanup when stream ends
		stream.on("end", () => {
			this.activeStreams.delete(stream);
		});

		stream.on("error", () => {
			this.activeStreams.delete(stream);
		});
	}

	/**
	 * Clean up streams that are already closed/destroyed
	 */
	cleanupClosedStreams() {
		for (const stream of this.activeStreams) {
			if (stream.destroyed || stream.readableEnded || stream.writableEnded) {
				this.activeStreams.delete(stream);
			}
		}
	}

	/**
	 * Safe file deletion with error handling
	 * @param {string} filePath
	 */
	safeUnlink(filePath) {
		try {
			fs.promises.unlink(filePath).catch(err => {
				if (err.code !== "ENOENT") {
					console.warn(`[safeUnlink] Failed to delete ${filePath}:`, err.message);
				}
			});
			this.tempFiles.delete(filePath);
			this.downloadStatus.delete(filePath);
			return true;
		} catch (error) {
			console.warn(`[safeUnlink] Failed to delete ${filePath}:`, error.message);
			return false;
		}
	}

	markFileReady(filePath) {
		this.downloadStatus.set(filePath, "ready");
	}
	markFileSent(filePath) {
		this.downloadStatus.set(filePath, "sent");
	}
	/**
	 * Set an arbitrary download status for a file (used by download pipeline).
	 * Valid values: "registered" | "downloading" | "ready" | "sent"
	 */
	markFileStatus(filePath, status) {
		this.downloadStatus.set(filePath, status);
	}

	/**
	 * Create optimized read stream with automatic cleanup
	 * @param {string} filePath
	 * @param {object} options
	 */
	createOptimizedReadStream(filePath, options = {}) {
		const defaultOptions = {
			highWaterMark: 64 * 1024, // 64KB chunks for better memory usage
			autoClose: true,
			...options,
		};

		const stream = fs.createReadStream(filePath, defaultOptions);
		this.registerStream(stream);

		// Auto cleanup file after stream ends
		stream.on("end", () => {
			if (options.autoDelete) {
				setTimeout(() => this.safeUnlink(filePath), 1000);
			}
		});

		return stream;
	}

	/**
	 * Create optimized write stream with automatic cleanup
	 * @param {string} filePath
	 * @param {object} options
	 */
	createOptimizedWriteStream(filePath, options = {}) {
		const defaultOptions = {
			highWaterMark: 64 * 1024, // 64KB chunks
			autoClose: true,
			...options,
		};

		const stream = fs.createWriteStream(filePath, defaultOptions);
		this.registerStream(stream);
		this.registerTempFile(filePath);

		return stream;
	}

	/**
	 * Stream-based file copy for large files
	 * @param {string} source
	 * @param {string} destination
	 */
	async streamCopy(source, destination) {
		return new Promise((resolve, reject) => {
			const readStream = this.createOptimizedReadStream(source);
			const writeStream = this.createOptimizedWriteStream(destination);

			readStream.pipe(writeStream);

			writeStream.on("finish", resolve);
			writeStream.on("error", reject);
			readStream.on("error", reject);
		});
	}

	/**
	 * Optimized buffer processing for media files
	 * @param {Buffer} buffer
	 * @param {number} chunkSize
	 */
	processBufferInChunks(buffer, chunkSize = 64 * 1024) {
		const chunks = [];
		for (let i = 0; i < buffer.length; i += chunkSize) {
			chunks.push(buffer.slice(i, i + chunkSize));
		}
		return chunks;
	}

	/**
	 * Check current memory usage and trigger cleanup if needed
	 */
	checkMemoryUsage() {
		const memUsage = process.memoryUsage();
		const totalMemory = memUsage.heapUsed + memUsage.external;

		console.log(`Memory Usage: ${Math.round(totalMemory / 1024 / 1024)}MB`);

		if (totalMemory > this.memoryThreshold) {
			console.warn("High memory usage detected, performing cleanup...");
			this.performGarbageCollection();
		}
	}

	/**
	 * Perform garbage collection and cleanup
	 */
	performGarbageCollection(force = false) {
		const now = Date.now();
		let cleanedFiles = 0;

		for (const [filePath, registeredAt] of this.tempFiles) {
			const downloadState = this.downloadStatus.get(filePath);
			const age = now - registeredAt;

			// Skip files that are actively downloading or already ready-to-send
			if (!force && (downloadState === "downloading" || downloadState === "ready")) {
				continue;
			}

			// Skip recently sent files within the max age window
			if (!force && downloadState === "sent" && age < this.maxTempFileAge) {
				continue;
			}

			if (this.safeUnlink(filePath)) {
				cleanedFiles++;
			} else {
				this.tempFiles.delete(filePath);
			}
		}

		let closedStreams = 0;
		for (const stream of [...this.activeStreams]) {
			if (stream.destroyed || stream.readableEnded || stream.writableEnded) {
				try {
					if (stream.destroy) stream.destroy();
					this.activeStreams.delete(stream);
					closedStreams++;
				} catch (error) {
					console.warn("[GC] Error closing stream:", error.message);
				}
			}
		}

		if (global.gc) global.gc();

		if (cleanedFiles > 0 || closedStreams > 0) {
			console.log(`[MemoryManager] GC: ${cleanedFiles} files, ${closedStreams} streams cleaned`);
		}
	}

	/**
	 * Generate random filename with proper extension
	 * @param {string} ext
	 */
	generateTempFileName(ext) {
		const uniqueId = crypto.randomUUID().split("-")[0];
		const filename = `temp_${Date.now()}_${uniqueId}${ext}`;
		const tempDir = path.join(__dirname, "..", "temp");

		if (!fs.existsSync(tempDir)) {
			fs.mkdirSync(tempDir, { recursive: true });
		}

		const filePath = path.join(tempDir, filename);
		this.registerTempFile(filePath);
		this.downloadStatus.set(filePath, "registered");
		return filePath;
	}

	/**
	 * Cleanup and destroy the memory manager
	 */
	destroy() {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
		if (this.memoryCheckInterval) {
			clearInterval(this.memoryCheckInterval);
		}

		this.performGarbageCollection(true);
	}
}

// Create global instance
const memoryManager = new MemoryManager();

// Cleanup on process exit
process.on("exit", () => {
	memoryManager.destroy();
});

process.on("SIGINT", () => {
	memoryManager.destroy();
	process.exit(0);
});

export default memoryManager;
