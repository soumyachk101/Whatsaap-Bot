import { botStatusMessages } from "../../../functions/messageFormatter.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { isGroupAdmin, isOwner, sendMessageWTyping, groupMetadata } = msgInfoObj;

	if (!isGroupAdmin && !isOwner) {
		return sendMessageWTyping(from, { text: "🚫 *Access Denied!*\n_This command is for Admins only._" }, { quoted: msg });
	}

	if (!args[0]) {
		return sendMessageWTyping(from, { text: "❌ *Provide on/off*\nUsage: #bot on/off" }, { quoted: msg });
	}

	const { group } = await import("../../../sqlite-DB/groupDataDb.js");
	const status = args[0].toLowerCase();
	const grpName = groupMetadata?.subject || "this group";

	if (status === "on") {
		try {
			await group.updateOne({ _id: from }, { $set: { isBotOn: true } });
			const text = botStatusMessages.activated(grpName);
			await sock.sendMessage(from, { text }, { quoted: msg });
			await sock.sendMessage(from, { react: { text: "🟢", key: msg.key } }).catch(() => {});
		} catch (err) {
			return sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
		}
	} else if (status === "off") {
		try {
			await group.updateOne({ _id: from }, { $set: { isBotOn: false } });
			const text = botStatusMessages.deactivated(grpName);
			await sock.sendMessage(from, { text }, { quoted: msg });
			await sock.sendMessage(from, { react: { text: "🔴", key: msg.key } }).catch(() => {});
		} catch (err) {
			return sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
		}
	} else {
		return sendMessageWTyping(from, { text: "❌ *Invalid status.*\nUse \`#bot on\` or \`#bot off\`." }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["bot"],
	desc: "Activate or deactivate the bot in the group.",
	usage: "bot on/off",
	handler,
});
