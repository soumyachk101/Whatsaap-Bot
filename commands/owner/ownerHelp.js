import { cmdToText } from "../../functions/getAddCommands.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	let prefix = msgInfoObj.prefix || (process.env.PREFIX ? process.env.PREFIX.trim() : "#");
	let { sendMessageWTyping } = msgInfoObj;
	try {
		const { ownerCommands } = await cmdToText();

		const lines = ownerCommands.map((cmd) => {
			const primary = cmd.cmd[0];
			const others = cmd.cmd.slice(1);
			const aliasText = others.length > 0 ? ` _(${others.map((a) => `${prefix}${a}`).join(", ")})_` : "";
			return `│ ➜ ${prefix}${primary}${aliasText}\n│    _${cmd.desc}_`;
		});

		const text = [
			"╭━━『 *Owner Commands* 👑 』━━╮",
			"",
			`⚡ Prefix: . or #`,
			`📦 Total: ${ownerCommands.length}`,
			"",
			"┏━━━━━━━━━━━━━━━━━",
			"┃ 👑 BOT OWNER COMMANDS",
			"┗━━━━━━━━━━━━━━━━━",
			...lines,
			"╰━━━━━━━━━━━━━━━━━",
			"",
			`💡 Type \`${prefix}help <command>\` for detailed usage`,
		].join("\n");

		await sendMessageWTyping(from, { text }, { quoted: msg });
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
