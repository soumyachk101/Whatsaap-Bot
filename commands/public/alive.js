const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, startTime, updateName, senderJid } = msgInfoObj;
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

		const friendlyPlatform = process.env.PLATFORM_NAME || "MacOS";
		const arch = process.env.PLATFORM_ARCH || "ARM64";
		const platform = `${friendlyPlatform} (${arch})`;
		const cpu = process.env.CPU_NAME || "Apple M5";
		const userName = updateName || senderJid.split("@")[0];

		const formattedLatency = responseTime >= 1000 
			? `${responseTimeInSeconds.toFixed(2)}s` 
			: `${Math.round(responseTime)}ms`;

		const response =
`🎀 *DownloadBuddy Status* 🎀

Hiii ${userName}! 🥰 I'm feeling great today!

✨ *How I'm Doing Right Now:* ✨
  • 🟢 *Status:* \`Happy & Online\` 💖
  • ⚡ *Speed (Latency):* \`${formattedLatency}\` 🚀
  • ⏱️ *Awake For:* \`${simpleUptime}\` ☀️
  • 🧠 *Brain Power (RAM):* \`${usedMB}MB / ${totalMB}MB\` 🍭
  • 💻 *Heart (CPU):* \`${cpu}\`
  • 🌍 *Home (Platform):* \`${platform}\`

🎈 Type \`#help\` to see what we can do together! 🥰`;

		return sendMessageWTyping(from, { text: response }, { quoted: msg });
	} catch (err) {
		console.error("Alive command error:", err);
		return sendMessageWTyping(from, { text: `🥺 Oopsie! Error: ${err.message}` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["a", "alive", "ping"],
	desc: "Check if bot is alive",
	usage: "alive | ping | a",
	handler,
});
