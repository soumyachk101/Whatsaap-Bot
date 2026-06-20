const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command } = msgInfoObj;

	let body = args.join(" ").trim();

	// Fall back to quoted message
	if (!body) {
		const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
		body = quoted?.conversation || quoted?.extendedTextMessage?.text || "";
	}

	if (!body) {
		return sendMessageWTyping(
			from,
			{
				text:
					`📊 *Poll Creator*\n\n` +
					`Create a poll using WhatsApp's native poll feature.\n\n` +
					`Format:\n` +
					`\`${prefix}${command} Question | Option1 | Option2 | Option3\`\n\n` +
					`Examples:\n` +
					`• \`${prefix}poll Best food? | Pizza | Burger | Sushi\`\n` +
					`• \`${prefix}poll Movie night? | Friday | Saturday | Sunday\`\n` +
					`• \`${prefix}poll Favorite color? | Red | Blue | Green | Yellow\``,
			},
			{ quoted: msg }
		);
	}

	// Split by "|" or "|" (full-width bar) — common alternatives
	const parts = body
		.split(/\s*\|\s*|\s*｜\s*/)
		.map((s) => s.trim())
		.filter(Boolean);

	if (parts.length < 3) {
		return sendMessageWTyping(
			from,
			{
				text:
					`❌ Need at least 1 question and 2 options.\n\n` +
					`Format: \`${prefix}${command} Question | Option1 | Option2\`\n\n` +
					`You provided ${parts.length} part(s).`,
			},
			{ quoted: msg }
		);
	}

	const question = parts[0];
	const options = parts.slice(1);

	if (options.length > 12) {
		return sendMessageWTyping(
			from,
			{ text: `❌ WhatsApp allows max 12 options. You provided ${options.length}.` },
			{ quoted: msg }
		);
	}

	if (question.length > 100) {
		return sendMessageWTyping(
			from,
			{ text: `❌ Question too long (max 100 chars). Yours: ${question.length}` },
			{ quoted: msg }
		);
	}

	try {
		await sock.sendMessage(from, {
			poll: {
				name: question,
				values: options,
				selectableCount: 1, // Single-select; Baileys defaults to 1 for new polls
			},
		});
		// Optional: confirm with a tiny text (can be skipped for cleaner UX)
		// await sendMessageWTyping(from, { text: `✅ Poll created!` }, { quoted: msg });
	} catch (err) {
		console.error("poll error:", err);
		sendMessageWTyping(
			from,
			{ text: `❌ Failed to create poll: ${err.message}` },
			{ quoted: msg }
		);
	}
};

export default () => ({
	cmd: ["poll", "vote"],
	desc: "Create a WhatsApp native poll (use | to separate options)",
	usage: "poll Question | Opt1 | Opt2 | Opt3",
	handler,
});
