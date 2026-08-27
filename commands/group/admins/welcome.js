import { getGroupData, group } from "../../sqlite-DB/groupDataDb.js";
import { randomWelcome } from "../../functions/messageFormatter.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, evv } = msgInfoObj;
	try {
		const groupData = await getGroupData(from);
		let welMess = groupData?.welcome || "";

		if (args[0] == "reset") {
			await group.updateOne({ _id: from }, { $set: { welcome: "" } });
			await sendMessageWTyping(from, { text: "✅ *Welcome Message reset to default.*" }, { quoted: msg });
		} else if (args[0] == "off" || args[0] == "disable") {
			await group.updateOne({ _id: from }, { $set: { welcome: "off" } });
			await sendMessageWTyping(from, { text: "😴 *Welcome Message disabled.*" }, { quoted: msg });
		} else if (args[0] == "preview") {
			const previewText = welMess && welMess !== "off"
				? welMess.replace(/@user|@member/g, "@PreviewUser")
				: randomWelcome("PreviewUser");
			await sendMessageWTyping(from, {
				text: `📋 *Preview:*\n\n${previewText}`,
			}, { quoted: msg });
		} else if (!args[0]) {
			const status = welMess === "off"
				? "🚫 Disabled"
				: welMess && welMess.trim() !== ""
					? `✅ *Custom:*\n${welMess}`
					: "📝 Using default random templates";
			await sendMessageWTyping(from, {
				text: `🎉 *Welcome Message Settings*\n\n${status}\n\n_Use #welcome <message> to set custom text_\n_Use #welcome preview to preview_\n_Use #welcome reset to default_\n_Use #welcome off to disable_`,
			}, { quoted: msg });
		} else {
			await group.updateOne({ _id: from }, { $set: { welcome: evv } });
			await sendMessageWTyping(from, { text: `✅ *Welcome Message Set!*\n\n${evv}` }, { quoted: msg });
		}
	} catch (err) {
		console.error("Welcome command error:", err);
		sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["welcome"],
	desc: "Set welcome message",
	usage: "welcome <message> | reset | off | preview",
	handler,
});
