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
import cobaltEngineManager from "./cobaltEngineManager.js";

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
		if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
			clean = "https://" + clean;
		} else if (clean.startsWith("http://")) {
			clean = clean.replace("http://", "https://");
		}
		const parsed = new URL(clean);
		const imgIndex = parsed.searchParams.get("img_index") || parsed.searchParams.get("index");
		parsed.search = "";
		if (imgIndex) {
			parsed.searchParams.set("img_index", imgIndex);
		}
		if (parsed.hostname === "instagram.com") {
			parsed.hostname = "www.instagram.com";
		}
		parsed.pathname = parsed.pathname.replace(/\/reels\//i, "/reel/");
		if (!parsed.pathname.endsWith("/")) {
			parsed.pathname += "/";
		}
		return parsed.toString();
	} catch {
		return rawUrl;
	}
};

/**
 * Helper to locate or build a Netscape cookie file for yt-dlp
 */
export function getYouTubeCookieFilePath() {
	// 1. From YOUTUBE_COOKIE environment variable (takes top priority so dynamically updated secrets work immediately)
	const raw = (process.env.YOUTUBE_COOKIE || "").trim();
	if (raw) {
		const targetFile = path.join(process.env.TEMP_DIR || "/tmp", "youtube_active_cookies.txt");
		if (fs.existsSync(raw) && fs.statSync(raw).size > 0) {
			return raw;
		}
		// Netscape format
		if (raw.includes("# Netscape") || (raw.includes("\t") && raw.includes(".youtube.com"))) {
			fs.writeFileSync(targetFile, raw, "utf8");
			return targetFile;
		}
		// JSON array format
		if (raw.startsWith("[") && raw.endsWith("]")) {
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed) && parsed.length > 0) {
					let netscape = "# Netscape HTTP Cookie File\n# Generated by bot\n\n";
					for (const c of parsed) {
						const domain = c.domain || ".youtube.com";
						const flag = domain.startsWith(".") ? "TRUE" : "FALSE";
						const p = c.path || "/";
						const secure = c.secure ? "TRUE" : "FALSE";
						const expiry = Math.floor(c.expirationDate || Date.now() / 1000 + 86400 * 365);
						netscape += `${domain}\t${flag}\t${p}\t${secure}\t${expiry}\t${c.name}\t${c.value}\n`;
					}
					fs.writeFileSync(targetFile, netscape, "utf8");
					return targetFile;
				}
			} catch (e) {
				console.warn("[CookieHelper] Failed to parse YOUTUBE_COOKIE JSON:", e.message);
			}
		}
		// Key=Value string
		if (raw.includes("=")) {
			const pairs = raw.split(";").map((s) => s.trim()).filter(Boolean);
			let netscape = "# Netscape HTTP Cookie File\n# Generated by bot\n\n";
			for (const pair of pairs) {
				const eqIdx = pair.indexOf("=");
				if (eqIdx > 0) {
					const name = pair.slice(0, eqIdx).trim();
					const val = pair.slice(eqIdx + 1).trim();
					const expiry = Math.floor(Date.now() / 1000 + 86400 * 365);
					netscape += `.youtube.com\tTRUE\t/\tTRUE\t${expiry}\t${name}\t${val}\n`;
				}
			}
			fs.writeFileSync(targetFile, netscape, "utf8");
			return targetFile;
		}
	}

	// 2. Explicit env path
	const explicit = process.env.YOUTUBE_COOKIES_PATH;
	if (explicit && fs.existsSync(explicit) && fs.statSync(explicit).size > 0) {
		return explicit;
	}

	// 3. Default local files
	const candidates = [
		path.join(process.cwd(), "youtube-cookies.txt"),
		path.join(process.cwd(), "cookies.txt"),
	];
	for (const cand of candidates) {
		if (fs.existsSync(cand) && fs.statSync(cand).size > 0) {
			return cand;
		}
	}

	return null;
}

/**
 * Helper to locate or build a Netscape cookie file for Instagram
 */
export function getInstagramCookieFilePath() {
	// 1. Explicit env path
	const explicit = process.env.INSTAGRAM_COOKIES_PATH;
	if (explicit && fs.existsSync(explicit) && fs.statSync(explicit).size > 0) {
		return explicit;
	}

	// 2. Default local files
	const candidates = [
		path.join(process.cwd(), "instagram-cookies.txt"),
		path.join(process.cwd(), "cookies.txt"),
	];
	for (const cand of candidates) {
		if (fs.existsSync(cand) && fs.statSync(cand).size > 0) {
			return cand;
		}
	}

	// 3. From INSTAGRAM_COOKIE environment variable
	const raw = (process.env.INSTAGRAM_COOKIE || "").trim();
	if (raw) {
		const targetFile = path.join(process.cwd(), "instagram-cookies.txt");
		if (fs.existsSync(raw) && fs.statSync(raw).size > 0) {
			return raw;
		}
		// Netscape format
		if (raw.includes("# Netscape") || (raw.includes("\t") && raw.includes(".instagram.com"))) {
			fs.writeFileSync(targetFile, raw, "utf8");
			return targetFile;
		}
		// Key=Value string (e.g. "sessionid=...; ds_user_id=...; csrftoken=...")
		if (raw.includes("=")) {
			const pairs = raw.split(";").map((s) => s.trim()).filter(Boolean);
			let netscape = "# Netscape HTTP Cookie File\n# Generated by bot\n\n";
			for (const pair of pairs) {
				const eqIdx = pair.indexOf("=");
				if (eqIdx > 0) {
					const name = pair.slice(0, eqIdx).trim();
					const val = pair.slice(eqIdx + 1).trim();
					const expiry = Math.floor(Date.now() / 1000 + 86400 * 365);
					netscape += `.instagram.com\tTRUE\t/\tTRUE\t${expiry}\t${name}\t${val}\n`;
				}
			}
			fs.writeFileSync(targetFile, netscape, "utf8");
			return targetFile;
		}
	}

	return null;
}

