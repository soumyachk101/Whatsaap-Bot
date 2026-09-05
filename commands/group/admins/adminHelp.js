import { cmdToText } from "../../../functions/getAddCommands.js";
import {
	box,
	premiumBox,
	brandedFooter,
} from "../../../functions/messageFormatter.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	let { prefix, sendMessageWTyping } = msgInfoObj;
	try {
		const { adminCommands } = await cmdToText();

		const formattedCmds = adminCommands.map((cmd) => {
			const primary = cmd.cmd[0];
			const others = cmd.cmd.slice(1);
			const aliasText = others.length > 0 ? ` (${others.map(a => `${prefix}${a}`).join(", ")})` : "";
			return `◦ *${prefix}${primary}*${aliasText}\n └─ _${cmd.desc}_\n └─ _Usage: ${prefix}${cmd.usage}_`;
		}).join("\n\n");

		const admin = premiumBox(
			[formattedCmds, "", "♥ мα∂є ωιтн ℓσνє, υѕє ωιтн ℓσνє ♥️"],
			"ADMIN COMMANDS", "🔐"
		);

		await sendMessageWTyping(from, { text: admin + brandedFooter() }, { quoted: msg });
	} catch (err) {
		console.error("Admin help error:", err);
		sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["admin"],
	desc: "Admin commands list",
	usage: "admin",
	handler,
});
