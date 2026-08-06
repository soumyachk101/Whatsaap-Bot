import downloadHandler from "../../public/download.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	return downloadHandler().handler(sock, msg, from, args, msgInfoObj);
};

export default () => ({
	cmd: ["pin"],
	desc: "Download Pinterest pin/video",
	usage: "pin <pin url>",
	handler,
});