import { group } from "../../../sqlite-DB/groupDataDb.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { isGroupAdmin, isOwner, sendMessageWTyping } = msgInfoObj;

	if (!isGroupAdmin && !isOwner) {
		return sendMessageWTyping(from, { text: "❌ *This command is for Admins only.*" }, { quoted: msg });
	}

	if (!args[0]) {
		return sendMessageWTyping(from, { text: "❌ *Provide on/off*\nUsage: .bot on/off" }, { quoted: msg });
	}

	const status = args[0].toLowerCase();

	if (status === "on") {
		await group.updateOne({ _id: from }, { $set: { isBotOn: true } });
		return sendMessageWTyping(from, { text: "✅ *Bot is now active in this group.*" }, { quoted: msg });
	} else if (status === "off") {
		await group.updateOne({ _id: from }, { $set: { isBotOn: false } });
		return sendMessageWTyping(from, { text: "✅ *Bot is now deactivated in this group.*" }, { quoted: msg });
	} else {
		return sendMessageWTyping(from, { text: "❌ *Invalid status. Use on or off.*" }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["bot"],
	desc: "Activate or deactivate the bot in the group.",
	usage: "bot on/off",
	handler,
});
