import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import stream from "stream";
import { promisify } from "util";
import path from "path";
import { execFile, execFileSync } from "child_process";
import { lookup } from "dns";
import snapsave from "snapsave-downloader";
import memoryManager from "./memoryUtils.js";
import instanceHealth from "./instanceHealth.js";
import ffmpegStatic from "ffmpeg-static";

// Prepend standard system and homebrew paths to process.env.PATH
const standardBinPaths = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];
process.env.PATH = Array.from(new Set([...standardBinPaths, ...(process.env.PATH || "").split(":")])).filter(Boolean).join(":");

const findBinary = (name) => {
	const candidates = [
		name,
		path.join("/opt/homebrew/bin", name),
		path.join("/usr/local/bin", name),
		path.join("/usr/bin", name),
		path.join("/bin", name),
	];
	for (const candidate of candidates) {
		try {
			execFileSync(candidate, ["--version"], { stdio: "ignore" });
			return candidate;
		} catch {}
	}
	return null;
};

const ytDlpPath = findBinary("yt-dlp");
const ytDlpAvailable = Boolean(ytDlpPath);

const resolvedFfmpeg = process.env.FFMPEG_PATH || ffmpegStatic || findBinary("ffmpeg") || "ffmpeg";
const ffmpegAvailable = Boolean(findBinary("ffmpeg") || ffmpegStatic);
const ffmpegPath = resolvedFfmpeg;

if (!ytDlpAvailable) {
	console.warn("[BinaryCheck] yt-dlp not found on PATH; YouTube downloads will fall back to Cobalt.");
}
if (!ffmpegAvailable) {
	console.warn("[BinaryCheck] ffmpeg not found on PATH; some yt-dlp conversions may fail.");
}

const pipeline = promisify(stream.pipeline);

/**
 * SSRF protection: reject URLs pointing to internal/private network addresses
 */
const SSRF_BLOCKED_RANGES = [
	{ name: "loopback", start: "127.0.0.0", end: "127.255.255.255" },
	{ name: "private-10", start: "10.0.0.0", end: "10.255.255.255" },
	{ name: "private-172", start: "172.16.0.0", end: "172.31.255.255" },
	{ name: "private-192", start: "192.168.0.0", end: "192.168.255.255" },
	{ name: "link-local", start: "169.254.0.0", end: "169.254.255.255" },
];

const isPrivateIp = (ip) => {
	const parts = ip.split(".").map(Number);
	if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return false;
	const ipNum = (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
	const toNum = (r) => {
		const p = r.start.split(".").map(Number);
		return (p[0] << 24) + (p[1] << 16) + (p[2] << 8) + p[3];
	};
	const toNumEnd = (r) => {
		const p = r.end.split(".").map(Number);
		return (p[0] << 24) + (p[1] << 16) + (p[2] << 8) + p[3];
	};
	return SSRF_BLOCKED_RANGES.some((r) => ipNum >= toNum(r) && ipNum <= toNumEnd(r));
};

const isPrivateHostname = async (hostname) => {
	// Direct IP check
	if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
		return isPrivateIp(hostname);
	}
	// DNS resolve + check
	return new Promise((resolve) => {
		lookup(hostname, { all: true }, (err, addresses) => {
			if (err) return resolve(false);
			if (addresses.some((a) => isPrivateIp(a.address))) return resolve(true);
			resolve(false);
		});
	});
};

const isSafeUrl = async (url) => {
	try {
		const parsed = new URL(url);
		if (!["http:", "https:"].includes(parsed.protocol)) return false;
		if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") return false;
		if (parsed.hostname.startsWith("127.")) return false;
		if (parsed.hostname === "::1") return false;
		// Resolve hostname and check for private IPs
		return !(await isPrivateHostname(parsed.hostname));
	} catch {
		return false;
	}
};

/**
 * Validate that a URL is a safe HTTP/HTTPS link
 */
