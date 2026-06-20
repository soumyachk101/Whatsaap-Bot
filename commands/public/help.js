import dotenv from "dotenv";
dotenv.config();

import { cmdToText } from "../../functions/getAddCommands.js";
import { member } from "../../sqlite-DB/membersDataDb.js";

const more = String.fromCharCode(8206);
const readMore = more.repeat(4001);

const handler = async (sock, msg, from, args, msgInfoObj) => {
	let { isGroup, sendMessageWTyping } = msgInfoObj;
	let prefix = process.env.PREFIX;

	const { publicCommands, groupCommands, adminCommands, ownerCommands } = await cmdToText();

	// Global stats for the header
	const allMembers = await member.find({}).toArray();
	const totalUsers = allMembers.length;

	const adminCmd = adminCommands.filter((cmd) => cmd.cmd.includes("admin"));
	const ownerCmd = ownerCommands.filter((cmd) => cmd.cmd.includes("owner"));

	// Combine all user-accessible commands
	const allUserCommands = [...publicCommands, ...groupCommands];

	// Categorize user commands with stylized names (Comprehensive List)
	const categories = {
		"🤖  *ᴀɪ & ᴄʜᴀᴛ*": [
			"roast", "shayari", "rap", "fortune", "story", "recipe",
			"groq", "llama",
			"chatbot",
			"downloadbuddy", "db", "gemini",
			"runcode",
			"say", "tts",
			"imagine", "gen", "dream",
			"transcribe", "tr2", "voice2text", "vtt"
		],
		"📥  *ᴅᴏᴡɴʟᴏᴀᴅᴇʀs*": [
			"fb", "facebook", "fbdl",
			"mp3", "audio", 
			"mp4", "video", 
			"reddit", 
			"idp", "dp", 
			"song", "play", 
			"yta", 
			"yt", "ytv", "vs", 
			"insta", "i", 
			"twitter", "tw", "x", 
			"pin", 
			"mp3convt", "mp4audio", "tomp3"
		],
		"🎨  *sᴛɪᴄᴋᴇʀs & ᴍᴇᴅɪᴀ*": [
			"sticker", "s", 
			"attp", "textsticker", "ts", "stickertext", 
			"sets", "stealtext",
			"steal", 
			"meme", 
			"image", "toimg", 
			"removebg", "bg", 
			"make", "gen3", 
			"gen", "genimg", "imagen", 
			"gen2", "genimg2", "flashgen"
		],
		"🛠️  *ᴜᴛɪʟɪᴛɪᴇs*": [
			"calc", "calculate", 
			"tr", "translate", 
			"weather", "w", 
			"remind", "reminder", 
			"l", "lyric", "lyrics", 
			"dictionary", "dict", 
			"ud", "urban", 
			"advice", 
			"fact", 
			"gender", 
			"horo", "horoscope", 
			"joke", 
			"quote", 
			"qpt", "qpoetry", 
			"proquote", "pqoute", 
			"true", "truecaller", 
			"getwarn", 
			"un", 
			"delete", "d", "dd"
		],
		"🔍  *sᴇᴀʀᴄʜ*": [
			"google", "gs",
			"search", "yts",
			"img", "imgSearch",
			"news", "categories", "cate"
		],
		"📝  *ᴘʀᴏᴅᴜᴄᴛɪᴠɪᴛʏ*": [
			"todo", "task",
			"note", "notes",
			"pomo", "pomodoro", "focus",
			"birthday", "bday",
			"remind", "reminder"
		],
		"🎮  *ғᴜɴ & ɢᴀᴍᴇs*": [
			"ship",
			"tod", "truthordare",
			"poll", "vote",
			"confess", "confession",
			"level", "rank", "xp"
		],
		"🔐  *ᴘʀɪᴠᴀᴄʏ & sᴇᴄᴜʀɪᴛʏ*": [
			"qr", "qrcode",
			"password", "genpass",
			"true", "truecaller"
		],
		"💰  *ғɪɴᴀɴᴄᴇ*": [
			"crypto", "coin"
		],
		"ℹ️  *ʙᴏᴛ ɪɴғᴏ*": [
			"help", "menu", 
			"alive", "a", "ping", 
			"start", 
			"stats", 
			"donate", "donation", 
			"dev", "developer", 
			"mycount", 
			"myGrpCount", 
			"headerfooter"
		]
	};

	let publicCmdText = "";
	const displayedCmds = new Set();

	for (const [categoryName, cmds] of Object.entries(categories)) {
		const filtered = allUserCommands.filter(c => c.cmd.some(alias => cmds.includes(alias)));
		if (filtered.length > 0) {
			publicCmdText += `\n╭───────────────────────────╮\n`;
			publicCmdText += `   ${categoryName}\n`;
			publicCmdText += `├───────────────────────────┤\n`;
			publicCmdText += filtered.map(cmd => {
				cmd.cmd.forEach(alias => displayedCmds.add(alias));
				const primary = cmd.cmd[0];
				const others = cmd.cmd.slice(1);
				const aliasText = others.length > 0 ? ` (${others.map(a => `${prefix}${a}`).join(", ")})` : "";
				return `  ◦ *${prefix}${primary}*${aliasText}\n      └─ _${cmd.desc}_`;
			}).join("\n") + "\n";
			publicCmdText += `╰───────────────────────────╯\n`;
		}
	}

	// Catch-all for uncategorized commands
	const uncategorized = allUserCommands.filter(c => !c.cmd.some(alias => displayedCmds.has(alias)));
	if (uncategorized.length > 0) {
		publicCmdText += `\n╭───────────────────────────╮\n`;
		publicCmdText += `   📁  *ᴏᴛʜᴇʀ s*\n`;
		publicCmdText += `├───────────────────────────┤\n`;
		publicCmdText += uncategorized.map(cmd => {
			const primary = cmd.cmd[0];
			const others = cmd.cmd.slice(1);
			const aliasText = others.length > 0 ? ` (${others.map(a => `${prefix}${a}`).join(", ")})` : "";
			return `  ◦ *${prefix}${primary}*${aliasText}\n      └─ _${cmd.desc}_`;
		}).join("\n") + "\n";
		publicCmdText += `╰───────────────────────────╯\n`;
	}

	const totalCommands = allUserCommands.length + adminCommands.length + ownerCommands.length;

	const help = `
┏───────────────────┓
    ✨ *DᴏᴡɴʟᴏᴀᴅBᴜᴅᴅʏ* ✨
┗───────────────────┛
${readMore}
╭───────────────────╮
   📊  *ʙᴏᴛ sᴛᴀᴛs*
├───────────────────┤
  ◦ 👥 *Users:* \`${totalUsers}\`
  ◦ 📍 *Prefix:* \`${prefix}\`
  ◦ ⚙️ *Commands:* \`${totalCommands}\`
╰───────────────────╯

╭───────────────────╮
   ✨  *ᴜsᴇʀ ᴄᴏᴍᴍᴀɴᴅs*
╰───────────────────╯
${publicCmdText}

╭───────────────────╮
   🛠️  *ᴀᴅɱɪɴ ᴄᴏɱɱᴀɴᴅs*
├───────────────────┤
${adminCmd.map((cmd) => {
	const primary = cmd.cmd[0];
	const others = cmd.cmd.slice(1);
	const aliasText = others.length > 0 ? ` (${others.map(a => `${prefix}${a}`).join(", ")})` : "";
	return `  ◦ *${prefix}${primary}*${aliasText}\n      └─ _${cmd.desc}_`;
}).join("\n")}
╰───────────────────╯

╭───────────────────╮
   👑  *ᴏᴡɴᴇʀ ᴄᴏɱɱᴀɴᴅs*
├───────────────────┤
${ownerCmd.map((cmd) => {
	const primary = cmd.cmd[0];
	const others = cmd.cmd.slice(1);
	const aliasText = others.length > 0 ? ` (${others.map(a => `${prefix}${a}`).join(", ")})` : "";
	return `  ◦ *${prefix}${primary}*${aliasText}\n      └─ _${cmd.desc}_`;
}).join("\n")}
╰───────────────────╯

  ♥ мα∂є ωιтн ℓσνє, υѕє ωιтн ℓσνє ♥️
  *https://buymeacoffee.com/soumyachk101*`;

	const helpInDm = `
┏───────────────────┓
    ✨ *DᴏᴡɴʟᴏᴀᴅBᴜᴅᴅʏ* ✨
┗───────────────────┛

╭───────────────────╮
   📊  *ʙᴏᴛ sᴛᴀᴛs*
├───────────────────┤
  ◦ 👥 *Users:* \`${totalUsers}\`
  ◦ 📍 *Prefix:* \`${prefix}\`
  ◦ ⚙️ *Commands:* \`${totalCommands}\`
╰───────────────────╯

╭───────────────────╮
   📱  *ᴅɱ ᴄᴏɱɱᴀɴᴅs*
╰───────────────────╯
${publicCmdText}

  ♥ мα∂є ωιтн ℓσνє, υѕє ωιтн ℓσνє ♥️
  *https://buymeacoffee.com/soumyachk101*`;

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
