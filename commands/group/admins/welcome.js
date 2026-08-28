import { getGroupData, setGroupWelcome } from "../../sqlite-DB/groupDataDb.js";
import { randomWelcome } from "../../functions/messageFormatter.js";
import { extractPhoneNumber } from "../../functions/lidUtils.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, evv, groupMetadata, senderJid, prefix } = msgInfoObj;
	const currentPrefix = prefix || "#";

	try {
		const groupData = await getGroupData(from);
		let welMess = groupData?.welcome || "";
		const subCmd = (args[0] || "").toLowerCase();
		const grpName = groupMetadata?.subject || groupData?.grpName || "Group";
		const grpDesc = groupMetadata?.desc ? groupMetadata.desc.toString() : (groupData?.desc || "");
		const senderNumber = extractPhoneNumber(senderJid || "");
		const senderTag = senderNumber ? `@${senderNumber}` : "@User";

		if (subCmd === "reset" || subCmd === "default") {
			await setGroupWelcome(from, "");
			await sendMessageWTyping(from, {
				text: "✅ *Welcome Message reset to default random templates.*",
			}, { quoted: msg });
		} else if (subCmd === "off" || subCmd === "disable") {
			await setGroupWelcome(from, "off");
			await sendMessageWTyping(from, {
				text: "😴 *Welcome Message disabled for this group.*",
			}, { quoted: msg });
		} else if (subCmd === "on" || subCmd === "enable") {
			const newStatus = welMess === "off" ? "" : welMess;
			await setGroupWelcome(from, newStatus);
			await sendMessageWTyping(from, {
				text: "✅ *Welcome Message enabled!*",
			}, { quoted: msg });
		} else if (subCmd === "preview") {
			let previewText = "";
			if (welMess && welMess !== "off") {
				let text = welMess;
				const hasPlaceholder = /@user|@member|\{user\}|\{member\}/i.test(text);
				text = text
					.replace(/@user|@member|\{user\}|\{member\}/gi, senderTag)
					.replace(/\{group\}|\{groupname\}/gi, grpName)
					.replace(/\{desc\}|\{description\}/gi, grpDesc)
					.replace(/\{name\}/gi, msg.pushName || senderNumber || "User")
					.replace(/\{count\}/gi, groupMetadata?.participants?.length ? String(groupMetadata.participants.length) : "1");

				if (hasPlaceholder || text.includes(senderTag)) {
					previewText = text;
				} else {
					previewText = `Welcome ${senderTag}!\n\n${text}`;
				}
			} else if (welMess === "off") {
				return sendMessageWTyping(from, {
					text: `⚠️ *Welcome messages are currently disabled.*\nUse \`${currentPrefix}welcome on\` or \`${currentPrefix}welcome <message>\` to enable.`,
				}, { quoted: msg });
			} else {
				previewText = randomWelcome(senderTag, grpName);
			}

			await sendMessageWTyping(from, {
				text: `📋 *Welcome Preview:*\n\n${previewText}`,
				mentions: senderJid ? [senderJid] : [],
			}, { quoted: msg });
		} else if (!args[0]) {
			const status = welMess === "off"
				? "🚫 *Disabled*"
				: welMess && welMess.trim() !== ""
					? `✅ *Custom Message:*\n${welMess}`
					: "📝 *Default Random Templates*";

			await sendMessageWTyping(from, {
				text: `🎉 *Welcome Message Settings*\n\n` +
					`Status: ${status}\n\n` +
					`⚙️ *Commands:*\n` +
					`• \`${currentPrefix}welcome <message>\` — Set custom text\n` +
					`• \`${currentPrefix}welcome preview\` — Test preview\n` +
					`• \`${currentPrefix}welcome reset\` — Reset to default templates\n` +
					`• \`${currentPrefix}welcome off\` — Turn off welcome\n` +
					`• \`${currentPrefix}welcome on\` — Turn on welcome\n\n` +
					`💡 *Placeholders for custom message:*\n` +
					`• *@user* or *{user}* — Mentions the new member\n` +
					`• *{group}* — Group name\n` +
					`• *{name}* — Member name\n` +
					`• *{desc}* — Group description`,
			}, { quoted: msg });
		} else {
			await setGroupWelcome(from, evv);
			await sendMessageWTyping(from, {
				text: `✅ *Welcome Message Set!*\n\n${evv}\n\n` +
					`_💡 Tip: Use \`${currentPrefix}welcome preview\` to see how it looks when someone joins._`,
			}, { quoted: msg });
		}
	} catch (err) {
		console.error("Welcome command error:", err);
		sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["welcome"],
	desc: "Set and manage group welcome message",
	usage: "welcome <message> | preview | reset | off | on",
	handler,
});
