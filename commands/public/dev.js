const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping } = msgInfoObj;
	try {
		const response =
`👨‍💻 *Developer Profile* 👨‍💻

Hi there! I was created by my amazing dad:
👑 *Soumya Chakraborty* 👑

✨ Lead Engineer & Creator of DownloadBuddy ✨

📬 *Let's Connect!* 📬
  🌐 *GitHub:*
    https://github.com/soumyachk101
  
  💬 *Direct WhatsApp:*
    https://wa.me/qr/PAVVG4QPZUJXF1
  
  ☕ *Support My Work:*
    https://buymeacoffee.com/soumyachk101

💖 Made with love and lots of code!
⚡ *DownloadBuddy Engine v2.0*`;

		return sendMessageWTyping(from, { text: response }, { quoted: msg });
	} catch (err) {
		console.error("Dev command error:", err);
		return sendMessageWTyping(from, { text: `🥺 Oopsie! Error: ${err.message}` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["dev", "developer"],
	desc: "Show developer information",
	usage: "dev",
	handler,
});
