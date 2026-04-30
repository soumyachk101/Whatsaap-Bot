import { group } from "../../sqlite-DB/groupDataDb.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, isGroup } = msgInfoObj;

	if (!isGroup) {
		return sendMessageWTyping(from, { text: "```This command is only for groups!```" }, { quoted: msg });
	}

	try {
		// Clear the chat history for this group
		await group.updateOne({ _id: from }, { $set: { chatHistory: [] } });

		return sendMessageWTyping(
			from,
			{ text: "✅ DownloadWorld's conversation history has been cleared for this group!" },
			{ quoted: msg }
		);
	} catch (err) {
		console.error(err);
		return sendMessageWTyping(from, { text: "❌ Failed to clear history. Please try again." }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["clearhistory", "cleardownloadworld", "resetdownloadworld", "forgetdownloadworld"],
	desc: "Clear DownloadWorld's conversation history for this group",
	usage: "clearhistory",
	handler,
});
