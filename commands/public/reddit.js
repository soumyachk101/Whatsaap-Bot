import downloadHandler from "./download.js";

const USER_COOLDOWN = 10000;
const userLastDownload = new Map();

function checkUserCooldown(jid) {
	const last = userLastDownload.get(jid);
	if (last && Date.now() - last < USER_COOLDOWN) return false;
	userLastDownload.set(jid, Date.now());
	if (userLastDownload.size > 1000) {
		const now = Date.now();
		for (const [k, v] of userLastDownload) if (now - v > 60000) userLastDownload.delete(k);
	}
	return true;
}

const handler = async (sock, msg, from, args, msgInfoObj) => {
	if (!checkUserCooldown(from)) {
		return msgInfoObj.sendMessageWTyping(from, { text: "⏳ Please wait 10 seconds before another download." }, { quoted: msg });
	}
	return downloadHandler().handler(sock, msg, from, args, msgInfoObj);
};

export default () => ({
	cmd: ["reddit", "red"],
	desc: "Download post from reddit",
	usage: "reddit <post link>",
	handler,
});
