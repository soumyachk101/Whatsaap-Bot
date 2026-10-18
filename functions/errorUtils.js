/**
 * Sanitizes errors so users never see raw internal URLs, stack traces,
 * API endpoints, or technical library error dumps.
 * 
 * Logs the full raw error to server logs for debugging,
 * and returns a clean, professional, human-friendly message for WhatsApp users.
 */
export function sanitizeUserError(err, context = "Command") {
	if (!err) return "❌ Something went wrong. Please try again later.";

	const rawMsg = typeof err === "string" ? err : err.message || err.toString() || "";

	// Log full raw error to console for backend debugging
	console.error(`[Internal Error in ${context}]:`, err);

	const lower = rawMsg.toLowerCase();

	// 1. High Demand / 503 / Service Unavailable / Model Overloaded
	if (
		lower.includes("503") ||
		lower.includes("high demand") ||
		lower.includes("overloaded") ||
		lower.includes("service unavailable") ||
		lower.includes("spikes in demand")
	) {
		return "⏳ Service is currently busy. Please try again.";
	}

	// 2. Rate Limit / 429 / Quota Exceeded
	if (
		lower.includes("429") ||
		lower.includes("rate limit") ||
		lower.includes("quota") ||
		lower.includes("resource_exhausted") ||
		lower.includes("too many requests")
	) {
		return "⏳ Rate limit reached. Please wait a minute.";
	}

	// 3. Safety / Content Filters
	if (lower.includes("safety") || lower.includes("blocked") || lower.includes("harmcategory")) {
		return "⚠️ Request blocked by safety filters.";
	}

	// 4. API Keys / Auth / 401 / 403
	if (
		lower.includes("api key") ||
		lower.includes("unauthorized") ||
		lower.includes("forbidden") ||
		lower.includes("401") ||
		lower.includes("403")
	) {
		return "⚠️ Service is temporarily unavailable. Please try again.";
	}

	// 5. Model Not Found / 404
	if (
		lower.includes("404") ||
		lower.includes("not found") ||
		lower.includes("does not exist") ||
		lower.includes("model_not_found")
	) {
		return "⚠️ Service is updating. Please try again shortly.";
	}

	// 6. Network / Timeouts / Socket hang up
	if (
		lower.includes("timeout") ||
		lower.includes("etimedout") ||
		lower.includes("econnreset") ||
		lower.includes("enotfound") ||
		lower.includes("socket hang up")
	) {
		return "🌐 Connection timed out. Please try again.";
	}

	// 7. Clean any technical traces, URLs, and file paths
	let clean = rawMsg
		// Remove full URLs (http:// or https://)
		.replace(/https?:\/\/[^\s)\]]+/gi, "")
		// Remove unix / mac paths
		.replace(/(\/[\w\.-]+){2,}/g, "")
		// Remove windows paths
		.replace(/[A-Z]:\\[\w\.\-\\]+/gi, "")
		// Remove library prefixes
		.replace(/\[\s*GoogleGenerativeAI\s*Error\s*\]\s*:?/gi, "")
		.replace(/\[\s*GroqError\s*\]\s*:?/gi, "")
		.replace(/\[\s*APIError\s*\]\s*:?/gi, "")
		.replace(/TypeError\s*:?/gi, "")
		.replace(/ReferenceError\s*:?/gi, "")
		.replace(/SyntaxError\s*:?/gi, "")
		.replace(/Error\s*:?/gi, "")
		.replace(/\s+/g, " ")
		.trim();

	// If cleaned message is empty, too technical, or too long, use safe fallback
	if (!clean || clean.length < 5 || clean.length > 55 || clean.includes("stack") || clean.includes("at ")) {
		return "❌ Something went wrong. Please try again.";
	}

	return clean.startsWith("❌") ? clean : `❌ ${clean}`;
}

export default sanitizeUserError;
