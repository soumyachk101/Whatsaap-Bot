import dotenv from "dotenv";
dotenv.config();

import { cmdToText } from "../../functions/getAddCommands.js";
import { member } from "../../sqlite-DB/membersDataDb.js";

const more = String.fromCharCode(8206);
const readMore = more.repeat(4001);

const handler = async (sock, msg, from, args, msgInfoObj) => {
	let { isGroup, sendMessageWTyping } = msgInfoObj;
	let prefix = process.env.PREFIX ? process.env.PREFIX.trim() : "#";

	const { publicCommands, groupCommands, adminCommands, ownerCommands } = await cmdToText();

	// Global stats for the header
	const allMembers = await member.find({}).toArray();
	const totalUsers = allMembers.length;

	const allUserCommands = [...publicCommands, ...groupCommands];

	const categories = {
		"📥 *DOWNLOADERS*": [
			"download", "dl", "d", "v", "song", "play", "search", "yts",
			"insta", "i", "fb", "facebook", "fbdl", "yt", "ytv", "vs",
			"twitter", "tw", "x", "pin", "mp3", "mp4", "reddit", "idp"
		],
		"🔍 *SEARCH & INFO*": [
			"google", "gs", "search", "yts", "img", "imgSearch", "news"
		],
		"🤖 *AI & CHAT*": [
			"gemini", "roast", "shayari", "rap", "story", "recipe", "groq", "llama",
			"db", "downloadbuddy", "say", "tts", "imagine", "gen", "transcribe"
		],
		"🎨 *STICKERS & MEDIA*": [
			"sticker", "s", "attp", "textsticker", "ts", "steal", "meme",
			"image", "toimg", "removebg", "bg", "genimg", "nsfw"
		],
		"🛠️ *UTILITIES*": [
			"calc", "calculate", "tr", "translate", "weather", "w", "remind",
			"l", "lyrics", "dictionary", "dict", "ud", "advice", "fact",
			"horo", "joke", "quote", "true"
		],
		"🎮 *FUN & GAMES*": [
			"ship", "tod", "poll", "confess", "level", "rank", "xp",
			"epic", "leaderboard", "top"
		],
		"⚙️ *BOT INFO*": [
			"help", "menu", "alive", "ping", "stats", "dev", "mycount", "daily"
		]
	};

	let publicCmdText = "";
	const displayedCmds = new Set();

	for (const [categoryName, cmds] of Object.entries(categories)) {
		const filtered = allUserCommands.filter(c => c.cmd.some(alias => cmds.includes(alias)));
		if (filtered.length > 0) {
			const commandNames = [];
			filtered.forEach(c => {
				const primary = c.cmd[0];
				if (!displayedCmds.has(primary)) {
					displayedCmds.add(primary);
					commandNames.push(`\`${prefix}${primary}\``);
				}
			});
			if (commandNames.length > 0) {
				publicCmdText += `${categoryName}\n${commandNames.join(" • ")}\n\n`;
			}
		}
	}

	// Uncategorized
	const uncategorized = [];
	allUserCommands.forEach(c => {
		const primary = c.cmd[0];
		if (!displayedCmds.has(primary)) {
			displayedCmds.add(primary);
			uncategorized.push(`\`${prefix}${primary}\``);
		}
	});

	if (uncategorized.length > 0) {
		publicCmdText += `📁 *OTHER COMMANDS*\n${uncategorized.join(" • ")}\n\n`;
	}

	const adminCmdNames = adminCommands.map(c => `\`${prefix}${c.cmd[0]}\``).join(" • ");
	const ownerCmdNames = ownerCommands.map(c => `\`${prefix}${c.cmd[0]}\``).join(" • ");

	const totalCommands = allUserCommands.length + adminCommands.length + ownerCommands.length;

	const menuText =
`🤖 *DOWNLOADBUDDY BOT* 🤖
${readMore}
📌 *Prefix:* \`${prefix}\` | 👥 *Users:* \`${totalUsers}\` | ⚡ *Commands:* \`${totalCommands}\`

💡 *Quick DL:* Reply to any link/name with \`${prefix}dl\` or \`${prefix}song\`

${publicCmdText}` +
(isGroup && adminCmdNames ? `🛠️ *ADMIN COMMANDS*\n${adminCmdNames}\n\n` : "") +
(isGroup && ownerCmdNames ? `👑 *OWNER COMMANDS*\n${ownerCmdNames}\n\n` : "") +
`💬 *Developer Info:* \`${prefix}dev\`
✨ *Support:* buymeacoffee.com/soumyachk101`;

	await sendMessageWTyping(from, { text: menuText });
};

export default () => ({
	cmd: ["help", "menu"],
	desc: "Display compact help menu",
	usage: "help",
	handler,
});
