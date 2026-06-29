import axios from "axios";
import fs from "fs";
import stream from "stream";
import { promisify } from "util";
import memoryManager from "./memoryUtils.js";

const pipeline = promisify(stream.pipeline);

const COBALT_API = "https://imputcobalt-api-production-dda7.up.railway.app";

/**
 * Download media via Cobalt API
 * @param {string} url - The URL to download
 * @param {object} options - Options (audioOnly, isNoTTWatermark, etc)
 * @returns {Promise<Array<string>>} - Array of file paths
 */
export const downloadFromCobalt = async (url, options = {}) => {
    try {
        const payload = {
            url: url,
            downloadMode: options.audioOnly ? "audio" : "auto",
            audioFormat: "mp3"
        };

        let data;
        try {
            const response = await axios.post(COBALT_API, payload, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }
            });
            data = response.data;
        } catch (err) {
            if (err.response && err.response.data) {
                data = err.response.data;
            } else {
                throw err;
            }
        }

        if (data.status === "error") {
            const errorReason = data.error?.code || data.text || JSON.stringify(data.error);
            throw new Error(`Cobalt Error: ${errorReason}`);
        }

        const items = [];
        if (data.status === "picker") {
            for (const item of data.picker) {
                items.push(item.url);
            }
        } else if (data.status === "redirect" || data.status === "stream" || data.status === "success") {
            items.push(data.url);
        } else {
            throw new Error(`Unknown Cobalt status: ${data.status}`);
        }

        const downloadedFiles = [];
        for (const itemUrl of items) {
            const ext = options.audioOnly ? ".mp3" : ".mp4";
            const tempFile = memoryManager.generateTempFileName(ext);
            
            const fileStream = memoryManager.createOptimizedWriteStream(tempFile);
            const downloadReq = await axios.get(itemUrl, { responseType: "stream" });
            
            await pipeline(downloadReq.data, fileStream);
            downloadedFiles.push(tempFile);
        }

        return downloadedFiles;

    } catch (error) {
        console.error("Cobalt Helper Error:", error.response?.data || error.message);
        throw error;
    }
};

export default downloadFromCobalt;
