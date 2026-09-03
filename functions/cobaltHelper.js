import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import stream from "stream";
import { promisify } from "util";
import path from "path";
import { exec, execFile } from "child_process";
import snapsave from "snapsave-downloader";
import memoryManager from "./memoryUtils.js";
import instanceHealth from "./instanceHealth.js";

const pipeline = promisify(stream.pipeline);

/**
 * Validate that a URL is a safe HTTP/HTTPS link
 */
const validateUrl = (url) => {
	try {
		const parsed = new URL(url);
		return ["http:", "https:"].includes(parsed.protocol);
	} catch {
		return false;
	}
};

/**
 * Validate that a URL is a safe HTTP/HTTPS link (existing, with hostname check)
 */
const isValidHttpUrl = (url) => {
	try {
		const u = new URL(url);
		return ["http:", "https:"].includes(u.protocol) && u.hostname.length > 2;
	} catch {
		return false;
	}
};

/**
 * Custom Error for Cobalt API issues
 */
export class CobaltDownloadError extends Error {
	constructor(code, message) {
		super(message || code);
		this.name = "CobaltDownloadError";
		this.code = code;
	}
}

/**
 * Validate downloaded file by magic bytes / file signature
 */
const validateDownloadedFile = (filePath, expectedType = "auto") => {
	try {
		if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
			return { valid: false, reason: "empty_or_missing" };
		}

		const buffer = Buffer.alloc(16);
		const fd = fs.openSync(filePath, "r");
		try {
			fs.readSync(fd, buffer, 0, 16, 0);
		} finally {
			fs.closeSync(fd);
		}

		const signature = buffer.toString("hex").toLowerCase();

		// Video signatures
		const videoSigs = ["000000", "667479", "6d6f6f", "000001", "464c56", "41564931", "1a45dfa3"];
		// Image signatures
		const imageSigs = ["ffd8", "89504e", "474946", "524946", "504b03"];
		// Audio signatures
		const audioSigs = [
			"fffb",
			"fff3",
			"fff2",
			"4944",
			"474554",
			"4f6767",
			"664c6143",
			"52494646",
			"6674797",
			"4d344120",
		];

		const hasVideo = videoSigs.some((s) => signature.startsWith(s));
		const hasImage = imageSigs.some((s) => signature.startsWith(s));
		const hasAudio = audioSigs.some((s) => signature.startsWith(s));

		if (expectedType === "video" && !hasVideo)
			return {
				valid: false,
				reason: "not_video",
				detected: hasImage ? "image" : hasAudio ? "audio" : "unknown",
			};
		if (expectedType === "audio" && !hasAudio && !hasVideo) return { valid: false, reason: "not_audio" };
		if (expectedType === "photo" && !hasImage) return { valid: false, reason: "not_image" };

		return { valid: true, type: hasVideo ? "video" : hasImage ? "image" : hasAudio ? "audio" : "unknown" };
	} catch (err) {
		return { valid: false, reason: "validation_error", error: err.message };
	}
};

/**
 * Fallback downloader using yt-dlp binary
 */
