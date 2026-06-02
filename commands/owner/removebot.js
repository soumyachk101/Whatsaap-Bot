const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, isGroup } = msgInfoObj;
	if (!isGroup) return sendMessageWTyping(from, { text: "❌ This command only works in groups." }, { quoted: msg });
	try {
		await sendMessageWTyping(from, { text: "👋 Leaving this group..." }, { quoted: msg });
		await sock.groupLeave(from);
	} catch (err) {
		console.error("removebot error:", err);
		sendMessageWTyping(from, { text: `❌ Error leaving group: ${err.message}` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["removebot"],
	desc: "Remove bot from group",
	usage: "removebot",
	handler,
});