/**
 * Fallback downloader using yt-dlp binary
 */
const YOUTUBE_PLAYER_CLIENTS = ["android", "web", "ios", "tv", "mediaconnect", "mweb"];

/**
 * Build yt-dlp args for a specific YouTube player client or platform.
 */
function buildYtDlpArgsForClient(url, outputDir, audioOnly, playerClient, cookiePath = null) {
	const ext = audioOnly ? ".mp3" : ".mp4";
	const tempFile = outputDir
		? path.join(outputDir, `ytdlp_${Date.now()}_${crypto.randomUUID().split("-")[0]}${ext}`)
		: memoryManager.generateTempFileName(ext);

	memoryManager.markFileStatus(tempFile, "downloading");

	const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
	const isInstagram = url.includes("instagram.com");
	const igCookie = process.env.INSTAGRAM_COOKIE || "";

	const clientArgs = isYouTube && playerClient && playerClient !== "default"
		? ["--extractor-args", `youtube:player_client=${playerClient}`]
		: [];

	const activeCookiePath = cookiePath || (isYouTube ? getYouTubeCookieFilePath() : (isInstagram ? getInstagramCookieFilePath() : null));

	const cookieArgs = activeCookiePath
		? ["--cookies", activeCookiePath]
		: [];

	const formatArg = audioOnly
		? "bestaudio/best"
		: isYouTube
			? "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]/best"
			: "best[height<=720][ext=mp4]/best[ext=mp4]/best";

	return {
		args: [
			"--no-playlist",
			"--no-update",
			"--js-runtimes",
			"node",
			"--retries",
			"3",
			"--extractor-retries",
			"3",
			"--fragment-retries",
			"3",
			"--concurrent-fragments",
			"1",
			...clientArgs,
			...cookieArgs,
			...(!activeCookiePath && isInstagram && igCookie ? ["--add-header", `Cookie: ${igCookie}`] : []),
			...(ffmpegPath ? ["--ffmpeg-location", ffmpegPath] : []),
			"--max-filesize",
			"200M",
			"-f",
			formatArg,
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
	const isInstagram = url.includes("instagram.com");
	const cookiePath = isYouTube
		? getYouTubeCookieFilePath()
		: (isInstagram ? getInstagramCookieFilePath() : null);

	const configsToTry = [];
	if (isYouTube) {
		if (cookiePath) {
			configsToTry.push(
				{ client: "default", cookies: cookiePath },
				{ client: "tv", cookies: cookiePath },
				{ client: "ios", cookies: cookiePath },
				{ client: "android", cookies: null },
				{ client: "tv", cookies: null },
				{ client: "ios", cookies: null }
			);
		} else {
			configsToTry.push(
				{ client: "android", cookies: null },
				{ client: "tv", cookies: null },
				{ client: "ios", cookies: null },
				{ client: "web", cookies: null },
				{ client: "mediaconnect", cookies: null }
			);
		}
	} else {
		configsToTry.push({ client: "", cookies: cookiePath });
	}

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
		userHome ? `${userHome}/Library/Python/3.14/bin` : null,
		env.PATH,
	].filter(Boolean);
	env.PATH = pathList.join(path.delimiter);

	let lastErr;
	let firstYtDlpError = null;

	for (const config of configsToTry) {
		const client = config.client;
		const activeCookies = config.cookies;
		const { args, tempFile } = buildYtDlpArgsForClient(url, outputDir, audioOnly, client, activeCookies);
		const clientLabel = isYouTube
			? ` (client=${client}, cookies=${Boolean(activeCookies)})`
			: (isInstagram ? ` (instagram, cookies=${Boolean(activeCookies)})` : "");

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
					const comp = await ensureWhatsAppCompatibleMedia(tempFile);
					memoryManager.markFileStatus(comp, "ready");
					return [comp];
				}
				lastErr = new Error("yt-dlp produced an empty file");
			} catch (err) {
				lastErr = err;
				// Preserve the first BLOCKED error so it can be surfaced if all fallbacks fail
				if (err.message.startsWith("BLOCKED:") && !firstYtDlpError) {
					firstYtDlpError = err;
				}
				if (fs.existsSync(tempFile)) memoryManager.safeUnlink(tempFile);
				// If client is hard blocked, don't waste time repeating attempt 2
				if (err.message.startsWith("BLOCKED:")) {
					console.warn(`[yt-dlp] Client ${client} blocked, trying next client...`);
					break;
				}
				if (attempt < 2) {
					await new Promise((r) => setTimeout(r, 2000));
				}
			}
		}
	}
	throw firstYtDlpError || lastErr || new Error("yt-dlp failed");
};

