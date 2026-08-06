import downloadHandler from "./download.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	return downloadHandler().handler(sock, msg, from, args, msgInfoObj);
};

export default () => ({
	cmd: ["fb", "facebook", "fbdl"],
	desc: "Download Facebook video",
	usage: "fb <link>",
	handler,
});
