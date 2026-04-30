const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping } = msgInfoObj;

	const response =
		`*👨💻 Developer — Soumya Chakraborty*\n\n` +
		`╭───────────────────────────\n` +
		`│ *🔗 GitHub*\n` +
		`│ github.com/soumyachk101\n` +
		`│\n` +
		`│ *☕ Support My Work*\n` +
		`│ buymeacoffee.com/soumyachk101\n` +
		`│\n` +
		`│ *🌐 Portfolio*\n` +
		`│ chksoumya.in\n` +
		`╰───────────────────────────`;

	return sendMessageWTyping(from, { text: response }, { quoted: msg });
};

export default () => ({
	cmd: ["dev", "developer"],
	desc: "Show developer information",
	usage: "dev",
	handler,
});
