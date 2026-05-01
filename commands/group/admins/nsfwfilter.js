import { group } from "../../../sqlite-DB/groupDataDb.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { isGroup, isGroupAdmin, isOwner, sendMessageWTyping } = msgInfoObj;

	if (!isGroup) return sendMessageWTyping(from, { text: "This command only works in groups." });
	if (!isGroupAdmin && !isOwner) return sendMessageWTyping(from, { text: "Only admins can use this command." });

	const toggle = args[0]?.toLowerCase();
	if (!toggle || (toggle !== "on" && toggle !== "off")) {
		return sendMessageWTyping(from, { text: `Usage: ${msgInfoObj.prefix}nsfwfilter on/off` });
	}

	const isEnabled = toggle === "on";

	try {
		await group.updateOne({ _id: from }, { $set: { nsfw: isEnabled } });
		sendMessageWTyping(from, { text: `✅ NSFW Filter has been turned *${isEnabled ? "ON" : "OFF"}* for this group.` });
	} catch (err) {
		console.error("[NSFW Filter Toggle Error]", err.message);
		sendMessageWTyping(from, { text: "❌ Failed to update NSFW Filter setting." });
	}
};

export default () => ({
	cmd: ["nsfwfilter", "nsfwon"],
	desc: "Toggle NSFW image filter (auto-delete explicit images).",
	usage: "nsfwfilter on/off",
	handler,
});
