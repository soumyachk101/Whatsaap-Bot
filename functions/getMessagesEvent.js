import dotenv from "dotenv";
dotenv.config();

import messageQueue from "./messageQueue.js";
import notifyOwner from "./getOwnerSend.js";
import { readFileEfficiently } from "./fileUtils.js";
import getGroupAdmins from "./getGroupAdmins.js";
import { stickerForward, forwardGroup } from "../functions/getStickerForward.js";
import { createMembersData, getMemberData, member } from "../sqlite-DB/membersDataDb.js";
import { createGroupData, getGroupData, recordGroupDailyStats, group } from "../sqlite-DB/groupDataDb.js";
import { commandsPublic, commandsMembers, commandsAdmins, commandsOwners, commandsReady } from "./getAddCommands.js";
import { getBotData } from "../sqlite-DB/botDataDb.js";
import { downloadMediaMessage } from "baileys";
import { checkNSFW } from "./nsfwFilter.js";
import { groupMetadataCache } from "./getSocket.js";
import { extractPhoneNumber, isLID, resolveMemberIdentity } from "./lidUtils.js";
import { logCommandEvent, logMessageEvent } from "./botLogger.js";

const parseNumberEnv = (envVal) => {
	if (!envVal) return [];
	const parts = envVal.split(",").map(s => s.trim()).filter(Boolean);
	const jids = [];
	for (const part of parts) {
		if (part.includes("@")) {
			jids.push(part);
		} else {
			jids.push(part + "@s.whatsapp.net");
		}
	}
	return jids;
};

const myNumber = parseNumberEnv(process.env.MY_NUMBER);
const botNumber = parseNumberEnv(process.env.BOT_NUMBER);
const moderatos = process.env.MODERATORS ? process.env.MODERATORS.split(",").map((s) => s.trim()).filter(Boolean) : [];

let _tagStickerBuffer = null;
const getTagSticker = async () => {
	if (!_tagStickerBuffer) {
		_tagStickerBuffer = await readFileEfficiently("./media/tag.webp");
	}
	return _tagStickerBuffer;
};

const configuredPrefix = process.env.PREFIX ? process.env.PREFIX.trim() : "#";
const validPrefixes = [...new Set([configuredPrefix, "#", ".", "!", "/"])];

