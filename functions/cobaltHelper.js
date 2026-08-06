import axios from "axios";
import fs from "fs";
import stream from "stream";
import { promisify } from "util";
import path from "path";
import { exec } from "child_process";
import snapsave from "snapsave-downloader";
import memoryManager from "./memoryUtils.js";

import ffmpegPath from "ffmpeg-static";

const pipeline = promisify(stream.pipeline);

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
 * Fallback downloader using yt-dlp binary
 */
export const downloadWithYtDlp = (url, outputDir = null, audioOnly = false) => {
    return new Promise((resolve, reject) => {
        const ext = audioOnly ? ".mp3" : ".mp4";
        let tempFile;
        if (outputDir) {
            tempFile = path.join(outputDir, `ytdlp_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`);
        } else {
            tempFile = memoryManager.generateTempFileName(ext);
        }

        const args = audioOnly
            ? `--no-playlist --max-filesize 50M -f bestaudio --extract-audio --audio-format mp3 -o "${tempFile}" "${url}"`
            : `--no-playlist --max-filesize 50M -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${tempFile}" "${url}"`;

        const env = { ...process.env };
        if (ffmpegPath) {
            const ffmpegDir = path.dirname(ffmpegPath);
            env.PATH = `${ffmpegDir}${path.delimiter}${env.PATH || ""}`;
        }

        console.log(`[yt-dlp Fallback] Running yt-dlp for ${url}...`);
        exec(`yt-dlp ${args}`, { timeout: 60000, env }, (err) => {
            if (err || !fs.existsSync(tempFile) || fs.statSync(tempFile).size === 0) {
                if (fs.existsSync(tempFile)) memoryManager.safeUnlink(tempFile);
                return reject(err || new Error("yt-dlp produced an empty file"));
            }
            console.log(`[yt-dlp Fallback] Downloaded successfully: ${tempFile}`);
            resolve([tempFile]);
        });
    });
};

/**
 * Fallback downloader for Instagram using snapsave-downloader
 */
export const downloadWithSnapSave = async (url, outputDir = null) => {
    console.log(`[SnapSave Fallback] Fetching Instagram media for ${url}...`);
    const res = await snapsave(url);
    if (!res || !res.status || !Array.isArray(res.data) || res.data.length === 0) {
        throw new Error("SnapSave returned no media data");
    }

    const downloadedFiles = [];
    for (const item of res.data) {
        const mediaUrl = item.url || item.thumbnail;
        if (!mediaUrl) continue;

        const isVideo = Boolean(item.url) || (item.filename && item.filename.endsWith(".mp4")) || mediaUrl.includes(".mp4");
        const ext = isVideo ? ".mp4" : ".jpg";

        let tempFile;
        if (outputDir) {
            tempFile = path.join(outputDir, `snapsave_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`);
        } else {
            tempFile = memoryManager.generateTempFileName(ext);
        }

        const fileStream = fs.createWriteStream(tempFile);
        const downloadReq = await axios.get(mediaUrl, {
            responseType: "stream",
            headers: item.headers || { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
            timeout: 30000
        });

        await pipeline(downloadReq.data, fileStream);
        if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 0) {
            downloadedFiles.push(tempFile);
        }
    }

    if (downloadedFiles.length === 0) {
        throw new Error("SnapSave download yielded no valid files");
    }

    console.log(`[SnapSave Fallback] Successfully downloaded ${downloadedFiles.length} file(s)`);
    return downloadedFiles;
};

/**
 * Download media via Cobalt API with fallback to yt-dlp & SnapSave
 */