const validateUrl = (url) => {
	try {
		const parsed = new URL(url);
		return ["http:", "https:"].includes(parsed.protocol);
	} catch {
		return false;
	}
};

/**
 * Custom Error for Cobalt API issues
 */
export class CobaltDownloadError extends Error {
	constructor(code, message) {
		super(message || code);
		this.name = "CobaltDownloadError";
		this.code = code;
	}
}

/**
 * Validate that a URL is a safe HTTP/HTTPS link (existing, with hostname check)
 */
const isValidHttpUrl = (url) => {
	try {
		const u = new URL(url);
		return ["http:", "https:"].includes(u.protocol) && u.hostname.length > 2;
	} catch {
		return false;
	}
};

/**
 * Validate downloaded file by magic bytes / file signature
 */
const validateDownloadedFile = (filePath, expectedType = "auto") => {
	try {
		if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
			return { valid: false, reason: "empty_or_missing" };
		}

		const buffer = Buffer.alloc(16);
		const fd = fs.openSync(filePath, "r");
		try {
			fs.readSync(fd, buffer, 0, 16, 0);
		} finally {
			fs.closeSync(fd);
		}

		const signature = buffer.toString("hex").toLowerCase();

		// Video signatures
		const videoSigs = ["000000", "667479", "6d6f6f", "000001", "464c56", "41564931", "1a45dfa3"];
		// Image signatures
		const imageSigs = ["ffd8", "89504e", "474946", "524946", "504b03"];
		// Audio signatures
		const audioSigs = [
			"fffb",
			"fff3",
			"fff2",
			"4944",
			"474554",
			"4f6767",
			"664c6143",
			"52494646",
			"6674797",
			"4d344120",
		];

		const hasVideo = videoSigs.some((s) => signature.startsWith(s));
		const hasImage = imageSigs.some((s) => signature.startsWith(s));
		const hasAudio = audioSigs.some((s) => signature.startsWith(s));

		if (expectedType === "video" && !hasVideo)
			return {
				valid: false,
				reason: "not_video",
				detected: hasImage ? "image" : hasAudio ? "audio" : "unknown",
			};
		if (expectedType === "audio" && !hasAudio && !hasVideo) return { valid: false, reason: "not_audio" };
		if (expectedType === "photo" && !hasImage) return { valid: false, reason: "not_image" };

		return { valid: true, type: hasVideo ? "video" : hasImage ? "image" : hasAudio ? "audio" : "unknown" };
	} catch (err) {
		return { valid: false, reason: "validation_error", error: err.message };
	}
};

/**
 * Normalize Instagram URL: strip tracking query params, enforce https and www, fix /reels/ to /reel/
 */
export const normalizeInstagramUrl = (rawUrl) => {
	try {
		let clean = String(rawUrl || "").trim();
		clean = clean.split("?")[0].split("&")[0];
		if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
			clean = "https://" + clean;
		} else if (clean.startsWith("http://")) {
			clean = clean.replace("http://", "https://");
		}
		clean = clean.replace(/\/reels\//i, "/reel/");
		const parsed = new URL(clean);
		if (parsed.hostname === "instagram.com") {
			parsed.hostname = "www.instagram.com";
		}
		let pathname = parsed.pathname;
		if (!pathname.endsWith("/")) {
			pathname += "/";
		}
		parsed.pathname = pathname;
		return parsed.toString();
	} catch {
		return rawUrl;
	}
};

/**
 * Fallback downloader using yt-dlp binary
 */
const YOUTUBE_PLAYER_CLIENTS = ["android", "web", "ios", "tv", "mediaconnect", "mweb"];
const YOUTUBE_YTDLP_OPTS = ["--extractor-args", "youtube:player_skip=webpage,jsplayer;player_client=android;formats=audio_only"];

/**
 * Build yt-dlp args for a specific YouTube player client.
 */
