import { getGroupData, setGroupGoodbye } from "../../../sqlite-DB/groupDataDb.js";
import { randomGoodbye, goodbyeSet, goodbyeDisabled, goodbyeEnabled, goodbyeReset, goodbyeSettings } from "../../../functions/messageFormatter.js";
import { extractPhoneNumber } from "../../../functions/lidUtils.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, evv, groupMetadata, senderJid, prefix } = msgInfoObj;
	const currentPrefix = prefix || "#";

	try {
		const groupData = await getGroupData(from);
		let byeMess = groupData?.goodbye || "";
		const subCmd = (args[0] || "").toLowerCase();
		const isSingleArg = args.length === 1;
		const grpName = groupMetadata?.subject || groupData?.grpName || "Group";
		const grpDesc = groupMetadata?.desc ? groupMetadata.desc.toString() : (groupData?.desc || "");
		const senderNumber = extractPhoneNumber(senderJid || "");
		const senderTag = senderNumber ? `@${senderNumber}` : "@User";

		// Extract quoted message text if present
		const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
		const quotedText = (
			quotedMsg?.conversation ||
			quotedMsg?.extendedTextMessage?.text ||
			quotedMsg?.imageMessage?.caption ||
			quotedMsg?.videoMessage?.caption ||
			""
		).trim();

		if (isSingleArg && (subCmd === "reset" || subCmd === "default")) {
			await setGroupGoodbye(from, "");
			await sendMessageWTyping(from, { text: goodbyeReset() }, { quoted: msg });
		} else if (isSingleArg && (subCmd === "off" || subCmd === "disable")) {
			await setGroupGoodbye(from, "off");
			await sendMessageWTyping(from, { text: goodbyeDisabled() }, { quoted: msg });
		} else if (isSingleArg && (subCmd === "on" || subCmd === "enable")) {
			const newStatus = byeMess === "off" ? "" : byeMess;
			await setGroupGoodbye(from, newStatus);
			await sendMessageWTyping(from, { text: goodbyeEnabled() }, { quoted: msg });
		} else if (isSingleArg && (subCmd === "preview" || subCmd === "test")) {
			let previewText = "";
			if (byeMess && byeMess !== "off") {
				let text = byeMess;
				const hasPlaceholder = /@user|@member|\{user\}|\{member\}/i.test(text);
				text = text
					.replace(/@user|@member|\{user\}|\{member\}/gi, senderTag)
					.replace(/\{group\}|\{groupname\}/gi, grpName)
					.replace(/\{desc\}|\{description\}/gi, grpDesc)
					.replace(/\{name\}/gi, msg.pushName || senderNumber || "User");

				if (hasPlaceholder || text.includes(senderTag)) {
					previewText = text;
				} else {
					previewText = `Goodbye ${senderTag}!\n\n${text}`;
				}
			} else if (byeMess === "off") {
				return sendMessageWTyping(from, {
					text: `⚠️ *Goodbye messages are currently disabled.*\nUse \`${currentPrefix}goodbye on\` or \`${currentPrefix}goodbye <message>\` to enable.`,
				}, { quoted: msg });
			} else {
				previewText = randomGoodbye(senderTag, grpName);
			}

			await sendMessageWTyping(from, {
				text: `📋 *Goodbye Preview:*\n\n${previewText}`,
				mentions: senderJid ? [senderJid] : [],
			}, { quoted: msg });
		} else if (subCmd === "set" && (args.length > 1 || quotedText)) {
			const messageToSet = args.length > 1 ? evv.slice(args[0].length).trim() : quotedText;
			await setGroupGoodbye(from, messageToSet);
			await sendMessageWTyping(from, { text: `✅ *Goodbye message set!*\n\n${messageToSet}\n\n_💡 Tip: Use \`${currentPrefix}goodbye preview\` to test._` }, { quoted: msg });
		} else if (!args[0] && quotedText) {
			await setGroupGoodbye(from, quotedText);
			await sendMessageWTyping(from, { text: `✅ *Goodbye message set!*\n\n${quotedText}\n\n_💡 Tip: Use \`${currentPrefix}goodbye preview\` to test._` }, { quoted: msg });
		} else if (!args[0]) {
			const status = byeMess === "off"
				? "🚫 *Disabled*"
				: byeMess && byeMess.trim() !== ""
					? `✅ *Custom Message:*\n${byeMess}`
					: "📝 *Default Random Templates*";

			await sendMessageWTyping(from, { text: goodbyeSettings(status, currentPrefix) }, { quoted: msg });
		} else {
			await setGroupGoodbye(from, evv);
			await sendMessageWTyping(from, { text: `✅ *Goodbye message set!*\n\n${evv}\n\n_💡 Tip: Use \`${currentPrefix}goodbye preview\` to test._` }, { quoted: msg });
		}
	} catch (err) {
		console.error("Goodbye command error:", err);
		sendMessageWTyping(from, { text: "❌ An error occurred. Please try again later." }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["goodbye", "setgoodbye", "leave"],
	desc: "Set and manage group goodbye message",
	usage: "goodbye <message> | preview | reset | off | on",
	handler,
});
