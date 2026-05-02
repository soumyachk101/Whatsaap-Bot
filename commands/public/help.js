import dotenv from "dotenv";
dotenv.config();

import { cmdToText } from "../../functions/getAddCommands.js";
import { member } from "../../sqlite-DB/membersDataDb.js";

const more = String.fromCharCode(8206);
const readMore = more.repeat(4001);

const handler = async (sock, msg, from, args, msgInfoObj) => {
	let { isGroup, sendMessageWTyping } = msgInfoObj;
	let prefix = process.env.PREFIX;

	const { publicCommands, groupCommands, adminCommands, ownerCommands, directCommands } = await cmdToText();

	// Global stats for the header
	const allMembers = await member.find({}).toArray();
	const totalUsers = allMembers.length;

	const adminCmd = adminCommands.filter((cmd) => cmd.cmd.includes("admin"));
	const ownerCmd = ownerCommands.filter((cmd) => cmd.cmd.includes("owner"));

	// Combine all user-accessible commands
	const allUserCommands = [...publicCommands, ...groupCommands];

	// Categorize user commands with stylized names (Comprehensive List)
	const categories = {
		"─── 「 🤖 ᴀɪ & ᴄʜᴀᴛ 」 ───": ["say", "tts", "groq", "chat", "aimodes", "chatbot", "downloadbuddy", "cmdrun"],
		"─── 「 📥 ᴅᴏᴡɴʟᴏᴀᴅᴇʀs 」 ───": ["mp3", "mp4", "reddit", "idp", "song", "yta", "ytdl", "insta", "twitter", "pin", "pin-downloader", "insta-downloader", "mp3convt", "y2mate"],
		"─── 「 🎨 sᴛɪᴄᴋᴇʀs & ᴍᴇᴅɪᴀ 」 ───": ["sticker", "attp", "textsticker", "ts", "stickertext", "steal", "meme", "image", "removebg", "imgGen", "imageGen", "imageGen2", "removebg"],
		"─── 「 🛠️ ᴜᴛɪʟɪᴛɪᴇs 」 ───": ["calc", "translate", "weather", "remind", "lyrics", "dictionary", "ud", "advice", "fact", "gender", "horo", "joke", "quote", "qpoetry", "programing-quote", "truecaller", "getwarn", "courseapi"],
		"─── 「 🔍 sᴇᴀʀᴄʜ 」 ───": ["google", "search", "googleSearch", "googleImgSearch", "news", "newsCate"],
		"─── 「 ℹ️ ʙᴏᴛ ɪɴғᴏ 」 ───": ["help", "menu", "stats", "mystats", "alive", "start", "donation", "dev", "mycount", "myGrpCount", "headerfooter"]
	};

	let publicCmdText = "";
	const displayedCmds = new Set();

	for (const [category, cmds] of Object.entries(categories)) {
		const filtered = allUserCommands.filter(c => c.cmd.some(alias => cmds.includes(alias)));
		if (filtered.length > 0) {
			publicCmdText += `\n*${category}*\n`;
			publicCmdText += filtered.map(cmd => {
				cmd.cmd.forEach(alias => displayedCmds.add(alias));
				const aliases = cmd.cmd.map(a => `${prefix}${a}`).join(", ");
				return `  ◦ \`${aliases}\` \n      └─ ${cmd.desc}`;
			}).join("\n") + "\n";
		}
	}

	// Catch-all for uncategorized commands
	const uncategorized = allUserCommands.filter(c => !c.cmd.some(alias => displayedCmds.has(alias)));
	if (uncategorized.length > 0) {
		publicCmdText += `\n*─── 「 📁 ᴏᴛʜᴇʀ s 」 ───*\n`;
		publicCmdText += uncategorized.map(cmd => {
			const aliases = cmd.cmd.map(a => `${prefix}${a}`).join(", ");
			return `  ◦ \`${aliases}\` \n      └─ ${cmd.desc}`;
		}).join("\n") + "\n";
	}

	const help = `
┏──────────────────┓
   ✨ *DᴏᴡɴʟᴏᴀᴅBᴜᴅᴅʏ* ✨
┗──────────────────┛
${readMore}
╭── 「 ʙᴏᴛ sᴛᴀᴛs 」 ──
│ 👥 *ᴜsᴇʀs:* \`${totalUsers}\`
│ 📍 *ᴘʀᴇғɪx:* \`${prefix}\`
╰───────────────

╭── 「 ᴜsᴇʀ ᴄᴏᴍᴍᴀɴᴅs 」 ──
${publicCmdText}
╰───────────────

╭── 「 ᴀᴅɱɪɴ ᴄᴏɱɱᴀɴᴅs 」 ──
${adminCmd.map((cmd) => `  ◦ \`${prefix}${cmd.cmd[0]}\` \n      └─ ${cmd.desc}`).join("\n")}
╰───────────────

╭── 「 ᴏᴡɴᴇʀ ᴄᴏɱɱᴀɴᴅs 」 ──
${ownerCmd.map((cmd) => `  ◦ \`${prefix}${cmd.cmd[0]}\` \n      └─ ${cmd.desc}`).join("\n")}
╰───────────────

  ♥ мα∂є ωιтн ℓσνє, υѕє ωιтн ℓσνє ♥️
  *buymeacoffee.com/soumyachk101*`;

	const helpInDm = `
┏──────────────────┓
   ✨ *DᴏᴡɴʟᴏᴀᴅBᴜᴅᴅʏ* ✨
┗──────────────────┛

╭── 「 ʙᴏᴛ sᴛᴀᴛs 」 ──
│ 👥 *ᴜsᴇʀs:* \`${totalUsers}\`
│ 📍 *ᴘʀᴇғɪx:* \`${prefix}\`
╰───────────────

╭── 「 ᴅɱ ᴄᴏɱɱᴀɴᴅs 」 ──
${publicCmdText}
╰───────────────

  ♥ мα∂є ωιтн ℓσνє, υѕє ωιтн ℓσνє ♥️
  *buymeacoffee.com/soumyachk101*`;

	await sendMessageWTyping(from, {
		text: isGroup ? help : helpInDm,
	});
};

export default () => ({
	cmd: ["help", "menu"],
	desc: "Help menu",
	usage: "help",
	handler,
});
