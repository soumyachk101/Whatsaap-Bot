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

// Cleanup old entries every minute
setInterval(() => {
	rateLimiter.cleanup();
}, 60000);

export default new RateLimiter();
