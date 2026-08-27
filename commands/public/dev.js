import { devCard } from "../../functions/messageFormatter.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping } = msgInfoObj;
	try {
		const response = devCard(
			"Soumya Chakraborty",
			"@soumyachk101",
			"https://github.com/soumyachk101",
			[
				"Support → https://buymeacoffee.com/soumyachk101",
				"",
				"*DownloadBuddy Bot Engine*",
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
