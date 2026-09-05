import { getGroupData, group } from "../../../sqlite-DB/groupDataDb.js";
import { getMemberData, member } from "../../../sqlite-DB/membersDataDb.js";
import { extractPhoneNumber, resolveMemberIdentity } from "../../../functions/lidUtils.js";
import { config } from "dotenv";
config();

const myNums = process.env.MY_NUMBER ? process.env.MY_NUMBER.split(",").map((n) => n.trim()).filter(Boolean) : [];
const myNumber = [
	...myNums.map((n) => n + "@s.whatsapp.net"),
	...myNums.map((n) => n + "@lid"),
];

/**
 * Read current warning count for a member from both DB sources.
 * Checks all equivalent JIDs (LID, PN) so warnings stay consistent.
 */
const readWarnCount = async (groupJid, memberJid, allJids = []) => {
	let groupWarn = 0;
	let memberWarn = 0;
	const matchJids = [...new Set([memberJid, ...allJids].filter(Boolean))];

	const gData = await getGroupData(groupJid);
	if (gData?.memberWarnCount?.length) {
		const gEntry = gData.memberWarnCount.find((e) => matchJids.includes(e.member));
		if (gEntry) groupWarn = gEntry.count || 0;
	}

	for (const j of matchJids) {
		const mData = await getMemberData(j);
		if (mData?.warning?.length) {
			const mEntry = mData.warning.find((e) => e.group === groupJid);
			if (mEntry && mEntry.count > memberWarn) memberWarn = mEntry.count;
		}
	}

	return Math.max(groupWarn, memberWarn);
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
	let { command, groupAdmins, sendMessageWTyping, botNumber, updateName, groupMetadata } = msgInfoObj;
	let prefix = msgInfoObj.prefix || (process.env.PREFIX ? process.env.PREFIX.trim() : "#");

	try {
		// Resolve target from reply context or mention or direct number in args
		const contextInfo =
			msg.message?.extendedTextMessage?.contextInfo ||
			msg.message?.imageMessage?.contextInfo ||
			msg.message?.videoMessage?.contextInfo ||
			msg.message?.stickerMessage?.contextInfo ||
			msg.message?.documentMessage?.contextInfo;

		let taggedJid = null;
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

		if (!taggedJid) {
			const helpText = [
				`╭━━『 *Warning System* 』━━╮`,
				"",
				"❌ *Please specify a user to warn!*",
				"",
				"┏━━━━━━━━━━━━━━━━━",
				"┃ 💡 HOW TO USE",
				"┗━━━━━━━━━━━━━━━━━",
				`│ ➜ Reply to message: \`${prefix}warn [reason]\``,
				`│ ➜ Mention user: \`${prefix}warn @user [reason]\``,
				`│ ➜ Check warnings: \`${prefix}warncount @user\``,
				`│ ➜ Reset warnings: \`${prefix}unwarn @user\``,
				"╰━━━━━━━━━━━━━━━━━",
			].join("\n");
			return sendMessageWTyping(from, { text: helpText }, { quoted: msg });
		}

		const targetIdentity = resolveMemberIdentity(taggedJid, groupMetadata, sock);
		const phoneNumber = targetIdentity.phoneNumber || extractPhoneNumber(taggedJid);
		const targetMentions = targetIdentity.allJids.length > 0 ? targetIdentity.allJids : [taggedJid];
		const primaryId = targetIdentity.pnJid || taggedJid;
		const adminName = updateName || msg.pushName || "Admin";

		// ── Guards ────────────────────────────────────────────────
		if (command !== "unwarn") {
			const isBotTarget = targetMentions.some((j) => botNumber.includes(j));
			if (isBotTarget) {
				return sendMessageWTyping(from, { text: "🤖 _I cannot warn myself!_" }, { quoted: msg });
			}
			const isOwnerTarget = targetMentions.some((j) => myNumber.includes(j)) || (phoneNumber && myNumber.some((m) => m.includes(phoneNumber)));
			if (isOwnerTarget) {
				return sendMessageWTyping(from, { text: "👑 _Owner or moderator cannot be warned._" }, { quoted: msg });
			}
		}

		// ── Ensure DB structures exist ────────────────────────────
		const groupData = await getGroupData(from);
		if (!groupData?.memberWarnCount || !Array.isArray(groupData.memberWarnCount)) {
			await group.updateOne({ _id: from }, { $set: { memberWarnCount: [] } });
		}

		const memberData = await getMemberData(primaryId);
		if (memberData && (!memberData.warning || !Array.isArray(memberData.warning))) {
			await member.updateOne({ _id: primaryId }, { $set: { warning: [] } });
		}

		// ── #warncount ────────────────────────────────────────────
		if (command === "warncount") {
			const currentCount = await readWarnCount(from, taggedJid, targetIdentity.allJids);
			const bars = "🔴".repeat(Math.min(currentCount, 3)) + "⚪".repeat(Math.max(0, 3 - currentCount));
			const countBox = [
				`╭━━『 *Warning Status* 』━━╮`,
				"",
				`👤 *User:* @${phoneNumber}`,
				"",
				"┏━━━━━━━━━━━━━━━━━",
				"┃ 📊 STRIKE RECORD",
				"┗━━━━━━━━━━━━━━━━━",
				`│ ➜ Strikes: ${bars} (${currentCount}/3)`,
				`│ ➜ Remaining: ${Math.max(0, 3 - currentCount)}`,
				`│ ➜ Status: ${currentCount === 0 ? "✅ Clean Record" : currentCount >= 3 ? "⛔ Ban Threshold Reached" : "⚠️ Active Warning"}`,
				"╰━━━━━━━━━━━━━━━━━",
				"",
				`💡 ${currentCount === 0 ? "User has a clean record in this group." : "3 warnings will result in an automatic removal."}`,
			].join("\n");

			return sendMessageWTyping(from, { text: countBox, mentions: targetMentions }, { quoted: msg });
		}

		// ── #warn ─────────────────────────────────────────────────
		if (command === "warn") {
			let reasonWords = [...args];
			if (reasonWords[0] && (reasonWords[0].startsWith("@") || /^\d+$/.test(reasonWords[0].replace(/[@\s+-]/g, "")))) {
				reasonWords.shift();
			}
			const reason = reasonWords.join(" ").trim() || "Group rule violation";

			const currentCount = await readWarnCount(from, taggedJid, targetIdentity.allJids);
			const newWarnCount = currentCount + 1;

			// Increment in group DB
			const groupResult = await group.updateOne(
				{ _id: from, "memberWarnCount.member": { $in: targetMentions } },
				{ $inc: { "memberWarnCount.$.count": 1 } }
			);
			if (groupResult.matchedCount === 0) {
				await group.updateOne(
					{ _id: from },
					{ $push: { memberWarnCount: { member: primaryId, count: newWarnCount } } }
				);
			}

			// Increment in member DB
			const memberResult = await member.updateOne(
				{ _id: primaryId, "warning.group": from },
				{ $inc: { "warning.$.count": 1 } }
			);
			if (memberResult.matchedCount === 0) {
				await member.updateOne(
					{ _id: primaryId },
					{ $push: { warning: { group: from, count: newWarnCount } } }
				);
			}

			const bars = "🔴".repeat(Math.min(newWarnCount, 3)) + "⚪".repeat(Math.max(0, 3 - newWarnCount));
			const warnText = [
				`╭━━『 *Warning Issued* 』━━╮`,
				"",
				`⚠️ *Warned User:* @${phoneNumber}`,
				`👮 *Warned By:* ${adminName}`,
				`📝 *Reason:* ${reason}`,
				"",
				"┏━━━━━━━━━━━━━━━━━",
				"┃ ⚠️ WARN STATUS",
				"┗━━━━━━━━━━━━━━━━━",
				`│ ➜ Strikes: ${bars} (${newWarnCount}/3)`,
				`│ ➜ Remaining: ${Math.max(0, 3 - newWarnCount)}`,
				`│ ➜ Status: ${newWarnCount >= 3 ? "⛔ Max strikes reached (Removing...)" : "⚠️ Strike Registered"}`,
				"╰━━━━━━━━━━━━━━━━━",
				"",
				newWarnCount >= 3
					? "⛔ 3 warnings reached! Auto-removing user from group..."
					: "💡 Note: 3 warnings will result in an automatic removal!",
			].join("\n");

			await sendMessageWTyping(from, { text: warnText, mentions: targetMentions }, { quoted: msg });

			// Auto-kick on 3rd warning
			if (newWarnCount >= 3) {
				const isGroupAdmin = targetMentions.some((j) => groupAdmins.includes(j));
				const isBotAdmin = groupAdmins.some((a) => botNumber.includes(a));

				if (!isBotAdmin) {
					await sendMessageWTyping(
						from,
						{
							text: `╭━━『 *Auto-Kick Failed* 』━━╮\n\n❌ *I need Admin rights to remove @${phoneNumber}!*`,
							mentions: targetMentions,
						},
						{ quoted: msg }
					);
				} else if (isGroupAdmin) {
					await sendMessageWTyping(
						from,
						{
							text: "❌ Cannot auto-remove an Admin from the group!",
						},
						{ quoted: msg }
					);
				} else {
					try {
						const kickJid = taggedJid.endsWith("@s.whatsapp.net")
							? taggedJid
							: (targetIdentity.allJids.find((j) => j.endsWith("@s.whatsapp.net")) || taggedJid);
						await sock.groupParticipantsUpdate(from, [kickJid], "remove");

						// Clear warnings after successful kick
						for (const j of targetMentions) {
							await group.updateOne(
								{ _id: from },
								{ $pull: { memberWarnCount: { member: j } } }
							);
							await member.updateOne(
								{ _id: j },
								{ $pull: { warning: { group: from } } }
							);
						}

						const kickText = [
							`╭━━『 *Member Removed* 』━━╮`,
							"",
							`👤 *User:* @${phoneNumber}`,
							"",
							"┏━━━━━━━━━━━━━━━━━",
							"┃ 🔨 AUTO REMOVAL",
							"┗━━━━━━━━━━━━━━━━━",
							"│ ➜ Reason: 3/3 warnings reached",
							"│ ➜ Action: Removed from group",
							"╰━━━━━━━━━━━━━━━━━",
						].join("\n");

						await sendMessageWTyping(from, { text: kickText, mentions: targetMentions }, { quoted: msg });
					} catch (kickErr) {
						await sendMessageWTyping(
							from,
							{
								text: `╭━━『 *Kick Failed* 』━━╮\n\n⚠️ Could not remove @${phoneNumber}: _${kickErr.message}_`,
								mentions: targetMentions,
							},
							{ quoted: msg }
						);
					}
				}
			}
			return;
		}

		// ── #unwarn ───────────────────────────────────────────────
		if (command === "unwarn") {
			for (const j of targetMentions) {
				await group.updateOne(
					{ _id: from },
					{ $pull: { memberWarnCount: { member: j } } }
				);
				await member.updateOne(
					{ _id: j },
					{ $pull: { warning: { group: from } } }
				);
			}

			const clearedText = [
				`╭━━『 *Warnings Reset* 』━━╮`,
				"",
				`👤 *User:* @${phoneNumber}`,
				`👮 *Admin:* ${adminName}`,
				"",
				"┏━━━━━━━━━━━━━━━━━",
				"┃ ✨ STATUS UPDATED",
				"┗━━━━━━━━━━━━━━━━━",
				"│ ➜ Strikes: ⚪⚪⚪ (0/3)",
				"│ ➜ Action: All warnings cleared",
				"╰━━━━━━━━━━━━━━━━━",
				"",
				"✅ Clean record granted. Please follow group rules!",
			].join("\n");

			await sendMessageWTyping(from, { text: clearedText, mentions: targetMentions }, { quoted: msg });
			return;
		}
	} catch (err) {
		console.error("Warning command error:", err);
		sendMessageWTyping(
			from,
			{
				text: `╭━━『 *Error* 』━━╮\n\n❌ ${err.message || err.toString()}`,
			},
			{ quoted: msg }
		);
	}
};

export default () => ({
	cmd: ["warn", "unwarn", "warncount"],
	desc: "Warn a member or check/reset warnings",
	usage: "warn @mention [reason] | unwarn @mention | warncount @mention | reply",
	handler,
});
