import { cmdToText } from "../../../functions/getAddCommands.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	let prefix = msgInfoObj.prefix || (process.env.PREFIX ? process.env.PREFIX.trim() : "#");
	let { sendMessageWTyping } = msgInfoObj;
	try {
		const { adminCommands } = await cmdToText();

		const lines = adminCommands.map((cmd) => {
			const primary = cmd.cmd[0];
			const others = cmd.cmd.slice(1);
			const aliasText = others.length > 0 ? ` _(${others.map((a) => `${prefix}${a}`).join(", ")})_` : "";
			return `│ ➜ ${prefix}${primary}${aliasText}\n│    _${cmd.desc}_`;
		});

		const text = [
			"╭━━『 *Admin Commands* 🛡️ 』━━╮",
			"",
			`⚡ Prefix: . or #`,
			`📦 Total: ${adminCommands.length}`,
			"",
			"┏━━━━━━━━━━━━━━━━━",
			"┃ 🛡️ GROUP ADMIN COMMANDS",
			"┗━━━━━━━━━━━━━━━━━",
			...lines,
			"╰━━━━━━━━━━━━━━━━━",
			"",
			`💡 Type \`${prefix}help <command>\` for detailed usage`,
		].join("\n");

		await sendMessageWTyping(from, { text }, { quoted: msg });
	} catch (err) {
		console.error("Admin help error:", err);
		sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["admin", "adminhelp"],
	desc: "Admin commands list",
	usage: "admin",
	handler,
});
