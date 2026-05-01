const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command } = msgInfoObj;

	if (args.length < 2) {
		return sendMessageWTyping(
			from,
			{ text: `Bhai format galat hai!\n\nExample: \`${prefix}${command} 10m Chai peeni hai\`` },
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
		return sendMessageWTyping(from, { text: "Bhai time sahi se bata! (30s, 10m, 2h) 🙏" });
	}

	// Limit reminder to 24 hours
	if (ms > 24 * 60 * 60 * 1000) {
		return sendMessageWTyping(from, { text: "Bhai max 24 hours ka reminder set kar sakte ho! 🙏" });
	}

	await sendMessageWTyping(from, { text: `Done bhai! ${timeStr} baad yaad dila dunga. 👍` }, { quoted: msg });

	setTimeout(async () => {
		try {
			await sock.sendMessage(from, { text: `⏰ *Yaad dilaya bhai:* ${task}` }, { quoted: msg });
		} catch (e) {
			console.error("Reminder Error:", e);
		}
	}, ms);
};

export default () => ({
	cmd: ["remind", "reminder"],
	desc: "Set a reminder",
	usage: "remind 10m Chai peeni hai",
	handler,
});
