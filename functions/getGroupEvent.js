import sendToTelegram, { escapeHtml } from "./telegramLogger.js";
import { fake_quoted } from "./getFakeQuoted.js";
import { getGroupData } from "../sqlite-DB/groupDataDb.js";
import { extractPhoneNumber, getPreferredJID } from "./lidUtils.js";
import { groupMetadataCache } from "./getSocket.js";
import { randomWelcome, sendWithTyping, successMsg } from "./messageFormatter.js";

const getPhone = (p) =>
	typeof p === "string"
		? extractPhoneNumber(p)
		: extractPhoneNumber(p?.id || p?.jid || p?.phoneNumber || "");

const getGroupEvent = async (sock, events, cache) => {
	let jid = events.id;
	let groupDataDB = await getGroupData(jid);
	if (!groupDataDB || groupDataDB === -1) {
		console.warn(`[getGroupEvent] No data found for group: ${jid}`);
		groupDataDB = { welcome: "", grpName: "Group", is91Only: false };
	}
	cache.del(jid + ":groupMetadata");
	groupMetadataCache.del(jid);

	if (events.action == "add") {
		if (groupDataDB.welcome !== "off") {
			for (const member of events.participants) {
				const memberJid = typeof member === "string" ? member : (member?.id || member?.jid || member?.phoneNumber || "");
				const phoneNumber = getPhone(member);
				const mentionTag = `@${phoneNumber}`;
				const displayName = member?.notify || member?.name || phoneNumber;

				// Resolve the real LID for proper mention notification
				const mentionJid = await getPreferredJID(sock, memberJid);

				// 1 Reaction on join message
				sock.sendMessage(jid, { react: { text: "👋", key: events.id } }).catch(() => {});

				// 2 Pick welcome text
				let welcomeText = "";
				if (groupDataDB.welcome && groupDataDB.welcome.trim() !== "") {
					let customText = groupDataDB.welcome;
					if (customText.includes("@user") || customText.includes("@member")) {
						welcomeText = customText.replace(/@user|@member/g, mentionTag);
					} else {
						welcomeText = `Welcome ${mentionTag}!\n\n${customText}`;
					}
				} else {
					welcomeText = randomWelcome(displayName);
				}

				// 3 Send welcome with proper LID mention
				sendWithTyping(
					sock,
					jid,
					{
						text: welcomeText,
						mentions: [mentionJid],
					},
					{ quoted: fake_quoted(events, "Welcome to " + (groupDataDB.grpName || "Group")) }
				).catch(() => {});

				// 4 Success reaction
				sock.sendMessage(jid, { react: { text: "🎉", key: events.id } }).catch(() => {});
			}
		}
		//91Only Working
		if (groupDataDB.is91Only == true) {
			let filteredParticipants = events.participants.filter((p) => {
				const phoneNumber = extractPhoneNumber(p.phoneNumber);
				return !phoneNumber.startsWith("91");
			});
			if (filteredParticipants.length > 0) {
				sock.groupParticipantsUpdate(jid, filteredParticipants, "remove");
				sock.sendMessage(
					jid,
					{
						text: "```Only Indian Number Allowed In This Group.\n```",
					},
					{ quoted: fake_quoted(events, "Only Indian Number Allowed, Namaste") }
				);
			}
		}
		const addedNumbers = events.participants.map((p) => `<code>${escapeHtml(getPhone(p))}</code>`).join(", ");
		sendToTelegram(
			`➕ <b>Group Update</b>\n` +
			`━━━━━━━━━━━━━━\n` +
			`🏠 <b>Group:</b> ${escapeHtml(groupDataDB?.grpName)}\n` +
			`👤 <b>Joined:</b> ${addedNumbers}`
		);
	} else {
		const actionEmoji = events.action === "remove" ? "➖" : events.action === "promote" ? "⬆️" : events.action === "demote" ? "⬇️" : "🔄";
		const actionLabel = events.action === "remove" ? "Left / Removed" : events.action === "promote" ? "Promoted to Admin" : events.action === "demote" ? "Demoted from Admin" : escapeHtml(events.action);
		const numbers = events.participants.map((p) => `<code>${escapeHtml(getPhone(p))}</code>`).join(", ");
		sendToTelegram(
			`${actionEmoji} <b>Group Update</b>\n` +
			`━━━━━━━━━━━━━━\n` +
			`🏠 <b>Group:</b> ${escapeHtml(groupDataDB?.grpName)}\n` +
			`👤 <b>Member:</b> ${numbers}\n` +
			`📋 <b>Action:</b> ${actionLabel}`
		);
	}
	console.log(events);
};

export default getGroupEvent;
