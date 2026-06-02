import { config } from "dotenv";
config();
const myNums = process.env.MY_NUMBER.split(",").map(n => n.trim()).filter(Boolean);
const myNumbers = [
	...myNums.map(n => n + "@s.whatsapp.net"),
	...myNums.map(n => n + "@lid"),
];

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { groupAdmins, sendMessageWTyping, groupMetadata, botNumber } = msgInfoObj;
	// return sendMessageWTyping(
	//     from,
	//     { text: "```❌ The admin commands are blocked for sometime to avoid ban on whatsapp!```" },
	//     { quoted: msg }
	// );

	if (!groupAdmins.includes(botNumber[0]) && !groupAdmins.includes(botNumber[1])) {
		return sendMessageWTyping(from, { text: `❌ I'm not admin here` }, { quoted: msg });
	}

	if (!msg.message.extendedTextMessage) {
		return sendMessageWTyping(from, { text: `*Mention or tag member.*` }, { quoted: msg });
	}

	const taggedJid =
		msg.message.extendedTextMessage.contextInfo.participant ||
		msg.message.extendedTextMessage.contextInfo.mentionedJid[0];

	if (taggedJid === groupMetadata.owner || myNumbers.includes(taggedJid) || groupAdmins.includes(taggedJid)) {
		return sendMessageWTyping(from, { text: `❌ *Can't remove Bot/Owner/admin*` }, { quoted: msg });
	}

	try {
		await sock.groupParticipantsUpdate(from, [taggedJid], "remove");
		sendMessageWTyping(from, { text: `✅ *Removed*` }, { quoted: msg });
	} catch (err) {
		console.error("Remove error:", err);
		sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["remove", "kick", "ban"],
	desc: "Remove a member from group.",
	usage: "remove @mention | reply",
	handler,
});