function buildYtDlpArgsForClient(url, outputDir, audioOnly, playerClient) {
	const ext = audioOnly ? ".mp3" : ".mp4";
	const tempFile = outputDir
		? path.join(outputDir, `ytdlp_${Date.now()}_${crypto.randomUUID().split("-")[0]}${ext}`)
		: memoryManager.generateTempFileName(ext);

	memoryManager.markFileStatus(tempFile, "downloading");

	const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
	const isInstagram = url.includes("instagram.com");
	const igCookie = process.env.INSTAGRAM_COOKIE || "";

	const clientArgs = isYouTube
		? ["--extractor-args", `youtube:player_client=${playerClient}`]
		: [];

	return {
		args: [
				"--no-playlist",
				"--no-check-certificates",
				"--retries",
				"3",
				"--extractor-retries",
				"3",
				"--fragment-retries",
				"3",
				"--concurrent-fragments",
				"1",
				"--sleep-interval",
				"2",
				"--max-sleep-interval",
				"5",
				...(clientArgs),
				...(isInstagram && igCookie ? ["--add-header", `Cookie: ${igCookie}`] : []),
				...(ffmpegPath ? ["--ffmpeg-location", ffmpegPath] : []),
				"--max-filesize",
				"200M",
				"-f",
				isYouTube
					? "bestaudio/best[height<=720]/best"
					: audioOnly
						? "bestaudio/best"
						: "best[height<=720][ext=mp4]/best[ext=mp4]/best",
				...(audioOnly ? ["--extract-audio", "--audio-format", "mp3"] : ["--merge-output-format", "mp4"]),
				"-o",
				tempFile,
				url,
			],
		tempFile,
	};
}

export const downloadWithYtDlp = async (url, outputDir = null, audioOnly = false, signal = null) => {
	const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");

	// For YouTube, try multiple player clients in sequence
	const clientsToTry = isYouTube ? YOUTUBE_PLAYER_CLIENTS : [""];

	const env = { ...process.env };
	const ffmpegDir = ffmpegPath ? path.dirname(ffmpegPath) : "";
	const userHome = process.env.HOME || "";
	const pathList = [
		ffmpegDir,
		"/opt/homebrew/bin",
		"/usr/local/bin",
		"/usr/bin",
		"/bin",
		userHome ? `${userHome}/.local/bin` : null,
		userHome ? `${userHome}/Library/Python/3.9/bin` : null,
		userHome ? `${userHome}/Library/Python/3.10/bin` : null,
		userHome ? `${userHome}/Library/Python/3.11/bin` : null,
		userHome ? `${userHome}/Library/Python/3.12/bin` : null,
		env.PATH,
	].filter(Boolean);
	env.PATH = pathList.join(path.delimiter);

	let lastErr;

	for (const client of clientsToTry) {
		const { args, tempFile } = buildYtDlpArgsForClient(url, outputDir, audioOnly, client);
		const clientLabel = isYouTube ? ` (client=${client})` : "";

		for (let attempt = 1; attempt <= 2; attempt++) {
			try {
				console.log(`[yt-dlp] Trying${clientLabel} attempt ${attempt}...`);
				await new Promise((resolve, reject) => {
					const opts = { timeout: 45000, env };
					if (signal) opts.signal = signal;
					const child = execFile(ytDlpPath || "yt-dlp", args, opts, (err, stdout, stderr) => {
						if (err) {
							const msg = stderr ? stderr.trim() : err.message;
							// If this is a 429/bot detection error, log it and let the next client try
							if (msg.includes("429") || msg.includes("bot") || msg.includes("Sign in")) {
								return reject(new Error(`BLOCKED: ${msg}`));
							}
							return reject(new Error(msg));
						}
						resolve();
					});
					if (signal) {
						signal.addEventListener(
							"abort",
							() => {
								child.kill("SIGTERM");
								reject(new Error("Download cancelled"));
							},
							{ once: true }
						);
					}
				});

				if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 0) {
					console.log(`[yt-dlp] Downloaded successfully with client=${client}: ${tempFile}`);
					memoryManager.markFileStatus(tempFile, "ready");
					return [tempFile];
				}
				lastErr = new Error("yt-dlp produced an empty file");
			} catch (err) {
				lastErr = err;
				if (fs.existsSync(tempFile)) memoryManager.safeUnlink(tempFile);
				// Don't retry if it's a hard block that won't resolve with retry
				if (err.message.startsWith("BLOCKED:") && attempt >= 2) {
					console.warn(`[yt-dlp] Client ${client} blocked, trying next client...`);
					break;
				}
				if (attempt < 2) {
					await new Promise((r) => setTimeout(r, 2000));
				}
			}
		}
	}
	throw lastErr || new Error("yt-dlp failed");
};

