import axios from "axios";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command } = msgInfoObj;

	const prompt = args.join(" ").trim();

	if (!prompt) {
		return sendMessageWTyping(
			from,
			{
				text:
					`🎨 *AI Image Generator*\n\n` +
					`Generate free AI images from any text prompt.\n` +
					`_Powered by Pollinations.ai (no API key needed)_\n\n` +
					`Usage: \`${prefix}${command} <prompt>\`\n\n` +
					`Examples:\n` +
					`• \`${prefix}imagine a cute robot holding a flower, digital art\`\n` +
					`• \`${prefix}imagine cyberpunk city at night, neon lights, 4k\`\n` +
					`• \`${prefix}imagine cat astronaut floating in space, oil painting\``,
			},
			{ quoted: msg }
		);
	}

	if (prompt.length > 500) {
		return sendMessageWTyping(
			from,
			{ text: `❌ Prompt too long (max 500 chars). Yours: ${prompt.length}` },
			{ quoted: msg }
		);
	}

	// Send "generating" status
	await sendMessageWTyping(
		from,
		{
			text:
				`🎨 *Generating image...*\n\n` +
				`📝 Prompt: _${prompt}_\n` +
				`⏳ This usually takes 5-15 seconds...`,
		},
		{ quoted: msg }
	);

	try {
		// Pollinations.ai - free, no API key, fast
		const seed = Math.floor(Math.random() * 1000000);
		const encodedPrompt = encodeURIComponent(prompt);
		const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`;

		const response = await axios.get(imageUrl, {
			responseType: "arraybuffer",
			timeout: 90000, // 90s for slow generations
			maxContentLength: 15 * 1024 * 1024, // 15MB
		});

		const buffer = Buffer.from(response.data);

		const caption =
			`🎨 *AI Generated Image*\n\n` +
			`📝 Prompt: _${prompt}_\n` +
			`🎲 Seed: \`${seed}\`\n` +
			`🤖 Model: Flux\n\n` +
			`_Reply with \`${prefix}imagine ${prompt}\` for a different variant._`;

		await sendMessageWTyping(
			from,
			{ image: buffer, caption },
			{ quoted: msg }
		);
	} catch (err) {
		console.error("imagine error:", err.message);
		const reason =
			err.code === "ECONNABORTED"
				? "⏳ Generation timed out (server busy). Try again!"
				: err.response?.status === 502 || err.response?.status === 503
				? "🚦 Pollinations.ai is busy. Please retry in a moment."
				: err.message;
		sendMessageWTyping(
			from,
			{ text: `❌ Failed to generate image.\n${reason}` },
			{ quoted: msg }
		);
	}
};

export default () => ({
	cmd: ["imagine", "dream"],
	desc: "Generate AI art from a text prompt (free, no key)",
	usage: "imagine <prompt>",
	handler,
});
