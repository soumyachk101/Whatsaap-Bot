const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping } = msgInfoObj;
	try {
		sendMessageWTyping(from, { text: from }, { quoted: msg });
	} catch (err) {
		console.error("JID command error:", err);
		sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["jid", "lid"],
	desc: "Get your jid or lid",
	usage: "jid | lid",
	handler,
});
