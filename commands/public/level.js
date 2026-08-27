import { member } from "../../sqlite-DB/membersDataDb.js";
import { progressBar, sendWithTyping, brandedFooter, sectionHeader } from "../../functions/messageFormatter.js";

const xpForLevel = (level) => level * level * 100;

const computeLevel = (xp) => {
	let level = 1;
	while (xp >= xpForLevel(level + 1)) level++;
	return level;
};

const rankTitle = (lvl) =>
	lvl >= 50 ? "👑 Legend" :
	lvl >= 25 ? "💎 Elite" :
	lvl >= 15 ? "🔥 Veteran" :
	lvl >= 10 ? "⚡ Active" :
	lvl >= 5 ? "🌟 Regular" :
	lvl >= 2 ? "🌱 Newbie" : "🐣 Rookie";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command, senderJid, updateName } = msgInfoObj;

	const subcmd = (args[0] || "view").toLowerCase();

	// ── /lb / leaderboard ────────────────────────────────────────────
	if (["lb", "leaderboard", "top", "rank"].includes(subcmd)) {
		try {
			const all = await member.find({}).toArray();
			const ranked = all
				.filter((m) => (m.xp || 0) > 0)
				.sort((a, b) => (b.xp || 0) - (a.xp || 0))
				.slice(0, 10);

			if (ranked.length === 0) {
				return sendMessageWTyping(
					from,
					{ text: `🏆 *Leaderboard*\n\n_No data yet. Keep chatting to earn XP!_` },
					{ quoted: msg }
				);
			}

			const medals = ["🥇", "🥈", "🥉"];
			const lines = ranked.map((m, i) => {
				const medal = medals[i] || `\`${i + 1}.\``;
				const lvl = computeLevel(m.xp || 0);
				const name = (m.username || m._id?.split("@")[0] || "Unknown").slice(0, 20);
				const bar = progressBar(Math.min(100, Math.round(((m.xp || 0) / xpForLevel(lvl + 1)) * 100)), 6);
				return `${medal} *${name}*\n └ Lvl ${lvl} ${bar}`;
			});

			const text =
`🏆 *TOP 10 LEADERBOARD*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${lines.join("\n\n")}

_Earn XP by sending messages!_
_View your stats: \`${prefix}level\`_${brandedFooter()}`;

			return sendMessageWTyping(from, { text }, { quoted: msg });
		} catch (err) {
			console.error("leaderboard error:", err);
			return sendMessageWTyping(
				from,
				{ text: `❌ Failed to load leaderboard.` },
				{ quoted: msg }
			);
		}
	}

	// ── Default: show your level ─────────────────────────────────────
	try {
		const data = await member.findOne({ _id: senderJid });
		const xp = data?.xp || 0;
		const totalmsg = data?.totalmsg || 0;
		const level = computeLevel(xp);
		const xpThisLevel = xp - xpForLevel(level);
		const xpForNext = xpForLevel(level + 1) - xpForLevel(level);
		const progressPct = Math.min(100, Math.round((xpThisLevel / xpForNext) * 100));

		const title = rankTitle(level);

		const text =
`🎖️ *YOUR LEVEL*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${sectionHeader("👤", "Profile")} *${updateName || "User"}*
${sectionHeader("🏅", "Rank")} ${title}
${sectionHeader("📈", "Level")} ${level}

${sectionHeader("✨", "XP Progress")}
${progressBar(progressPct)}
\`${xpThisLevel} / ${xpForNext}\` (Total: ${xp})

${sectionHeader("💬", "Messages")} ${totalmsg}

_Keep chatting to level up!_
_View top 10: \`${prefix}level lb\`_${brandedFooter()}`;

		return sendMessageWTyping(from, { text }, { quoted: msg });
	} catch (err) {
		console.error("level error:", err);
		return sendMessageWTyping(
			from,
			{ text: `❌ Failed to load your level.` },
			{ quoted: msg }
		);
	}
};

export default () => ({
	cmd: ["level", "lvl", "rank"],
	desc: "View your XP/level or the leaderboard (level lb)",
	usage: "level | level lb",
	handler,
});
