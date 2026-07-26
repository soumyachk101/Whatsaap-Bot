const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command } = msgInfoObj;

	if (args.length < 2) {
		return sendMessageWTyping(
			from,
			{ text: `❌ Invalid format!\n\nExample: \`${prefix}${command} 10m Take a break\`` },
			{ quoted: msg }
		);
	}

	const timeStr = args[0];
	const task = args.slice(1).join(" ");
	
	let ms = 0;
	const match = timeStr.match(/^(\d+)([smh])$/);
	
	if (match) {
		const val = parseInt(match[1]);
		const unit = match[2];
		if (unit === 's') ms = val * 1000;
		else if (unit === 'm') ms = val * 60 * 1000;
		else if (unit === 'h') ms = val * 60 * 60 * 1000;
	} else {
		// Try parsing as raw seconds
		ms = parseInt(timeStr) * 1000;
	}

	if (isNaN(ms) || ms <= 0) {
		return sendMessageWTyping(from, { text: "❌ Invalid time format! Use units like 30s, 10m, or 2h." });
	}

	// Limit reminder to 24 hours
	if (ms > 24 * 60 * 60 * 1000) {
		return sendMessageWTyping(from, { text: "❌ Maximum reminder limit is 24 hours." });
	}

	await sendMessageWTyping(from, { text: `✅ Reminder set! I will remind you in ${timeStr}. 👍` }, { quoted: msg });

	setTimeout(async () => {
		try {
			await sock.sendMessage(from, { text: `⏰ *Reminder:* ${task}` }, { quoted: msg });
		} catch (e) {
			console.error("Reminder Error:", e);
		}
	}, ms);
};

export default () => ({
	cmd: ["remind", "reminder"],
	desc: "Set a timer reminder",
	usage: "remind 10m Take a break",
	handler,
});
