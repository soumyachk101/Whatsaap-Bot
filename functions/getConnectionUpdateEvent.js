import { DisconnectReason } from "baileys";
import QRCode from "qrcode";
import { clearSQLiteAuthState } from "./useSQLiteAuthState.js";
import sendToTelegram from "./telegramLogger.js";
import { groupMetadataCache, prewarmGroupCacheFromDb } from "./getSocket.js";
import { group } from "../sqlite-DB/groupDataDb.js";

let lastPrewarmTime = 0;
const PREWARM_COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes cooldown between bulk fetches

const getConnectionUpdate = async (sock, startSock, events) => {
	const update = events;
	const { connection, lastDisconnect, qr } = update;

	console.log("Connection update:", connection);

	if (connection === "close") {
		const error = lastDisconnect?.error;
		const statusCode = error?.output?.statusCode;
		const errorMessage = error?.message || "";

		console.log("Connection closed. Reason:", statusCode);
		console.log("Error details:", errorMessage);

		// Clean up this socket instance
		try {
			if (sock.ws) {
				sock.ws.close();
				sock.ws.terminate?.();
			}
			sock.end?.();
		} catch (e) {}

		const isConflict = errorMessage.toLowerCase().includes("conflict") || statusCode === 440;
		const isTrueLogout = statusCode === DisconnectReason.loggedOut && !isConflict;

		if (isTrueLogout) {
			console.log("❌ Device logged out, manual re-authentication required");
			clearSQLiteAuthState();
			sendToTelegram(
				`🚨 <b>Bot Logged Out</b>\n` +
				`━━━━━━━━━━━━━━\n` +
				`⚠️ Device was logged out from WhatsApp.\n` +
				`🔑 Manual re-authentication required.`
			);
			setTimeout(() => {
				startSock("logged-out-reauth");
			}, 5000);
		} else if (isConflict) {
			console.log("⚠️ Session conflict detected (another device or deploy connected). Waiting 15s before reconnecting...");
			setTimeout(() => {
				startSock("reconnect-after-conflict");
			}, 15000);
		} else {
			const reason = `Status ${statusCode}`;
			console.log(`🔄 Reconnecting... Reason: ${reason}`);
			sendToTelegram(
				`🔄 <b>Bot Disconnected</b>\n` +
				`━━━━━━━━━━━━━━\n` +
				`📋 <b>Reason:</b> ${reason}\n` +
				`⏳ Reconnecting in 5 seconds...`
			);
			setTimeout(() => {
				startSock("reconnect");
			}, 5000);
		}
	} else if (connection === "connecting") {
		console.log("🔗 Connecting to WhatsApp...");
	} else if (connection === "open") {
		console.log("✅ Successfully connected to WhatsApp!");
		console.log("📱 Ready to receive and process messages");
		sendToTelegram(
			`✅ <b>Bot Connected</b>\n` +
			`━━━━━━━━━━━━━━\n` +
			`📱 Successfully connected to WhatsApp.`
		);

		// 1. Instant 0ms pre-warm from database (no network, instant availability)
		prewarmGroupCacheFromDb().catch(() => {});

		// 2. Background pre-warm group metadata cache with cooldown and stabilized delay
		const now = Date.now();
		if (sock && typeof sock.groupFetchAllParticipating === "function" && (now - lastPrewarmTime > PREWARM_COOLDOWN_MS)) {
			lastPrewarmTime = now;
			setTimeout(async () => {
				try {
					console.log("⚡ Pre-warming group metadata cache from WhatsApp...");
					const groups = await sock.groupFetchAllParticipating();
					let count = 0;
					for (const [jid, metadata] of Object.entries(groups)) {
						groupMetadataCache.set(jid, metadata);
						count++;
						// Persist participants to DB for resilience
						if (Array.isArray(metadata.participants)) {
							const participantIds = metadata.participants.map(p => ({
								id: p.id,
								admin: p.admin || null,
								lid: p.lid || null
							}));
							group.updateOne(
								{ _id: jid },
								{
									$set: {
										grpName: metadata.subject || "Group",
										desc: metadata.desc ? metadata.desc.toString() : "",
										participants: participantIds
									}
								},
								{ upsert: true }
							).catch(() => {});
						}
					}
					console.log(`✅ Cached metadata for ${count} groups! (0ms lookups active)`);
				} catch (err) {
					if (err.message && err.message.includes("rate-overlimit")) {
						console.log("ℹ️ WhatsApp bulk rate-limit active. Group metadata will load on-demand with DB fallback.");
					} else {
						console.warn("⚠️ Background group metadata pre-warm skipped:", err.message);
					}
				}
			}, 8000); // 8s delay gives WhatsApp connection time to stabilize
		}
	}

	if (qr) {
		console.log("📱 QR Code received — scan with WhatsApp (Linked Devices):");
		QRCode.toString(qr, { type: "terminal", small: true }, (err, str) => {
			if (err) console.error("Failed to render QR in terminal:", err.message);
			else console.log(str);
		});
	}
};

export default getConnectionUpdate;
