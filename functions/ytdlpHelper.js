import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the yt-dlp binary provided by youtube-dl-exec
const YTDLP_PATH = path.join(__dirname, "../node_modules/youtube-dl-exec/bin/yt-dlp");

/**
 * Execute yt-dlp with arguments and return a promise
 * This bypasses issues with spaces in paths found in some wrappers
 */
export const execYtdlp = (url, flags = {}, options = {}) => {
	return new Promise((resolve, reject) => {
		const args = [url];
		
		// Convert flags object to array of strings
		Object.entries(flags).forEach(([key, value]) => {
			if (value === true) {
				args.push(`--${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`);
			} else if (value !== false && value !== undefined && value !== null) {
				args.push(`--${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`);
				args.push(String(value));
			}
		});

		if (options.dumpSingleJson) {
			args.push("--dump-single-json");
		}

		console.log(`🚀 Executing yt-dlp: ${YTDLP_PATH} ${args.join(" ")}`);

		const child = spawn(YTDLP_PATH, args, {
			cwd: process.cwd(),
			...options,
		});

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (data) => {
			stdout += data.toString();
		});

		child.stderr.on("data", (data) => {
			stderr += data.toString();
		});

		child.on("close", (code) => {
			if (code === 0) {
				try {
					if (args.includes("--dump-single-json")) {
						resolve(JSON.parse(stdout));
					} else {
						resolve(stdout);
					}
				} catch (e) {
					resolve(stdout);
				}
			} else {
				const error = new Error(stderr || `yt-dlp exited with code ${code}`);
				error.stderr = stderr;
				error.stdout = stdout;
				error.exitCode = code;
				reject(error);
			}
		});

		child.on("error", (err) => {
			reject(err);
		});
	});
};

export default execYtdlp;
