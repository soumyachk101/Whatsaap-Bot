/**
 * Fast Download queue with high concurrency and NO rate limiting / cooldowns
 */

class DownloadQueue {
	constructor(maxConcurrent = 10) {
		this.maxConcurrent = maxConcurrent;
		this.active = 0;
		this.queue = [];
		this.heartbeatInterval = 5000; // check every 5s
		this.stallThreshold = 300000; // 5 minutes total timeout
		this.idleThreshold = 60000; // 60s of no heartbeat = stalled
	}

	async acquire(userId) {
		if (this.active < this.maxConcurrent) {
			this.active++;
			return { queued: false, position: 0 };
		}

		const position = this.queue.length + 1;
		this.queue.push({ userId, resolve: null, reject: null, lastHeartbeat: Date.now() });

		return new Promise((resolve, reject) => {
			const entry = this.queue[this.queue.length - 1];
			entry.resolve = () => {
				this.queue = this.queue.filter((e) => e !== entry);
				this.active++;
				resolve({ queued: true, position });
			};
			entry.reject = () => {
				this.queue = this.queue.filter((e) => e !== entry);
				reject(new Error("queue_timeout"));
			};

			// Progress heartbeat: only fire timeout if the download is truly stalled
			const stallCheck = setInterval(() => {
				if (!this.queue.includes(entry)) {
					clearInterval(stallCheck);
					return;
				}
				entry.lastHeartbeat = Date.now();
				const elapsed = Date.now() - entry.lastHeartbeat;
				if (elapsed > this.stallThreshold) {
					clearInterval(stallCheck);
					entry.reject();
				}
			}, this.heartbeatInterval);

			// Hard cap at stallThreshold in case heartbeat interval drifts
			setTimeout(() => {
				clearInterval(stallCheck);
				if (this.queue.includes(entry)) {
					entry.reject();
				}
			}, this.stallThreshold);
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
