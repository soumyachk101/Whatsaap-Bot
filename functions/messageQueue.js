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
				// Wait if total active sends across all chats exceeds global limit
				while (this.totalActiveSends >= this.maxConcurrent) {
					await new Promise((resolve) => setTimeout(resolve, 10));
				}

				const message = queue.shift();
				if (!message) break;

				// Wait if this chat already has too many active sends
				while ((this.activeSendsByChat.get(chatId) || 0) >= this.perChatMax) {
					await new Promise((resolve) => setTimeout(resolve, 10));
				}

				this.totalActiveSends++;
				this.activeSendsByChat.set(chatId, (this.activeSendsByChat.get(chatId) || 0) + 1);
				try {
					const sendPromise = message.sendFunction();
					const timeoutPromise = new Promise((_, reject) =>
						setTimeout(() => reject(new Error("Message send timeout (25s)")), 25000)
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