export const downloadViaCobalt = async (url, outputDir = null, audioOnly = false) => {
    const isInstagram = url.includes("instagram.com");
    const isReelOrTv = isInstagram && (url.includes("/reel/") || url.includes("/tv/"));

    let response;
    let success = false;
    let lastError = null;

    const baseApiUrl = process.env.COBALT_API_URL;
    const apiKey = process.env.COBALT_API_KEY;

    // Ordered list of working instances
    const instances = [
        "https://api.cobalt.tools",
        "https://cobalt.kwiatekmom.tokyo",
        "https://imputcobalt-api-production-dda7.up.railway.app",
        "https://dog.kittycat.boo",
        "https://rue-cobalt.xenon.zone",
        "https://cobaltapi.cjs.nz",
        "https://cobalt.api.scie.nz"
    ];

    if (baseApiUrl && !instances.includes(baseApiUrl)) {
        instances.unshift(baseApiUrl);
    }

    for (const apiUrl of instances) {
        try {
            const payload = {
                url: url,
                downloadMode: audioOnly ? "audio" : "auto",
                videoQuality: "1080",
                filenameStyle: "basic"
            };

            const headers = {
                "Accept": "application/json",
                "Content-Type": "application/json"
            };

            if (apiKey && apiUrl === baseApiUrl) {
                headers["Authorization"] = `Api-Key ${apiKey}`;
            }

            response = await axios.post(apiUrl, payload, {
                headers,
                timeout: 20000
            });

            if (response.data && response.data.status === "error") {
                const errorCode = response.data.error?.code || "unknown_error";
                console.warn(`[Cobalt Fallback] ${apiUrl} failed with: ${errorCode}. Trying next...`);
                lastError = response; 
                continue;
            }

            success = true;
            break;

        } catch (err) {
            if (err.response && err.response.data && err.response.data.status === "error") {
                const errorCode = err.response.data.error?.code || "unknown_error";
                console.warn(`[Cobalt Fallback] ${apiUrl} responded with error: ${errorCode}. Trying next...`);
                lastError = err.response;
            } else {
                console.warn(`[Cobalt Fallback] ${apiUrl} failed to connect. Trying next...`);
                lastError = { data: { status: "error", error: { code: "network_error" } } };
            }
        }
    }

    if (success && response && response.data) {
        const data = response.data;
        const items = [];

        if (data.status === "picker") {
            const videoItems = data.picker.filter((item) => item.type === "video" || (item.url && (item.url.includes(".mp4") || item.url.includes("video"))));
            const photoItems = data.picker.filter((item) => item.type === "photo");

            if (videoItems.length > 0) {
                videoItems.forEach((item) => {
                    if (item.url) items.push({ url: item.url, type: "video" });
                });
            } else if (photoItems.length > 0 && !isReelOrTv) {
                photoItems.forEach((item) => {
                    if (item.url) items.push({ url: item.url, type: "photo" });
                });
            } else {
                for (const item of data.picker) {
                    if (item.url) {
                        const itemType = isReelOrTv ? "video" : (item.type || "auto");
                        items.push({ url: item.url, type: itemType });
                    }
                }
            }
        } else if (data.status === "tunnel" || data.status === "redirect") {
            if (isReelOrTv && data.filename && data.filename.endsWith(".jpg")) {
                console.warn("[Cobalt] Received JPEG thumbnail for Reel URL. Falling back to SnapSave...");
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
                const itemUrl = typeof itemObj === "string" ? itemObj : itemObj.url;
                const itemType = typeof itemObj === "string" ? "auto" : itemObj.type;
                if (!itemUrl) continue;
                
                const ext = audioOnly ? ".mp3" : itemType === "photo" ? ".jpg" : ".mp4";
                
                let tempFile;
                if (outputDir) {
                    tempFile = path.join(outputDir, `cobalt_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`);
                } else {
                    tempFile = memoryManager.generateTempFileName(ext);
                }
                
                const fileStream = fs.createWriteStream(tempFile);
                try {
                    const downloadReq = await axios.get(itemUrl, {
                        responseType: "stream",
                        timeout: 60000,
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                            "Accept": "*/*"
                        }
                    });
                    
                    await pipeline(downloadReq.data, fileStream);
                } catch (dlErr) {
                    console.warn(`[Cobalt] Stream download error for ${itemUrl}:`, dlErr.message);
                }

                if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 0) {
                    downloadedFiles.push(tempFile);
                } else {
                    console.warn(`[Cobalt] Downloaded file ${tempFile} is empty (0 bytes). Unlinking...`);
                    if (fs.existsSync(tempFile)) memoryManager.safeUnlink(tempFile);
                }
            }

            if (downloadedFiles.length > 0) {
                if (isReelOrTv) {
                    const hasVideo = downloadedFiles.some(f => f.endsWith(".mp4"));
                    if (!hasVideo) {
                        console.warn("[Cobalt] Downloaded file for Reel is not a video. Unlinking photo and trying SnapSave...");
                        downloadedFiles.forEach(f => memoryManager.safeUnlink(f));
                    } else {
                        return downloadedFiles;
                    }
                } else {
                    return downloadedFiles;
                }
            }
        }
    }

    if (isInstagram) {
        try {
            return await downloadWithSnapSave(url, outputDir);
        } catch (snapErr) {
            console.warn(`[SnapSave Fallback] Failed for ${url}:`, snapErr.message);
        }
    }

    try {
        return await downloadWithYtDlp(url, outputDir, audioOnly);
    } catch (ytdlpErr) {
        console.error(`[yt-dlp Fallback] Failed for ${url}:`, ytdlpErr.message);
    }

    const errorCode = lastError?.data?.error?.code || "download_failed";
    throw new CobaltDownloadError(errorCode, `Failed to download media for ${url}`);
};

export default downloadViaCobalt;
