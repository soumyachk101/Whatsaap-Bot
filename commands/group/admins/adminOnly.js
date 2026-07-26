import { group } from "../../../sqlite-DB/groupDataDb.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { isGroup, isGroupAdmin, isOwner, sendMessageWTyping, prefix } = msgInfoObj;

	if (!isGroup) return sendMessageWTyping(from, { text: "This command only works in groups." });
	if (!isGroupAdmin && !isOwner) return sendMessageWTyping(from, { text: "Only admins can use this command." });

	const toggle = args[0]?.toLowerCase();
	if (!toggle || (toggle !== "on" && toggle !== "off")) {
		return sendMessageWTyping(from, { text: `Usage: *${prefix}adminonly on* or *${prefix}adminonly off*` });
	}

	const isEnabled = toggle === "on";

	try {
		await group.updateOne({ _id: from }, { $set: { adminOnly: isEnabled } });
		sendMessageWTyping(from, { 
			text: `🛡️ *Admin-Only Mode* has been turned *${isEnabled ? "ON" : "OFF"}* for this group.\n\n` +
			      (isEnabled ? "Now bot will only reply to Group Admins!" : "Now bot will reply to all group members!") 
		});
	} catch (err) {
		console.error("[AdminOnly Toggle Error]", err.message);
		sendMessageWTyping(from, { text: "❌ Failed to update Admin-Only setting." });
	}
};

export default () => ({
	cmd: ["adminonly", "adminmode"],
	desc: "Toggle Admin-Only mode (bot replies to admins only)",
	usage: "adminonly on/off | adminmode on/off",
	handler,
});
