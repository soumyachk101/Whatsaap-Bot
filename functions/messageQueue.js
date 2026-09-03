class MessageQueue {
	constructor() {
		this.queues = new Map(); // Per-chat queues
		this.processing = new Map(); // Track processing status
		this.messageDelay = 0; // Immediate dispatch (0ms delay)
		this.groupMessageDelay = 0;
		this.maxConcurrent = 25; // High throughput
		this.activeSends = 0;
		this.batchSize = 10; // Batch processing
		this.groupBatchDelay = 0;

		this.cleanupInterval = setInterval(() => {
			this.cleanupEmptyQueues();
		}, 300000);
	}

	cleanupEmptyQueues() {
		let cleaned = 0;
		for (const [chatId, queue] of this.queues.entries()) {
			if (queue.length === 0) {
				this.queues.delete(chatId);
				cleaned++;
			}
		}
		for (const [chatId, status] of this.processing.entries()) {
			if (!status && !this.queues.has(chatId)) {
				this.processing.delete(chatId);
				cleaned++;
			}
		}
	}

	async enqueue(chatId, sendFunction, priority = 1) {
		if (!this.queues.has(chatId)) {
			this.queues.set(chatId, []);
		}

		return new Promise((resolve, reject) => {
			const queue = this.queues.get(chatId);
			queue.push({
				sendFunction,
				priority,
				timestamp: Date.now(),
				resolve,
				reject
			});

			queue.sort((a, b) => a.priority - b.priority);

			if (!this.processing.get(chatId)) {
				this.processQueue(chatId);
			}
		});
	}

	async processQueue(chatId) {
		if (this.processing.get(chatId)) return;
		this.processing.set(chatId, true);

		const queue = this.queues.get(chatId);
		if (!queue) {
			this.processing.set(chatId, false);
			return;
		}

		try {
			while (queue.length > 0) {
				while (this.activeSends >= this.maxConcurrent) {
					await new Promise((resolve) => setTimeout(resolve, 10));
				}

				const message = queue.shift();
				if (!message) break;

				this.activeSends++;
				try {
					const result = await message.sendFunction();
					message.resolve(result);
				} catch (err) {
					console.error(`Queue send error for ${chatId}:`, err.message);
					message.reject(err);
				} finally {
					this.activeSends--;
				}
			}
		} finally {
			this.processing.set(chatId, false);
			// Re-trigger if any message arrived while loop was concluding
			if (queue.length > 0) {
				this.processQueue(chatId);
			}
		}
	}

	getStats() {
		const stats = {
			totalQueued: 0,
			queuesByChat: {},
			activeSends: this.activeSends,
		};

		for (const [chatId, queue] of this.queues.entries()) {
			stats.totalQueued += queue.length;
			stats.queuesByChat[chatId] = queue.length;
		}

		return stats;
	}

	clearQueue(chatId) {
		if (this.queues.has(chatId)) {
			this.queues.get(chatId).length = 0;
		}
	}
}

const messageQueue = new MessageQueue();

export default messageQueue;