export const downloadWithYtDlp = async (url, outputDir = null, audioOnly = false, signal = null) => {
	const ext = audioOnly ? ".mp3" : ".mp4";
	const tempFile = outputDir
		? path.join(outputDir, `ytdlp_${Date.now()}_${crypto.randomUUID().split("-")[0]}${ext}`)
		: memoryManager.generateTempFileName(ext);

	const args = audioOnly
		? [
				"--no-playlist",
				"--max-filesize",
				"70M",
				"-f",
				"140/ba/b",
				"--extract-audio",
				"--audio-format",
				"mp3",
				"-o",
				tempFile,
				url,
		 ]
		: [
				"--no-playlist",
				"--max-filesize",
				"90M",
				"-f",
				"18/best[height<=720][ext=mp4]/best[height<=480][ext=mp4]/best",
				"--merge-output-format",
				"mp4",
				"-o",
				tempFile,
				url,
		 ];

	const env = { ...process.env };
	const ffmpegDir = ffmpegPath ? path.dirname(ffmpegPath) : "";
	const pathList = [ffmpegDir, "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", env.PATH].filter(Boolean);
	env.PATH = pathList.join(path.delimiter);

	const ytdlpArgs = audioOnly
		? [
				"--no-playlist",
				"--extractor-args",
				"youtube:player_client=android",
				"--max-filesize",
				"70M",
				"-f",
				"140/ba/b",
				"--extract-audio",
				"--audio-format",
				"mp3",
				"-o",
				tempFile,
				url,
			]
		: [
				"--no-playlist",
				"--extractor-args",
				"youtube:player_client=android",
				"--max-filesize",
				"90M",
				"-f",
				"18/best[height<=720][ext=mp4]/best[height<=480][ext=mp4]/best",
				"--merge-output-format",
				"mp4",
				"-o",
				tempFile,
				url,
			];

	let lastErr;
	for (let attempt = 1; attempt <= 2; attempt++) {
		try {
			await new Promise((resolve, reject) => {
				const child = execFile("yt-dlp", ytdlpArgs, { timeout: 90000, env, signal }, (err) => {
					if (err) return reject(err);
					resolve();
				});
				if (signal) {
					signal.addEventListener(
						"abort",
						() => {
							child.kill("SIGTERM");
							reject(new Error("Download cancelled"));
						},
						{ once: true }
					);
				}
			});

			if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 0) {
				console.log(`[yt-dlp Fallback] Downloaded successfully: ${tempFile}`);
				return [tempFile];
			}
			lastErr = new Error("yt-dlp produced an empty file");
		} catch (err) {
			lastErr = err;
			if (fs.existsSync(tempFile)) memoryManager.safeUnlink(tempFile);
			if (attempt < 2) {
				await new Promise((r) => setTimeout(r, 2000));
			}
		}
	}
	throw lastErr || new Error("yt-dlp failed");
};

/**
 * Fallback downloader for Instagram using snapsave-downloader
 */
export const downloadWithSnapSave = async (url, outputDir = null, signal = null) => {
	console.log(`[SnapSave Fallback] Fetching Instagram media for ${url}...`);
	const res = await snapsave(url);
	if (!res || !res.status || !Array.isArray(res.data) || res.data.length === 0) {
		throw new Error("SnapSave returned no media data");
	}

	const downloadedFiles = [];
	for (const item of res.data) {
		if (signal?.aborted) throw new Error("Download cancelled");

		const mediaUrl = item.url || item.thumbnail;
		if (!mediaUrl) continue;

		const isVideo = Boolean(item.url) || (item.filename && item.filename.endsWith(".mp4")) || mediaUrl.includes(".mp4");
		const ext = isVideo ? ".mp4" : ".jpg";

		const tempFile = outputDir
			? path.join(outputDir, `snapsave_${Date.now()}_${crypto.randomUUID().split("-")[0]}${ext}`)
			: memoryManager.generateTempFileName(ext);

		const fileStream = fs.createWriteStream(tempFile);
		try {
			const downloadReq = await axios.get(mediaUrl, {
				responseType: "stream",
				headers: item.headers || { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
				timeout: 30000,
				maxContentLength: 100 * 1024 * 1024,
				signal: signal,
			});

			await pipeline(downloadReq.data, fileStream);
		} catch (dlErr) {
			if (fs.existsSync(tempFile)) memoryManager.safeUnlink(tempFile);
			console.warn(`[SnapSave] Failed to download item:`, dlErr.message);
			continue;
		}

		if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 0) {
			downloadedFiles.push(tempFile);
		} else if (fs.existsSync(tempFile)) {
			memoryManager.safeUnlink(tempFile);
		}
	}

	if (downloadedFiles.length === 0) {
		throw new Error("SnapSave download yielded no valid files");
	}

	console.log(`[SnapSave Fallback] Successfully downloaded ${downloadedFiles.length} file(s)`);
	return downloadedFiles;
};

/**
 * Download media via Cobalt API with fallback to yt-dlp & SnapSave
 */
