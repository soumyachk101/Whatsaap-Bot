/**
 * Simple per-user rate limiter
 */

class RateLimiter {
	constructor() {
		this.cooldowns = new Map();
		this.defaultCooldown = 10000; // 10 seconds
	}

	check(userId, cooldownMs = this.defaultCooldown) {
		const lastUsed = this.cooldowns.get(userId);
		if (lastUsed && Date.now() - lastUsed < cooldownMs) {
			return { allowed: false, waitMs: cooldownMs - (Date.now() - lastUsed) };
		}
		this.cooldowns.set(userId, Date.now());
		return { allowed: true };
	}

	cleanup() {
		const now = Date.now();
		for (const [userId, ts] of this.cooldowns) {
			if (now - ts > 60000) this.cooldowns.delete(userId);
		}
	}
}

// Cleanup old entries every minute
setInterval(() => {
	rateLimiter.cleanup();
}, 60000);

export default new RateLimiter();
