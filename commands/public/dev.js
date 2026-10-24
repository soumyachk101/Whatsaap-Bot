import { devCard } from "../../functions/messageFormatter.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping } = msgInfoObj;
	try {
		const response = devCard(
			"Soumya Chakraborty",
			"@soumyachk101",
			[
				"🔗 *Links:*",
				"  📦  github.com/soumyachk101",
				"  ☕  buymeacoffee.com/soumyachk101",
				"  💬  wa.me/qr/PAVVG4QPZUJXF1?s=v"
			]
		);

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
