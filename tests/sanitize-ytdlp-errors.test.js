// Unit + integration tests — sanitizeYtDlpError (moved to functions/errorSanitizer.js)
// Run with: node tests/sanitize-ytdlp-errors.test.js
//
// Regression history:
//  - "❌ This content is private or restricted." fired for public song/yt links
//    whose TITLE contains the word "age" ("Age of Empires", "Stage", "Language")
//    because the private branch used lower.includes("age") — a substring match.
//  - 403 / "Sign in to confirm you're not a bot" fell through to the generic
//    "Unable to download" message (no bot-check branch existed).
//  - Follow-up findings from the adversarial review, all now covered below:
//    1. bot-check gets its own actionable message (not "content is private")
//    2. rate-limit wins when an error contains both 429 and block wording
//    3. bare \b403\b in a title is no longer misclassified as bot-check
//    4. "video unavailable" (stale cookies / age-restriction) is actionable
//    5. the pure sanitizer lives in its own module — no source extraction hack

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
	try {
		fn();
		passed++;
		results.push({ name, ok: true });
	} catch (err) {
		failed++;
		results.push({ name, ok: false, error: err.message });
	}
}

// ── Finding #5: sanitizer is a real pure module, importable without node_modules
test("functions/errorSanitizer.js exists and exports sanitizeYtDlpError", async () => {
	const mod = await import(path.join(projectRoot, "functions/errorSanitizer.js"));
	assert.strictEqual(typeof mod.sanitizeYtDlpError, "function", "sanitizeYtDlpError must be exported");
});

const { sanitizeYtDlpError } = await import(path.join(projectRoot, "functions/errorSanitizer.js"));

// ── Integration: cobaltHelper still re-exports it; commands pass the error code ─
test("cobaltHelper.js re-exports sanitizeYtDlpError from errorSanitizer.js", () => {
	const src = fs.readFileSync(path.join(projectRoot, "functions/cobaltHelper.js"), "utf8");
	assert(src.includes('from "./errorSanitizer.js"'), "cobaltHelper should import the pure sanitizer module");
	assert(src.includes("export { sanitizeYtDlpError }"), "cobaltHelper should re-export sanitizeYtDlpError for existing consumers");
});

test("commands/public/mp3.js passes the error code as hint", () => {
	const src = fs.readFileSync(path.join(projectRoot, "commands/public/mp3.js"), "utf8");
	assert(src.includes("sanitizeYtDlpError(error.message, error.code)"), "mp3.js should pass error.code as the hint");
});

test("commands/public/download.js passes the error code as hint", () => {
	const src = fs.readFileSync(path.join(projectRoot, "commands/public/download.js"), "utf8");
	assert(src.includes("sanitizeYtDlpError(err.message, err.code)"), "download.js should pass err.code as the hint");
});

test("commands/group/members/song.js passes the error code as hint", () => {
	const src = fs.readFileSync(path.join(projectRoot, "commands/group/members/song.js"), "utf8");
	assert(src.includes("sanitizeYtDlpError(err.message, err.code)"), "song.js should pass err.code as the hint");
});

// ── Message constants (mirror the module's user-facing strings) ──────────────
const M = {
	deleted: "This post was deleted or is unavailable.",
	noMedia: "No downloadable media found in this post.",
	noAudio: "Audio stream is unavailable for this media.",
	live: "Live streams cannot be downloaded as audio.",
	private: "This content is private or restricted.",
	botCheck: "This download is blocked by a bot check. Please try again later, or update the YouTube cookies.",
	unavailable: "This video is unavailable to the downloader — it may be private or age-restricted.",
	busy: "Service is busy. Please try again in a moment.",
	fileLimit: "File exceeds WhatsApp limit (max 200MB).",
	invalidUrl: "Please provide a valid public link.",
	cancelled: "Download was cancelled.",
	generic: "Unable to download. Please check the link.",
	fallback: "Unable to download media.",
};

// ── Regression: titles containing "age" must NOT read as private ─────────────
test("yt-dlp error mentioning 'Age of Empires' title is NOT private/restricted", () => {
	assert.notStrictEqual(sanitizeYtDlpError("ERROR: [youtube] Age of Empires 2 Gameplay: unable to find formats"), M.private);
	assert.notStrictEqual(sanitizeYtDlpError("ERROR: [youtube] Age of Empires 2 Gameplay: unable to find formats"), M.botCheck);
});

test("title containing 'Stage' is NOT private/restricted", () => {
	assert.notStrictEqual(sanitizeYtDlpError("ERROR: Unable to download 'Concert Stage Setup Guide'"), M.private);
});

test("title containing 'Language' is NOT private/restricted", () => {
	assert.notStrictEqual(sanitizeYtDlpError("ERROR: Format selection failed for 'Language Tutorial Episode 12'"), M.private);
});

