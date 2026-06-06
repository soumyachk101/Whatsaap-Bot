import { cmdToText } from "../../functions/getAddCommands.js";

const more = String.fromCharCode(8206);
const readMore = more.repeat(4001);

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { prefix, sendMessageWTyping } = msgInfoObj;
	const { ownerCommands } = await cmdToText();

	const formattedCmds = ownerCommands.map((cmd) => {
		const primary = cmd.cmd[0];
		const others = cmd.cmd.slice(1);
		const aliasText = others.length > 0 ? ` (${others.map(a => `${prefix}${a}`).join(", ")})` : "";
		return `  ◦ *${prefix}${primary}*${aliasText}\n      └─ _${cmd.desc}_\n      └─ _Usage: ${prefix}${cmd.usage}_`;
	}).join("\n\n");

	const owner = `
┏──────────────────┓
   👑 *Oᴡɴᴇʀ Cᴏᴍᴍᴀɴᴅs* 👑
┗──────────────────┛
${readMore}
╭── 「 ᴏᴡɴᴇʀ ʟɪsᴛ 」 ──
${formattedCmds}
╰───────────────

  ♥ мα∂є ωιтн ℓσνє, υѕє ωιтн ℓσνє ♥️`;

	sendMessageWTyping(from, { text: owner });
};

export default () => ({
	cmd: ["owner", "ownerhelp", "ownermenu"],
	desc: "Owner help menu",
	usage: "owner",
	handler,
});
