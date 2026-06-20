import { member } from "../../sqlite-DB/membersDataDb.js";

// XP thresholds for each level: level n requires n*n*100 XP (RuneScape-ish curve)
const xpForLevel = (level) => level * level * 100;

const computeLevel = (xp) => {
	let level = 1;
	while (xp >= xpForLevel(level + 1)) level++;
	return level;
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command, senderJid, updateName } = msgInfoObj;

	const subcmd = (args[0] || "view").toLowerCase();

	// ── ─lb / leaderboard ────────────────────────────────────────────
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
				return `${medal} *${name}* — Lvl ${lvl} • \`${m.xp || 0} XP\``;
			});

			const text =
				`🏆 *Top 10 Leaderboard*\n` +
				`━━━━━━━━━━━━━━\n` +
				lines.join("\n") +
				`\n━━━━━━━━━━━━━━\n` +
				`_Earn XP by sending messages!_\n` +
				`_Use \`${prefix}level\` to view your stats._`;

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

		// Progress bar (10 segments)
		const filled = Math.round(progressPct / 10);
		const bar = "▓".repeat(filled) + "░".repeat(10 - filled);

		// Title based on level
		const title =
			level >= 50 ? "👑 Legend" :
			level >= 25 ? "💎 Elite" :
			level >= 15 ? "🔥 Veteran" :
			level >= 10 ? "⚡ Active" :
			level >= 5 ? "🌟 Regular" :
			level >= 2 ? "🌱 Newbie" : "🐣 Rookie";

		const text =
			`📊 *Your Level*\n` +
			`━━━━━━━━━━━━━━\n` +
			`👤 *${updateName || "User"}*\n` +
			`🎖️ *Title:* ${title}\n` +
			`📈 *Level:* ${level}\n` +
			`✨ *XP:* \`${xpThisLevel} / ${xpForNext}\` (Total: ${xp})\n` +
			`💬 *Messages:* ${totalmsg}\n\n` +
			`${bar} \`${progressPct}%\`\n\n` +
			`_Keep chatting to level up!_\n` +
			`_View top 10: \`${prefix}level lb\`_`;

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
