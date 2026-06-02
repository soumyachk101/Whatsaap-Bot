import { getGroupData, group } from "../../../sqlite-DB/groupDataDb.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { command, isGroup, sendMessageWTyping } = msgInfoObj;
	if (!isGroup) return sendMessageWTyping(from, { text: "Use In Group Only!" }, { quoted: msg });

	const resBlock = await getGroupData(from);
	if (!resBlock) return sendMessageWTyping(from, { text: "No data found in DB for this group" }, { quoted: msg });
	let blockCommandsInDB = resBlock.cmdBlocked;

	switch (command) {
		case "blockc":
			if (!args[0]) return sendMessageWTyping(from, { text: `Enter a command to block` }, { quoted: msg });
			if (blockCommandsInDB.includes(args[0])) {
				sendMessageWTyping(from, { text: "Command already blocked in this group" }, { quoted: msg });
			} else {
				try {
					await group.updateOne({ _id: from }, { $push: { cmdBlocked: { $each: args[0].split(",") } } });
					sendMessageWTyping(from, { text: "*Blocked* _" + args[0] + "_ *in this group*." }, { quoted: msg });
				} catch (err) {
					sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
				}
			}
			break;

		case "emptyc":
			try {
				await group.updateOne({ _id: from }, { $set: { cmdBlocked: [] } });
				sendMessageWTyping(from, { text: `*No commands blocked in this group*` }, { quoted: msg });
			} catch (err) {
				sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
			}
			break;

		case "getblockc":
			sendMessageWTyping(
				from,
				{ text: `*Commands Block in this Group are* : ${resBlock.cmdBlocked.toString()}` },
				{ quoted: msg }
			);
			break;

		case "removec":
			if (!args[0]) return sendMessageWTyping(from, { text: `Enter a command to unblock` }, { quoted: msg });
			try {
				await group.updateOne({ _id: from }, { $pullAll: { cmdBlocked: args[0].split(",") } });
				sendMessageWTyping(from, { text: "*UnBlocked* _" + args[0] + "_ *in this Group*." }, { quoted: msg });
			} catch (err) {
				sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
			}
			break;

		default:
			break;
	}
};

export default () => ({
	cmd: ["blockc", "emptyc", "getblockc", "removec"],
	desc: "block command for a group",
	usage: "blockc insta | insta,help",
	handler,
});
