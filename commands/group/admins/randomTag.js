import { extractPhoneNumber, resolveMemberIdentity } from "../../../functions/lidUtils.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, botNumber, groupMetadata: cachedMeta } = msgInfoObj;
	let message = "";

	try {
		const groupMetadata = cachedMeta || await sock.groupMetadata(from);
		if (msg.message.extendedTextMessage) {
			message = msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || "";
		}
		if (args.length > 0) {
			message = args.join(" ");
		}
		const mention = (groupMetadata?.participants || []).filter((p) => !botNumber.includes(p.id));
		if (!mention.length) {
			return sendMessageWTyping(from, { text: "❌ No eligible members found to tag." }, { quoted: msg });
		}
		const random = Math.floor(Math.random() * mention.length);
		const target = mention[random];
		const idObj = resolveMemberIdentity(target.id, groupMetadata, sock);
		const phone = idObj.phoneNumber || extractPhoneNumber(target.id);
		const targetMentions = idObj.allJids.length > 0 ? idObj.allJids : [target.id];

		message = (message ? message + " @" : "@") + phone;
		if (!args[0]) sendMessageWTyping(from, { text: message, mentions: targetMentions }, { quoted: msg });
		else sendMessageWTyping(from, { text: message, mentions: targetMentions });
	} catch (err) {
		console.error(err);
		sendMessageWTyping(from, { text: err.toString() }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["rn", "rt"],
	desc: "Random Tag a member",
	usage: "rn | rt ",
	handler,
});
