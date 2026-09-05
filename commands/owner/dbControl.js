import { getGroupData, group } from "../../sqlite-DB/groupDataDb.js";
import { getMemberData, member } from "../../sqlite-DB/membersDataDb.js";
import { getBotData, bot } from "../../sqlite-DB/botDataDb.js";
import { extractPhoneNumber } from "../../functions/lidUtils.js";

const updateData = async (collection, id, data, value, sendMessageWTyping, from, msg) => {
	if (value === undefined) {
		return sendMessageWTyping(from, { text: "❌ Provide format: <field>:<value>" }, { quoted: msg });
	}
	if (typeof value === "string") {
		if (/^[0-9]+$/.test(value)) value = Number(value);
		else if (value === "true") value = true;
		else if (value === "false") value = false;
	}
	await collection.updateOne({ _id: id }, { $set: { [data]: value } });
	sendMessageWTyping(from, { text: "Command Executed" }, { quoted: msg });
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, command } = msgInfoObj;
	try {
		let data, value, id, collection, getDataFunc;

		switch (command) {
			case "group":
				collection = group;
				getDataFunc = getGroupData;
				id = from;
				break;
			case "member":
				if (!msg.message?.extendedTextMessage?.contextInfo?.participant) {
					return sendMessageWTyping(from, { text: "*Reply On User's Message.*" }, { quoted: msg });
				}
				collection = member;
				getDataFunc = getMemberData;
				const rawParticipant = msg.message.extendedTextMessage.contextInfo.participant;
				const phoneNum = extractPhoneNumber(rawParticipant);
				id = phoneNum ? `${phoneNum}@s.whatsapp.net` : rawParticipant;
				break;
			case "bot":
				collection = bot;
				getDataFunc = getBotData;
				id = "bot";
				break;
			default:
				return;
		}

		if (!args[0]) {
			const data = await getDataFunc(id);
			sendMessageWTyping(from, { text: JSON.stringify(data, null, 2, 100) }, { quoted: msg });
		} else {
			[data, value] = args[0].split(":");
			await updateData(collection, id, data, value, sendMessageWTyping, from, msg);
		}
	} catch (err) {
		console.error("dbControl error:", err);
		sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["group", "member", "bot"],
	desc: "Control Database",
	usage: "group | member | bot",
	handler,
});
