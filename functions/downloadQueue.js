/**
 * Download queue with concurrency limit and per-user cooldown
 */

class DownloadQueue {
	constructor(maxConcurrent = 3) {
		this.maxConcurrent = maxConcurrent;
		this.active = 0;
		this.queue = [];
		this.userCooldowns = new Map();
		this.cooldownMs = 10000; // 10 seconds between downloads per user
	}

	async acquire(userId) {
		const lastDownload = this.userCooldowns.get(userId);
		if (lastDownload && Date.now() - lastDownload < this.cooldownMs) {
			const waitMs = this.cooldownMs - (Date.now() - lastDownload);
			throw new Error(`cooldown:${Math.ceil(waitMs / 1000)}`);
		}

		if (this.active < this.maxConcurrent) {
			this.active++;
			this.userCooldowns.set(userId, Date.now());
			return { queued: false, position: 0 };
		}

		const position = this.queue.length + 1;
		this.queue.push({ userId, resolve: null, reject: null });

		return new Promise((resolve, reject) => {
			const entry = this.queue[this.queue.length - 1];
			entry.resolve = () => {
				this.queue = this.queue.filter((e) => e !== entry);
				this.active++;
				this.userCooldowns.set(userId, Date.now());
				resolve({ queued: true, position });
			};
			entry.reject = () => {
				this.queue = this.queue.filter((e) => e !== entry);
				reject(new Error("queue_timeout"));
			};

			setTimeout(() => {
				if (this.queue.includes(entry)) {
					entry.reject();
				}
			}, 120000);
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

export default new DownloadQueue(3);