test("title containing 'Village' (substring 'age') is NOT private/restricted", () => {
	assert.notStrictEqual(sanitizeYtDlpError("Error processing video 'Village Life in 1080p'"), M.private);
});

test("title '403 Status Code Explained' is NOT misread as a bot-check", () => {
	// Finding #3: bare 403 with no bot/blocked context must not trigger the bot message.
	const out = sanitizeYtDlpError("ERROR: unable to download '403 Status Code Explained' (no formats found)");
	assert.notStrictEqual(out, M.botCheck, "bare 403 in a title must not trigger the bot-check message");
});

// ── Finding #4: 'video unavailable' (stale cookies / age-restriction) is actionable
test("'Video unavailable' error gives the actionable unavailable message", () => {
	assert.strictEqual(sanitizeYtDlpError("ERROR: [youtube] dQw4w9WgXcQ: Video unavailable"), M.unavailable);
	assert.strictEqual(sanitizeYtDlpError("ERROR: video unavailable: sign in to confirm you're not a bot"), M.botCheck);
	// bot-check wording still wins when explicitly present
});

// ── Finding #1: bot-check has its own actionable message, distinct from private
test("'Sign in to confirm you're not a bot' gives the bot-check message", () => {
	assert.strictEqual(sanitizeYtDlpError("Sign in to confirm you're not a bot"), M.botCheck);
});

test("403 + bot detection gives the bot-check message", () => {
	assert.strictEqual(sanitizeYtDlpError("HTTP error 403: yt-dlp detected possible bot detection"), M.botCheck);
});

test("403 + blocked gives the bot-check message", () => {
	assert.strictEqual(sanitizeYtDlpError("403: request blocked by the service"), M.botCheck);
});

// ── Genuine private/restricted content still gets the private message ───────
test("'channel is private' still returns the private/restricted message", () => {
	assert.strictEqual(sanitizeYtDlpError("ERROR: channel is private"), M.private);
});

test("'age-restricted' word (word-boundary) still returns the private message", () => {
	assert.strictEqual(sanitizeYtDlpError("ERROR: This video is age-restricted; cookies are required"), M.private);
});

test("'nsfw' still returns the private message", () => {
	assert.strictEqual(sanitizeYtDlpError("ERROR: nsfw content cannot be downloaded"), M.private);
});

// ── Finding #2: rate-limit wins over block/private wording ───────────────────
test("429 + 'blocked' returns the busy message (rate-limit wins)", () => {
	assert.strictEqual(sanitizeYtDlpError("HTTP 429: request blocked, too many requests"), M.busy);
});

test("'rate limit' wording returns the busy message", () => {
	assert.strictEqual(sanitizeYtDlpError("ERROR: rate limit exceeded"), M.busy);
});

// ── Stable branches: unchanged behavior must not regress ─────────────────────
test("deleted post returns the deleted message", () => {
	assert.strictEqual(sanitizeYtDlpError("ERROR: post was deleted or is unavailable: not found"), M.deleted);
});

test("'no media' returns the no-media message", () => {
	assert.strictEqual(sanitizeYtDlpError("ERROR: no media found in post"), M.noMedia);
});

test("no audio stream returns the audio message", () => {
	assert.strictEqual(sanitizeYtDlpError("no audio stream available (no_audio_stream)"), M.noAudio);
});

test("live stream returns the live message", () => {
	assert.strictEqual(sanitizeYtDlpError("ERROR: This is a live stream and cannot be downloaded as audio"), M.live);
});

test("file size limit returns the 200MB message", () => {
	assert.strictEqual(sanitizeYtDlpError("ERROR: requested format too large (filesize limit exceeded)"), M.fileLimit);
});

test("invalid URL returns the valid-link message", () => {
	assert.strictEqual(sanitizeYtDlpError("ERROR: Invalid URL protocol"), M.invalidUrl);
});

test("cancelled returns the cancelled message", () => {
	assert.strictEqual(sanitizeYtDlpError("ERROR: cancelled by user (aborted)"), M.cancelled);
});

test("generic technical failure returns the generic message", () => {
	assert.strictEqual(sanitizeYtDlpError("ERROR: all download methods failed: cobalt error: download failed"), M.generic);
});

test("empty input returns the fallback message", () => {
	assert.strictEqual(sanitizeYtDlpError(""), M.fallback);
});

test("non-string input returns the fallback message", () => {
	assert.strictEqual(sanitizeYtDlpError(null), M.fallback);
	assert.strictEqual(sanitizeYtDlpError(42), M.fallback);
});

// ── Finding #1/#2: error-code hints (structured beats text-matching) ─────────
test("hint twitter_post_deleted returns the deleted message", () => {
	assert.strictEqual(sanitizeYtDlpError("something garbled", "twitter_post_deleted"), M.deleted);
});

