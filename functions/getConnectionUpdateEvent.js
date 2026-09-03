import { DisconnectReason } from "baileys";
import QRCode from "qrcode";
import { clearSQLiteAuthState } from "./useSQLiteAuthState.js";
import sendToTelegram from "./telegramLogger.js";
import { groupMetadataCache } from "./getSocket.js";

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

		// Background pre-warm group metadata cache for instant (0ms) response times
		if (sock && typeof sock.groupFetchAllParticipating === "function") {
			setTimeout(async () => {
				try {
					console.log("⚡ Pre-warming group metadata cache...");
					const groups = await sock.groupFetchAllParticipating();
					let count = 0;
					for (const [jid, metadata] of Object.entries(groups)) {
						groupMetadataCache.set(jid, metadata);
						count++;
					}
					console.log(`✅ Cached metadata for ${count} groups! (0ms lookups active)`);
				} catch (err) {
					console.warn("⚠️ Background group metadata pre-warm skipped:", err.message);
				}
			}, 1500);
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
