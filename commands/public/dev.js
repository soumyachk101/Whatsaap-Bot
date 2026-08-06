const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping } = msgInfoObj;
	try {
		const response =
			`*👨‍💻 Developer — Soumya Chakraborty*\n\n` +
			`╭───────────────────────────\n` +
			`│ *🔗 GitHub*\n` +
			`│ github.com/soumyachk101\n` +
			`│\n` +
			`│ *💬 WhatsApp*\n` +
			`│ https://wa.me/qr/PAVVG4QPZUJXF1\n` +
			`│\n` +
			`│ *☕ Support My Work*\n` +
			`│ buymeacoffee.com/soumyachk101\n` +
			`╰───────────────────────────`;

		return sendMessageWTyping(from, { text: response }, { quoted: msg });
	} catch (err) {
		console.error("Dev command error:", err);
		return sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["dev", "developer"],
	desc: "Show developer information",
	usage: "dev",
	handler,
});
