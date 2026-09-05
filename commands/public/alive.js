import {
	botStatusMessages,
	progressBar,
	statCard,
	sectionHeader,
	sendWithTyping,
	box,
} from "../../functions/messageFormatter.js";
import { getPreferredJID, resolveMemberIdentity, extractPhoneNumber } from "../../functions/lidUtils.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, startTime, updateName, senderJid, senderPhone, groupMetadata } = msgInfoObj;
	try {
		const uptime = process.uptime();
		const hours = Math.floor(uptime / 3600);
		const minutes = Math.floor((uptime % 3600) / 60);
		const seconds = Math.floor(uptime % 60);
		const simpleUptime = `${hours}h ${minutes}m ${seconds}s`;

		const diff = process.hrtime(startTime);
		const responseTime = (diff[0] * 1e9 + diff[1]) / 1e6;
		const responseTimeInSeconds = responseTime / 1000;

		const memoryUsage = process.memoryUsage();
		const usedMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(1);
		const totalMB = (memoryUsage.rss / 1024 / 1024).toFixed(1);
		const memPct = Math.min(100, Math.round((memoryUsage.heapUsed / memoryUsage.rss) * 100));

		const friendlyPlatform = process.env.PLATFORM_NAME || "MacOS";
		const arch = process.env.PLATFORM_ARCH || "ARM64";
		const platform = `${friendlyPlatform} (${arch})`;
		const cpu = process.env.CPU_NAME || "Apple M5";

		const formattedLatency = responseTime >= 1000
			? `${responseTimeInSeconds.toFixed(2)}s`
			: `${Math.round(responseTime)}ms`;

		const statusBadge = responseTime < 500 ? "🟢" : responseTime < 2000 ? "🟡" : "🔴";
		const statusLabel = responseTime < 500 ? "EXCELLENT" : responseTime < 2000 ? "GOOD" : "SLOW";

		const userName = updateName || msg.pushName || "";
		const identity = resolveMemberIdentity(senderJid, groupMetadata, sock);
		const displayNumber = senderPhone || identity.phoneNumber || extractPhoneNumber(senderJid);
		const greetingUser = userName ? `*${userName}*` : (displayNumber ? `@${displayNumber}` : "Friend");
		const mentions = displayNumber ? identity.allJids : [];

		const response =
`🎾 *ENGINE STATUS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${sectionHeader("👤", "Greetings")} ${greetingUser}

${sectionHeader("📡", "Performance")}
${statCard([
	{ label: "Status", value: `${statusBadge} ${statusLabel}` },
	{ label: "Latency", value: formattedLatency },
	{ label: "Uptime", value: simpleUptime },
])}

${sectionHeader("💾", "System")}
${statCard([
	{ label: "Heap", value: `${usedMB} MB` },
	{ label: "RSS", value: `${totalMB} MB` },
	{ label: "CPU", value: cpu },
	{ label: "OS", value: platform },
])}

${progressBar(memPct)}

💡 Type #help to explore commands`;

		return sendMessageWTyping(from, { text: response, mentions }, { quoted: msg });
	} catch (err) {
		console.error("Alive command error:", err);
		return sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["a", "alive", "ping"],
	desc: "Check bot status & performance",
	usage: "alive | ping | a",
	handler,
});
