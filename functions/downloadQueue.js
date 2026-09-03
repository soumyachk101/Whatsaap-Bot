/**
 * Fast Download queue with high concurrency and NO rate limiting / cooldowns
 */

class DownloadQueue {
	constructor(maxConcurrent = 10) {
		this.maxConcurrent = maxConcurrent;
		this.active = 0;
		this.queue = [];
	}

	async acquire(userId) {
		if (this.active < this.maxConcurrent) {
			this.active++;
			return { queued: false, position: 0 };
		}

		const position = this.queue.length + 1;
		this.queue.push({ userId, resolve: null, reject: null });

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

export default new DownloadQueue(10);
