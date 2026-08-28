import sendToTelegram, { escapeHtml } from "./telegramLogger.js";
import { fake_quoted } from "./getFakeQuoted.js";
import { getGroupData, createGroupData } from "../sqlite-DB/groupDataDb.js";
import { extractPhoneNumber, getPreferredJID } from "./lidUtils.js";
import { groupMetadataCache } from "./getSocket.js";
import { randomWelcome, sendWithTyping } from "./messageFormatter.js";

const getPhone = (p) => {
	const raw = typeof p === "string" ? p : (p?.phoneNumber || p?.id || p?.jid || "");
	return extractPhoneNumber(raw);
};

const getGroupEvent = async (sock, events, cache) => {
	const jid = events?.id;
	if (!jid) return;

	// Invalidate metadata caches on participant change
	if (cache) cache.del(jid + ":groupMetadata");
	groupMetadataCache.del(jid);

	let groupMetadata = null;
	try {
		groupMetadata = await sock.groupMetadata(jid);
		if (groupMetadata) {
			groupMetadataCache.set(jid, groupMetadata);
			if (cache) cache.set(jid + ":groupMetadata", groupMetadata, 10 * 60);
		}
	} catch (e) {
		console.warn(`[getGroupEvent] Could not fetch groupMetadata: ${e.message}`);
	}

	let groupDataDB = await getGroupData(jid);
	if (!groupDataDB || groupDataDB === -1) {
		if (groupMetadata) {
			await createGroupData(jid, groupMetadata);
			groupDataDB = await getGroupData(jid);
		}
		if (!groupDataDB || groupDataDB === -1) {
			groupDataDB = { welcome: "", grpName: groupMetadata?.subject || "Group", is91Only: false };
		}
	}

	const grpName = groupMetadata?.subject || groupDataDB?.grpName || "Group";
	const grpDesc = groupMetadata?.desc ? groupMetadata.desc.toString() : (groupDataDB?.desc || "");

	if (events.action === "add") {
		if (groupDataDB.welcome !== "off" && Array.isArray(events.participants)) {
			for (const member of events.participants) {
				const memberJid = typeof member === "string" ? member : (member?.id || member?.jid || member?.phoneNumber || "");
				const phoneNumber = getPhone(member);
				if (!phoneNumber) continue;

				const mentionTag = `@${phoneNumber}`;
				const displayName = member?.notify || member?.name || phoneNumber;

				// Resolve preferred JID format
				let mentionJid = "";
				try {
					mentionJid = await getPreferredJID(sock, memberJid);
				} catch (_) {
					mentionJid = memberJid;
				}

				const pnJid = `${phoneNumber}@s.whatsapp.net`;
				const cleanMemberJid = memberJid.includes(":")
					? memberJid.split(":")[0] + (memberJid.includes("@lid") ? "@lid" : "@s.whatsapp.net")
					: memberJid;

				// Mentions array must contain the PN JID that matches @phoneNumber in text
				const mentionsList = [...new Set([pnJid, memberJid, cleanMemberJid, mentionJid].filter(Boolean))];

				// Pick and format welcome text
				let welcomeText = "";
				if (groupDataDB.welcome && groupDataDB.welcome.trim() !== "" && groupDataDB.welcome !== "off") {
					let customText = groupDataDB.welcome;
					const hasUserPlaceholder = /@user|@member|\{user\}|\{member\}/i.test(customText);

					customText = customText
						.replace(/@user|@member|\{user\}|\{member\}/gi, mentionTag)
						.replace(/\{group\}|\{groupname\}/gi, grpName)
						.replace(/\{desc\}|\{description\}/gi, grpDesc)
						.replace(/\{name\}/gi, displayName)
						.replace(/\{count\}/gi, groupMetadata?.participants?.length ? String(groupMetadata.participants.length) : "");

					if (hasUserPlaceholder || customText.includes(mentionTag)) {
						welcomeText = customText;
					} else {
						welcomeText = `Welcome ${mentionTag}!\n\n${customText}`;
					}
				} else {
					welcomeText = randomWelcome(mentionTag, grpName);
				}

				// Send welcome with mentions array
				try {
					await sendWithTyping(
						sock,
						jid,
						{
							text: welcomeText,
							mentions: mentionsList,
						},
						{ quoted: fake_quoted(events, `Welcome to ${grpName}`) }
					);
				} catch (sendErr) {
					console.error(`[getGroupEvent] Failed to send welcome message to ${jid}:`, sendErr.message);
				}
			}
		}

		// 91Only Check
		if (groupDataDB.is91Only === true && Array.isArray(events.participants)) {
			const nonIndianParticipants = events.participants.filter((p) => {
				const phoneNumber = getPhone(p);
				return phoneNumber && !phoneNumber.startsWith("91");
			});
			if (nonIndianParticipants.length > 0) {
				const toRemove = nonIndianParticipants.map((p) =>
					typeof p === "string" ? p : (p.id || p.jid || p.phoneNumber)
				);
				sock.groupParticipantsUpdate(jid, toRemove, "remove").catch(() => {});
				sock.sendMessage(
					jid,
					{
						text: "```Only Indian Numbers (+91) Allowed In This Group.\n```",
					},
					{ quoted: fake_quoted(events, "Only Indian Number Allowed, Namaste") }
				).catch(() => {});
			}
		}

		const addedNumbers = events.participants.map((p) => `<code>${escapeHtml(getPhone(p))}</code>`).join(", ");
		sendToTelegram(
			`➕ <b>Group Update</b>\n` +
			`━━━━━━━━━━━━━━\n` +
			`🏠 <b>Group:</b> ${escapeHtml(grpName)}\n` +
			`👤 <b>Joined:</b> ${addedNumbers}`
		);
	} else {
		const actionEmoji = events.action === "remove" ? "➖" : events.action === "promote" ? "⬆️" : events.action === "demote" ? "⬇️" : "🔄";
		const actionLabel = events.action === "remove" ? "Left / Removed" : events.action === "promote" ? "Promoted to Admin" : events.action === "demote" ? "Demoted from Admin" : escapeHtml(events.action);
		const numbers = (events.participants || []).map((p) => `<code>${escapeHtml(getPhone(p))}</code>`).join(", ");
		sendToTelegram(
			`${actionEmoji} <b>Group Update</b>\n` +
			`━━━━━━━━━━━━━━\n` +
			`🏠 <b>Group:</b> ${escapeHtml(grpName)}\n` +
			`👤 <b>Member:</b> ${numbers}\n` +
			`📋 <b>Action:</b> ${actionLabel}`
		);
	}
	console.log(events);
};

export default getGroupEvent;
