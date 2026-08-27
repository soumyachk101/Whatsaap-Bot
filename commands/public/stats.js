import { statCard, sectionHeader, sendWithTyping, brandedFooter } from "../../functions/messageFormatter.js";
import { getMemberData, member } from "../../sqlite-DB/membersDataDb.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, senderJid } = msgInfoObj;

	try {
		const [memberData, allMembers] = await Promise.all([
			getMemberData(senderJid),
			member.find({}).toArray(),
		]);

		const totalDownloads = allMembers.reduce((acc, m) => acc + (m.videototal || 0) + (m.pdftotal || 0), 0);
		const totalUsers = allMembers.length;
		const totalMsgs = allMembers.reduce((acc, m) => acc + (m.totalmsg || 0), 0);

		const myDownloads = (memberData?.videototal || 0) + (memberData?.pdftotal || 0);
		const myMsgs = memberData?.totalmsg || 0;
		const myStickers = memberData?.stickertotal || 0;
		const myImages = memberData?.imagetotal || 0;
		const myVideos = memberData?.videototal || 0;
		const msgShare = totalMsgs > 0 ? Math.round((myMsgs / totalMsgs) * 100) : 0;

		const response = `📊 *BOT STATISTICS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${sectionHeader("🌍", "Global")}
${statCard([
	{ label: "Total Users", value: totalUsers },
	{ label: "Messages", value: totalMsgs.toLocaleString() },
	{ label: "Downloads", value: totalDownloads.toLocaleString() },
])}

${sectionHeader("👤", "Your Stats")}
${statCard([
	{ label: "Messages", value: myMsgs },
	{ label: "Downloads", value: myDownloads },
	{ label: "Stickers", value: myStickers },
	{ label: "Images", value: myImages },
	{ label: "Videos", value: myVideos },
	{ label: "Share", value: `${msgShare}%` },
])}

_Keep chatting to climb the leaderboard!_${brandedFooter()}`;

		return sendMessageWTyping(from, { text: response }, { quoted: msg });
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