test("hint twitter_post_unavailable returns an unavailable message", () => {
	const out = sanitizeYtDlpError("something garbled", "twitter_post_unavailable");
	assert.strictEqual(out, "This post is unavailable.");
});

test("hint twitter_no_media returns the no-media message", () => {
	assert.strictEqual(sanitizeYtDlpError("something garbled", "twitter_no_media"), M.noMedia);
});

test("hint invalid_url returns the valid-link message", () => {
	assert.strictEqual(sanitizeYtDlpError("something garbled", "invalid_url"), M.invalidUrl);
});

test("hint invalid_twitter_url returns the Twitter valid-link message", () => {
	assert.strictEqual(sanitizeYtDlpError("something garbled", "invalid_twitter_url"), "Please provide a valid Twitter/X link.");
});

test("hint no_audio_stream returns the audio message", () => {
	assert.strictEqual(sanitizeYtDlpError("something garbled", "no_audio_stream"), M.noAudio);
});

test("hint twitter_token_failed / twitter_api_error / twitter_download_failed return the Twitter generic", () => {
	const expected = "Unable to download media from Twitter/X.";
	assert.strictEqual(sanitizeYtDlpError("garbled", "twitter_token_failed"), expected);
	assert.strictEqual(sanitizeYtDlpError("garbled", "twitter_api_error"), expected);
	assert.strictEqual(sanitizeYtDlpError("garbled", "twitter_download_failed"), expected);
});

test("unknown or missing hint falls through to text-matching", () => {
	assert.strictEqual(sanitizeYtDlpError("ERROR: channel is private", "totally_unknown_code"), M.private);
	assert.strictEqual(sanitizeYtDlpError("ERROR: channel is private"), M.private);
	assert.strictEqual(sanitizeYtDlpError("ERROR: channel is private", undefined), M.private);
});

test("a hint never overrides an actionable structural branch with a hint-less message", () => {
	// Even with a known hint, the text still gets checked only when the hint is unknown.
	// Known hints short-circuit — assert that:
	assert.strictEqual(sanitizeYtDlpError("429 rate limit", "invalid_url"), M.invalidUrl);
});

// ── userNotified flag: handlers that notify the user must flag + rethrow ─────
// The orchestrator (getMessagesEvent.js) sends a SECOND generic error message
// for any handler error unless `error.userNotified` is set, and adds a ❌
// reaction only when the handler *throws* (a swallowed error looks like
// success → success reaction on a failed download). Every download handler
// that already sent the sanitized message must therefore flag + rethrow.
function catchBlockAround(src, marker) {
	const idx = src.indexOf(marker);
	if (idx === -1) throw new Error(`marker "${marker}" not found`);
	return src.slice(idx, idx + 700);
}

test("mp3.js marks userNotified and rethrows in its catch block", () => {
	const src = fs.readFileSync(path.join(projectRoot, "commands/public/mp3.js"), "utf8");
	const block = catchBlockAround(src, "MP3 Download Error");
	assert(block.includes("userNotified = true"), "mp3.js must set userNotified = true after sending the error message");
	assert(/throw (error|err)\b/.test(block), "mp3.js must rethrow so the orchestrator adds the ❌ reaction (not the success reaction)");
});

test("song.js marks userNotified and rethrows in its catch block", () => {
	const src = fs.readFileSync(path.join(projectRoot, "commands/group/members/song.js"), "utf8");
	const block = catchBlockAround(src, "Song download error");
	assert(block.includes("userNotified = true"), "song.js must set userNotified = true after sending the error message");
	assert(/throw (err|error)\b/.test(block), "song.js must rethrow so the orchestrator adds the ❌ reaction (not the success reaction)");
});

test("download.js still marks userNotified and rethrows (no regression)", () => {
	const src = fs.readFileSync(path.join(projectRoot, "commands/public/download.js"), "utf8");
	const block = catchBlockAround(src, "Universal DL] Error:");
	assert(block.includes("userNotified = true"), "download.js must set userNotified = true");
	assert(/throw (err|error)\b/.test(block), "download.js must rethrow");
});

test("orchestrator still consumes the userNotified flag", () => {
	const src = fs.readFileSync(path.join(projectRoot, "functions/getMessagesEvent.js"), "utf8");
	assert(src.includes("!error.userNotified"), "getMessagesEvent.js must skip its fallback message when userNotified is set");
});

// ── Report ────────────────────────────────────────────────────────────────────
(async () => {
	for (const r of results) {
		console.log(`${r.ok ? "✅" : "❌"} ${r.name}${r.error ? `\n   ${r.error}` : ""}`);
	}
	console.log(`\n${passed} passed, ${failed} failed`);
	process.exit(failed > 0 ? 1 : 0);
})();
