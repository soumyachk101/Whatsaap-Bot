import songHandler from "./song.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
    // Redirect yta to the more robust song handler but ensure it sends as audio
    const newMsgInfoObj = { ...msgInfoObj, command: "yta" };
    return songHandler.handler(sock, msg, from, args, newMsgInfoObj);
};

export default () => ({
	cmd: ["yta"],
	desc: "Download youtube audio (High Quality)",
	usage: "yta <youtube link>",
	handler,
});
