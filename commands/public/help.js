import dotenv from "dotenv";
dotenv.config();

import { cmdToText } from "../../functions/getAddCommands.js";
import { member } from "../../sqlite-DB/membersDataDb.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	let { isGroup, sendMessageWTyping } = msgInfoObj;
	let prefix = process.env.PREFIX ? process.env.PREFIX.trim() : "#";

	const { publicCommands, groupCommands, adminCommands, ownerCommands } = await cmdToText();

	// Single command lookup mode (#help song, #help insta)
	if (args.length > 0) {
		const targetCmd = args[0].toLowerCase().replace(/^[#./!]/, "");
		const allCommands = [...publicCommands, ...groupCommands, ...adminCommands, ...ownerCommands];
		const found = allCommands.find(c => Array.isArray(c.cmd) && c.cmd.includes(targetCmd));

		if (found) {
			const cmdName = found.cmd[0];
			const aliases = found.cmd.slice(1).map(a => `${prefix}${a}`).join(", ");
			const desc = found.desc || "No description available.";
			const usage = found.usage ? `${prefix}${found.usage}` : `${prefix}${cmdName}`;

			const singleMenu =
`📌 *COMMAND INFO:* \`${prefix}${cmdName}\`
━━━━━━━━━━━━━━━━━━━━
📝 *Description:* ${desc}
💡 *Usage:* \`${usage}\`` +
(aliases ? `\n🏷️ *Aliases:* ${aliases}` : "");

			return await sendMessageWTyping(from, { text: singleMenu }, { quoted: msg });
		}
	}

	// Dynamic Command Mapping by Categories
	const categories = {
		"📥 *DOWNLOADERS & MEDIA*": [
			"download", "dl", "d", "song", "play", "music", "insta", "i", "ig", 
			"fb", "facebook", "fbdl", "yt", "ytv", "yts", "vs", "twitter", "tw", "x", 
			"pin", "pinterest", "mp3", "mp4", "reddit", "idp"
		],
		"🔍 *SEARCH & INFO*": [
			"google", "gs", "search", "img", "image", "imgsearch", "news", "wiki"
		],
		"🤖 *AI & CHATBOT*": [
			"gemini", "roast", "shayari", "rap", "story", "recipe", "groq", "llama",
			"db", "downloadbuddy", "say", "tts", "imagine", "gen", "transcribe"
		],
		"🎨 *STICKER & CREATIVE*": [
			"sticker", "s", "attp", "textsticker", "ts", "steal", "meme",
			"toimg", "removebg", "bg", "genimg"
		],
		"🛠️ *UTILITIES & TOOLS*": [
			"calc", "calculate", "tr", "translate", "weather", "w", "remind",
			"lyrics", "l", "dictionary", "dict", "ud", "advice", "fact",
			"horo", "joke", "quote"
		],
		"🎮 *FUN & GROUP RANK*": [
			"ship", "tod", "poll", "confess", "level", "rank", "xp",
			"epic", "leaderboard", "top"
		],
		"⚙️ *SYSTEM & BOT INFO*": [
			"help", "menu", "alive", "ping", "stats", "dev", "mycount", "daily"
		]
	};

	const allUserCmds = [...publicCommands, ...groupCommands];
	const displayedCmds = new Set();
	let categoryBlocks = [];

	for (const [catName, aliases] of Object.entries(categories)) {
		const matches = allUserCmds.filter(c => Array.isArray(c.cmd) && c.cmd.some(alias => aliases.includes(alias)));
		if (matches.length > 0) {
			const cmdPills = [];
			matches.forEach(c => {
				const primary = c.cmd[0];
				if (!displayedCmds.has(primary)) {
					displayedCmds.add(primary);
					cmdPills.push(`\`${prefix}${primary}\``);
				}
			});
			if (cmdPills.length > 0) {
				categoryBlocks.push(`${catName}\n${cmdPills.join(" • ")}`);
			}
		}
	}

	// Collect any uncategorized public/member commands
	const uncategorized = [];
	allUserCmds.forEach(c => {
		if (Array.isArray(c.cmd)) {
			const primary = c.cmd[0];
			if (!displayedCmds.has(primary)) {
				displayedCmds.add(primary);
				uncategorized.push(`\`${prefix}${primary}\``);
			}
		}
	});

	if (uncategorized.length > 0) {
		categoryBlocks.push(`📁 *OTHER COMMANDS*\n${uncategorized.join(" • ")}`);
	}

	// Admin Commands
	let adminBlock = "";
	if (isGroup && adminCommands.length > 0) {
		const adminCmdPills = adminCommands.map(c => `\`${prefix}${c.cmd[0]}\``).join(" • ");
		adminBlock = `\n🛠️ *GROUP ADMIN COMMANDS*\n${adminCmdPills}\n`;
	}

	// Owner Commands
	let ownerBlock = "";
	if (isGroup && ownerCommands.length > 0) {
		const ownerCmdPills = ownerCommands.map(c => `\`${prefix}${c.cmd[0]}\``).join(" • ");
		ownerBlock = `\n👑 *OWNER COMMANDS*\n${ownerCmdPills}\n`;
	}

	const totalCmdCount = allUserCmds.length + adminCommands.length + ownerCommands.length;

	const menuHeader =
`✨ *DOWNLOADBUDDY BOT MENU* ✨
📌 *Prefix:* \`${prefix}\` | ⚡ *Total Commands:* \`${totalCmdCount}\`
━━━━━━━━━━━━━━━━━━━━

${categoryBlocks.join("\n\n")}
${adminBlock}${ownerBlock}
━━━━━━━━━━━━━━━━━━━━
💡 *Tip:* Type \`${prefix}help <command>\` for detailed usage!
💬 *Dev Contact:* \`${prefix}dev\``;

	await sendMessageWTyping(from, { text: menuHeader }, { quoted: msg });
};

export default () => ({
	cmd: ["help", "menu"],
	desc: "Display organized bot commands menu",
	usage: "help",
	handler,
});
