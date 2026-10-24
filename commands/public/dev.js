const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping } = msgInfoObj;
	try {
		const response = [
			`╭━━『 *Developer Info* 』━━╮`,
			``,
			`┏━━━━━━━━━━━━━━━━━`,
			`┃ *Owner:*  Soumya Chakraborty`,
			`┃ *Handle:*  @soumyachk101`,
			`┗━━━━━━━━━━━━━━━━━`,
			``,
			`┏━━━━━━━━━━━━━━━━━`,
			`┃ *WhatsApp:*  wa.me/qr/PAVVG4QPZUJXF1?s=v`,
			`┗━━━━━━━━━━━━━━━━━`,
			``,
			`┏━━━━━━━━━━━━━━━━━`,
			`┃ *GitHub:*  github.com/soumyachk101`,
			`┗━━━━━━━━━━━━━━━━━`,
			``,
			`┏━━━━━━━━━━━━━━━━━`,
			`┃ *Support:*  buymeacoffee.com/soumyachk101`,
			`┗━━━━━━━━━━━━━━━━━`,
			``,
			`╰━━━━━━━━━━━━━━━━━`,
			``,
			`DownloadBuddy Bot Engine · v2.2.0`,
		].join("\n");

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
