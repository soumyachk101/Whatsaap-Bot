import { cmdToText } from "../../functions/getAddCommands.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	let { isGroup, sendMessageWTyping, updateName, senderJid, isOwner } = msgInfoObj;
	let prefix = msgInfoObj.prefix || (process.env.PREFIX ? process.env.PREFIX.trim() : "#");
	const botName = process.env.BOT_NAME || "DownloadBuddy";
	const ownerName = process.env.OWNER_NAME || "Soumya Chakraborty";
	const botVersion = "2.2.0";

	const { publicCommands, groupCommands, adminCommands, ownerCommands } = await cmdToText();
	const allCommands = [...publicCommands, ...groupCommands, ...adminCommands, ...ownerCommands];

	// ─── Single Command Lookup: #help <command> ─────────────────────────
	if (args.length > 0) {
		const targetCmd = args[0].toLowerCase().replace(/^[#./!]/, "");
		const found = allCommands.find((c) => Array.isArray(c.cmd) && c.cmd.includes(targetCmd));

		if (found) {
			const prefMap = { a: "alive", fb: "facebook", l: "lyrics", tr: "translate", un: "udemy", ud: "urban", bb: "broadcast" };
			const cmdName = found.cmd.find(a => a.toLowerCase() === targetCmd) || prefMap[found.cmd[0]] || found.cmd[0];
			const aliases = found.cmd.filter(a => a.toLowerCase() !== cmdName.toLowerCase()).map((a) => `${prefix}${a}`).join(", ");
			const desc = found.desc || "No description available.";
			const usage = found.usage ? `${prefix}${found.usage}` : `${prefix}${cmdName}`;

			const info = [
				`╭━━『 *Command Info* 』━━╮`,
				"",
				"┏━━━━━━━━━━━━━━━━━",
				`┃ 📌 ${prefix}${cmdName}`,
				"┗━━━━━━━━━━━━━━━━━",
				`│ 📝 *Description:* ${desc}`,
				`│ 💡 *Usage:* \`${usage}\``,
				...(aliases ? [`│ 🏷️ *Aliases:* ${aliases}`] : []),
				"╰━━━━━━━━━━━━━━━━━",
				"",
				`💡 Type ${prefix}help to see all commands`,
				`🌟 Bot Version: ${botVersion}`,
			].join("\n");

			return await sendMessageWTyping(from, { text: info }, { quoted: msg });
		} else {
			const notFound = [
				`╭━━『 *Command Not Found* 』━━╮`,
				"",
				`❌ Command \`${prefix}${targetCmd}\` was not found.`,
				"",
				`💡 Type \`${prefix}help\` to see all available commands.`,
			].join("\n");

			return await sendMessageWTyping(from, { text: notFound }, { quoted: msg });
		}
	}

	// ─── Build Full Menu ────────────────────────────────────────────────
	const downloaderKeywords = ["download", "dl", "d", "v", "video", "song", "play", "music", "insta", "i", "fb", "facebook", "fbdl", "yt", "ytv", "vs", "yta", "twitter", "tw", "x", "pin", "mp3", "mp4", "reddit", "idp", "dp", "tiktok", "tt", "mp3convt", "tomp3"];
	const aiKeywords = ["downloadbuddy", "db", "gemini", "groq", "llama", "roast", "shayari", "rap", "fortune", "story", "recipe", "imagine", "dream", "gen", "genimg", "imagen", "gen2", "genimg2", "flashgen", "make", "chatbot", "aimodes", "ai"];
	const stickerKeywords = ["sticker", "s", "attp", "textsticker", "ts", "stickertext", "steal", "stealn", "meme", "image", "toimg", "removebg", "bg", "text", "txt", "texmeme", "sets", "stealtext", "customstealtext"];
	const searchKeywords = ["google", "gs", "search", "yts", "img", "news", "newscategories", "newscate", "categories", "cate", "wiki"];
	const utilityKeywords = ["calc", "calculate", "tr", "translate", "weather", "w", "remind", "reminder", "lyrics", "lyric", "l", "dictionary", "dict", "ud", "urban", "advice", "fact", "horo", "horoscope", "quote", "proquote", "qpt", "qpoetry", "say", "tts", "transcribe", "tr2", "voice2text", "vtt", "crypto", "price", "coin", "convert", "currency", "password", "passwd", "pass", "genpass", "qr", "qrcode", "note", "notes", "bookmark", "save", "todo", "todos", "task", "pomo", "pomodoro", "focus", "timer", "true", "truecaller", "birthday", "bday", "bdy", "gender", "runcode", "un", "udemy"];
	const funKeywords = ["ship", "love", "match", "tod", "truthdare", "truth", "dare", "poll", "vote", "confess", "anon", "level", "lvl", "rank", "xp", "epic", "epicgames", "freegames", "leaderboard", "top", "rankings", "topmembers", "nsfw", "donation", "donate", "joke"];
	const systemKeywords = ["help", "menu", "alive", "a", "ping", "stats", "mystats", "dev", "developer", "mycount", "total", "daystats", "dailystats", "daily", "start", "totalg", "analysis", "chatanalytics", "chatstats", "grpstats", "delete", "delmsg", "getwarn"];

	const categorize = (cmd) => {
		const aliases = cmd.cmd || [];
		if (aliases.some((a) => downloaderKeywords.includes(a))) return "media";
		if (aliases.some((a) => aiKeywords.includes(a))) return "ai";
		if (aliases.some((a) => stickerKeywords.includes(a))) return "sticker";
		if (aliases.some((a) => searchKeywords.includes(a))) return "search";
		if (aliases.some((a) => systemKeywords.includes(a))) return "general";
		if (aliases.some((a) => utilityKeywords.includes(a))) return "utility";
		if (aliases.some((a) => funKeywords.includes(a))) return "fun";
		return "other";
	};

	const prefMap = {
		a: "alive",
		fb: "facebook",
		l: "lyrics",
		tr: "translate",
		un: "udemy",
		ud: "urban",
		bb: "broadcast",
	};
	const getCmdName = (c) => prefMap[c.cmd[0]] || c.cmd[0];

	const buckets = {
		general: { title: "🧭 GENERAL COMMAND", cmds: [] },
		ai: { title: "🤖 AI COMMAND", cmds: [] },
		media: { title: "🎞️ MEDIA COMMAND", cmds: [] },
		sticker: { title: "🎨 STICKER COMMAND", cmds: [] },
		search: { title: "🔍 SEARCH COMMAND", cmds: [] },
		fun: { title: "🎭 FUN COMMAND", cmds: [] },
		utility: { title: "🔧 UTILITY COMMAND", cmds: [] },
		other: { title: "📦 OTHER COMMAND", cmds: [] },
	};

	const seen = new Set();
	for (const c of [...publicCommands, ...groupCommands]) {
		if (!Array.isArray(c.cmd) || c.cmd.length === 0) continue;
		const name = getCmdName(c);
		if (seen.has(name)) continue;
		seen.add(name);
		const cat = categorize(c);
		buckets[cat].cmds.push(name);
	}

	const adminCmds = [];
	if (isGroup) {
		seen.clear();
		for (const c of adminCommands) {
			if (!Array.isArray(c.cmd) || c.cmd.length === 0) continue;
			const name = getCmdName(c);
			if (seen.has(name)) continue;
			seen.add(name);
			adminCmds.push(name);
		}
	}

	const ownerCmds = [];
	if (isGroup || isOwner) {
		seen.clear();
		for (const c of ownerCommands) {
			if (!Array.isArray(c.cmd) || c.cmd.length === 0) continue;
			const name = getCmdName(c);
			if (seen.has(name)) continue;
			seen.add(name);
			ownerCmds.push(name);
		}
	}

	const total =
		Object.values(buckets).reduce((sum, b) => sum + b.cmds.length, 0) +
		adminCmds.length +
		ownerCmds.length;

	const sections = [];
	for (const key of ["general", "ai", "media", "sticker", "search", "fun", "utility", "other"]) {
		const b = buckets[key];
		if (b.cmds.length === 0) continue;
		b.cmds.sort();
		const lines = [
			"┏━━━━━━━━━━━━━━━━━",
			`┃ ${b.title}`,
			"┗━━━━━━━━━━━━━━━━━",
			...b.cmds.map((cmd) => `│ ➜ ${prefix}${cmd}`),
		];
		sections.push(lines.join("\n"));
	}

	if (adminCmds.length > 0) {
		adminCmds.sort();
		sections.push(
			[
				"┏━━━━━━━━━━━━━━━━━",
				"┃ 🛡️ ADMIN COMMAND",
				"┗━━━━━━━━━━━━━━━━━",
				...adminCmds.map((cmd) => `│ ➜ ${prefix}${cmd}`),
			].join("\n")
		);
	}

	if (ownerCmds.length > 0) {
		ownerCmds.sort();
		sections.push(
			[
				"┏━━━━━━━━━━━━━━━━━",
				"┃ 👑 OWNER COMMAND",
				"┗━━━━━━━━━━━━━━━━━",
				...ownerCmds.map((cmd) => `│ ➜ ${prefix}${cmd}`),
			].join("\n")
		);
	}

	let userName = updateName || (msg.pushName ? msg.pushName : "");
	let greeting = userName ? `@~${userName}` : (senderJid ? `@${senderJid.split("@")[0]}` : "Friend");

	const menu = [
		`╭━━『 *${botName}* 』━━╮`,
		"",
		`👋 Hello ${greeting}!`,
		"",
		`⚡ Prefix: ${prefix}`,
		`📦 Total Commands: ${total}`,
		`👑 Owner: ${ownerName}`,
		"",
		sections.join("\n\n"),
		"╰━━━━━━━━━━━━━━━━━",
		"",
		`💡 Type ${prefix}help <command> for more info`,
		`🌟 Bot Version: ${botVersion}`,
	].join("\n");

	const mentions = senderJid ? [senderJid] : [];
	await sendMessageWTyping(from, { text: menu, mentions }, { quoted: msg });
};

export default () => ({
	cmd: ["help", "menu"],
	desc: "Display organized bot commands menu",
	usage: "help [command]",
	handler,
});
