import { cmdToText } from "../../functions/getAddCommands.js";
import { box, brandedFooter } from "../../functions/messageFormatter.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { prefix, sendMessageWTyping } = msgInfoObj;
	try {
		const { ownerCommands } = await cmdToText();

		const formattedCmds = ownerCommands.map((cmd) => {
			const primary = cmd.cmd[0];
			const others = cmd.cmd.slice(1);
			const aliasText = others.length > 0 ? ` (${others.map(a => `${prefix}${a}`).join(", ")})` : "";
			return `◦ *${prefix}${primary}*${aliasText}\n └─ _${cmd.desc}_\n └─ _Usage: ${prefix}${cmd.usage}_`;
		}).join("\n\n");

		const owner = box(
			[formattedCmds, "", "♥ мα∂є ωιтн ℓσνє, υѕє ωιтн ℓσνє ♥️"],
			"OWNER COMMANDS"
		);

		sendMessageWTyping(from, { text: owner + brandedFooter() }, { quoted: msg });
	} catch (err) {
		console.error("Owner help error:", err);
		sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["owner", "ownerhelp", "ownermenu"],
	desc: "Owner help menu",
	usage: "owner",
	handler,
});
