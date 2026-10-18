import getConnectionUpdate from "./getConnectionUpdateEvent.js";
import getCommand from "./getMessagesEvent.js";
import getGroupEvent from "./getGroupEvent.js";
import getCallEvent from "./getCallEvents.js";
import { group, createGroupData, clearGroupCache } from "../sqlite-DB/groupDataDb.js";
import { groupMetadataCache } from "./getSocket.js";

const events = async (sock, startSock, cache) => {
	sock.ev.process(async (event) => {
		try {
			if (event["messages.upsert"]) {
				const { type, messages } = event["messages.upsert"];
				if (type === "notify" || type === "append") {
					const now = Date.now();
					const validMessages = messages.filter((msg) => {
						if (!msg || !msg.message || !msg.key?.remoteJid || Object.keys(msg.message).length === 0) {
							return false;
						}
						const msgTimestamp = (Number(msg.messageTimestamp) * 1000) || now;
						if (sock.startupTime && msgTimestamp < (sock.startupTime - 120_000)) {
							return false;
						}
						return true;
					});

					for (const msg of validMessages) {
						getCommand(sock, msg, cache).catch((err) => {
							console.error("Error processing message:", err);
							console.error("Message key:", msg?.key);
						});
					}
				}
			}

			if (event["connection.update"]) {
				await getConnectionUpdate(sock, startSock, event["connection.update"]);
			}

			if (event["groups.update"]) {
				const updates = event["groups.update"];
				for (const update of updates) {
					if (!update?.id) continue;
					const jid = update.id;
					const setFields = {};
					if (update.subject) setFields.grpName = update.subject;
					if (update.desc) setFields.desc = update.desc.toString();
					if (typeof update.announce !== "undefined") setFields.announce = update.announce;
					if (typeof update.restrict !== "undefined") setFields.restrict = update.restrict;

					if (Object.keys(setFields).length > 0) {
						await group.updateOne({ _id: jid }, { $set: setFields }).catch(() => {});
						clearGroupCache(jid);
						if (cache && typeof cache.del === "function") cache.del(jid + ":groupMetadata");
						const cached = groupMetadataCache.get(jid);
						if (cached) {
							if (update.subject) cached.subject = update.subject;
							if (update.desc) cached.desc = update.desc;
							groupMetadataCache.set(jid, cached);
						}
						console.log(`[groups.update] Updated metadata for group ${jid}:`, setFields);
					}
				}
			}

			if (event["groups.upsert"]) {
				const newGroups = event["groups.upsert"];
				for (const grp of newGroups) {
					if (!grp?.id) continue;
					await createGroupData(grp.id, grp).catch(() => {});
					groupMetadataCache.set(grp.id, grp);
					if (cache && typeof cache.set === "function") cache.set(grp.id + ":groupMetadata", grp, 86400);
					console.log(`[groups.upsert] Registered group ${grp.id} (${grp.subject})`);
				}
			}

			if (event["group-participants.update"]) {
				await getGroupEvent(sock, event["group-participants.update"], cache);
			}

			if (event["call"]) {
				await getCallEvent(sock, event["call"]);
			}
		} catch (err) {
			console.error("Error processing event:", err);
			console.error("Event type:", Object.keys(event));
		}
	});
};

export default events;
