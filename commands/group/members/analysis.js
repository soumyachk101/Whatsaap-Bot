import { group } from "../../../sqlite-DB/groupDataDb.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { isGroup, sendMessageWTyping } = msgInfoObj;

	if (!isGroup) {
		return sendMessageWTyping(from, { text: "❌ Chat analysis command can only be used inside groups." }, { quoted: msg });
	}

	try {
		const groupDb = await group.findOne({ _id: from });
		if (!groupDb || !groupDb.members || groupDb.members.length === 0) {
			return sendMessageWTyping(from, { text: "❌ No analytics data recorded for this group yet." }, { quoted: msg });
		}

		const items = groupDb.members || [];
		const totalMsgs = groupDb.totalMsgCount || items.reduce((sum, m) => sum + (m.count || 0), 0) || 1;

		const totalText = items.reduce((sum, m) => sum + (m.texttotal || 0), 0);
		const totalImage = items.reduce((sum, m) => sum + (m.imagetotal || 0), 0);
		const totalVideo = items.reduce((sum, m) => sum + (m.videototal || 0), 0);
		const totalSticker = items.reduce((sum, m) => sum + (m.stickertotal || 0), 0);
		const totalPdf = items.reduce((sum, m) => sum + (m.pdftotal || 0), 0);

		const textPct = Math.round((totalText / totalMsgs) * 100) || 0;
		const imagePct = Math.round((totalImage / totalMsgs) * 100) || 0;
		const videoPct = Math.round((totalVideo / totalMsgs) * 100) || 0;
		const stickerPct = Math.round((totalSticker / totalMsgs) * 100) || 0;
		const pdfPct = Math.round((totalPdf / totalMsgs) * 100) || 0;

		const sorted = [...items].sort((a, b) => (b.count || 0) - (a.count || 0));
		const topUser = sorted[0];
		const topUserJid = topUser?.id || "";

		let engagementLevel = "Low Activity 💤";
		if (totalMsgs > 5000) engagementLevel = "Ultra Active 🔥⚡";
		else if (totalMsgs > 1000) engagementLevel = "Highly Active 🔥";
		else if (totalMsgs > 200) engagementLevel = "Moderately Active 💬";

		let text = `📊 *CHAT ANALYTICS & INSIGHTS* 📊\n` +
			       `━━━━━━━━━━━━━━━━━━━━━━\n` +
			       `📌 *Group Name:* ${groupDb.grpName || "Current Group"}\n` +
			       `👥 *Tracked Members:* ${items.length}\n` +
			       `💬 *Total Group Messages:* ${totalMsgs.toLocaleString()}\n` +
			       `⚡ *Engagement Rating:* ${engagementLevel}\n\n` +
			       `📈 *Content Breakdown:*\n` +
			       `  • 💬 Text Messages: *${totalText.toLocaleString()}* (${textPct}%)\n` +
			       `  • 🖼️ Images: *${totalImage.toLocaleString()}* (${imagePct}%)\n` +
			       `  • 🎥 Videos: *${totalVideo.toLocaleString()}* (${videoPct}%)\n` +
			       `  • 🎭 Stickers: *${totalSticker.toLocaleString()}* (${stickerPct}%)\n` +
			       `  • 📄 PDFs & Docs: *${totalPdf.toLocaleString()}* (${pdfPct}%)\n\n`;

		const mentions = [];
		if (topUser) {
			if (topUserJid.includes("@")) mentions.push(topUserJid);
			const topName = topUserJid.includes("@") ? `@${topUserJid.split("@")[0]}` : (topUser.name || "User");
			text += `👑 *Top Contributor:* ${topName} (${(topUser.count || 0).toLocaleString()} msgs)\n`;
		}

		text += `━━━━━━━━━━━━━━━━━━━━━━`;

		await sendMessageWTyping(from, { text, mentions }, { quoted: msg });
	} catch (err) {
		console.error("[Chat Analysis Error]", err.message);
		sendMessageWTyping(from, { text: "❌ Failed to generate chat analysis." }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["analysis", "chatanalytics", "chatstats", "grpstats"],
	desc: "Get detailed chat analysis & content breakdown for the group",
	usage: "analysis | chatanalytics",
	handler,
});
