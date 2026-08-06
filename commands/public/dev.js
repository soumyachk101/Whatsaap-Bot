const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping } = msgInfoObj;
	try {
		const response =
`╭━━━━━━━━━━━━━━━━━━━━━━╮
┃   *DEVELOPER PROFILE*
┃   *Soumya Chakraborty*
╰━━━━━━━━━━━━━━━━━━━━━━╯

*Full-Stack Developer & Lead Engineer*

╭────── *CONTACT & LINKS* ──────
│  *GitHub:*
│  https://github.com/soumyachk101
│
│  *Direct WhatsApp:*
│  https://wa.me/qr/PAVVG4QPZUJXF1
│
│  *Support My Work:*
│  https://buymeacoffee.com/soumyachk101
╰────────────────────────────────

*DownloadBuddy Bot Engine v2.0*`;

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