/**
 * Fallback downloader for Instagram using snapsave-downloader
 */
export const downloadWithSnapSave = async (url, outputDir = null, signal = null) => {
	const normalizedUrl = normalizeInstagramUrl(url);
	console.log(`[SnapSave Fallback] Fetching Instagram media for ${normalizedUrl}...`);
	const res = await snapsave(normalizedUrl);
	if (!res || !res.status || !Array.isArray(res.data) || res.data.length === 0) {
		throw new Error("SnapSave returned no media data");
	}

	const downloadedFiles = [];
	for (const item of res.data) {
		if (signal?.aborted) throw new Error("Download cancelled");

		const mediaUrl = item.url || item.thumbnail;
		if (!mediaUrl) continue;

		// SSRF: reject URLs pointing to internal/private hosts
		if (!(await isSafeUrl(mediaUrl))) {
			console.warn(`[SnapSave] Skipping SSRF-unsafe URL: ${mediaUrl}`);
			continue;
		}

		const isVideo = Boolean(item.url) || (item.filename && item.filename.endsWith(".mp4")) || mediaUrl.includes(".mp4") || mediaUrl.includes("video");
		const ext = isVideo ? ".mp4" : ".jpg";

		const tempFile = outputDir
			? path.join(outputDir, `snapsave_${Date.now()}_${crypto.randomUUID().split("-")[0]}${ext}`)
			: memoryManager.generateTempFileName(ext);

		const fileStream = fs.createWriteStream(tempFile);
		try {
			const downloadReq = await axios.get(mediaUrl, {
				responseType: "stream",
				headers: item.headers || { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
				timeout: 45000,
				maxContentLength: 200 * 1024 * 1024,
				signal: signal,
			});

			await pipeline(downloadReq.data, fileStream);
		} catch (dlErr) {
			if (fileStream && !fileStream.destroyed) {
				fileStream.destroy();
			}
			if (fs.existsSync(tempFile)) {
				memoryManager.safeUnlink(tempFile);
			}
			console.warn(`[SnapSave] Failed to download item:`, dlErr.message);
			continue;
		}

		if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 0) {
			downloadedFiles.push(tempFile);
		} else if (fs.existsSync(tempFile)) {
			memoryManager.safeUnlink(tempFile);
		}
	}

	if (downloadedFiles.length === 0) {
		throw new Error("SnapSave download yielded no valid files");
	}

	// Mark all files as ready for delivery
	downloadedFiles.forEach((f) => memoryManager.markFileStatus(f, "ready"));

	console.log(`[SnapSave Fallback] Successfully downloaded ${downloadedFiles.length} file(s)`);
	return downloadedFiles;
};

/**
 * Download media via Cobalt API with fallback to yt-dlp & SnapSave
 */
