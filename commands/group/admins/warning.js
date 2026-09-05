import { getGroupData, createGroupData, group } from "../../../sqlite-DB/groupDataDb.js";
import { createMembersData, getMemberData, member } from "../../../sqlite-DB/membersDataDb.js";
import { extractPhoneNumber } from "../../../functions/lidUtils.js";
import {
 warningMsg,
 kickMsg,
 successMsg,
 warningsCleared,
 processError,
 botNotAdmin,
 premiumBox,
} from "../../../functions/messageFormatter.js";

import { config } from "dotenv";
config();
const myNums = process.env.MY_NUMBER ? process.env.MY_NUMBER.split(",").map(n => n.trim()).filter(Boolean) : [];
const myNumber = [
 ...myNums.map(n => n + "@s.whatsapp.net"),
 ...myNums.map(n => n + "@lid"),
];

/**
 * Read current warning count for a member from both DB sources.
 * Returns the higher of the two (group memberWarnCount vs member warning[]).
 */
const readWarnCount = async (groupJid, memberJid) => {
 let groupWarn = 0;
 let memberWarn = 0;

 const gData = await getGroupData(groupJid);
 if (gData?.memberWarnCount?.length) {
 const gEntry = gData.memberWarnCount.find(e => e.member === memberJid);
 if (gEntry) groupWarn = gEntry.count || 0;
 }

 const mData = await getMemberData(memberJid);
 if (mData?.warning?.length) {
 const mEntry = mData.warning.find(e => e.group === groupJid);
 if (mEntry) memberWarn = mEntry.count || 0;
 }

 return Math.max(groupWarn, memberWarn);
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
 let { command, groupAdmins, sendMessageWTyping, botNumber } = msgInfoObj;

 try {
 if (!msg.message.extendedTextMessage) {
 return sendMessageWTyping(from, { text: "❌ Tag someone! or reply to a message" }, { quoted: msg });
 }

 let taggedJid =
 msg.message.extendedTextMessage.contextInfo.participant ||
 msg.message.extendedTextMessage.contextInfo.mentionedJid[0];

 const phoneNumber = extractPhoneNumber(taggedJid);

 // ── Guards ────────────────────────────────────────────────
 if (command !== "unwarn") {
 if (taggedJid === botNumber[0] || taggedJid === botNumber[1]) {
 return sendMessageWTyping(from, { text: "_How can I warn myself?_" }, { quoted: msg });
 }
 if (myNumber.includes(taggedJid)) {
 return sendMessageWTyping(from, { text: "_Owner or moderator cannot be warned._" }, { quoted: msg });
 }
 }

 // ── Ensure DB structures exist ────────────────────────────
 const groupData = await getGroupData(from);
 if (!groupData?.memberWarnCount || !Array.isArray(groupData.memberWarnCount)) {
 await group.updateOne({ _id: from }, { $set: { memberWarnCount: [] } });
 }

 const memberData = await getMemberData(taggedJid);
 if (memberData && (!memberData.warning || !Array.isArray(memberData.warning))) {
 await member.updateOne({ _id: taggedJid }, { $set: { warning: [] } });
 }

 // ── #warncount ────────────────────────────────────────────
 if (command === "warncount") {
 const currentCount = await readWarnCount(from, taggedJid);

 const countBox = currentCount === 0
 ? premiumBox(
 [`⚠️ *No Warnings*`, `@${phoneNumber}`, "", "_This user has a clean record._"],
 "WARN COUNT", "✅"
 )
 : premiumBox(
 [`⚠️ *Warnings for* @${phoneNumber}`, "",
 `🔴 Count: \`${currentCount}/3\``, "",
 currentCount >= 3 ? "_⛔ Next strike = removal._" : "_Be careful!_"],
 "WARN COUNT", "⚠️"
 );

 return sendMessageWTyping(from, { text: countBox, mentions: [taggedJid] }, { quoted: msg });
 }

 // ── #warn ─────────────────────────────────────────────────
 if (command === "warn") {
 // Read current count from both DBs, take max
 const currentCount = await readWarnCount(from, taggedJid);
 const newWarnCount = currentCount + 1;

 // Increment in group DB
 const groupResult = await group.updateOne(
 { _id: from, "memberWarnCount.member": taggedJid },
 { $inc: { "memberWarnCount.$.count": 1 } }
 );
 if (groupResult.matchedCount === 0) {
 await group.updateOne(
 { _id: from },
 { $push: { memberWarnCount: { member: taggedJid, count: newWarnCount } } }
 );
 }

 // Increment in member DB
 const memberResult = await member.updateOne(
 { _id: taggedJid, "warning.group": from },
 { $inc: { "warning.$.count": 1 } }
 );
 if (memberResult.matchedCount === 0) {
 await member.updateOne(
 { _id: taggedJid },
 { $push: { warning: { group: from, count: newWarnCount } } }
 );
 }

 // Send formatted warning message
 const warnText = warningMsg(phoneNumber, newWarnCount, 3);
 await sendMessageWTyping(from, { text: warnText, mentions: [taggedJid] }, { quoted: msg });

 // Auto-kick on 3rd warning
 if (newWarnCount >= 3) {
 const isGroupAdmin = groupAdmins.includes(taggedJid);
 const isBotAdmin = groupAdmins.includes(botNumber[0]) || groupAdmins.includes(botNumber[1]);

 if (!isBotAdmin) {
 await sendMessageWTyping(from, { text: botNotAdmin() }, { quoted: msg });
 } else if (isGroupAdmin) {
 await sendMessageWTyping(from, { text: "❌ Cannot remove an admin!" }, { quoted: msg });
 } else {
 try {
 await sock.groupParticipantsUpdate(from, [taggedJid], "remove");

 // Clear warnings after successful kick
 await group.updateOne(
 { _id: from },
 { $pull: { memberWarnCount: { member: taggedJid } } }
 );
 await member.updateOne(
 { _id: taggedJid },
 { $pull: { warning: { group: from } } }
 );

 const kickText = premiumBox(
 [`🔨 *Kicked* @${phoneNumber}`, "", "_Reached 3 warnings._"],
 "REMOVED", "🔨"
 );
 await sendMessageWTyping(from, { text: kickText, mentions: [taggedJid] }, { quoted: msg });
 } catch (kickErr) {
 const kickErrText = premiumBox(
 [`⚠️ *Kick Failed*`, `@${phoneNumber}`, "", `_${kickErr.message}_`],
 "ERROR", "❌"
 );
 await sendMessageWTyping(from, { text: kickErrText, mentions: [taggedJid] }, { quoted: msg });
 }
 }
 }
 return;
 }

 // ── #unwarn ───────────────────────────────────────────────
 if (command === "unwarn") {
 // Clear from group DB
 await group.updateOne(
 { _id: from },
 { $pull: { memberWarnCount: { member: taggedJid } } }
 );
 // Clear from member DB
 await member.updateOne(
 { _id: taggedJid },
 { $pull: { warning: { group: from } } }
 );

 const clearedText = warningsCleared(phoneNumber);
 await sendMessageWTyping(from, { text: clearedText, mentions: [taggedJid] }, { quoted: msg });
 return;
 }

 } catch (err) {
 const errorText = processError(err.message || err.toString());
 sendMessageWTyping(from, { text: errorText }, { quoted: msg });
 }
};

export default () => ({
 cmd: ["warn", "unwarn", "warncount"],
 desc: "Warn a member",
 usage: "warn @mention | unwarn @mention | warncount @mention | reply",
 handler,
});
