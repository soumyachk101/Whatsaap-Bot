import { spawn } from "child_process";
import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_PORT = parseInt(process.env.LOCAL_COBALT_PORT || "9000", 10);
const LOCAL_URL = `http://127.0.0.1:${LOCAL_PORT}/`;
const API_DIR = path.resolve(__dirname, "../cobalt-engine/api");

let childProcess = null;
let isStarting = false;
let startPromise = null;

/**
 * Checks if Cobalt Engine is responding on the local port.
 */
export async function isEngineHealthy(timeoutMs = 1500) {
	return new Promise((resolve) => {
		const req = http.get(LOCAL_URL, { timeout: timeoutMs }, (res) => {
			if (res.statusCode === 200) {
				resolve(true);
			} else {
				resolve(false);
			}
		});
		req.on("error", () => resolve(false));
		req.on("timeout", () => {
			req.destroy();
			resolve(false);
		});
	});
}

function parseNetscapeToHeader(content) {
	if (!content) return "";
	if (content.includes("=") && !content.includes("\t")) {
		return content.trim();
	}
	const lines = content.split("\n");
	const pairs = [];
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const parts = trimmed.split("\t");
		if (parts.length >= 7) {
			const name = parts[5].trim();
			const val = parts[6].trim();
			if (name && val) pairs.push(`${name}=${val}`);
		} else if (trimmed.includes("=")) {
			pairs.push(trimmed);
		}
	}
	return pairs.join("; ");
}

/**
 * Builds cookie data from environment variables or text files for Cobalt.
 */
function buildCookiesData() {
	const cookies = {};

	// Instagram cookie
	const igCookie = (process.env.INSTAGRAM_COOKIE || "").trim();
	if (igCookie) {
		cookies.instagram = [parseNetscapeToHeader(igCookie)];
	} else {
		const igCandidate = path.resolve(__dirname, "../instagram-cookies.txt");
		if (fs.existsSync(igCandidate)) {
			try {
				const content = fs.readFileSync(igCandidate, "utf8").trim();
				const parsed = parseNetscapeToHeader(content);
				if (parsed) {
					cookies.instagram = [parsed];
				}
			} catch (_) {}
		}
	}

	// Check explicit env var or existing cookies.json
	const ytCookie = (process.env.COBALT_YOUTUBE_COOKIE || "").trim();
	if (ytCookie) {
		cookies.youtube = [parseNetscapeToHeader(ytCookie)];
	} else {
		const ytCandidate = path.resolve(__dirname, "../youtube-cookies.txt");
		if (fs.existsSync(ytCandidate)) {
			try {
				const content = fs.readFileSync(ytCandidate, "utf8").trim();
				const parsed = parseNetscapeToHeader(content);
				if (parsed) {
					cookies.youtube = [parsed];
				}
			} catch (_) {}
		}

		if (!cookies.youtube) {
			const existingTarget = path.join(API_DIR, "cookies.json");
			if (fs.existsSync(existingTarget)) {
				try {
					const existing = JSON.parse(fs.readFileSync(existingTarget, "utf8"));
					if (Array.isArray(existing.youtube) && existing.youtube.length > 0) {
						cookies.youtube = existing.youtube;
					}
				} catch (_) {}
			}
		}
		if (!cookies.youtube) cookies.youtube = [];
	}

	return cookies;
}

/**
 * Synchronizes cookies.json file in cobalt-engine/api directory.
 */
function syncCookieFile() {
	try {
		const data = buildCookiesData();
		const target = path.join(API_DIR, "cookies.json");
		fs.writeFileSync(target, JSON.stringify(data, null, 4), "utf8");
	} catch (e) {
		console.warn("[CobaltEngine] Could not sync cookies.json:", e.message);
	}
}

/**
 * Ensures the local Cobalt Engine is booted, healthy, and ready to accept requests.
 */
export async function ensureEngineRunning(maxWaitMs = 15000) {
	syncCookieFile();

	// 1. Fast check if already running and responding
	if (await isEngineHealthy(1200)) {
		return LOCAL_URL;
	}

	// 2. Prevent race conditions if multiple callers invoke simultaneously
	if (isStarting && startPromise) {
		return startPromise;
	}

	isStarting = true;
	startPromise = (async () => {
		try {
			if (!fs.existsSync(API_DIR)) {
				return null;
			}

			syncCookieFile();

			const cookies = buildCookiesData();
			const cookiesJson = Object.keys(cookies).length > 0 ? JSON.stringify(cookies) : undefined;

			const nodeBin = process.execPath;
			const env = {
				...process.env,
				API_URL: LOCAL_URL,
				API_PORT: String(LOCAL_PORT),
				PORT: String(LOCAL_PORT),
				COOKIE_PATH: "cookies.json",
				...(cookiesJson ? { COOKIES_JSON: cookiesJson } : {}),
			};

			console.log(`[CobaltEngine] Starting local engine at ${LOCAL_URL} using Node (${nodeBin})...`);

			childProcess = spawn(nodeBin, ["src/cobalt.js"], {
				cwd: API_DIR,
				env,
				stdio: ["ignore", "pipe", "pipe"],
			});

			childProcess.stdout.on("data", (data) => {
				const line = data.toString().trim();
				if (line.includes("cobalt API") || line.includes("internal tunnel handler")) {
					console.log(`[CobaltEngine] ${line.split("\n")[0]}`);
				}
			});

			childProcess.stderr.on("data", (data) => {
				const line = data.toString().trim();
				if (!line.includes("UNDICI-EHPA") && !line.includes("ExperimentalWarning")) {
					console.warn(`[CobaltEngine stderr] ${line}`);
				}
			});

			childProcess.on("exit", (code, signal) => {
				console.warn(`[CobaltEngine] Process exited with code ${code}, signal ${signal}`);
				childProcess = null;
			});

			// Register shutdown hook
			const cleanup = () => {
				if (childProcess && !childProcess.killed) {
					try {
						childProcess.kill("SIGTERM");
					} catch (_) {}
				}
			};
			process.once("exit", cleanup);
			process.once("SIGINT", cleanup);
			process.once("SIGTERM", cleanup);

			// Poll until engine answers with 200
			const startTime = Date.now();
			while (Date.now() - startTime < maxWaitMs) {
				await new Promise((r) => setTimeout(r, 400));
				if (await isEngineHealthy(800)) {
					console.log(`[CobaltEngine] Local engine is healthy and ready on ${LOCAL_URL}!`);
					return LOCAL_URL;
				}
			}

			throw new Error(`Cobalt engine did not respond within ${maxWaitMs / 1000}s`);
		} finally {
			isStarting = false;
			startPromise = null;
		}
	})();

	return startPromise;
}

/**
 * Cleanly stops the managed Cobalt process if running.
 */
export function stopEngine() {
	if (childProcess && !childProcess.killed) {
		console.log("[CobaltEngine] Stopping local engine process...");
		try {
			childProcess.kill("SIGTERM");
		} catch (_) {}
		childProcess = null;
	}
}

export function getEngineUrl() {
	return LOCAL_URL;
}

export default {
	ensureEngineRunning,
	isEngineHealthy,
	stopEngine,
	getEngineUrl,
};
