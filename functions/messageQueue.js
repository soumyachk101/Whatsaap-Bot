class MessageQueue {
	constructor() {
		this.queues = new Map(); // Per-chat queues
		this.processing = new Map(); // Track processing status
		this.messageDelay = 0; // Immediate dispatch (0ms delay)
		this.groupMessageDelay = 0;
		this.maxConcurrent = 25; // Global concurrent send limit
		this.totalActiveSends = 0;
		this.activeSendsByChat = new Map(); // Per-chat active send tracking
		this.perChatMax = 5; // Max concurrent sends per chat
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
			this.processQueue(chatId);
		});
	}

	processQueue(chatId) {
		const queue = this.queues.get(chatId);
		if (!queue || queue.length === 0) return;

		while (
			queue.length > 0 &&
			(this.activeSendsByChat.get(chatId) || 0) < this.perChatMax &&
			this.totalActiveSends < this.maxConcurrent
		) {
			const message = queue.shift();
			if (!message) break;

			this.totalActiveSends++;
			this.activeSendsByChat.set(chatId, (this.activeSendsByChat.get(chatId) || 0) + 1);

			(async () => {
				try {
					const sendTimeoutMs = message.priority >= 2 ? 120000 : 35000;
					const sendPromise = message.sendFunction();
					const timeoutPromise = new Promise((_, reject) =>
						setTimeout(() => reject(new Error(`Message send timeout (${sendTimeoutMs / 1000}s)`)), sendTimeoutMs)
					);
					const result = await Promise.race([sendPromise, timeoutPromise]);
					message.resolve(result);
				} catch (err) {
					console.error(`Queue send error for ${chatId}:`, err.message);
					message.reject(err);
				} finally {
					this.totalActiveSends--;
					const current = this.activeSendsByChat.get(chatId) || 0;
					this.activeSendsByChat.set(chatId, Math.max(0, current - 1));
					this.processQueue(chatId);
				}
			})();
		}
	}

	getStats() {
		const stats = {
			totalQueued: 0,
			queuesByChat: {},
			totalActiveSends: this.totalActiveSends,
			activeSendsByChat: {},
		};

		for (const [chatId, queue] of this.queues.entries()) {
			stats.totalQueued += queue.length;
			stats.queuesByChat[chatId] = queue.length;
			stats.activeSendsByChat[chatId] = this.activeSendsByChat.get(chatId) || 0;
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
