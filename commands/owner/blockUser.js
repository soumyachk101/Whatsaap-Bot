import dotenv from "dotenv";
dotenv.config();
const myNumbers = process.env.MY_NUMBER.split(",").map(n => n.trim()).filter(Boolean);
const myNumber = [
	...myNumbers.map(n => n + "@s.whatsapp.net"),
	...myNumbers.map(n => n + "@lid"),
];
import { member } from "../../sqlite-DB/membersDataDb.js";
import { extractPhoneNumber, normalizeJID } from "../../functions/lidUtils.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { command, botNumber, sendMessageWTyping } = msgInfoObj;

	if (!msg.message.extendedTextMessage)
		return sendMessageWTyping(from, { text: "❌ Tag / mentioned!" }, { quoted: msg });

	let taggedJid = msg.message.extendedTextMessage.contextInfo.participant
		|| msg.message.extendedTextMessage.contextInfo.mentionedJid?.[0];

	if (!taggedJid)
		return sendMessageWTyping(from, { text: "❌ Could not identify the user." }, { quoted: msg });

	const targetNumber = extractPhoneNumber(taggedJid);

	if (
		targetNumber == extractPhoneNumber(botNumber[0]) ||
		targetNumber == extractPhoneNumber(botNumber[1]) ||
		myNumber.map((m) => extractPhoneNumber(m)).includes(targetNumber)
	)
		return sendMessageWTyping(from, { text: `_Command Can't be used on Bot / Mod / Owner_.💀` }, { quoted: msg });

	if (command == "block") {
		const dbJid = targetNumber + "@lid";
		member.updateOne({ _id: dbJid }, { $set: { isBlock: true } }).then(() => {
			sendMessageWTyping(from, { text: `❌ Blocked` }, { quoted: msg });
		}).catch((err) => {
			sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
		});
	}

	if (command == "unblock") {
		const dbJid = targetNumber + "@lid";
		member.updateOne({ _id: dbJid }, { $set: { isBlock: false } }).then(() => {
			sendMessageWTyping(from, { text: `✅ *Unblocked*` }, { quoted: msg });
		}).catch((err) => {
			sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
		});
	}
};

export default () => ({
	cmd: ["block", "unblock"],
	desc: "Block / Unblock a user",
	usage: "block | unblock | tag / mention the user | reply to a message to block / unblock",
	handler,
});
