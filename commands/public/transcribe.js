import axios from "axios";
import FormData from "form-data";
import { downloadContentFromMessage } from "baileys";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command } = msgInfoObj;

	const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
	const audioMsg =
		quoted?.audioMessage ||
		quoted?.pttMessage ||
		(msg.message?.audioMessage) ||
		(msg.message?.pttMessage);

	if (!audioMsg) {
		return sendMessageWTyping(
			from,
			{
				text:
					`🎙️ *Voice Transcriber*\n\n` +
					`Convert any voice note or audio to text.\n` +
					`_Powered by Groq Whisper (free tier available)_\n\n` +
					`Usage: Reply to a voice note with \`${prefix}${command}\`\n\n` +
					`Setup: Add \`GROQ_API_KEY\` to your \`.env\` file.\n` +
					`Get a free key: https://console.groq.com`,
			},
			{ quoted: msg }
		);
	}

	const apiKey = process.env.GROQ_API_KEY;
	if (!apiKey) {
		return sendMessageWTyping(
			from,
			{
				text:
					`❌ *Transcription not configured*\n\n` +
					`The bot owner needs to add \`GROQ_API_KEY\` to their \`.env\` file.\n` +
					`Free key: https://console.groq.com`,
			},
			{ quoted: msg }
		);
	}

	try {
		// Download the audio
		const stream = await downloadContentFromMessage(audioMsg, "audio");
		let buffer = Buffer.from([]);
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk]);
		}

		if (buffer.length === 0) {
			return sendMessageWTyping(
				from,
				{ text: `❌ Could not download the audio.` },
				{ quoted: msg }
			);
		}

		// 25MB limit for Whisper
		if (buffer.length > 25 * 1024 * 1024) {
			return sendMessageWTyping(
				from,
				{ text: `❌ Audio too large (max 25MB).` },
				{ quoted: msg }
			);
		}

		await sendMessageWTyping(
			from,
			{ text: `🎙️ *Transcribing...* _(this may take a few seconds)_` },
			{ quoted: msg }
		);

		// Send to Groq Whisper
		const form = new FormData();
		form.append("file", buffer, {
							filename: "audio.ogg",
							contentType: audioMsg.mimetype || "audio/ogg",
						});
		form.append("model", "whisper-large-v3-turbo");
		form.append("response_format", "verbose_json");

		const res = await axios.post(
			"https://api.groq.com/openai/v1/audio/transcriptions",
			form,
			{
				headers: {
					...form.getHeaders(),
					Authorization: `Bearer ${apiKey}`,
				},
				timeout: 60000,
			}
		);

		const text = res.data?.text?.trim();
		const lang = res.data?.language || "auto";

		if (!text) {
			return sendMessageWTyping(
				from,
				{ text: `❌ No speech detected in the audio.` },
				{ quoted: msg }
			);
		}

		const reply =
			`🎙️ *Transcription*\n` +
			`🌐 *Language:* ${lang.toUpperCase()}\n` +
			`📝 *Length:* ${text.length} chars\n` +
			`━━━━━━━━━━━━━━\n\n` +
			`${text}`;

		await sendMessageWTyping(from, { text: reply }, { quoted: msg });
	} catch (err) {
		console.error("transcribe error:", err.response?.data || err.message);
		const msg =
			err.response?.status === 401
				? "❌ Invalid GROQ_API_KEY. Bot owner needs to fix this."
				: err.response?.status === 429
				? "❌ Rate limit hit. Try again in a minute."
				: "❌ Transcription failed. Please try again.";
		sendMessageWTyping(from, { text: msg }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["transcribe", "tr2", "voice2text", "vtt"],
	desc: "Transcribe a voice note to text (reply to audio)",
	usage: "transcribe (reply to voice note)",
	handler,
});
