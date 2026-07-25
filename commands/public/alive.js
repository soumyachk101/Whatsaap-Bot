import os from "os";
import { execSync } from "child_process";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, startTime, updateName } = msgInfoObj;

	const uptime = process.uptime();
	const hours = Math.floor(uptime / 3600);
	const minutes = Math.floor((uptime % 3600) / 60);
	const seconds = Math.floor(uptime % 60);
	const simpleUptime = `${hours}h ${minutes}m ${seconds}s`;

	const diff = process.hrtime(startTime);
	const responseTime = (diff[0] * 1e9 + diff[1]) / 1e6;
	const responseTimeInSeconds = responseTime / 1000;

	const memoryUsage = process.memoryUsage();
	const usedMB = (memoryUsage.rss / 1024 / 1024).toFixed(2);

	const friendlyPlatform = process.env.PLATFORM_NAME || "MacOS";
	const arch = process.env.PLATFORM_ARCH || "ARM64";
	const platform = `${friendlyPlatform} (${arch})`;
	const cpu = process.env.CPU_NAME || "Apple M5";

	const response =
		`*👋🏻 Hello ${updateName}*\n\n` +
		`*🎾 DownloadBuddy is Online!*\n` +
		`*🟢 Response Time:* ${
			responseTime >= 1000 ? `${responseTimeInSeconds.toFixed(2)}s` : `${responseTime.toFixed(2)}ms`
		}\n` +
		`*⏱️ Uptime:* ${simpleUptime}\n` +
		`*🧠 RAM Usage:* ${usedMB} MB\n` +
		`*💻 CPU:* ${cpu}\n` +
		`*🌍 Platform:* ${platform}`;

	return sendMessageWTyping(from, { text: response }, { quoted: msg });
};

export default () => ({
	cmd: ["a", "alive", "ping"],
	desc: "Check if bot is alive",
	usage: "alive | ping | a",
	handler,
});
