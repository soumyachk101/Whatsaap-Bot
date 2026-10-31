// functions/errorSanitizer.js
// Pure user-facing error message sanitizer for media-download errors.
//
// Design notes:
//  - Zero imports → importable in any environment (production, Docker,
//    tests without node_modules), and trivially unit-testable.
//  - `code` (a structured hint, e.g. CobaltDownloadError.code) takes
//    priority over text-matching when it is a known code.
//  - Branch order is intentional: rate-limiting before bot-check (a "429
//    request blocked" dump must read as *busy*, not *restricted*), and
//    word-boundary matching everywhere a keyword can appear inside a video
//    title ("Age of Empires", "Stage", "Village" must not read as private).

const HINTS = {
	deleted: "This post was deleted or is unavailable.",
	twitter_post_deleted: "This post was deleted or is unavailable.",
	twitter_post_unavailable: "This post is unavailable.",
	twitter_no_media: "No downloadable media found in this post.",
	no_audio_stream: "Audio stream is unavailable for this media.",
	invalid_url: "Please provide a valid public link.",
	invalid_twitter_url: "Please provide a valid Twitter/X link.",
	twitter_token_failed: "Unable to download media from Twitter/X.",
	twitter_api_error: "Unable to download media from Twitter/X.",
	twitter_download_failed: "Unable to download media from Twitter/X.",
};

/**
 * Sanitize raw download errors (yt-dlp stderr, cobalt errors, HTTP failures)
 * into concise, professional, human-friendly 1-line messages.
 *
 * @param {string} rawMsg - raw error message / stderr text
 * @param {string} [code] - optional structured error-code hint
 * @returns {string} user-facing 1-line message
 */
export const sanitizeYtDlpError = (rawMsg, code = null) => {
	if (!rawMsg || typeof rawMsg !== "string") {
		// Even with a bad message body, a known code hint is still actionable.
		if (code && HINTS[code]) return HINTS[code];
		return "Unable to download media.";
	}

	// 0. Structured hint wins when it is a known code.
	if (code && HINTS[code]) return HINTS[code];

	const lower = rawMsg.toLowerCase();

	// 1. Deleted or non-existent posts / 404
	if (
		lower.includes("deleted") ||
		lower.includes("not exist") ||
		lower.includes("tombstone") ||
		lower.includes("post unavailable") ||
		lower.includes("tweet unavailable") ||
		lower.includes("not found") ||
		lower.includes("404")
	) {
		return "This post was deleted or is unavailable.";
	}

	// 2. No video / media found in post
	if (
		lower.includes("no media") ||
		lower.includes("no video could be found") ||
		lower.includes("no downloadable media")
	) {
		return "No downloadable media found in this post.";
	}

	// 3. Audio stream unavailable
	if (
		lower.includes("no audio") ||
		lower.includes("no sound") ||
		lower.includes("audio stream") ||
		lower.includes("no_audio_stream") ||
		lower.includes("audio track") ||
		lower.includes("format not available")
	) {
		return "Audio stream is unavailable for this media.";
	}

	// 4. Live stream
	if (lower.includes("live stream")) {
		return "Live streams cannot be downloaded as audio.";
	}

	// 5. Rate limiting or high server traffic — checked BEFORE bot-check so a
	//    "429 request blocked" dump reads as busy, not restricted.
	if (
		lower.includes("429") ||
		lower.includes("rate limit") ||
		lower.includes("too many requests")
	) {
		return "Service is busy. Please try again in a moment.";
	}

	// 6. Bot check / anti-bot blocking. Requires 4xx context plus block
	//    wording, or explicit anti-bot phrases — so a bare "403" or "blocked"
	//    appearing in a video TITLE cannot misfire this branch.
	const hasHttp4xx = /\b4[0-9]{2}\b/.test(lower);
	const botContext =
		lower.includes("sign in to confirm") ||
		lower.includes("you're not a bot") ||
		lower.includes("bot detection") ||
		lower.includes("bot check") ||
		(hasHttp4xx && (lower.includes("blocked") || lower.includes("blocking")));
	if (botContext) {
		return "This download is blocked by a bot check. Please try again later, or update the YouTube cookies.";
	}

	// 7. Private, protected, age-restricted, or NSFW. Word-boundary matching:
	//    raw substring checks like .includes("age") used to misclassify public
	//    videos titled "Age of Empires", "Stage…", "Village…" as private.
	if (
		/\bprivate\b/.test(lower) ||
		/\bprotected\b/.test(lower) ||
		/\bage-restricted\b/.test(lower) ||
		/\bnsfw\b/.test(lower)
	) {
		return "This content is private or restricted.";
	}

	// 8. Video unavailable (stale/missing cookies, age-gated without cookies).
	//    Actionable: tells the user the link probably still exists.
	if (lower.includes("video unavailable")) {
		return "This video is unavailable to the downloader — it may be private or age-restricted.";
	}

	// 9. File size limits
	if (lower.includes("too large") || lower.includes("filesize") || lower.includes("limit")) {
		return "File exceeds WhatsApp limit (max 200MB).";
	}

	// 10. Invalid URL
	if (lower.includes("invalid url") || lower.includes("unsupported") || lower.includes("protocol")) {
		return "Please provide a valid public link.";
	}

	// 11. Cancelled
	if (lower.includes("cancelled") || lower.includes("aborted")) {
		return "Download was cancelled.";
	}

	// 12. Generic failures, technical stack, or subshell error outputs
	if (
		lower.includes("all download methods failed") ||
		lower.includes("cobalt error") ||
		lower.includes("download failed") ||
		lower.includes("err_bad_request") ||
		lower.includes("bad request") ||
		lower.includes("invalid request") ||
		lower.includes("traceback") ||
		lower.includes("syntaxerror") ||
		lower.includes("error:")
	) {
		return "Unable to download. Please check the link.";
	}

	// 13. Clean single line message if reasonable
	const lines = rawMsg.split("\n").map((l) => l.trim()).filter(Boolean);
	const meaningful = lines.filter(
		(l) => !l.startsWith("WARNING:") && !l.startsWith("ERROR:") && !l.startsWith("DEBUG:")
	);
	const clean = (meaningful.length > 0 ? meaningful[meaningful.length - 1] : lines[lines.length - 1] || "Unable to download.")
		.replace(/^BLOCKED:\s*/i, "")
		.replace(/^Error:\s*/i, "")
		.replace(/https?:\/\/[^\s]+/gi, "")
		.trim();

	if (clean.length > 50 || clean.includes("stack") || clean.includes("at ") || clean.includes("{")) {
		return "Unable to download. Please check the link.";
	}

	return clean;
};
