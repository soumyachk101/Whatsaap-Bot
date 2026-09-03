import songHandler from "./song.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
    try {
        const newMsgInfoObj = { ...msgInfoObj, command: "yta" };
        return await songHandler().handler(sock, msg, from, args, newMsgInfoObj);
    } catch (err) {
        console.error("YTA handler error:", err);
        msgInfoObj.sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
    }
};

export default () => ({
	cmd: ["yta"],
	desc: "Download youtube audio (High Quality)",
	usage: "yta <youtube link>",
	handler,
});