/**
 * Ensures any downloaded video/audio file is 100% compatible with WhatsApp's native mobile/desktop player:
 * - Videos: H.264 (avc1) video + AAC audio + yuv420p + faststart (if silent, adds silent AAC track).
 * - Audios: Clean standard MP3 (libmp3lame) audio.
 */
export async function ensureWhatsAppCompatibleMedia(filePath) {
	if (!filePath || !fs.existsSync(filePath)) return filePath;
	try {
		const stats = await fs.promises.stat(filePath);
		if (stats.size === 0) return filePath;

		const ffprobeBin = findBinary("ffprobe") || "ffprobe";
		const probeOutput = await new Promise((resolve, reject) => {
			execFile(
				ffprobeBin,
				["-v", "error", "-show_entries", "stream=index,codec_name,codec_type,pix_fmt", "-of", "json", filePath],
				{ timeout: 15000 },
				(err, stdout, stderr) => {
					if (err) return reject(new Error(stderr || err.message));
					resolve(stdout.toString());
				}
			);
		}).catch((err) => {
			console.warn(`[MediaFix] ffprobe check skipped: ${err.message}`);
			return "{}";
		});

		const info = JSON.parse(probeOutput || "{}");
		const streams = info.streams || [];
		const videoStream = streams.find((s) => s.codec_type === "video");
		const audioStream = streams.find((s) => s.codec_type === "audio");

		const ffmpegBin = ffmpegPath || findBinary("ffmpeg") || "ffmpeg";

		// 1. Video files
		if (videoStream) {
			const isH264 = videoStream.codec_name === "h264";
			const isYuv420p = videoStream.pix_fmt === "yuv420p";
			const hasAac = audioStream && audioStream.codec_name === "aac";

			// Already 100% WhatsApp compliant
			if (isH264 && isYuv420p && hasAac) {
				return filePath;
			}

			console.log(`[MediaFix] Transcoding video ${filePath} for WhatsApp compatibility (vcodec=${videoStream.codec_name}, acodec=${audioStream?.codec_name || "none"})...`);
			const ext = path.extname(filePath) || ".mp4";
			const fixedFile = filePath.replace(new RegExp(`\\${ext}$`), `_wa_${Date.now()}${ext}`);

			const args = ["-y", "-i", filePath];
			if (!audioStream) {
				// Inject silent stereo audio track so WhatsApp player does not reject video
				args.push("-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100");
			}

			args.push(
				"-c:v", isH264 && isYuv420p ? "copy" : "libx264",
				...(isH264 && isYuv420p ? [] : ["-pix_fmt", "yuv420p", "-preset", "ultrafast", "-crf", "24", "-threads", "2"]),
				"-c:a", hasAac ? "copy" : "aac",
				...(hasAac ? [] : ["-b:a", "128k"]),
				"-shortest",
				"-movflags", "+faststart",
				fixedFile
			);

			await new Promise((resolve, reject) => {
				execFile(ffmpegBin, args, { timeout: 120000 }, (err, stdout, stderr) => {
					if (err) return reject(new Error(stderr || err.message));
					resolve();
				});
			});

			if (fs.existsSync(fixedFile) && fs.statSync(fixedFile).size > 0) {
				memoryManager.safeUnlink(filePath);
				memoryManager.markFileStatus(fixedFile, "ready");
				return fixedFile;
			}
		} else if (audioStream) {
			// 2. Audio files
			const isMp3 = audioStream.codec_name === "mp3";
			if (isMp3 && filePath.endsWith(".mp3")) {
				return filePath;
			}

			console.log(`[MediaFix] Transcoding audio ${filePath} to clean MP3 for WhatsApp (acodec=${audioStream.codec_name})...`);
			const ext = path.extname(filePath) || ".mp3";
			const fixedFile = filePath.replace(new RegExp(`\\${ext}$`), `_wa_${Date.now()}.mp3`);

			await new Promise((resolve, reject) => {
				execFile(ffmpegBin, [
					"-y", "-i", filePath,
					"-vn",
					"-c:a", "libmp3lame",
					"-b:a", "192k",
					fixedFile
				], { timeout: 60000 }, (err, stdout, stderr) => {
					if (err) return reject(new Error(stderr || err.message));
					resolve();
				});
			});

			if (fs.existsSync(fixedFile) && fs.statSync(fixedFile).size > 0) {
				memoryManager.safeUnlink(filePath);
				memoryManager.markFileStatus(fixedFile, "ready");
				return fixedFile;
			}
		}
	} catch (err) {
		console.warn(`[MediaFix] Transcoding skipped or failed: ${err.message}`);
	}

	return filePath;
}

/**
 * Dedicated Downloader for Instagram using yt-dlp with authenticated cookies
 * Handles Reels, TV videos, single photos, and multi-slide carousel posts.
 */
