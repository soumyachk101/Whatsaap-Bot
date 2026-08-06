import downloadHandler from "./download.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	return downloadHandler().handler(sock, msg, from, args, msgInfoObj);
};

export default () => ({
	cmd: ["mp4", "video"],
	desc: "Download HD video via link or search",
	usage: "mp4 <link or search>",
	handler,
});