export const downloadViaCobalt = async (url, outputDir = null, audioOnly = false, signal = null) => {
	// Validate URL first
	if (!url || !isValidHttpUrl(url)) {
		throw new CobaltDownloadError("invalid_url", "Please provide a valid HTTP/HTTPS URL.");
	}

	const isInstagram = url.includes("instagram.com");
	const isReelOrTv = isInstagram && (url.includes("/reel/") || url.includes("/tv/"));

	const baseApiUrl = process.env.COBALT_API_URL || "https://cobalt-engine1.onrender.com";
	const apiKey = process.env.COBALT_API_KEY;

	// Deduplicated instance list
	const instanceSet = new Set([
		baseApiUrl,
		"https://cobaltapi.cjs.nz",
		"https://api.cobalt.tools",
		"https://cobalt.deno.dev",
	]);
	// Always add the primary if not already present
	if (!instanceSet.has("https://cobalt-engine1.onrender.com")) {
		instanceSet.add("https://cobalt-engine1.onrender.com");
	}
	const instances = [...instanceSet];

	// Try instances with retry + parallel racing
	let lastError = null;

	const tryInstance = async (apiUrl) => {
		const payload = {
			url: url,
			downloadMode: audioOnly ? "audio" : "auto",
			videoQuality: "720",
			filenameStyle: "basic",
		};

		const headers = {
			Accept: "application/json",
			"Content-Type": "application/json",
		};
		if (apiKey) {
			headers["Authorization"] = `Api-Key ${apiKey}`;
		}

		// Retry each instance up to 2 times
		for (let attempt = 1; attempt <= 2; attempt++) {
			if (signal?.aborted) throw new Error("Download cancelled");

			try {
				const response = await axios.post(apiUrl, payload, {
					headers,
					timeout: 15000,
					signal: signal,
					maxContentLength: 50 * 1024 * 1024,
					maxBodyLength: 50 * 1024 * 1024,
				});

				if (response.data && response.data.status === "error") {
					const errorCode = response.data.error?.code || "unknown_error";
					// Don't retry on certain errors
					if (errorCode === "unsupported-url" || errorCode === "invalid-url") {
						throw { isFinal: true, errorCode, data: response.data };
					}
					if (attempt < 2) {
						await new Promise((r) => setTimeout(r, attempt * 1000));
						continue;
					}
					return { success: false, errorCode, data: response.data };
				}

				return { success: true, data: response.data };
			} catch (err) {
				if (err.isFinal) throw err;
				if (signal?.aborted) throw new Error("Download cancelled");

				if (attempt < 2) {
					await new Promise((r) => setTimeout(r, attempt * 1000));
				} else {
					const errorCode = err.response?.data?.error?.code || "network_error";
					return { success: false, errorCode, data: err.response?.data };
				}
			}
		}
	};

	// Parallel race: all instances at once, first success wins
	try {
		const raceResults = await Promise.allSettled(
			instances.map((apiUrl) => tryInstance(apiUrl))
		);

		let bestResult = null;
		const startTime = Date.now();
		for (const result of raceResults) {
			if (result.status === "fulfilled" && result.value.success) {
				bestResult = result.value;
				const latency = Date.now() - startTime;
				instanceHealth.recordSuccess(result.value.url || instances[0], latency);
				break;
			}
			if (result.status === "rejected" && result.reason?.isFinal) {
				throw result.reason;
			}
			if (result.status === "fulfilled" && !bestResult) {
				bestResult = result.value;
				instanceHealth.recordFailure(bestResult.url || instances[0], Date.now() - startTime);
			}
		}

		if (!bestResult?.success) {
			const finalError = bestResult?.errorCode || "download_failed";
			throw new CobaltDownloadError(finalError, `All Cobalt instances failed`);
		}

		// Process successful response
		const data = bestResult.data;
		const items = [];

		if (data.status === "picker") {
			const videoItems = data.picker.filter((item) => item.type === "video");
			const otherItems = data.picker.filter((item) => item.type !== "video");

			if (videoItems.length > 0) {
				videoItems.forEach((item) => {
					if (item.url) items.push({ url: item.url, type: "video" });
				});
			} else if (otherItems.length > 0 && !isReelOrTv) {
				otherItems.forEach((item) => {
					if (item.url) items.push({ url: item.url, type: item.type || "photo" });
				});
			} else {
				for (const item of data.picker) {
					if (item.url) {
						const itemType = isReelOrTv ? "video" : item.type || "auto";
						if (itemType === "video" || isReelOrTv) {
							items.push({ url: item.url, type: itemType });
						}
					}
				}
			}
		} else if (data.status === "tunnel" || data.status === "redirect") {
			if (isReelOrTv && data.filename && data.filename.endsWith(".jpg")) {
				console.warn("[Cobalt] JPEG thumbnail for Reel, will try SnapSave later");
			} else {
				items.push({ url: data.url, type: "auto" });
			}
		} else if (data.status === "local-processing") {
			if (data.tunnel) {
				data.tunnel.forEach((tUrl) => items.push({ url: tUrl, type: "auto" }));
			}
		} else if (data.status === "success" || data.status === "stream") {
			items.push({ url: data.url, type: "auto" });
		}

		if (items.length > 0) {
			const downloadedFiles = [];
			for (const itemObj of items) {
				if (signal?.aborted) break;

				const itemUrl = typeof itemObj === "string" ? itemObj : itemObj.url;
				const itemType = typeof itemObj === "string" ? "auto" : itemObj.type;
				if (!itemUrl) continue;

				const expectedType = audioOnly ? "audio" : itemType === "photo" ? "photo" : "video";
				const ext = audioOnly ? ".mp3" : itemType === "photo" ? ".jpg" : ".mp4";

				const tempFile = outputDir
					? path.join(outputDir, `cobalt_${Date.now()}_${crypto.randomUUID().split("-")[0]}${ext}`)
					: memoryManager.generateTempFileName(ext);

				const fileStream = fs.createWriteStream(tempFile);
				let lastProgress = Date.now();
				let downloadedBytes = 0;
				let contentLength = null;

				try {
					const downloadReq = await axios.get(itemUrl, {
						responseType: "stream",
						timeout: 60000,
						signal: signal,
						maxContentLength: 100 * 1024 * 1024,
						headers: {
							"User-Agent":
								"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
							Accept: "*/*",
						},
						onDownloadProgress: (progress) => {
							downloadedBytes = progress.loaded;
							if (progress.total) contentLength = progress.total;
							lastProgress = Date.now();
						},
					});

					downloadReq.data.on("data", (chunk) => {
						downloadedBytes += chunk.length;
						lastProgress = Date.now();
					});

					// Stall detection: abort if no progress for 30s
					const stallInterval = setInterval(() => {
						if (Date.now() - lastProgress > 30000) {
							downloadReq.abort();
						}
					}, 5000);

					try {
						await pipeline(downloadReq.data, fileStream);
					} finally {
						clearInterval(stallInterval);
					}
				} catch (dlErr) {
					if (fs.existsSync(tempFile)) memoryManager.safeUnlink(tempFile);
					console.warn(`[Cobalt] Stream error for ${itemUrl}:`, dlErr.message);
					continue;
				}

				// Validate downloaded file
				const validation = validateDownloadedFile(tempFile, expectedType);
				if (!validation.valid) {
					console.warn(`[Cobalt] File validation failed (${validation.reason}): ${tempFile}`);
					if (fs.existsSync(tempFile)) memoryManager.safeUnlink(tempFile);
					continue;
				}

				downloadedFiles.push(tempFile);
			}

			if (downloadedFiles.length > 0) {
				if (isReelOrTv) {
					const hasVideo = downloadedFiles.some((f) => f.endsWith(".mp4"));
					if (!hasVideo) {
						console.warn("[Cobalt] No valid video for Reel, unlinking and trying SnapSave...");
						downloadedFiles.forEach((f) => {
							if (fs.existsSync(f)) memoryManager.safeUnlink(f);
						});
					} else {
						return downloadedFiles;
					}
				} else {
					return downloadedFiles;
				}
			}
		}
	} catch (err) {
		if (err.code) throw err; // CobaltDownloadError
		if (err.isFinal) throw new CobaltDownloadError(err.errorCode, err.message);
		lastError = err;
	}

	// Instagram fallback: SnapSave
	if (isInstagram && !audioOnly) {
		try {
			return await downloadWithSnapSave(url, outputDir, signal);
		} catch (snapErr) {
			console.warn(`[SnapSave Fallback] Failed:`, snapErr.message);
		}
	}

	// Final fallback: yt-dlp
	try {
		return await downloadWithYtDlp(url, outputDir, audioOnly, signal);
	} catch (ytdlpErr) {
		console.error(`[yt-dlp Fallback] Failed:`, ytdlpErr.message);
	}

	const errorCode = lastError?.data?.error?.code || "download_failed";
	throw new CobaltDownloadError(errorCode, `Failed to download: ${url}`);
};

export default downloadViaCobalt;
