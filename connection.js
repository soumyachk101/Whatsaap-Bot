import NodeCache from "node-cache";

// Optimized cache with TTL and memory management
const cache = new NodeCache({
	stdTTL: 300, // 5 minutes default TTL
	checkperiod: 60, // Check every 1 minute
	useClones: false,
	maxKeys: 300,
	deleteOnExpire: true,
});

import socket from "./functions/getSocket.js";
import events from "./functions/getEvents.js";

let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 15;
let lastConnectionTime = 0;
const MIN_CONNECTION_INTERVAL = 1000; // 1 second interval between attempts

let _onNewSock = null;
export const onNewSock = (fn) => { _onNewSock = fn; };

let pendingRetry = null;

const startSock = async (reason = "initial") => {
	try {
		const now = Date.now();

		if (now - lastConnectionTime < MIN_CONNECTION_INTERVAL) {
			const waitMs = MIN_CONNECTION_INTERVAL - (now - lastConnectionTime);
			clearTimeout(pendingRetry);
			pendingRetry = setTimeout(() => startSock(reason), waitMs);
			return null;
		}

		if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
			console.log("⚠️ Resetting connection attempts count for fresh start...");
			connectionAttempts = 0;
		}

		clearTimeout(pendingRetry);
		pendingRetry = null;
		connectionAttempts++;
		lastConnectionTime = now;
		console.log(`🔄 Starting socket connection (attempt ${connectionAttempts}): ${reason}`);

		const sock = await socket();
		if (sock) {
			if (_onNewSock) _onNewSock(sock);

			events(sock, startSock, cache);
			connectionAttempts = 0; // Reset on successful connection
			console.log("✅ Socket connection established successfully");
		}
		return sock;
	} catch (error) {
		console.error("❌ Error starting socket:", error.message);
		return null;
	}
};

export default startSock;
