const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { prefix, sendMessageWTyping, groupMetadata, type, content } = msgInfoObj;
	if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
		let temp =
			msg.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text ||
			msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation ||
			msg.message?.conversation;
		msg["message"] = { ...msg.message.extendedTextMessage.contextInfo.quotedMessage };
		if (temp) msg["message"]["conversation"] = temp;
	}
	const isMedia = type === "imageMessage" || type === "videoMessage";
	const isTaggedImage = type === "extendedTextMessage" && content.includes("imageMessage");
	const isTaggedVideo = type === "extendedTextMessage" && content.includes("videoMessage");

	try {
		const allMentions = [];
		for (const p of (groupMetadata?.participants || [])) {
			if (p.id) allMentions.push(p.id);
			if (p.lid) allMentions.push(p.lid);
			if (p.pn) allMentions.push(p.pn.includes("@") ? p.pn : `${p.pn}@s.whatsapp.net`);
		}
		const mentions = [...new Set(allMentions.filter(Boolean))];

		if (isMedia || isTaggedImage || isTaggedVideo) {
			delete msg["message"]["conversation"];
			let tempMess = Object.assign({}, msg.message);
			tempMess[Object.keys(tempMess)[0]]["contextInfo"] = {
				mentionedJid: mentions,
			};
			const tempCaption = tempMess[Object.keys(tempMess)[0]]["caption"];
			tempMess[Object.keys(tempMess)[0]]["caption"] = tempCaption.includes(prefix + "hidetag")
				? tempCaption.split(prefix + "hidetag")[1].trim()
				: tempCaption;
			await sock.sendMessage(from, {
				forward: {
					key: {
						remoteJid: msg.key.remoteJid,
						fromMe: msg.key.fromMe,
						id: msg.key.id,
						participant: msg.key.participant ? msg.key.participant : null,
					},
					messageTimestamp: msg.messageTimestamp,
					pushName: msg.pushName,
					broadcast: msg.broadcast,
					message: tempMess,
				},
				mentions,
				contextInfo: { forwardingScore: 0, isForwarded: false, mentionedJid: mentions },
			});
		} else {
			let message = msg.message.conversation;
			message = message.includes(prefix + "hidetag") ? message.split(prefix + "hidetag")[1].trim() : message;
			message = message ? message : "Hidden Tag by DownloadWorld";
			sendMessageWTyping(from, {
				text: message,
				mentions,
			});
		}
	} catch (err) {
		console.log(err);
		sendMessageWTyping(from, { text: err.toString() }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["hidetag"],
	desc: "Hide Tag Message",
	usage: "hidetag <message>",
	handler,
});
