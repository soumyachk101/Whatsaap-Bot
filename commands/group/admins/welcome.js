import { getGroupData, group } from "../../../sqlite-DB/groupDataDb.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping } = msgInfoObj;
	const evv = msgInfoObj.evv;
	try {
		const groupData = await getGroupData(from);
		let welMess = groupData?.welcome || "";

		if (args[0] == "reset") {
			await group.updateOne({ _id: from }, { $set: { welcome: "" } });
			sendMessageWTyping(from, { text: "Welcome Message reset to default." }, { quoted: msg });
		} else if (args[0] == "off" || args[0] == "disable") {
			await group.updateOne({ _id: from }, { $set: { welcome: "off" } });
			sendMessageWTyping(from, { text: "Welcome Message disabled." }, { quoted: msg });
		} else if (!args[0]) {
			sendMessageWTyping(
				from,
				{
					text: welMess && welMess !== "off"
						? `Custom Welcome Message: ${welMess}`
						: welMess === "off"
						? "Welcome Message is currently disabled. Use welcome <message> or welcome reset to enable."
						: "Default Welcome Message is active. Use welcome <message> to set a custom message or welcome off to disable.",
				},
				{ quoted: msg }
			);
		} else {
			await group.updateOne({ _id: from }, { $set: { welcome: evv } });
			sendMessageWTyping(from, { text: `Welcome Message Set: ${evv}` }, { quoted: msg });
		}
	} catch (err) {
		console.error("Welcome command error:", err);
		sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["welcome"],
	desc: "Set welcome message",
	usage: "welcome <message> | reset | off",
	handler,
});
