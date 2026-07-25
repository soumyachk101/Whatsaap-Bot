import axios from "axios";
import fs from "fs";
import stream from "stream";
import { promisify } from "util";
import path from "path";
import memoryManager from "./memoryUtils.js";

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
 * Download media via Cobalt API
 * @param {string} url - The URL to download
 * @param {string} outputDir - Directory to save files (if null, uses memoryManager temp dir)
 * @param {boolean} audioOnly - Whether to extract audio only
 * @returns {Promise<Array<string>>} - Array of downloaded file paths
 */
export const downloadViaCobalt = async (url, outputDir = null, audioOnly = false) => {
    let response;
    let success = false;
    let lastError = null;

    const baseApiUrl = process.env.COBALT_API_URL;
    const apiKey = process.env.COBALT_API_KEY;

    // Ordered list of instances to try (Primary: User Railway Cobalt instance)
    const instances = [
        "https://imputcobalt-api-production-dda7.up.railway.app",
        "https://api.cobalt.tools",
        "https://dog.kittycat.boo",
        "https://rue-cobalt.xenon.zone",
        "https://cobaltapi.cjs.nz"
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

            // Only use API key on the primary base instance if it matches
            if (apiKey && apiUrl === baseApiUrl) {
                headers["Authorization"] = `Api-Key ${apiKey}`;
            }

            response = await axios.post(apiUrl, payload, {
                headers,
                timeout: 20000 // 20s timeout
            });

            // If it returns an error status gracefully, we still want to throw/fallback
            if (response.data && response.data.status === "error") {
                const errorCode = response.data.error?.code || "unknown_error";
                console.warn(`[Cobalt Fallback] ${apiUrl} failed with: ${errorCode}. Trying next...`);
                lastError = response; 
                continue;
            }

            success = true;
            break; // Success! Exit the loop.

        } catch (err) {
            if (err.response && err.response.data && err.response.data.status === "error") {
                const errorCode = err.response.data.error?.code || "unknown_error";
                console.warn(`[Cobalt Fallback] ${apiUrl} responded with error: ${errorCode}. Trying next...`);
                lastError = err.response;
            } else {
                console.warn(`[Cobalt Fallback] ${apiUrl} failed to connect. Trying next...`);
                // Network error, just save as last error to throw later if all fail
                lastError = { data: { status: "error", error: { code: "network_error" } } };
            }
        }
    }

    if (!success) {
        response = lastError;
    }

    const data = response.data;

    // Handle error status
    if (data.status === "error") {
        const errorCode = data.error?.code || "unknown_error";
        if (errorCode.startsWith("error.api.auth.")) {
            console.error("\n=======================================================");
            console.error("🚨 COBALT API AUTHENTICATION ERROR 🚨");
            console.error(`Error Code: ${errorCode}`);
            console.error("Check your COBALT_API_KEY and COBALT_API_URL in .env");
            console.error("=======================================================\n");
        }
        throw new CobaltDownloadError(errorCode, `Cobalt Error: ${errorCode}`);
    }

    const items = [];
    if (data.status === "picker") {
        const isReelOrTv = url.includes("/reel/") || url.includes("/tv/");
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
        items.push({ url: data.url, type: "auto" });
    } else if (data.status === "local-processing") {
        if (data.tunnel) {
            data.tunnel.forEach((tUrl) => items.push({ url: tUrl, type: "auto" }));
        }
    } else if (data.status === "success" || data.status === "stream") {
        items.push({ url: data.url, type: "auto" });
    } else {
        throw new CobaltDownloadError("unknown_status", `Unknown Cobalt status: ${data.status}`);
    }

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
        const downloadReq = await axios.get(itemUrl, { responseType: "stream", timeout: 30000 });
        
        await pipeline(downloadReq.data, fileStream);
        downloadedFiles.push(tempFile);
    }

    return downloadedFiles;
};

export default downloadViaCobalt;
