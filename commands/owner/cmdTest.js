import { getGroupData, createGroupData, group } from "../../sqlite-DB/groupDataDb.js";
import { getMemberData, createMembersData, member } from "../../sqlite-DB/membersDataDb.js";
import axios from "axios";
import fs from "fs";

/**
 * ⚠️ WARNING: This command uses eval() which is extremely dangerous.
 * It is strictly restricted to the primary owner of the bot.
 * Do NOT use this command unless you know exactly what you are doing.
 */
const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, evv, senderJid } = msgInfoObj;

	// Strictly restrict to the primary owner only (the first number in MY_NUMBER)
	const primaryOwner = process.env.MY_NUMBER.split(",")[0] + "@s.whatsapp.net";
	if (senderJid !== primaryOwner) {
		return sendMessageWTyping(from, { text: "❌ This dangerous command is restricted to the primary owner only." }, { quoted: msg });
	}

	let taggedJid;
	if (msg.message.extendedTextMessage) {
		taggedJid = msg.message.extendedTextMessage
			? msg.message.extendedTextMessage.contextInfo.participant
			: msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
	}

	if (args.length === 0) {
		return sendMessageWTyping(from, { text: `❌ empty query!` }, { quoted: msg });
	}
	try {
		// Use a local scope to provide some context but eval is still dangerous
		let resultTest = eval(evv);
		if (typeof resultTest === "object")
			sendMessageWTyping(from, { text: JSON.stringify(resultTest, null, 2) }, { quoted: msg });
		else sendMessageWTyping(from, { text: String(resultTest) }, { quoted: msg });
	} catch (err) {
		sendMessageWTyping(from, { text: "❌ Error: " + err.toString() }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["test", "code"],
	desc: "Test your code (Owner Only - Dangerous)",
	usage: "test | code",
	handler,
});
