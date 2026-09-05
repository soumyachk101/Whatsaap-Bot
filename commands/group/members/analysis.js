import { group } from "../../../sqlite-DB/groupDataDb.js";
import { resolveMemberIdentity, extractPhoneNumber } from "../../../functions/lidUtils.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { isGroup, sendMessageWTyping, groupMetadata } = msgInfoObj;

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

		const engagementLevel =
			totalMsgs > 5000 ? "🔥 Super Active (Very High Activity)" :
			totalMsgs > 1000 ? "⚡ Moderate (Consistent Conversations)" : "🌱 Low (Slow Activity)";

		const topUser = items.length > 0 ? [...items].sort((a, b) => (b.count || 0) - (a.count || 0))[0] : null;
		const topUserJid = topUser?.id || "";

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
			const idObj = resolveMemberIdentity(topUserJid, groupMetadata, sock);
			const phone = idObj.phoneNumber || extractPhoneNumber(topUserJid);
			if (idObj.allJids.length > 0) {
				for (const aj of idObj.allJids) mentions.push(aj);
			} else if (topUserJid.includes("@")) {
				mentions.push(topUserJid);
			}
			const topName = phone ? `@${phone}` : (topUser.name || "User");
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
