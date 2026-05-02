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

	// Categorize public commands
	const categories = {
		"🤖 AI & Chat": ["say", "tts", "groq", "chat", "aimodes"],
		"📥 Downloaders": ["mp3", "mp4", "reddit", "idp"],
		"🎨 Stickers & Media": ["sticker", "attp", "textsticker", "ts", "steal"],
		"🛠️ Utilities": ["calc", "translate", "weather", "remind"],
		"🔍 Search": ["google", "search"],
		"ℹ️ Bot Info": ["help", "menu", "stats", "alive", "start", "donation"]
	};

	let publicCmdText = "";
	for (const [category, cmds] of Object.entries(categories)) {
		const filtered = publicCommands.filter(c => c.cmd.some(alias => cmds.includes(alias)));
		if (filtered.length > 0) {
			publicCmdText += `\n*${category}*\n`;
			publicCmdText += filtered.map(cmd => `  ▸ \`${prefix}${cmd.cmd[0]}\` - ${cmd.desc}`).join("\n") + "\n";
		}
	}

	const help = `
╔════════════════════════╗
      *DσɯɳʅσαԃBυԃԃყ*
╚════════════════════════╝
${readMore}
👥 *Total Users:* \`${totalUsers}\`
📍 *Prefix:* \`${prefix}\`

--- *Uʂҽɾ Cσɱɱαɳԃʂ* ---
${publicCmdText}
--- *Gɾσυρ Cσɱɱαɳԃʂ* ---
${groupCommands.map((cmd) => `  ▸ \`${prefix}${cmd.cmd[0]}\` - ${cmd.desc}`).join("\n")}

--- *Aԃɱιɳ Cσɱɱαɳԃʂ* ---
${adminCmd.map((cmd) => `  ▸ \`${prefix}${cmd.cmd[0]}\` - ${cmd.desc}`).join("\n")}

--- *Oɯɳҽɾ Cσɱɱαɳԃʂ* ---
${ownerCmd.map((cmd) => `  ▸ \`${prefix}${cmd.cmd[0]}\` - ${cmd.desc}`).join("\n")}

♥ мα∂є ωιтн ℓσνє, υѕє ωιтн ℓσνє ♥️
buymeacoffee.com/soumyachk101`;

	const helpInDm = `
╔════════════════════════╗
      *DσɯɳʅσαԃBυԃԃყ*
╚════════════════════════╝

👥 *Total Users:* \`${totalUsers}\`
📍 *Prefix:* \`${prefix}\`

--- *Dɱ Cσɱɱαɳԃʂ* ---
${directCommands.map((cmd) => `  ▸ \`${prefix}${cmd.cmd[0]}\` - ${cmd.desc}`).join("\n")}

♥ мα∂є ωιтн ℓσνє, υѕє ωιтн ℓσνє ♥️
buymeacoffee.com/soumyachk101`;

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
