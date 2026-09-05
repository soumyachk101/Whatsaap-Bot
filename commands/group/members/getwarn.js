import dotenv from "dotenv";
dotenv.config();
import { extractPhoneNumber, resolveMemberIdentity } from "../../../functions/lidUtils.js";
import { getGroupData } from "../../../sqlite-DB/groupDataDb.js";
import { getMemberData } from "../../../sqlite-DB/membersDataDb.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	let { senderJid, sendMessageWTyping, groupMetadata } = msgInfoObj;

	const contextInfo =
		msg.message?.extendedTextMessage?.contextInfo ||
		msg.message?.imageMessage?.contextInfo ||
		msg.message?.videoMessage?.contextInfo ||
		msg.message?.stickerMessage?.contextInfo ||
		msg.message?.documentMessage?.contextInfo;

	let taggedJid = senderJid;
	if (contextInfo?.participant) {
		taggedJid = contextInfo.participant;
	} else if (contextInfo?.mentionedJid && contextInfo.mentionedJid.length > 0) {
		taggedJid = contextInfo.mentionedJid[0];
	} else if (args[0]) {
		const cleanNum = args[0].replace(/[@\s+-]/g, "");
		if (/^\d{7,15}$/.test(cleanNum)) {
			taggedJid = `${cleanNum}@s.whatsapp.net`;
		}
	}

	const targetIdentity = resolveMemberIdentity(taggedJid, groupMetadata, sock);
	const targetMentions = targetIdentity.allJids.length > 0 ? targetIdentity.allJids : [taggedJid];
	const phoneNumber = targetIdentity.phoneNumber || extractPhoneNumber(taggedJid);

	const groupData = await getGroupData(from);
	let groupWarn = 0;
	if (groupData?.memberWarnCount?.length) {
		const found = groupData.memberWarnCount.find((element) => targetMentions.includes(element.member));
		if (found) groupWarn = found.count || 0;
	}

	let memberWarn = 0;
	for (const j of targetMentions) {
		const memberData = await getMemberData(j);
		if (memberData?.warning?.length) {
			const found = memberData.warning.find((element) => element.group == from);
			if (found && found.count > memberWarn) memberWarn = found.count;
		}
	}

	const warnCount = Math.max(groupWarn, memberWarn);
	const bars = "🔴".repeat(Math.min(warnCount, 3)) + "⚪".repeat(Math.max(0, 3 - warnCount));

	const warnMsg = [
		`╭━━『 *Warning Status* 』━━╮`,
		"",
		`👤 *User:* @${phoneNumber}`,
		"",
		"┏━━━━━━━━━━━━━━━━━",
		"┃ 📊 STRIKE RECORD",
		"┗━━━━━━━━━━━━━━━━━",
		`│ ➜ Strikes: ${bars} (${warnCount}/3)`,
		`│ ➜ Remaining: ${Math.max(0, 3 - warnCount)}`,
		`│ ➜ Status: ${warnCount === 0 ? "✅ Clean Record" : warnCount >= 3 ? "⛔ Strike Limit Exceeded" : "⚠️ Active Warning"}`,
		"╰━━━━━━━━━━━━━━━━━",
		"",
		`💡 ${warnCount === 0 ? "No warnings on record in this group!" : "3 warnings will result in an automatic removal."}`,
	].join("\n");

	await sendMessageWTyping(from, { text: warnMsg, mentions: targetMentions }, { quoted: msg });
};

export default () => ({
	cmd: ["getwarn"],
	desc: "Get warning status of a member",
	usage: "getwarn | reply to a message to get warning status of that member",
	handler,
});
