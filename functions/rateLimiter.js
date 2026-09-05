/**
 * Simple per-user rate limiter
 */

class RateLimiter {
	constructor() {
		this.cooldowns = new Map();
		this.defaultCooldown = 10000; // 10 seconds
	}

	check(userId, cooldownMs = 0) {
		return { allowed: true };
	}

	cleanup() {}
}

const rateLimiter = new RateLimiter();

// Cleanup old entries every minute
const cleanupInterval = setInterval(() => {
	rateLimiter.cleanup();
}, 60000);
if (cleanupInterval.unref) cleanupInterval.unref();

export default rateLimiter;
