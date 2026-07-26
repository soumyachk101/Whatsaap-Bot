import { group } from "../../../sqlite-DB/groupDataDb.js";
import { member } from "../../../sqlite-DB/membersDataDb.js";

const more = String.fromCharCode(8206);
const readMore = more.repeat(4001);

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { isGroup, sendMessageWTyping } = msgInfoObj;

	try {
		if (isGroup) {
			const groupDb = await group.findOne({ _id: from });
			if (!groupDb || !groupDb.members || groupDb.members.length === 0) {
				return sendMessageWTyping(from, { text: "❌ No chat history recorded for this group yet." }, { quoted: msg });
			}

			const sorted = [...groupDb.members].sort((a, b) => (b.count || 0) - (a.count || 0));
			const top10 = sorted.slice(0, 10);
			const medals = ["🥇", "🥈", "🥉"];

			let text = `🏆 *GROUP LEADERBOARD* 🏆\n` +
				       `━━━━━━━━━━━━━━━━━━━━\n` +
				       `📌 *Group:* ${groupDb.grpName || "Current Group"}\n` +
				       `👥 *Tracked Members:* ${sorted.length}\n\n`;

			const mentions = [];
			top10.forEach((m, idx) => {
				const medal = medals[idx] || `*#${idx + 1}*`;
				const jid = m.id || "";
				if (jid.includes("@")) mentions.push(jid);
				const userHandle = jid.includes("@") ? `@${jid.split("@")[0]}` : (m.name || "User");
				text += `${medal} ${userHandle} - *${(m.count || 0).toLocaleString()}* msgs\n`;
			});

			if (sorted.length > 10) {
				text += `\n${readMore}\n*📜 Extended Rankings:* \n`;
				sorted.slice(10).forEach((m, idx) => {
					text += `${idx + 11}. ${m.name || m.id.split("@")[0]} - ${(m.count || 0).toLocaleString()} msgs\n`;
				});
			}

			text += `\n━━━━━━━━━━━━━━━━━━━━\n` +
				    `✨ _Keep chatting to climb the leaderboard!_`;

			await sendMessageWTyping(from, { text, mentions }, { quoted: msg });
		} else {
			// Global leaderboard for DMs
			const allMembers = await member.find({}).sort({ totalmsg: -1 }).limit(10).toArray();
			if (!allMembers || allMembers.length === 0) {
				return sendMessageWTyping(from, { text: "❌ No member stats available yet." }, { quoted: msg });
			}

			const medals = ["🥇", "🥈", "🥉"];
			let text = `🌍 *GLOBAL LEADERBOARD* 🌍\n` +
				       `━━━━━━━━━━━━━━━━━━━━\n` +
				       `👥 *Top Active Users Across All Groups:*\n\n`;

			allMembers.forEach((m, idx) => {
				const medal = medals[idx] || `*#${idx + 1}*`;
				const name = m.username || m._id.split("@")[0];
				text += `${medal} *${name}* - ${(m.totalmsg || 0).toLocaleString()} msgs\n`;
			});

			text += `\n━━━━━━━━━━━━━━━━━━━━`;
			await sendMessageWTyping(from, { text }, { quoted: msg });
		}
	} catch (err) {
		console.error("[Leaderboard Error]", err.message);
		sendMessageWTyping(from, { text: "❌ Failed to generate leaderboard." }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["leaderboard", "top", "rankings", "topmembers"],
	desc: "Show top active members leaderboard",
	usage: "leaderboard | top",
	handler,
});
