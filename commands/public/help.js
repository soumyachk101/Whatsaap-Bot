import { cmdToText } from "../../functions/getAddCommands.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	let { isGroup, sendMessageWTyping, updateName, senderJid, isOwner } = msgInfoObj;
	let prefix = msgInfoObj.prefix || (process.env.PREFIX ? process.env.PREFIX.trim() : "#");
	const botName = process.env.BOT_NAME || "DownloadBuddy";
	const ownerName = process.env.OWNER_NAME || "Soumya Chakraborty";
	const botVersion = "2.2.0";

	const { publicCommands, groupCommands, adminCommands, ownerCommands } = await cmdToText();
	const allCommands = [...publicCommands, ...groupCommands, ...adminCommands, ...ownerCommands];

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

	// Curated popular shortcuts / composition commands
	const customShortcuts = {
		download: ["d", "dl"],
		facebook: ["fb"],
		sticker: ["s"],
		insta: ["i"],
		song: ["play", "mp3"],
		alive: ["a", "ping"],
		translate: ["tr"],
		weather: ["w"],
		lyrics: ["l"],
		urban: ["ud"],
		udemy: ["un"],
		search: ["yts"],
		google: ["gs"],
		remove: ["kick"],
		broadcast: ["bb"],
		delete: ["del"],
		gemini: ["ai", "db"],
		say: ["tts"],
		crypto: ["coin", "price"],
		level: ["lvl", "rank"],
		leaderboard: ["top"],
		tod: ["truth", "dare"],
		removebg: ["bg"],
		text: ["txt"],
		attp: ["ts"],
		idp: ["dp"],
		tagall: ["all"],
		imagine: ["gen"],
		password: ["pass"],
		note: ["notes"],
		todo: ["task"],
		calc: ["calculate"],
		analysis: ["chatstats"],
		daystats: ["daily"],
		epicgames: ["epic"],
		confess: ["anon"],
		poll: ["vote"],
		reddit: ["red"],
		ship: ["love"],
		birthday: ["bday"],
	};

	const formatItem = (c) => {
		const name = getCmdName(c);
		const rawAliases = Array.isArray(c.cmd) ? c.cmd : [];
		const predefined = customShortcuts[name];
		const shortcuts = predefined || rawAliases
			.map((a) => a.toLowerCase())
			.filter((a) => a !== name.toLowerCase() && a.length <= 4)
			.sort((x, y) => x.length - y.length || x.localeCompare(y))
			.slice(0, 2);

		const shortcutText = shortcuts.length > 0
			? ` _(${shortcuts.map((s) => `${prefix}${s}`).join(", ")})_`
			: "";
		return `│ ➜ ${prefix}${name}${shortcutText}`;
	};

	// ─── Single Command Lookup: #help <command> ─────────────────────────
	if (args.length > 0) {
		const targetCmd = args[0].toLowerCase().replace(/^[#./!]/, "");
		const found = allCommands.find((c) => Array.isArray(c.cmd) && c.cmd.includes(targetCmd));

		if (found) {
			const cmdName = found.cmd.find((a) => a.toLowerCase() === targetCmd) || prefMap[found.cmd[0]] || found.cmd[0];
			const aliases = found.cmd
				.filter((a) => a.toLowerCase() !== cmdName.toLowerCase())
				.map((a) => `${prefix}${a}`)
				.join(", ");
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
				`💡 Type .help or #help to see all commands`,
				`🌟 Bot Version: ${botVersion}`,
			].join("\n");

			return await sendMessageWTyping(from, { text: info }, { quoted: msg });
		} else {
			const notFound = [
				`╭━━『 *Command Not Found* 』━━╮`,
				"",
				`❌ Command \`${prefix}${targetCmd}\` was not found.`,
				"",
				`💡 Type \`.help\` or \`#help\` to see all available commands.`,
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

	const buckets = {
		general: { title: "🧭 GENERAL COMMAND", items: [] },
		ai: { title: "🤖 AI COMMAND", items: [] },
		media: { title: "🎞️ MEDIA COMMAND", items: [] },
		sticker: { title: "🎨 STICKER COMMAND", items: [] },
		search: { title: "🔍 SEARCH COMMAND", items: [] },
		fun: { title: "🎭 FUN COMMAND", items: [] },
		utility: { title: "🔧 UTILITY COMMAND", items: [] },
		other: { title: "📦 OTHER COMMAND", items: [] },
	};

	const seen = new Set();
	for (const c of [...publicCommands, ...groupCommands]) {
		if (!Array.isArray(c.cmd) || c.cmd.length === 0) continue;
		const name = getCmdName(c);
		if (seen.has(name)) continue;
		seen.add(name);
		const cat = categorize(c);
		buckets[cat].items.push({ name, line: formatItem(c) });
	}

	const adminItems = [];
	if (isGroup) {
		seen.clear();
		for (const c of adminCommands) {
			if (!Array.isArray(c.cmd) || c.cmd.length === 0) continue;
			const name = getCmdName(c);
			if (seen.has(name)) continue;
			seen.add(name);
			adminItems.push({ name, line: formatItem(c) });
		}
	}

	const ownerItems = [];
	if (isGroup || isOwner) {
		seen.clear();
		for (const c of ownerCommands) {
			if (!Array.isArray(c.cmd) || c.cmd.length === 0) continue;
			const name = getCmdName(c);
			if (seen.has(name)) continue;
			seen.add(name);
			ownerItems.push({ name, line: formatItem(c) });
		}
	}

	const total =
		Object.values(buckets).reduce((sum, b) => sum + b.items.length, 0) +
		adminItems.length +
		ownerItems.length;

	const sections = [];
	for (const key of ["general", "ai", "media", "sticker", "search", "fun", "utility", "other"]) {
		const b = buckets[key];
		if (b.items.length === 0) continue;
		b.items.sort((x, y) => x.name.localeCompare(y.name));
		const lines = [
			"┏━━━━━━━━━━━━━━━━━",
			`┃ ${b.title}`,
			"┗━━━━━━━━━━━━━━━━━",
			...b.items.map((i) => i.line),
		];
		sections.push(lines.join("\n"));
	}

	if (adminItems.length > 0) {
		adminItems.sort((x, y) => x.name.localeCompare(y.name));
		sections.push(
			[
				"┏━━━━━━━━━━━━━━━━━",
				"┃ 🛡️ ADMIN COMMAND",
				"┗━━━━━━━━━━━━━━━━━",
				...adminItems.map((i) => i.line),
			].join("\n")
		);
	}

	if (ownerItems.length > 0) {
		ownerItems.sort((x, y) => x.name.localeCompare(y.name));
		sections.push(
			[
				"┏━━━━━━━━━━━━━━━━━",
				"┃ 👑 OWNER COMMAND",
				"┗━━━━━━━━━━━━━━━━━",
				...ownerItems.map((i) => i.line),
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
		`⚡ Prefix: . or #`,
		`📦 Total Commands: ${total}`,
		`👑 Owner: ${ownerName}`,
		"",
		sections.join("\n\n"),
		"╰━━━━━━━━━━━━━━━━━",
		"",
		`💡 Type .help or #help <command> for more info`,
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