export const downloadInstagramMedia = async (url, outputDir = null, audioOnly = false, signal = null) => {
	const normalizedUrl = normalizeInstagramUrl(url);
	const cookiePath = getInstagramCookieFilePath();
	const outDir = outputDir || process.env.TEMP_DIR || path.join(process.cwd(), "temp");
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	let imgIndex = null;
	try {
		const parsed = new URL(normalizedUrl);
		imgIndex = parsed.searchParams.get("img_index") || parsed.searchParams.get("index");
	} catch (_) {}

	const isReel = normalizedUrl.includes("/reel/") || normalizedUrl.includes("/reels/") || normalizedUrl.includes("/tv/");

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
		env.PATH,
	].filter(Boolean);
	env.PATH = pathList.join(path.delimiter);

	// Case 1: Simple single Reel or TV video without specific index
	if (isReel && !imgIndex) {
		console.log(`[Instagram DL] Downloading single reel/video for ${normalizedUrl}...`);
		const ext = audioOnly ? ".mp3" : ".mp4";
		const tempFile = path.join(outDir, `ig_${Date.now()}_${crypto.randomUUID().split("-")[0]}${ext}`);
		memoryManager.markFileStatus(tempFile, "downloading");

		const args = [
			"--no-update",
			"--js-runtimes", "node",
			...(cookiePath ? ["--cookies", cookiePath] : []),
			...(ffmpegPath ? ["--ffmpeg-location", ffmpegPath] : []),
			"--max-filesize", "200M",
			"-f", audioOnly ? "bestaudio/best" : "best[vcodec^=avc1]/best[vcodec^=h264]/bestvideo[vcodec^=avc1]+bestaudio[acodec^=mp4a]/bestvideo[vcodec^=h264]+bestaudio/best[height<=720][ext=mp4]/best[ext=mp4]/best",
			...(audioOnly ? ["--extract-audio", "--audio-format", "mp3"] : ["--merge-output-format", "mp4"]),
			"-o", tempFile,
			normalizedUrl,
		];

		await new Promise((resolve, reject) => {
			const opts = { timeout: 60000, env };
			if (signal) opts.signal = signal;
			const child = execFile(ytDlpPath || "yt-dlp", args, opts, (err, stdout, stderr) => {
				if (err && (!fs.existsSync(tempFile) || fs.statSync(tempFile).size === 0)) {
					return reject(new Error(stderr || err.message));
				}
				resolve();
			});
			if (signal) {
				signal.addEventListener("abort", () => {
					child.kill("SIGTERM");
					reject(new Error("Download cancelled"));
				}, { once: true });
			}
		});

		if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 0) {
			const comp = await ensureWhatsAppCompatibleMedia(tempFile);
			memoryManager.markFileStatus(comp, "ready");
			return [comp];
		}
	}

	// Case 2: Post / Carousel (contains photos, videos, or specific img_index)
	console.log(`[Instagram DL] Extracting metadata for post ${normalizedUrl} (index=${imgIndex || "all"})...`);
	const jsonArgs = [
		"--no-update",
		"--js-runtimes", "node",
		...(cookiePath ? ["--cookies", cookiePath] : []),
		"--ignore-no-formats-error",
		"--ignore-errors",
		"-j",
	];
	if (imgIndex) {
		jsonArgs.push("--playlist-items", String(imgIndex));
	}
	jsonArgs.push(normalizedUrl);

	const items = await new Promise((resolve, reject) => {
		const opts = { timeout: 45000, maxBuffer: 15 * 1024 * 1024, env };
		if (signal) opts.signal = signal;
		const child = execFile(ytDlpPath || "yt-dlp", jsonArgs, opts, (err, stdout, stderr) => {
			if (!stdout && err) return reject(new Error(stderr || err.message));
			const lines = (stdout || "").trim().split("\n").filter(Boolean);
			const parsedItems = [];
			for (const line of lines) {
				try {
					parsedItems.push(JSON.parse(line));
				} catch (_) {}
			}
			resolve(parsedItems);
		});
		if (signal) {
			signal.addEventListener("abort", () => {
				child.kill("SIGTERM");
				reject(new Error("Download cancelled"));
			}, { once: true });
		}
	});

	if (!items || items.length === 0) {
		throw new Error("No media items found for Instagram post");
	}

	const downloadedFiles = [];
	for (let i = 0; i < items.length; i++) {
		if (signal?.aborted) throw new Error("Download cancelled");
		const item = items[i];
		const playlistIndex = item.playlist_index || (imgIndex ? imgIndex : (i + 1));
		const hasVideo = !audioOnly && (Boolean(item.url) || (item.formats && item.formats.length > 0 && item.vcodec !== "none"));

		if (hasVideo) {
			console.log(`[Instagram DL] Downloading video item ${playlistIndex}...`);
			const tempFile = path.join(outDir, `ig_${Date.now()}_${playlistIndex}_${crypto.randomUUID().split("-")[0]}.mp4`);
			memoryManager.markFileStatus(tempFile, "downloading");

			try {
				await new Promise((resolve, reject) => {
					const opts = { timeout: 60000, env };
					if (signal) opts.signal = signal;
					const child = execFile(ytDlpPath || "yt-dlp", [
						"--no-update",
						"--js-runtimes", "node",
						...(cookiePath ? ["--cookies", cookiePath] : []),
						...(ffmpegPath ? ["--ffmpeg-location", ffmpegPath] : []),
						"--playlist-items", String(playlistIndex),
						"-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[height<=720][ext=mp4]/best",
						"--merge-output-format", "mp4",
						"-o", tempFile,
						normalizedUrl,
					], opts, (err, stdout, stderr) => {
						if (err && (!fs.existsSync(tempFile) || fs.statSync(tempFile).size === 0)) {
							return reject(new Error(stderr || err.message));
						}
						resolve();
					});
					if (signal) {
						signal.addEventListener("abort", () => {
							child.kill("SIGTERM");
							reject(new Error("Download cancelled"));
						}, { once: true });
					}
				});

				if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 0) {
					memoryManager.markFileStatus(tempFile, "ready");
					downloadedFiles.push(tempFile);
				}
			} catch (vErr) {
				console.warn(`[Instagram DL] Video item ${playlistIndex} download failed:`, vErr.message);
				if (fs.existsSync(tempFile)) memoryManager.safeUnlink(tempFile);
			}
		} else {
			// Photo item (or audioOnly fallback)
			const thumbs = item.thumbnails || [];
			const bestThumb = thumbs.length > 0 ? thumbs[thumbs.length - 1] : { url: item.thumbnail };
			if (bestThumb?.url) {
				console.log(`[Instagram DL] Downloading photo item ${playlistIndex} (${bestThumb.resolution || "best"})...`);
				const tempFile = path.join(outDir, `ig_${Date.now()}_${playlistIndex}_${crypto.randomUUID().split("-")[0]}.jpg`);
				memoryManager.markFileStatus(tempFile, "downloading");
				const fileStream = fs.createWriteStream(tempFile);
				try {
					const dlRes = await axios.get(bestThumb.url, {
						responseType: "stream",
						timeout: 30000,
						signal: signal,
					});
					await pipeline(dlRes.data, fileStream);
					if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 0) {
						memoryManager.markFileStatus(tempFile, "ready");
						downloadedFiles.push(tempFile);
					} else if (fs.existsSync(tempFile)) {
						memoryManager.safeUnlink(tempFile);
					}
				} catch (pErr) {
					if (fileStream && !fileStream.destroyed) fileStream.destroy();
					if (fs.existsSync(tempFile)) memoryManager.safeUnlink(tempFile);
					console.warn(`[Instagram DL] Photo item ${playlistIndex} download failed:`, pErr.message);
				}
			}
		}
	}

	const finalFiles = [];
	for (const f of downloadedFiles) {
		const comp = await ensureWhatsAppCompatibleMedia(f);
		if (comp && fs.existsSync(comp)) {
			finalFiles.push(comp);
		}
	}

	if (finalFiles.length === 0) {
		throw new Error("Instagram download yielded no valid files");
	}

	console.log(`[Instagram DL] Successfully downloaded ${finalFiles.length} file(s)`);
	return finalFiles;
};

