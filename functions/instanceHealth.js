/**
 * Instance health tracking with circuit breaker pattern
 */

class InstanceHealth {
	constructor() {
		this.scores = new Map();
		this.circuitBreakerThreshold = 3;
		this.recoveryTimeout = 120000; // 2 minutes
	}

	getOrderedInstances(instances) {
		return instances
			.map((url) => {
				const health = this.scores.get(url) || {
					success: 0,
					fail: 0,
					avgLatency: 15000,
					circuitOpen: false,
					lastFail: 0,
				};

				if (health.circuitOpen && Date.now() - health.lastFail < this.recoveryTimeout) {
					return { url, score: -Infinity, latency: Infinity, skip: true };
				}

				const total = health.success + health.fail;
				const successRate = total > 0 ? health.success / total : 0.5;
				return { url, score: successRate, latency: health.avgLatency, skip: false };
			})
			.filter((item) => !item.skip)
			.sort((a, b) => {
				const scoreDiff = b.score - a.score;
				if (Math.abs(scoreDiff) > 0.1) return scoreDiff;
				return a.latency - b.latency;
			})
			.map((item) => item.url);
	}

	recordSuccess(url, latency) {
		const h = this.scores.get(url) || { success: 0, fail: 0, avgLatency: 15000 };
		h.success++;
		h.avgLatency = Math.round((h.avgLatency + latency) / 2);
		h.circuitOpen = false;
		this.scores.set(url, h);
	}

	recordFailure(url, latency) {
		const h = this.scores.get(url) || { success: 0, fail: 0, avgLatency: 15000 };
		h.fail++;
		if (h.fail >= this.circuitBreakerThreshold && h.fail > h.success) {
			h.circuitOpen = true;
			h.lastFail = Date.now();
		}
		this.scores.set(url, h);
	}

	getStats() {
		const stats = {};
		for (const [url, h] of this.scores) {
			stats[url] = {
				success: h.success,
				fail: h.fail,
				rate: h.success + h.fail > 0 ? (h.success / (h.success + h.fail) * 100).toFixed(1) + "%" : "N/A",
				avgLatency: h.avgLatency + "ms",
				circuitOpen: h.circuitOpen,
			};
		}
		return stats;
	}
}

export default new InstanceHealth();
