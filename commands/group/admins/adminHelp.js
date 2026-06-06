import { cmdToText } from "../../../functions/getAddCommands.js";

const more = String.fromCharCode(8206);
const readMore = more.repeat(4001);

const handler = async (sock, msg, from, args, msgInfoObj) => {
	let { prefix, sendMessageWTyping } = msgInfoObj;
	const { adminCommands } = await cmdToText();

	const formattedCmds = adminCommands.map((cmd) => {
		const primary = cmd.cmd[0];
		const others = cmd.cmd.slice(1);
		const aliasText = others.length > 0 ? ` (${others.map(a => `${prefix}${a}`).join(", ")})` : "";
		return `  ◦ *${prefix}${primary}*${aliasText}\n      └─ _${cmd.desc}_\n      └─ _Usage: ${prefix}${cmd.usage}_`;
	}).join("\n\n");

	const admin = `
┏──────────────────┓
   🛠️ *Aᴅᴍɪɴ Cᴏᴍᴍᴀɴᴅs* 🛠️
┗──────────────────┛
${readMore}
╭── 「 ᴀᴅɱɪɴ ʟɪsᴛ 」 ──
${formattedCmds}
╰───────────────

  ♥ мα∂є ωιтн ℓσνє, υѕє ωιтн ℓσνє ♥️`;

	sendMessageWTyping(from, { text: admin }, { quoted: msg });
};

export default () => ({
	cmd: ["admin"],
	desc: "Admin commands list",
	usage: "admin",
	handler,
});
