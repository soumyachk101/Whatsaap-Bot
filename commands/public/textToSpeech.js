import axios from "axios";

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
		let buffer;

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
						speech_sample_rate: 8000,
					},
					{
						headers: {
							"api-subscription-key": sarvamKey,
							"Content-Type": "application/json",
						},
					}
				);

				if (sarvamResponse.data && sarvamResponse.data.audios && sarvamResponse.data.audios[0]) {
					buffer = Buffer.from(sarvamResponse.data.audios[0], "base64");
				}
			} catch (sErr) {
				console.error("Sarvam AI failed, falling back to Google:", sErr.message);
			}
		}

		// Fallback to Google Translate if Sarvam is not available or fails
		if (!buffer) {
			const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(message)}&tl=${lang}&client=tw-ob`;
			const response = await axios.get(url, {
				responseType: "arraybuffer",
				headers: {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
				},
			});
			buffer = Buffer.from(response.data);
		}

		await sock.sendMessage(
			from,
			{
				audio: buffer,
				mimetype: "audio/mp4", // Most compatible for WhatsApp voice notes
				ptt: true,
				fileName: "voice.mp4",
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