export const downloadViaCobalt = async (url, outputDir = null, audioOnly = false, signal = null, onProgress = null) => {
	if (!validateUrl(url)) {
		throw new CobaltDownloadError("invalid_url", "Invalid URL. Only http/https links are supported.");
	}

	// Validate URL first
	if (!url || !isValidHttpUrl(url)) {
		throw new CobaltDownloadError("invalid_url", "Please provide a valid HTTP/HTTPS URL.");
	}

	const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
	if (isYouTube) {
		if (ytDlpAvailable) {
			try {
				console.log(`[YouTube DL] Fetching directly via yt-dlp...`);
				return await downloadWithYtDlp(url, outputDir, audioOnly, signal);
			} catch (ytdlpErr) {
				console.error(`[YouTube DL] Direct yt-dlp failed: ${ytdlpErr.message}`);
				throw new CobaltDownloadError("ytdlp_failed", `YouTube download failed: ${ytdlpErr.message}`);
			}
		} else {
			console.warn(`[YouTube DL] yt-dlp not found on system, attempting Cobalt fallback...`);
		}
	}

	const isInstagram = url.includes("instagram.com");
	const isReelOrTv = isInstagram && (url.includes("/reel/") || url.includes("/reels/") || url.includes("/tv/") || url.includes("/p/"));

	// FAST PATH: For Instagram videos/reels, SnapSave is 10x faster (<1.5s) than querying sleeping/blocked Cobalt instances
	if (isInstagram && !audioOnly) {
		try {
			console.log(`[Instagram Fast-Path] Downloading directly via SnapSave for ${url}...`);
			const snapResult = await downloadWithSnapSave(url, outputDir, signal);
			if (snapResult && snapResult.length > 0) {
				return snapResult;
			}
		} catch (snapErr) {
			console.warn(`[Instagram Fast-Path] SnapSave attempt failed (${snapErr.message}), falling back to Cobalt/yt-dlp...`);
		}
	}

	const baseApiUrl = process.env.COBALT_API_URL || "https://cobalt-engine1.onrender.com";
	const apiKey = process.env.COBALT_API_KEY;

	// Deduplicated working instance list
	const instanceSet = new Set([
		baseApiUrl,
		"https://cobaltapi.cjs.nz",
	]);
	if (!instanceSet.has("https://cobalt-engine1.onrender.com")) {
		instanceSet.add("https://cobalt-engine1.onrender.com");
	}
	const instances = [...instanceSet].filter(Boolean);

	// Try instances with retry + parallel racing
	let lastError = null;

	const tryInstance = async (apiUrl) => {
		const payload = {
			url: url,
			downloadMode: audioOnly ? "audio" : "auto",
			videoQuality: "720",
			filenameStyle: "basic",
		};

		const headers = {
			Accept: "application/json",
			"Content-Type": "application/json",
		};
		if (apiKey) {
			headers["Authorization"] = `Api-Key ${apiKey}`;
		}

		// Retry each instance up to 2 times with 6s timeout
		for (let attempt = 1; attempt <= 2; attempt++) {
			if (signal?.aborted) throw new Error("Download cancelled");

			try {
				const response = await axios.post(apiUrl, payload, {
					headers,
					timeout: 6000,
					signal: signal,
					maxContentLength: 50 * 1024 * 1024,
					maxBodyLength: 50 * 1024 * 1024,
				});

				if (response.data && response.data.status === "error") {
					const errorCode = response.data.error?.code || "unknown_error";
					// Don't retry on certain errors
					if (errorCode === "unsupported-url" || errorCode === "invalid-url") {
						throw { isFinal: true, errorCode, data: response.data };
					}
					if (attempt < 2) {
						await new Promise((r) => setTimeout(r, attempt * 1000));
						continue;
					}
					return { success: false, errorCode, data: response.data };
				}

				return { success: true, data: response.data };
			} catch (err) {
				if (err.isFinal) throw err;
				if (signal?.aborted) throw new Error("Download cancelled");

				if (attempt < 2) {
					await new Promise((r) => setTimeout(r, attempt * 1000));
				} else {
					const errorCode = err.response?.data?.error?.code || "network_error";
					return { success: false, errorCode, data: err.response?.data };
				}
			}
		}
	};

	// Parallel race: all instances at once, first success wins
	try {
		const raceResults = await Promise.allSettled(
			instances.map((apiUrl) => tryInstance(apiUrl))
		);

		let bestResult = null;
		const startTime = Date.now();
		for (const result of raceResults) {
			if (result.status === "fulfilled" && result.value.success) {
				bestResult = result.value;
				const latency = Date.now() - startTime;
				instanceHealth.recordSuccess(result.value.url || instances[0], latency);
				break;
			}
			if (result.status === "rejected" && result.reason?.isFinal) {
				throw result.reason;
			}
			if (result.status === "fulfilled" && !bestResult) {
				bestResult = result.value;
				instanceHealth.recordFailure(bestResult.url || instances[0], Date.now() - startTime);
			}
		}

		if (!bestResult?.success) {
			const finalError = bestResult?.errorCode || "download_failed";
			throw new CobaltDownloadError(finalError, `All Cobalt instances failed`);
		}

		// Process successful response
		const data = bestResult.data;
		const items = [];

		if (data.status === "picker") {
			// Helper: extract extension from a URL, defaulting to the item's type field
			const urlExt = (u) => {
				try {
					const pathname = new URL(u).pathname;
					const dotIdx = pathname.lastIndexOf(".");
					if (dotIdx >= 0) return pathname.slice(dotIdx + 1).toLowerCase();
				} catch { /* ignore */ }
				return null;
			};

			const isVideoUrl = (item) => {
				const ext = urlExt(item.url);
				if (ext && ["mp4", "webm", "mov", "m3u8"].includes(ext)) return true;
				if (item.type === "video") return true;
				return false;
			};

			const videoItems = data.picker.filter(isVideoUrl);
			const otherItems = data.picker.filter((item) => !isVideoUrl(item));

			if (videoItems.length > 0) {
				// Always prefer .mp4 over image extensions for Reels/TV
				const sorted = [...videoItems].sort((a, b) => {
					const extA = urlExt(a.url);
					const extB = urlExt(b.url);
					if (["mp4", "webm", "mov", "m3u8"].includes(extA) && !["mp4", "webm", "mov", "m3u8"].includes(extB)) return -1;
					if (!["mp4", "webm", "mov", "m3u8"].includes(extA) && ["mp4", "webm", "mov", "m3u8"].includes(extB)) return 1;
					return 0;
				});
				sorted.forEach((item) => {
					if (item.url) items.push({ url: item.url, type: "video" });
				});
			} else if (otherItems.length > 0 && !isReelOrTv) {
				otherItems.forEach((item) => {
					if (item.url) items.push({ url: item.url, type: item.type || "photo" });
				});
			} else if (isReelOrTv) {
				// For Reels/TV even non-video items: try everything, the validator later will catch bad URLs
				for (const item of data.picker) {
					if (item.url) items.push({ url: item.url, type: item.type || "auto" });
				}
			}
		} else if (data.status === "tunnel" || data.status === "redirect") {
			if (isReelOrTv && data.filename && data.filename.endsWith(".jpg")) {
				console.warn("[Cobalt] JPEG thumbnail for Reel, will try SnapSave later");
			} else {
				items.push({ url: data.url, type: "auto" });
			}
		} else if (data.status === "local-processing") {
			if (data.tunnel) {
				data.tunnel.forEach((tUrl) => items.push({ url: tUrl, type: "auto" }));
			}
		} else if (data.status === "success" || data.status === "stream") {
			items.push({ url: data.url, type: "auto" });
		}

		if (items.length > 0) {
			const downloadedFiles = [];
			for (const itemObj of items) {
				if (signal?.aborted) break;

				const itemUrl = typeof itemObj === "string" ? itemObj : itemObj.url;
				const itemType = typeof itemObj === "string" ? "auto" : itemObj.type;
				if (!itemUrl) continue;

				const expectedType = audioOnly ? "audio" : itemType === "photo" ? "photo" : "video";
				const ext = audioOnly ? ".mp3" : itemType === "photo" ? ".jpg" : ".mp4";

				const tempFile = outputDir
					? path.join(outputDir, `cobalt_${Date.now()}_${crypto.randomUUID().split("-")[0]}${ext}`)
					: memoryManager.generateTempFileName(ext);

				const streamController = new AbortController();
				if (signal) {
					signal.addEventListener("abort", () => streamController.abort(), { once: true });
				}
				const fileStream = fs.createWriteStream(tempFile);
				let lastProgress = Date.now();
							onProgress?.();
				let downloadedBytes = 0;
				let contentLength = null;

				try {
					const downloadReq = await axios.get(itemUrl, {
						responseType: "stream",
						timeout: 90000,
						signal: streamController.signal,
						maxContentLength: 200 * 1024 * 1024,
						headers: {
							"User-Agent":
								"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
							Accept: "*/*",
						},
						onDownloadProgress: (progress) => {
							downloadedBytes = progress.loaded;
							if (progress.total) contentLength = progress.total;
							lastProgress = Date.now();
							onProgress?.();
						},
					});

					downloadReq.data.on("data", (chunk) => {
						downloadedBytes += chunk.length;
						lastProgress = Date.now();
							onProgress?.();
					});

					// Stall detection: abort if no progress for 30s
					const stallInterval = setInterval(() => {
						if (Date.now() - lastProgress > 30000) {
							streamController.abort();
							if (downloadReq.data?.destroy) downloadReq.data.destroy();
						}
					}, 5000);

					try {
						await pipeline(downloadReq.data, fileStream);
					} finally {
						clearInterval(stallInterval);
					}
				} catch (dlErr) {
					if (fileStream && !fileStream.destroyed) {
						fileStream.destroy();
					}
					if (fs.existsSync(tempFile)) {
						memoryManager.safeUnlink(tempFile);
					}
					console.warn(`[Cobalt] Stream download error for ${itemUrl}:`, dlErr.message);
					continue;
				}

				// Validate downloaded file
				const validation = validateDownloadedFile(tempFile, expectedType);
				if (!validation.valid) {
					console.warn(`[Cobalt] File validation failed (${validation.reason}): ${tempFile}`);
					if (fs.existsSync(tempFile)) memoryManager.safeUnlink(tempFile);
					continue;
				}

				// Mark as ready so GC protects it until delivery
				memoryManager.markFileStatus(tempFile, "ready");

				downloadedFiles.push(tempFile);
			}

			if (downloadedFiles.length > 0) {
				if (isReelOrTv) {
					const hasVideo = downloadedFiles.some((f) => f.endsWith(".mp4"));
					if (!hasVideo) {
						console.warn("[Cobalt] No valid video for Reel, unlinking and trying SnapSave...");
						downloadedFiles.forEach((f) => {
							if (fs.existsSync(f)) memoryManager.safeUnlink(f);
						});
					} else {
						return downloadedFiles;
					}
				} else {
					return downloadedFiles;
				}
			}
		}
	} catch (err) {
		console.warn(`[Cobalt] All instances failed (${err.code || err.message}). Attempting fallbacks...`);
		lastError = err;
	}

	// Instagram fallback: SnapSave
	if (isInstagram && !audioOnly) {
		try {
			return await downloadWithSnapSave(url, outputDir, signal);
		} catch (snapErr) {
			console.warn(`[SnapSave Fallback] Failed:`, snapErr.message);
		}
	}

	// Final fallback: yt-dlp
	try {
		return await downloadWithYtDlp(url, outputDir, audioOnly, signal);
	} catch (ytdlpErr) {
		console.error(`[yt-dlp Fallback] Failed:`, ytdlpErr.message);
	}

	const errorCode = lastError?.data?.error?.code || "download_failed";
	throw new CobaltDownloadError(errorCode, `Failed to download: ${url}`);
};

export { isSafeUrl };
