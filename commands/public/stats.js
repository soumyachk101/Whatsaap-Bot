import { getMemberData, member } from "../../sqlite-DB/membersDataDb.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, senderJid, updateName } = msgInfoObj;

	try {
		const personalData = await getMemberData(senderJid);
		
		// Global stats
		const allMembers = await member.find({}).toArray();
		const totalDownloads = allMembers.reduce((acc, m) => acc + (m.videototal || 0) + (m.pdftotal || 0), 0);
		const totalUsers = allMembers.length;

		let statsMsg = `📊 *Bot Statistics*\n\n`;
		statsMsg += `🌍 *Global Downloads:* \`${totalDownloads}\`\n`;
		statsMsg += `👥 *Total Users:* \`${totalUsers}\`\n\n`;
		
		if (personalData && personalData !== -1) {
			statsMsg += `👤 *Your Stats:* \n`;
			statsMsg += `▸ Messages: \`${personalData.totalmsg || 0}\`\n`;
			statsMsg += `▸ Downloads: \`${(personalData.videototal || 0) + (personalData.pdftotal || 0)}\`\n`;
			statsMsg += `▸ Stickers: \`${personalData.stickertotal || 0}\`\n`;
		}

		return sendMessageWTyping(from, { text: statsMsg }, { quoted: msg });
	} catch (error) {
		console.error("Stats Error:", error);
		return sendMessageWTyping(from, { text: "❌ *Error fetching stats!* 🙏" }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["stats", "mystats"],
	desc: "View bot and your statistics",
	usage: "stats",
	handler,
});
