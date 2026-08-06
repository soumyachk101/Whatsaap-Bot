import downloadHandler from "../../public/download.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	return downloadHandler().handler(sock, msg, from, args, msgInfoObj);
};

export default () => ({
	cmd: ["yt", "ytv", "vs"],
	desc: "Download YouTube video",
	usage: "yt <link or query>",
	handler,
});