const getCommand = async (sock, msg, cache) => {
	const startTime = process.hrtime();

	try {
		await commandsReady();
		if (!sock || !msg) return;
		const from = msg.key?.remoteJid;
		if (!from) return;
		const messageKeys = Object.keys(msg.message);
		if (messageKeys.length === 0) return;

		const sendMessageWTyping = async (to, msgObj, messageOptions = {}) => {
			try {
				if (!to || !msgObj) return;
				if (!sock || !sock.user) return;

				const mediaTypes = ["sticker", "image", "audio", "video", "document"];
				const messageType = Object.keys(msgObj)[0];
				const isGroupChat = to.endsWith("@g.us");
				const currentGroupMetadata = isGroupChat
					? (groupMetadataCache.get(to) || groupMetadata || null)
					: null;

				// ── Auto-Normalize & Enrich Mentions ─────────────────────
				const collectedMentions = new Set();

				// 1. Mentions from msgObj
				if (Array.isArray(msgObj.mentions)) {
					for (const m of msgObj.mentions) if (m) collectedMentions.add(m);
				}
				if (Array.isArray(msgObj.contextInfo?.mentionedJid)) {
					for (const m of msgObj.contextInfo.mentionedJid) if (m) collectedMentions.add(m);
				}

				// 2. Mentions from messageOptions
				if (Array.isArray(messageOptions?.mentions)) {
					for (const m of messageOptions.mentions) if (m) collectedMentions.add(m);
				}
				if (Array.isArray(messageOptions?.contextInfo?.mentionedJid)) {
					for (const m of messageOptions.contextInfo.mentionedJid) if (m) collectedMentions.add(m);
				}

				// 3. Scan message text or caption for @\d{7,16} tags
				const textContent =
					(typeof msgObj.text === "string" ? msgObj.text : "") ||
					(typeof msgObj.caption === "string" ? msgObj.caption : "") ||
					(typeof msgObj.conversation === "string" ? msgObj.conversation : "");
				if (textContent) {
					const phoneTagMatches = textContent.match(/@(\d{7,16})/g);
					if (phoneTagMatches) {
						for (const tag of phoneTagMatches) {
							const digits = tag.slice(1);
							collectedMentions.add(`${digits}@s.whatsapp.net`);
						}
					}
				}

				// 4. Resolve all identities (pair PN and LID)
				if (collectedMentions.size > 0) {
					const enrichedMentions = new Set();
					for (const jid of collectedMentions) {
						if (!jid) continue;
						const idObj = resolveMemberIdentity(jid, currentGroupMetadata, sock);
						if (idObj.allJids && idObj.allJids.length > 0) {
							for (const aj of idObj.allJids) enrichedMentions.add(aj);
						} else {
							const cleanJid = String(jid).includes(":")
								? String(jid).split(":")[0] + (String(jid).includes("@") ? "@" + String(jid).split("@")[1] : "")
								: String(jid);
							if (cleanJid.includes("@")) {
								enrichedMentions.add(cleanJid);
							}
						}
					}

					const finalMentionList = [...enrichedMentions];
					if (finalMentionList.length > 0) {
						msgObj.mentions = finalMentionList;
						msgObj.contextInfo = {
							...(msgObj.contextInfo || {}),
							mentionedJid: finalMentionList,
						};
					}
				}

				if (mediaTypes.includes(messageType)) {
					if (typeof msgObj[messageType] === "string") {
						try {
							msgObj[messageType] = await readFileEfficiently(msgObj[messageType]);
						} catch (readErr) {
							console.error("❌ Error reading media file:", readErr.message);
							throw readErr;
						}
					}
				}

				const doSend = async () => {
					try {
						const sendOptions = {
							...messageOptions,
							cachedGroupMetadata: isGroupChat ? (jid) => groupMetadataCache.get(jid) : undefined,
							mediaUploadTimeoutMs: isGroupChat ? 1000 * 60 * 10 : 1000 * 60 * 5,
						};

						if (msgObj.contextInfo?.mentionedJid?.length) {
							sendOptions.contextInfo = {
								...(sendOptions.contextInfo || {}),
								mentionedJid: msgObj.contextInfo.mentionedJid,
							};
						}

						return await sock.sendMessage(to, msgObj, sendOptions);
					} catch (err) {
						console.error("❌ Error sending message:", err.message);
						throw err;
					}
				};

				if (isGroupChat) {
					const priority = mediaTypes.includes(messageType) ? 2 : 1;
					return await messageQueue.enqueue(to, doSend, priority);
				} else {
					return await messageQueue.enqueue(to, doSend, 0);
				}
			} catch (error) {
				console.error("❌ Error in sendMessageWTyping:", error.message);
				throw error;
			}
		};

		const content = JSON.stringify(msg.message);

		let m = msg.message || {};
		while (
			m?.ephemeralMessage?.message ||
			m?.viewOnceMessage?.message ||
			m?.viewOnceMessageV2?.message ||
			m?.viewOnceMessageV2Extension?.message ||
			m?.documentWithCaptionMessage?.message ||
			m?.editedMessage?.message?.protocolMessage?.editedMessage ||
			m?.deviceSentMessage?.message
		) {
			m =
				m?.ephemeralMessage?.message ||
				m?.viewOnceMessage?.message ||
				m?.viewOnceMessageV2?.message ||
				m?.viewOnceMessageV2Extension?.message ||
				m?.documentWithCaptionMessage?.message ||
				m?.editedMessage?.message?.protocolMessage?.editedMessage ||
				m?.deviceSentMessage?.message;
		}

		// Skip protocol messages and reactions
		if (m.protocolMessage || m.reactionMessage) return;

		const ignoredKeys = new Set(["messageContextInfo", "senderKeyDistributionMessage"]);
		const type = Object.keys(m).find((k) => !ignoredKeys.has(k)) || Object.keys(m)[0];

		if (type === "stickerMessage" && forwardGroup != "") {
			stickerForward(sock, msg, from);
		}

		let interactiveText = "";
		if (m.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
			try {
				const params = JSON.parse(m.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
				interactiveText = params.id || params.text || "";
			} catch {}
		} else if (m.interactiveResponseMessage?.body?.text) {
			interactiveText = m.interactiveResponseMessage.body.text;
		}

		const bodyMap = {
			conversation: m.conversation,
			imageMessage: m.imageMessage?.caption,
			videoMessage: m.videoMessage?.caption,
			extendedTextMessage: m.extendedTextMessage?.text,
			buttonsResponseMessage: m.buttonsResponseMessage?.selectedDisplayText || m.buttonsResponseMessage?.selectedButtonId,
			templateButtonReplyMessage: m.templateButtonReplyMessage?.selectedDisplayText || m.templateButtonReplyMessage?.selectedId,
			listResponseMessage: m.listResponseMessage?.title || m.listResponseMessage?.singleSelectReply?.selectedRowId,
			documentMessage: m.documentMessage?.caption,
			interactiveResponseMessage: interactiveText,
		};

		let body = bodyMap[type] ?? "";
		body = String(body).trim();

		let types = [
			"conversation",
			"imageMessage",
			"videoMessage",
			"extendedTextMessage",
			"buttonsResponseMessage",
			"templateButtonReplyMessage",
			"listResponseMessage",
			"stickerMessage",
			"documentMessage",
			"interactiveResponseMessage",
		];

		if (!types.includes(type)) return;

		if (type == "buttonsResponseMessage") {
			if (msg.message.buttonsResponseMessage?.selectedButtonId == "downloadworld")
				body = body.startsWith(configuredPrefix) ? body : configuredPrefix + body;
		} else if (type == "templateButtonReplyMessage") {
			body = body.startsWith(configuredPrefix) ? body : configuredPrefix + body;
		} else if (type == "listResponseMessage") {
			if (msg.message.listResponseMessage?.singleSelectReply?.selectedRowId == "downloadworld")
				body = body.startsWith(configuredPrefix) ? body : configuredPrefix + body;
		}

		const matchedPrefix = validPrefixes.find((p) => body.startsWith(p));
		const isCmd = Boolean(matchedPrefix);
		let command = "";
		let args = [];
		let evv = "";

		if (isCmd) {
			const cleanBody = body.slice(matchedPrefix.length).trim();
			const firstSpace = cleanBody.search(/\s/);
			if (firstSpace === -1) {
				command = cleanBody.toLowerCase();
				args = [];
				evv = "";
			} else {
				command = cleanBody.slice(0, firstSpace).toLowerCase();
				evv = cleanBody.slice(firstSpace).trim();
				args = evv.split(/\s+/).filter(Boolean);
			}
		} else {
			const firstSpace = body.trim().search(/\s/);
			if (firstSpace === -1) {
				command = body.trim().toLowerCase();
				args = [];
				evv = body.trim();
			} else {
				command = body.trim().slice(0, firstSpace).toLowerCase();
				evv = body.trim();
				args = body.trim().slice(firstSpace).trim().split(/\s+/).filter(Boolean);
			}
		}

		const isGroup = from.endsWith("@g.us");
		let groupMetadata = null;
		if (isGroup) {
			groupMetadata = groupMetadataCache.get(from) || (typeof cache?.get === "function" ? cache.get(from + ":groupMetadata") : null);
			if (!groupMetadata) {
				groupMetadata = { participants: [], subject: from };
				// Background fetch to refresh cache without blocking command execution
				Promise.race([
					sock.groupMetadata(from),
					new Promise((_, reject) =>
						setTimeout(() => reject(new Error("Group metadata fetch timeout")), 5000)
					),
				]).then((m) => {
					if (m) {
						groupMetadataCache.set(from, m);
						if (typeof cache?.set === "function") {
							cache.set(from + ":groupMetadata", m, 60 * 60);
						}
					}
				}).catch(() => {});
			}
		}

		const botRawId = sock.user?.id || "";
		const botJid = botRawId.includes(":") ? botRawId.split(":")[0] + "@s.whatsapp.net" : (botRawId ? (botRawId.includes("@") ? botRawId : botRawId + "@s.whatsapp.net") : "");
		const botLid = sock.user?.lid || "";
		const senderJid = msg.key.fromMe ? botJid : (isGroup ? (msg.key.participant || msg.participant) : msg.key.remoteJid);
		if (!senderJid || !senderJid.includes("@")) return;

		const senderIdentity = resolveMemberIdentity(senderJid, groupMetadata, sock);
		const senderPnJid = senderIdentity.pnJid || (senderJid.endsWith("@s.whatsapp.net") ? senderJid : "");
		const senderPhone = senderIdentity.phoneNumber || extractPhoneNumber(senderPnJid || senderJid);
		const senderNumber = senderPhone || (senderJid.includes(":") ? senderJid.split(":")[0] : senderJid.split("@")[0]);

		const botIdentityJids = [...new Set([...botNumber, botJid, botLid].filter(Boolean))];

		const cleanDigits = (s) => String(s || "").replace(/\D/g, "").slice(-10);
		const senderDigits = cleanDigits(senderPhone) || cleanDigits(senderPnJid) || cleanDigits(senderJid);

		const isOwner =
			msg.key.fromMe ||
			myNumber.some((n) => {
				const nDigits = cleanDigits(n);
				return n === senderJid || n === senderPnJid || (nDigits && senderDigits && nDigits === senderDigits);
			}) ||
			botIdentityJids.some((b) => {
				const bDigits = cleanDigits(b);
				return b === senderJid || b === senderPnJid || (bDigits && senderDigits && bDigits === senderDigits);
			});

		const updateId = senderPnJid || senderJid;
		const updateName = msg.key.fromMe ? sock.user?.name : msg.pushName;
		logMessageEvent(updateId, isGroup ? from : null);

		// Asynchronous non-blocking background database stats tracking
		(async () => {
			try {
				await createMembersData(updateId, updateName);
				if (senderJid !== updateId) {
					await createMembersData(senderJid, msg.pushName || "");
				}

				const mediaTypeField =
					type === "conversation" || type === "extendedTextMessage" ? "texttotal" :
					type === "imageMessage" ? "imagetotal" :
					type === "videoMessage" ? "videototal" :
					type === "stickerMessage" ? "stickertotal" :
					type === "documentMessage" ? "pdftotal" : null;

				if (mediaTypeField) {
					const xpGain = (
						mediaTypeField === "texttotal" ? 5 :
						mediaTypeField === "imagetotal" ? 8 :
						mediaTypeField === "videototal" ? 10 :
						mediaTypeField === "stickertotal" ? 3 :
						mediaTypeField === "pdftotal" ? 5 : 3
					);

					await member.updateOne(
						{ _id: updateId },
						{
							$inc: { totalmsg: 1, [mediaTypeField]: 1, xp: xpGain },
							$set: { username: updateName, lastXPGain: Date.now() }
						}
					).catch((e) => console.error("[member update error]", e.message));

					if (isGroup) {
						const r = await group.updateOne(
							{ _id: from, "members.id": updateId },
							{
								$inc: { "members.$.count": 1, [`members.$.${mediaTypeField}`]: 1 },
								$set: { "members.$.name": updateName },
							}
						).catch(() => null);

						if (r && r.matchedCount === 0) {
							const newMember = {
								id: updateId, name: updateName, count: 1,
								texttotal: 0, imagetotal: 0, videototal: 0, stickertotal: 0, pdftotal: 0,
							};
							newMember[mediaTypeField] = 1;
							await group.updateOne(
								{ _id: from },
								{ $push: { members: newMember } }
							).catch(() => {});
						}
						await group.updateOne({ _id: from }, { $inc: { totalMsgCount: 1 } }).catch(() => {});
						await recordGroupDailyStats(from, mediaTypeField).catch(() => {});
					}
				}
			} catch (e) {
				console.error("[background stats tracking error]", e.message);
			}
		})();

		if (!isCmd && (type == "stickerMessage" || type == "documentMessage")) return;

		if (isCmd && msg.message.extendedTextMessage) {
			if (
				msg.message.extendedTextMessage.contextInfo?.mentionedJid?.some(jid => botIdentityJids.includes(jid))
			) {
				try {
					const stickerBuffer = await getTagSticker();
					sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });
				} catch (err) {
					console.error("Failed to send tag sticker:", err.message);
				}
			}
		}

		const [senderData, groupData] = await Promise.all([
			getMemberData(senderJid),
			isGroup ? getGroupData(from) : Promise.resolve(null),
		]);

		const allowedWhenOff = [
			"start", "welcome", "stats", "mystats", "search", "yts",
			"level", "lvl", "rank", "leaderboard", "lb", "top", "mycount", "mygrpcount",
			"group", "dev", "bot", "help", "menu", "alive", "a", "ping", "status"
		];
		
		if (isGroup && (groupData && groupData.isBotOn === false)) {
			if (!allowedWhenOff.includes(command) && !isOwner) {
				return;
			}
		}

		const groupAdmins = isGroup ? getGroupAdmins(groupMetadata.participants) : [];
		const isGroupAdmin = isGroup ? (groupAdmins.includes(senderJid) || (senderPnJid && groupAdmins.includes(senderPnJid)) || false) : false;

		if (isGroup && groupData?.adminOnly && !isGroupAdmin && !isOwner && !moderatos.includes(senderNumber)) {
			return;
		}

		if (isGroup && groupData?.antilink && !isGroupAdmin && !isOwner) {
			const linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})|(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-z]{2,6}(\/[^\s]*)?/gi;
			if (linkRegex.test(body)) {
				console.log(`[ANTILINK] Link detected from ${senderJid} in ${groupMetadata.subject}. Deleting...`);
				try {
					await sock.sendMessage(from, { delete: msg.key });
					return;
				} catch (err) {
					console.error("[ANTILINK error] Failed to delete message:", err.message);
				}
			}
		}

		if (isGroup && groupData?.nsfw && type === "imageMessage" && !isGroupAdmin && !isOwner) {
			try {
				const buffer = await downloadMediaMessage(msg, "buffer", {});
				if (buffer) {
					const isNSFW = await checkNSFW(buffer);
					if (isNSFW) {
						console.log(`[NSFW] Sexually explicit image detected from ${senderJid} in ${groupMetadata.subject}. Deleting...`);
						await sock.sendMessage(from, { delete: msg.key });
						await sendMessageWTyping(from, { text: `🚫 NSFW content is not allowed in this group. @${senderJid.split("@")[0]} has been warned.` }, { mentions: [senderJid] });
						return;
					}
				}
			} catch (err) {
				console.error("[NSFW Filter error]", err.message);
			}
		}

		if (isCmd && isGroup && type == "imageMessage" && groupData?.isAutoStickerOn) {
			if (msg.message.imageMessage.caption == "") {
				commandsPublic["sticker"](sock, msg, from, args, {
					senderJid,
					type,
					content,
					isGroup,
					sendMessageWTyping,
					evv,
				});
			}
		}

		if (senderData?.isBlock) return;

		const isChatBotOn = groupData ? groupData.isChatBotOn : false;
		if (isCmd && isGroup && isChatBotOn && (type == "conversation" || type == "extendedTextMessage")) {
			let isTaggedBot = false;
			let tagMessage = null;
			if (type == "extendedTextMessage") {
				const tagMessageSenderJID = msg.message?.extendedTextMessage?.contextInfo?.participant || "";
				isTaggedBot = botIdentityJids.some(b => b === tagMessageSenderJID || (tagMessageSenderJID && b.includes(extractPhoneNumber(tagMessageSenderJID))));
				tagMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
			}
			const quotedText = tagMessage?.conversation || tagMessage?.extendedTextMessage?.text || "";
			const isReplyToDownloadBuddy = isTaggedBot && quotedText.includes("DownloadBuddy");
			if (
				["downloadbuddy", "db"].includes(command) ||
				isReplyToDownloadBuddy
			) {
				commandsPublic["downloadbuddy"](sock, msg, from, args, {
					sendMessageWTyping,
					command,
					updateName:
						updateName == "" || updateName == null || updateName == undefined
							? senderData?.username
							: updateName,
					updateId,
					senderJid,
					groupMetadata,
					groupAdmins,
					isGroup,
					evv,
					isOwner,
				});
				notifyOwner(
					sock,
					`🤖 <b>Command Used</b>\n` +
					`━━━━━━━━━━━━━━\n` +
					`📌 <b>Command:</b> <code>chat</code>\n` +
					`👤 <b>User:</b> ${msg.pushName}\n` +
					`📱 <b>ID:</b> <code>${senderJid}</code>\n` +
					`💬 <b>In:</b> ${groupMetadata.subject}`,
					msg
				);
				return;
			}
		}

		if (!isCmd) return;

		sock.readMessages([msg.key]).catch(() => {});

		const msgInfoObj = {
			prefix: matchedPrefix,
			type,
			content,
			evv,
			command,
			isGroup,
			senderJid,
			senderPnJid,
			senderPhone,
			groupMetadata,
			groupAdmins,
			isGroupAdmin,
			botNumber: botIdentityJids,
			sendMessageWTyping,
			notifyOwner,
			updateName,
			updateId,
			isOwner,
			startTime,
		};
		console.log(
			"[COMMAND]",
			command,
			"[FROM]",
			senderJid,
			"[name]",
			msg.pushName,
			"[IN]",
			isGroup ? groupMetadata.subject : "Directs"
		);
		notifyOwner(
			sock,
			`🤖 <b>Command Used</b>\n` +
			`━━━━━━━━━━━━━━\n` +
			`📌 <b>Command:</b> <code>${command}</code>\n` +
			`👤 <b>User:</b> ${msg.pushName}\n` +
			`📱 <b>ID:</b> <code>${senderJid}</code>\n` +
			`💬 <b>In:</b> ${isGroup ? groupMetadata.subject : "Direct Message"}`,
			msg
		);
		const isRegisteredCmd = Boolean(
			commandsPublic[command] ||
			commandsMembers[command] ||
			commandsAdmins[command] ||
			commandsOwners[command]
		);

		if (!isRegisteredCmd) return;

		// ── Maintenance mode: only whitelisted commands allowed ──────────
		const botData = await getBotData();
		const maintenanceMode = botData?.maintenanceMode || false;
		const isGroupRestricted = isGroup && (maintenanceMode || groupData?.restrictedMode) && !isGroupAdmin && !isOwner;
		const maintenanceMessage = "🔒 *Command Restriction Active*\n\nOnly welcome, stats, and search commands are available right now. Other commands are temporarily disabled.\n_Check back later!_";
		if (isGroupRestricted) {
			const allowed = ["start", "welcome", "stats", "mystats", "search", "yts",
				"level", "lvl", "rank", "leaderboard", "lb", "top", "mycount", "mygrpcount"];
			if (!allowed.includes(command)) {
				return sendMessageWTyping(from, {
					text: maintenanceMessage,
				}, { quoted: msg });
			}
		}

		if (isGroup) {
			let isBotExplicitlyOff = groupData && groupData.isBotOn === false;
			if (isBotExplicitlyOff && !isOwner && !(command.startsWith("group") || command.startsWith("dev") || command === "bot" || allowedWhenOff.includes(command))) {
				return;
			}
			let blockCommandsInDB = (await groupData?.cmdBlocked) || [];
			if (command != "" && Array.isArray(blockCommandsInDB)) {
				if (blockCommandsInDB.includes(command)) {
					return sendMessageWTyping(from, { text: `Command blocked for this group.` }, { quoted: msg });
				}
			}
		}

		if (command != "") {
			sock.sendMessage(from, { react: { text: "👀", key: msg.key } }).catch(err => console.error("[React Error]", err));
			const globallyDisabled = botData?.disabledGlobally || [];
			if (globallyDisabled.includes(command)) {
				return sendMessageWTyping(from, { text: `🚫 This command is globally disabled.` }, { quoted: msg });
			}
		}

		// Log command execution for dashboard stats & activity
		logCommandEvent(command, senderJid, isGroup ? (groupData?.grpName || from) : null);

		const COMMAND_TIMEOUT_MS = 30000;
		const runHandler = async (handlerFn, label) => {
			const t0 = Date.now();
			try {
				const result = await Promise.race([
					handlerFn(),
					new Promise((_, reject) =>
						setTimeout(() => reject(new Error(`Command timeout: '${command}' (${label}) exceeded ${COMMAND_TIMEOUT_MS / 1000}s`)), COMMAND_TIMEOUT_MS)
					),
				]);
				const t1 = Date.now();
				console.log(`[PROFILE] Command '${command}' (${label}) took ${t1 - t0}ms`);
				return result;
			} catch (err) {
				if (err.message && err.message.includes("Command timeout")) {
					console.error(`[WATCHDOG] ${err.message}`);
					await sendMessageWTyping(from, { text: `⏱️ *Command Timeout*\n\nCommand '${command}' took too long to respond. Please try again.` }, { quoted: msg }).catch(() => {});
				}
				throw err;
			}
		};

		if (commandsPublic[command]) {
			return runHandler(() => commandsPublic[command](sock, msg, from, args, msgInfoObj), "public");
		} else if (commandsMembers[command]) {
			return runHandler(() => commandsMembers[command](sock, msg, from, args, msgInfoObj), "members");
		} else if (commandsAdmins[command]) {
			if (!isGroup) {
				return sendMessageWTyping(from, { text: "```This command can only be used in a group.```" }, { quoted: msg });
			}
			if (isGroupAdmin || isOwner || moderatos.includes(senderNumber)) {
				return runHandler(() => commandsAdmins[command](sock, msg, from, args, msgInfoObj), "admins");
			} else {
				return sendMessageWTyping(
					from,
					{ text: "```🚫 Access Denied! This command requires Group Admin privileges.```" },
					{ quoted: msg }
				);
			}
		} else if (commandsOwners[command]) {
			if (isOwner || moderatos.includes(senderNumber)) {
				return runHandler(() => commandsOwners[command](sock, msg, from, args, msgInfoObj), "owners");
			} else {
				return sendMessageWTyping(
					from,
					{ text: "```🚫 Access Denied! Only the Bot Owner can use this command.```" },
					{ quoted: msg }
				);
			}
		}
	} catch (error) {
		console.error("❌ Error processing message:", error.message);
		console.error("📍 Error stack:", error.stack);
		try {
			const safeFrom = (from && typeof from === "string") ? from : (msg?.key?.remoteJid || "");
			if (safeFrom && sock) {
				await sock.sendMessage(safeFrom, { text: `❌ *Error processing command:*\n_${error.message}_` }, { quoted: msg });
			}
		} catch (_) {}
	}
};

export default getCommand;