// Backwards compatibility alias
export const downloadWithSnapSave = downloadInstagramMedia;

/**
 * Processes Cobalt response data (tunnel, stream, redirect, picker) and downloads the media file(s).
 */
const downloadFromCobaltData = async (data, url, outputDir, audioOnly, signal, onProgress) => {
	const isReelOrTv = url.includes("/reel/") || url.includes("/reels/") || url.includes("/tv/");
	const items = [];

	const urlExt = (u) => {
		try {
			const pathname = new URL(u).pathname;
			const dotIdx = pathname.lastIndexOf(".");
			if (dotIdx >= 0) return pathname.slice(dotIdx + 1).toLowerCase();
		} catch {}
		return null;
	};

	const isVideoUrl = (item) => {
		const ext = urlExt(item.url);
		if (ext && ["mp4", "webm", "mov", "m3u8"].includes(ext)) return true;
		if (item.type === "video") return true;
		return false;
	};

	if (data.status === "picker" && Array.isArray(data.picker)) {
		const videoItems = data.picker.filter(isVideoUrl);
		const otherItems = data.picker.filter((item) => !isVideoUrl(item));

		if (videoItems.length > 0) {
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
			for (const item of data.picker) {
				if (item.url) items.push({ url: item.url, type: item.type || "auto" });
			}
		}
	} else if (data.status === "tunnel" || data.status === "redirect") {
		if (data.url) {
			items.push({ url: data.url, type: "auto" });
		}
	} else if (data.status === "local-processing") {
		if (Array.isArray(data.tunnel)) {
			data.tunnel.forEach((tUrl) => items.push({ url: tUrl, type: "auto" }));
		}
	} else if (data.status === "success" || data.status === "stream") {
		if (data.url) {
			items.push({ url: data.url, type: "auto" });
		}
	}

	if (items.length === 0) return [];

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

		try {
			const downloadReq = await axios.get(itemUrl, {
				responseType: "stream",
				timeout: 90000,
				signal: streamController.signal,
				maxContentLength: 200 * 1024 * 1024,
				headers: {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
					Accept: "*/*",
				},
				onDownloadProgress: (progress) => {
					downloadedBytes = progress.loaded;
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
			if (fileStream && !fileStream.destroyed) fileStream.destroy();
			if (fs.existsSync(tempFile)) memoryManager.safeUnlink(tempFile);
			console.warn(`[Cobalt] Stream download error for ${itemUrl}:`, dlErr.message);
			continue;
		}

		const validation = validateDownloadedFile(tempFile, expectedType);
		if (!validation.valid) {
			console.warn(`[Cobalt] File validation failed (${validation.reason}): ${tempFile}`);
			if (fs.existsSync(tempFile)) memoryManager.safeUnlink(tempFile);
			continue;
		}

		memoryManager.markFileStatus(tempFile, "ready");
		downloadedFiles.push(tempFile);
	}

	const finalFiles = [];
	for (const f of downloadedFiles) {
		const comp = await ensureWhatsAppCompatibleMedia(f);
		if (comp && fs.existsSync(comp)) {
			finalFiles.push(comp);
		}
	}
	return finalFiles;
};

/**
 * Dedicated Downloader for Twitter / X using modern GraphQL API
 * Handles video, GIF, photos, and provides exact error reasons (e.g. deleted post).
 */
export const downloadTwitterMedia = async (url, outputDir = null, audioOnly = false, signal = null) => {
	const tweetIdMatch = url.match(/(?:twitter|x)\.com\/(?:#!\/)?(?:\w+)\/status(?:es)?\/(\d+)/i);
	if (!tweetIdMatch || !tweetIdMatch[1]) {
		throw new CobaltDownloadError("invalid_twitter_url", "Invalid Twitter/X URL format.");
	}
	const tweetId = tweetIdMatch[1];
	const outDir = outputDir || process.env.TEMP_DIR || path.join(process.cwd(), "temp");
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	console.log(`[TwitterDL] Fetching Twitter/X tweet ${tweetId}...`);

	// 1. Get Guest Token from X
	const guestTokenRes = await axios.post(
		"https://api.x.com/1.1/guest/activate.json",
		null,
		{
			headers: {
				authorization: "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
			},
			timeout: 10000,
			signal,
		}
	).catch((err) => {
		console.warn(`[TwitterDL] Guest token activation failed: ${err.message}`);
		return null;
	});

	const guestToken = guestTokenRes?.data?.guest_token;
	if (!guestToken) {
		throw new CobaltDownloadError("twitter_token_failed", "Could not obtain Twitter guest token.");
	}

	// 2. Query TweetResultByRestId GraphQL API
	const variables = JSON.stringify({
		tweetId,
		withCommunity: false,
		includePromotedContent: false,
		withVoice: false,
	});
	const features = JSON.stringify({
		creator_subscriptions_tweet_preview_api_enabled: true,
		communities_web_enable_tweet_community_results_fetch: true,
		c9s_tweet_anatomy_moderator_badge_enabled: true,
		tweetypie_unmention_optimization_enabled: true,
		responsive_web_edit_tweet_api_enabled: true,
		graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
		view_counts_everywhere_api_enabled: true,
		longform_notetweets_consumption_enabled: true,
		responsive_web_twitter_article_tweet_consumption_enabled: true,
		tweet_awards_web_tipping_enabled: false,
		creator_subscriptions_quote_tweet_preview_enabled: false,
		freedom_of_speech_not_reach_fetch_enabled: true,
		standardized_nudges_misinfo: true,
		tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
		rweb_video_timestamps_enabled: true,
		longform_notetweets_rich_text_read_enabled: true,
		longform_notetweets_inline_media_enabled: true,
		responsive_web_enhance_cards_enabled: false,
	});

	const gqlUrl = `https://x.com/i/api/graphql/2ICDjqPd81tulZcYrtpTuQ/TweetResultByRestId?variables=${encodeURIComponent(variables)}&features=${encodeURIComponent(features)}`;

	const tweetDataRes = await axios.get(gqlUrl, {
		headers: {
			authorization: "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
			"x-guest-token": guestToken,
			"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
		},
		timeout: 15000,
		signal,
	}).catch((err) => {
		throw new CobaltDownloadError("twitter_api_error", `Twitter API request failed: ${err.message}`);
	});

	let result = tweetDataRes.data?.data?.tweetResult?.result;
	if (!result || Object.keys(result).length === 0) {
		throw new CobaltDownloadError("twitter_post_deleted", "This post was deleted by the author or does not exist on Twitter/X.");
	}

	if (result.__typename === "TweetUnavailable" || result.__typename === "TweetTombstone") {
		const reason = result.tombstone?.text?.text || result.reason || "Post unavailable";
		throw new CobaltDownloadError("twitter_post_unavailable", `Twitter post unavailable: ${reason}`);
	}

	if (result.__typename === "TweetWithVisibilityResults") {
		result = result.tweet || result;
	}

	const legacy = result.legacy || {};
	const mediaItems = legacy.extended_entities?.media || legacy.entities?.media || [];

	if (!mediaItems || mediaItems.length === 0) {
		throw new CobaltDownloadError("twitter_no_media", "This post does not contain any video or downloadable media.");
	}

	const downloadedFiles = [];

	for (let i = 0; i < mediaItems.length; i++) {
		if (signal?.aborted) break;
		const item = mediaItems[i];
		const isVideo = item.type === "video" || item.type === "animated_gif";

		if (isVideo && item.video_info?.variants) {
			const mp4Variants = item.video_info.variants.filter((v) => v.content_type === "video/mp4" && v.url);
			if (mp4Variants.length === 0) continue;
			// Sort by bitrate descending
			const bestVariant = mp4Variants.reduce((prev, curr) => (Number(curr.bitrate || 0) > Number(prev.bitrate || 0) ? curr : prev));
			const ext = audioOnly ? ".mp3" : ".mp4";
			const tempFile = path.join(outDir, `twitter_${tweetId}_${i}${ext}`);
			memoryManager.markFileStatus(tempFile, "downloading");

			console.log(`[TwitterDL] Downloading video variant (bitrate: ${bestVariant.bitrate}): ${bestVariant.url}`);
			const streamRes = await axios.get(bestVariant.url, { responseType: "stream", timeout: 60000, signal });
			const writer = fs.createWriteStream(tempFile);
			await pipeline(streamRes.data, writer);

			const validCheck = validateDownloadedFile(tempFile, "video");
			if (!validCheck.valid) {
				memoryManager.safeUnlink(tempFile);
				continue;
			}
			const fixedFile = await ensureWhatsAppCompatibleMedia(tempFile);
			downloadedFiles.push(fixedFile);
			if (audioOnly) break;
		} else if (!isVideo && item.media_url_https && !audioOnly) {
			const photoUrl = `${item.media_url_https}?name=orig`;
			const tempFile = path.join(outDir, `twitter_${tweetId}_${i}.jpg`);
			memoryManager.markFileStatus(tempFile, "downloading");

			console.log(`[TwitterDL] Downloading photo: ${photoUrl}`);
			const streamRes = await axios.get(photoUrl, { responseType: "stream", timeout: 30000, signal });
			const writer = fs.createWriteStream(tempFile);
			await pipeline(streamRes.data, writer);

			const validCheck = validateDownloadedFile(tempFile, "image");
			if (!validCheck.valid) {
				memoryManager.safeUnlink(tempFile);
				continue;
			}
			memoryManager.markFileStatus(tempFile, "ready");
			downloadedFiles.push(tempFile);
		}
	}

	if (downloadedFiles.length === 0) {
		throw new CobaltDownloadError("twitter_download_failed", "Could not download media from Twitter/X post.");
	}

	const finalFiles = [];
	for (const f of downloadedFiles) {
		const comp = await ensureWhatsAppCompatibleMedia(f);
		if (comp && fs.existsSync(comp)) {
			finalFiles.push(comp);
		}
	}

	return finalFiles;
};

/**
 * Download media via Cobalt Engine (Primary: Local cobalt-engine, Secondary: Dedicated Platform Extractor, Fallback: yt-dlp)
 */
export const downloadViaCobalt = async (url, outputDir = null, audioOnly = false, signal = null, onProgress = null) => {
	if (!validateUrl(url) || !isValidHttpUrl(url)) {
		throw new CobaltDownloadError("invalid_url", "Please provide a valid HTTP/HTTPS URL.");
	}

	let lastError = null;

	// Check for platform-specific downloaders first where Cobalt is known to have limitations:
	// 1. Twitter / X dedicated downloader
	const isTwitter = /(?:twitter|x)\.com/i.test(url);
	if (isTwitter) {
		try {
			console.log(`[MediaDL] Platform match: running dedicated Twitter/X extractor...`);
			const twFiles = await downloadTwitterMedia(url, outputDir, audioOnly, signal);
			if (twFiles && twFiles.length > 0) return twFiles;
		} catch (twErr) {
			console.warn(`[MediaDL] Dedicated Twitter/X extractor failed: ${twErr.message}`);
			if (twErr.code === "twitter_post_deleted" || twErr.code === "twitter_no_media" || twErr.code === "twitter_post_unavailable") {
				throw twErr;
			}
			lastError = twErr;
		}
	}

	// 2. Build prioritized list of Cobalt endpoints:
	// - Local Cobalt engine (docker or node on port 9000)
	// - Configured COBALT_API_URL
	// - Fallback public instances
	const endpoints = [];
	const localUrl = `http://127.0.0.1:${process.env.LOCAL_COBALT_PORT || "9000"}/`;
	endpoints.push(localUrl);

	const envApiUrl = (process.env.COBALT_API_URL || "").trim();
	if (envApiUrl) {
		const formatted = envApiUrl.endsWith("/") ? envApiUrl : `${envApiUrl}/`;
		if (!endpoints.includes(formatted)) {
			endpoints.push(formatted);
		}
	}

	try {
		const mgrUrl = await cobaltEngineManager.ensureEngineRunning();
		if (mgrUrl && !endpoints.includes(mgrUrl)) {
			endpoints.push(mgrUrl);
		}
	} catch (e) {
		console.warn("[MediaDL] Local Cobalt manager check:", e.message);
	}

	const fallbackList = [
		"https://cobaltapi.cjs.nz/",
	];
	for (const fb of fallbackList) {
		if (!endpoints.some((e) => e.replace(/\/+$/, "") === fb.replace(/\/+$/, ""))) {
			endpoints.push(fb);
		}
	}

	const apiKey = process.env.COBALT_API_KEY;

	for (const endpoint of endpoints) {
		if (signal?.aborted) break;
		try {
			console.log(`[MediaDL] Requesting media from Cobalt endpoint (${endpoint}): ${url}`);
			const headers = { Accept: "application/json", "Content-Type": "application/json" };
			if (apiKey && !endpoint.includes("127.0.0.1")) {
				headers["Authorization"] = `Api-Key ${apiKey}`;
			}

			const payload = {
				url,
				downloadMode: audioOnly ? "audio" : "auto",
				videoQuality: "720",
				filenameStyle: "basic",
				audioFormat: audioOnly ? "mp3" : undefined,
			};

			const res = await axios.post(endpoint, payload, {
				headers,
				timeout: endpoint.includes("127.0.0.1") ? 45000 : 25000,
				signal,
			});

			if (res.data && res.data.status !== "error") {
				const files = await downloadFromCobaltData(res.data, url, outputDir, audioOnly, signal, onProgress);
				if (files && files.length > 0) {
					console.log(`[MediaDL] Cobalt endpoint (${endpoint}) succeeded: ${files.length} file(s)`);
					return files;
				}
			} else if (res.data?.status === "error") {
				const errCode = res.data.error?.code || "unknown_error";
				console.warn(`[MediaDL] Cobalt endpoint (${endpoint}) returned error: ${errCode}`);
				lastError = new CobaltDownloadError(errCode, `Cobalt error: ${errCode}`);
			}
		} catch (endpointErr) {
			console.warn(`[MediaDL] Cobalt endpoint (${endpoint}) failed: ${endpointErr.response?.data?.error?.code || endpointErr.message}`);
			lastError = endpointErr;
		}
	}

	// 3. Fallback: Instagram dedicated downloader
	const isInstagram = url.includes("instagram.com");
	if (isInstagram) {
		try {
			console.log(`[MediaDL] Fallback: trying Instagram dedicated downloader...`);
			const igFiles = await downloadInstagramMedia(url, outputDir, audioOnly, signal);
			if (igFiles && igFiles.length > 0) return igFiles;
		} catch (igErr) {
			console.warn(`[MediaDL] Instagram dedicated downloader failed: ${igErr.message}`);
		}
	}

	// 4. Fallback: yt-dlp binary (dynamic check)
	const ytBin = ytDlpPath || findBinary("yt-dlp");
	if (ytBin) {
		try {
			console.log(`[MediaDL] Fallback: trying yt-dlp binary (${ytBin})...`);
			return await downloadWithYtDlp(url, outputDir, audioOnly, signal);
		} catch (ytdlpErr) {
			console.error(`[MediaDL] yt-dlp fallback failed: ${ytdlpErr.message}`);
			lastError = ytdlpErr;
		}
	}

	// If there is an actionable specific error, surface it directly
	if (lastError instanceof CobaltDownloadError && lastError.message) {
		throw lastError;
	}

	const errorCode = lastError?.code || "download_failed";
	const defaultMessage = "Unable to download this media. Please check the link and try again.";
	throw new CobaltDownloadError(
		errorCode,
		lastError?.message || defaultMessage
	);
};

/**
 * Sanitize error messages for user-facing display.
 * Returns concise, professional, human-friendly 1-line messages.
 */
export const sanitizeYtDlpError = (rawMsg) => {
	if (!rawMsg || typeof rawMsg !== "string") return "Unable to download media.";

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

	// 3. Private, protected, age-restricted, or login required
	if (
		lower.includes("private") ||
		lower.includes("protected") ||
		lower.includes("age") ||
		lower.includes("nsfw") ||
		lower.includes("sign in to confirm") ||
		lower.includes("confirm you're not a bot")
	) {
		return "This content is private or restricted.";
	}

	// 4. Rate limiting or high server traffic
	if (
		lower.includes("429") ||
		lower.includes("rate limit") ||
		lower.includes("too many requests") ||
		lower.includes("blocking")
	) {
		return "Service is busy. Please try again in a moment.";
	}

	// 5. File size limits
	if (lower.includes("too large") || lower.includes("filesize") || lower.includes("limit")) {
		return "File exceeds WhatsApp limit (max 200MB).";
	}

	// 6. Invalid URL
	if (lower.includes("invalid url") || lower.includes("unsupported") || lower.includes("protocol")) {
		return "Please provide a valid public link.";
	}

	// 7. Cancelled
	if (lower.includes("cancelled") || lower.includes("aborted")) {
		return "Download was cancelled.";
	}

	// 8. Generic failures, technical stack, or subshell error outputs
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

	// 9. Clean single line message if reasonable
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

export { isSafeUrl };
