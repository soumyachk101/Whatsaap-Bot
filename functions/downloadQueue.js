/**
 * Fast Download queue with high concurrency and NO rate limiting / cooldowns
 */

class DownloadQueue {
	constructor(maxConcurrent = 10) {
		this.maxConcurrent = maxConcurrent;
		this.active = 0;
		this.queue = [];
		this.stallThreshold = 300000; // 5 minutes without heartbeat = stalled
		this.heartbeatCheckInterval = 5000; // check every 5s
	}

	/**
	 * Signal that a queued download is still making progress.
	 * Prevents stall-timeout for active downloads.
	 */
	heartbeat(userId) {
		const entry = this.queue.find((e) => e.userId === userId);
		if (entry) {
			entry.lastHeartbeat = Date.now();
		}
	}

	async acquire(userId) {
		if (this.active < this.maxConcurrent) {
			this.active++;
			return { queued: false, position: 0 };
		}

		const position = this.queue.length + 1;
		const entry = { userId, resolve: null, reject: null, lastHeartbeat: Date.now() };
		this.queue.push(entry);

		return new Promise((resolve, reject) => {
			entry.resolve = () => {
				this.queue = this.queue.filter((e) => e !== entry);
				this.active++;
				resolve({ queued: true, position });
			};
			entry.reject = () => {
				this.queue = this.queue.filter((e) => e !== entry);
				reject(new Error("queue_timeout"));
			};

			// Stall detection: only fire timeout if no heartbeat received within threshold
			const stallCheck = setInterval(() => {
				if (!this.queue.includes(entry)) {
					clearInterval(stallCheck);
					return;
				}
				const elapsed = Date.now() - entry.lastHeartbeat;
				if (elapsed > this.stallThreshold) {
					clearInterval(stallCheck);
					entry.reject();
				}
			}, this.heartbeatCheckInterval);

			// Absolute safety net: 2x stall threshold
			setTimeout(() => {
				clearInterval(stallCheck);
				if (this.queue.includes(entry)) {
					entry.reject();
				}
			}, this.stallThreshold * 2);
		});
	}

	release() {
		this.active = Math.max(0, this.active - 1);

		if (this.queue.length > 0 && this.active < this.maxConcurrent) {
			const next = this.queue.shift();
			if (next?.resolve) {
				next.resolve();
			}
		}
	}

	getStats() {
		return {
			active: this.active,
			maxConcurrent: this.maxConcurrent,
			queued: this.queue.length,
		};
	}
}

export default new DownloadQueue(10);
