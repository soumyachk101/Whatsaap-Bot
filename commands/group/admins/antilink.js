import { group } from "../../../sqlite-DB/groupDataDb.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { isGroup, isGroupAdmin, isOwner, sendMessageWTyping } = msgInfoObj;

	if (!isGroup) return sendMessageWTyping(from, { text: "This command only works in groups." });
	if (!isGroupAdmin && !isOwner) return sendMessageWTyping(from, { text: "Only admins can use this command." });

	const toggle = args[0]?.toLowerCase();
	if (!toggle || (toggle !== "on" && toggle !== "off")) {
		return sendMessageWTyping(from, { text: `Usage: ${msgInfoObj.prefix}antilink on/off` });
	}

	const isEnabled = toggle === "on";

	try {
		await group.updateOne({ _id: from }, { $set: { antilink: isEnabled } });
		sendMessageWTyping(from, { text: `✅ Anti-Link has been turned *${isEnabled ? "ON" : "OFF"}* for this group.` });
	} catch (err) {
		console.error("[Anti-Link Toggle Error]", err.message);
		sendMessageWTyping(from, { text: "❌ Failed to update Anti-Link setting." });
	}
};

export default () => ({
	cmd: ["antilink"],
	desc: "Toggle Anti-Link filter (auto-delete links).",
	usage: "antilink on/off",
	handler,
});
