import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use ffmpeg-static binary if available, fallback to system ffmpeg
let ffmpegPath = "ffmpeg";
try {
	const mod = await import("ffmpeg-static");
	if (mod.default) ffmpegPath = mod.default;
} catch (_) {}

/**
 * Convert any audio buffer to OGG/Opus format compatible with WhatsApp voice notes.
 * WhatsApp ONLY plays ptt (voice notes) in audio/ogg; codecs=opus format.
 */
async function convertToOpus(inputBuffer) {
	const tmpDir = path.join(__dirname, "..", "tmp");
	if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

	const id = Date.now() + "_" + Math.random().toString(36).slice(2, 8);
	const inputPath = path.join(tmpDir, `tts_in_${id}`);
	const outputPath = path.join(tmpDir, `tts_out_${id}.ogg`);

	try {
		fs.writeFileSync(inputPath, inputBuffer);

		// Use ffmpeg to convert to OGG/Opus (the only format WhatsApp accepts for voice notes)
		await execAsync(
			`"${ffmpegPath}" -y -i "${inputPath}" -ac 1 -ar 48000 -c:a libopus -b:a 64k -application voip "${outputPath}"`,
			{ timeout: 15000 }
		);

		const outputBuffer = fs.readFileSync(outputPath);
		return outputBuffer;
	} finally {
		// Always clean up temp files
		try { fs.unlinkSync(inputPath); } catch (_) {}
		try { fs.unlinkSync(outputPath); } catch (_) {}
	}
}

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { prefix, sendMessageWTyping, evv, content } = msgInfoObj;
	let lang = "en";
	let message = "";

	// Check if there's text in args or quoted message
	if (args.length > 0 && args[0] !== "hin") {
		message = evv; // Use the full text after command
	} else if (msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo?.quotedMessage) {
		message =
			msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation ||
			msg.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text ||
			"";
	} else if (evv) {
		message = evv;
	}

	// Handle Hindi language option
	if (args[0] === "hin") {
		lang = "hi";
		if (evv && evv.includes("hin")) {
			message = evv.split("hin")[1].trim();
		} else {
			// If "hin" is specified but no text follows, check quoted message
			if (msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo?.quotedMessage) {
				message =
					msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation ||
					msg.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text ||
					"";
			}
		}
	}

	// Validate message
	if (!message || message.trim() === "") {
		return sendMessageWTyping(
			from,
			{
				text: `❌ Text is empty! \n\nUsage:\n• ${prefix}say <text>\n• ${prefix}say hin <hindi text>\n• Reply to a message with ${prefix}say`,
			},
			{ quoted: msg }
		);
	}

	// Check message length
	if (message.length >= 200) {
		return sendMessageWTyping(
			from,
			{ text: `❌ Text too long! Limit: ${message.length}/200 characters\nSend ${prefix}say <shorter text>` },
			{ quoted: msg }
		);
	}

	try {
		const sarvamKey = process.env.SARVAM_API_KEY;
		let rawBuffer;

		if (sarvamKey) {
			try {
				// Try Sarvam AI first for premium quality
				const sarvamResponse = await axios.post(
					"https://api.sarvam.ai/text-to-speech",
					{
						inputs: [message],
						target_language_code: lang === "hi" ? "hi-IN" : "en-IN",
						speaker: "meera",
						pitch: 0,
						pace: 1.1,
						loudness: 1.5,
						speech_sample_rate: 22050,
					},
					{
						headers: {
							"api-subscription-key": sarvamKey,
							"Content-Type": "application/json",
						},
						timeout: 10000,
					}
				);

				if (sarvamResponse.data?.audios?.[0]) {
					rawBuffer = Buffer.from(sarvamResponse.data.audios[0], "base64");
				}
			} catch (sErr) {
				console.error("Sarvam AI failed, falling back to Google:", sErr.message);
			}
		}

		// Fallback to Google Translate TTS
		if (!rawBuffer) {
			const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(message)}&tl=${lang}&client=tw-ob`;
			const response = await axios.get(url, {
				responseType: "arraybuffer",
				timeout: 10000,
				headers: {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
					"Referer": "https://translate.google.com/",
				},
			});
			rawBuffer = Buffer.from(response.data);
		}

		if (!rawBuffer || rawBuffer.length < 100) {
			return sendMessageWTyping(
				from,
				{ text: `❌ Failed to generate audio. The TTS service returned empty data.` },
				{ quoted: msg }
			);
		}

		// Convert to OGG/Opus — the ONLY format WhatsApp accepts for voice notes
		const opusBuffer = await convertToOpus(rawBuffer);

		await sock.sendMessage(
			from,
			{
				audio: opusBuffer,
				mimetype: "audio/ogg; codecs=opus",
				ptt: true,
			},
			{ quoted: msg }
		);
	} catch (error) {
		console.error("TTS Error:", error);
		return sendMessageWTyping(
			from,
			{ text: `❌ Error generating voice: ${error.message}` },
			{ quoted: msg }
		);
	}
};

export default () => ({
	cmd: ["say", "tts"],
	desc: "Convert text to speech (supports English and Hindi)",
	usage: "say <text> | say hin <hindi text> | Reply to message with say",
	handler,
});
