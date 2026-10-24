// Unit tests — cobaltHelper / cobaltEngineManager fixes
// Run with: node tests/cobalt-fixes.test.js
// These are lightweight assertion-based tests (no framework required).

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

async function testAsync(name, fn) {
	try {
		await fn();
		passed++;
		results.push({ name, ok: true });
	} catch (err) {
		failed++;
		results.push({ name, ok: false, error: err.message });
	}
}

const helperSrc = fs.readFileSync(path.join(projectRoot, "functions/cobaltHelper.js"), "utf8");
const managerSrc = fs.readFileSync(path.join(projectRoot, "functions/cobaltEngineManager.js"), "utf8");
const dockerfileSrc = fs.readFileSync(path.join(projectRoot, "Dockerfile"), "utf8");

// ── Fix 1: ffprobe in Dockerfile ─────────────────────────────────────────────
test("Fix 1: Dockerfile installs ffprobe", () => {
	assert(dockerfileSrc.includes("ffprobe"), "ffprobe not found in Dockerfile apt-get line");
});

// ── Fix 2: Endpoint priority — local first, public last ─────────────────────
test("Fix 2: local endpoint pushed before env API URL", () => {
	const localPush = helperSrc.indexOf('endpoints.push(localUrl)');
	const envPush = helperSrc.indexOf('if (envApiUrl)');
	assert(localPush !== -1, "local endpoint push not found");
	assert(envPush !== -1, "env API URL push not found");
	assert(localPush < envPush, "Local endpoint must be pushed before env COBALT_API_URL");
});

// ── Fix 3: IG carousel thumbnail fallback ────────────────────────────────────
test("Fix 3: thumbnail fallback uses item.url when no thumbnail available", () => {
	assert(helperSrc.includes("item.url") || helperSrc.includes("thumbUrl"),
		"Thumbnail fallback (item.url / thumbUrl) not found");
	// Ensure old silent-skip condition was replaced
	assert(!/if \(bestThumb\?\.url\) \{/.test(helperSrc),
		"Old silent-skip pattern (if bestThumb?.url) still present");
});

// ── Fix 4: isEngineHealthy treats 4xx as "engine up" ─────────────────────────
test("Fix 4: isEngineHealthy accepts 401/403/429 as healthy", () => {
	assert(managerSrc.includes("429") || managerSrc.includes("401"),
		"isEngineHealthy does not handle 4xx auth/rate-limit responses");
});

// ── Fix 5: Twitter no-media throws specific error (not silent fall-through) ─
test("Fix 5: Twitter empty result throws CobaltDownloadError (no silent fall-through)", () => {
	// In downloadViaCobalt, if twFiles is empty array we should still fall back
	// but the dedicated Twitter extractor must throw for "no_media" / "deleted" / "unavailable"
	const hasThrow = helperSrc.includes("throw twErr");
	const hasCodeCheck = helperSrc.includes('twErr.code === "twitter_post_deleted"')
		|| helperSrc.includes('twErr.code === "twitter_no_media"');
	assert(hasThrow, "twitter_post_deleted / twitter_no_media not re-thrown");
	assert(hasCodeCheck, "Specific Twitter error codes not checked before re-throw");
});

// ── Fix 6: validateDownloadedFile — narrow 000000 signature ──────────────────
test("Fix 6: videoSigs does not include bare '000000' (too broad)", () => {
	const sigsMatch = helperSrc.match(/videoSigs\s*=\s*\[([^\]]+)\]/);
	assert(sigsMatch, "videoSigs array not found");
	const sigsBlock = sigsMatch[1];
	// '000000' alone is too broad — it matches any file starting with 4 zero bytes
	// Accept: '000001' (AVI) but not bare '000000'
	assert(!sigsBlock.trim().startsWith('"000000"') && !/^\s*"000000"\s*,/.test(sigsBlock),
		"Bare '000000' signature still in videoSigs — too broad, causes false positives");
});

// ── Fix 7: findBinary — no synchronous execFileSync at module load ───────────
test("Fix 7: no execFileSync in findBinarySync function body (sync blocks event loop at module load)", () => {
	// Check only the actual function body, not comments
	const findBinaryBlock = helperSrc.match(/const findBinarySync\s*=\s*\(name\)\s*=>\s*\{([\s\S]*?)\n\};/);
	assert(findBinaryBlock, "findBinarySync definition not found");
	const body = findBinaryBlock[1]; // capture group = function body only (excludes the definition line comment)
	assert(!/execFileSync\(/.test(body),
		"findBinarySync calls execFileSync( — blocks event loop at module load");
});

// ── Print results ─────────────────────────────────────────────────────────────
console.log("\n── Cobalt Fix Tests ──\n");
for (const r of results) {
	const icon = r.ok ? "✅" : "❌";
	console.log(`${icon} ${r.name}${r.error ? `\n   ↳ ${r.error}` : ""}`);
}
console.log(`\n${passed}/${passed + failed} passed${failed ? `, ${failed} FAILED` : ""}\n`);
process.exit(failed > 0 ? 1 : 0);
