import dotenv from "dotenv";
dotenv.config();

import { cmdToText } from "../../functions/getAddCommands.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	let { isGroup, sendMessageWTyping, updateName, senderJid } = msgInfoObj;
	let prefix = process.env.PREFIX ? process.env.PREFIX.trim() : "#";

	const { publicCommands, groupCommands, adminCommands, ownerCommands } = await cmdToText();
	const allCommands = [...publicCommands, ...groupCommands, ...adminCommands, ...ownerCommands];

	// ─── Single Command Lookup: #help <command> ─────────────────────────
	if (args.length > 0) {
		const targetCmd = args[0].toLowerCase().replace(/^[#./!]/, "");
		const found = allCommands.find(c => Array.isArray(c.cmd) && c.cmd.includes(targetCmd));

		if (found) {
			const cmdName = found.cmd[0];
			const aliases = found.cmd.slice(1).map(a => `${prefix}${a}`).join(", ");
			const desc = found.desc || "No description available.";
			const usage = found.usage ? `${prefix}${found.usage}` : `${prefix}${cmdName}`;

			const info =
`🎀 *Command Info* 🎀

🌸 *Name:* \`${prefix}${cmdName}\`
📝 *Description:* ${desc}
🪄 *Usage:* \`${usage}\`${aliases ? `\n🏷️ *Aliases:* ${aliases}` : ""}

✨ *Hope this helps!* ✨`;

			return await sendMessageWTyping(from, { text: info }, { quoted: msg });
		} else {
			return await sendMessageWTyping(from, {
				text: `🥺 Oopsie! Command \`${prefix}${targetCmd}\` not found.\n\nType \`${prefix}help\` to see the magic menu! ✨`
			}, { quoted: msg });
		}
	}

	// ─── Build Full Menu ────────────────────────────────────────────────
	const seen = new Set();

	const formatCmdList = (commands) => {
		const lines = [];
		for (const c of commands) {
			if (!Array.isArray(c.cmd) || c.cmd.length === 0) continue;
			const primary = c.cmd[0];
			if (seen.has(primary)) continue;
			seen.add(primary);
			const shortAliases = c.cmd.slice(1, 3).map(a => `${prefix}${a}`).join(" ");
			const aliasStr = shortAliases ? ` _(${shortAliases})_` : "";
			lines.push(` 🍡 \`${prefix}${primary}\`${aliasStr}`);
		}
		return lines.join("\n");
	};

	const downloaderKeywords = ["download", "dl", "d", "v", "song", "play", "music", "insta", "i", "fb", "facebook", "fbdl", "yt", "ytv", "vs", "yta", "twitter", "tw", "x", "pin", "mp3", "mp4", "reddit", "idp", "dp", "tiktok", "tt", "mp3convt", "tomp3"];
	const aiKeywords = ["downloadbuddy", "db", "gemini", "groq", "llama", "roast", "shayari", "rap", "fortune", "story", "recipe", "imagine", "dream", "gen", "genimg", "imagen", "gen2", "genimg2", "flashgen", "make", "chatbot"];
	const stickerKeywords = ["sticker", "s", "attp", "textsticker", "ts", "stickertext", "steal", "stealn", "meme", "image", "toimg", "removebg", "bg", "text", "txt", "texmeme", "sets", "stealtext", "customstealtext"];
	const searchKeywords = ["google", "gs", "search", "yts", "img", "news", "newscategories", "newscate", "categories", "cate", "wiki"];
	const utilityKeywords = ["calc", "calculate", "tr", "translate", "weather", "w", "remind", "reminder", "lyrics", "lyric", "l", "dictionary", "dict", "ud", "urban", "advice", "fact", "horo", "horoscope", "joke", "quote", "proquote", "qpt", "qpoetry", "say", "tts", "transcribe", "tr2", "voice2text", "vtt", "crypto", "price", "coin", "convert", "currency", "password", "passwd", "pass", "genpass", "qr", "qrcode", "note", "notes", "bookmark", "save", "todo", "todos", "task", "pomo", "pomodoro", "focus", "timer", "true", "truecaller", "birthday", "bday", "bdy", "gender", "runcode"];
	const funKeywords = ["ship", "love", "match", "tod", "truthdare", "truth", "dare", "poll", "vote", "confess", "anon", "level", "lvl", "rank", "xp", "epic", "epicgames", "freegames", "leaderboard", "top", "rankings", "topmembers", "nsfw", "donation", "donate"];
	const systemKeywords = ["help", "menu", "alive", "a", "ping", "stats", "mystats", "dev", "developer", "mycount", "total", "daystats", "dailystats", "daily", "start", "totalg", "analysis", "chatanalytics", "chatstats", "grpstats", "delete", "d", "dd", "delmsg", "getwarn"];

	const categorize = (cmd) => {
		const aliases = cmd.cmd || [];
		if (aliases.some(a => downloaderKeywords.includes(a))) return "downloader";
		if (aliases.some(a => aiKeywords.includes(a))) return "ai";
		if (aliases.some(a => stickerKeywords.includes(a))) return "sticker";
		if (aliases.some(a => searchKeywords.includes(a))) return "search";
		if (aliases.some(a => utilityKeywords.includes(a))) return "utility";
		if (aliases.some(a => funKeywords.includes(a))) return "fun";
		if (aliases.some(a => systemKeywords.includes(a))) return "system";
		return "other";
	};

	const allUserCmds = [...publicCommands, ...groupCommands];
	const buckets = { downloader: [], ai: [], sticker: [], search: [], utility: [], fun: [], system: [], other: [] };
	for (const c of allUserCmds) {
		buckets[categorize(c)].push(c);
	}

	const sectionHeaders = {
		downloader: "📥 *Download & Media* 📥",
		ai:         "🤖 *AI & Magic* 🪄",
		sticker:    "🎨 *Stickers & Art* 🎨",
		search:     "🔍 *Search & Explore* 🌍",
		utility:    "🛠️ *Tools & Utility* ⚙️",
		fun:        "🎮 *Fun & Games* 🧸",
		system:     "⚙️ *System Info* 💻",
		other:      "📁 *Other Stuffs* 🌈",
	};

	let sections = [];
	for (const [key, header] of Object.entries(sectionHeaders)) {
		const cmds = buckets[key];
		if (cmds.length === 0) continue;
		const list = formatCmdList(cmds);
		if (list.trim()) {
			sections.push(`${header}\n${list}`);
		}
	}

	if (isGroup && adminCommands.length > 0) {
		seen.clear();
		const adminList = formatCmdList(adminCommands);
		if (adminList.trim()) {
			sections.push(`🔐 *Group Admins Only* 👑\n${adminList}`);
		}
	}

	if (isGroup && ownerCommands.length > 0) {
		seen.clear();
		const ownerList = formatCmdList(ownerCommands);
		if (ownerList.trim()) {
			sections.push(`💖 *Bot Owner Only* 💖\n${ownerList}`);
		}
	}

	const totalCount = allUserCmds.length + adminCommands.length + ownerCommands.length;
	const userName = updateName || senderJid.split("@")[0];

	const menu =
`✨ *DownloadBuddy OG* ✨

Hii ${userName}! 🌸 Welcome to my menu~
Here are all the magical things I can do for you! 🥰

🎀 *Quick Stats:*
  • *Prefix:* \`${prefix}\`
  • *Commands:* \`${totalCount} Total\`
  • *Status:* \`Happy & Online\` 💖

${sections.join("\n\n")}

🎈 *Pro Tip:*
  Type \`${prefix}help <cmd>\` to learn more about a command!
  E.g. \`${prefix}help sticker\` ✨`;

	await sendMessageWTyping(from, { text: menu }, { quoted: msg });
};

export default () => ({
	cmd: ["help", "menu"],
	desc: "Display organized bot commands menu",
	usage: "help [command]",
	handler,
});
