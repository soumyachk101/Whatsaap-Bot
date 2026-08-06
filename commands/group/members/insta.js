import downloadHandler from "../../public/download.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	return downloadHandler().handler(sock, msg, from, args, msgInfoObj);
};

export default () => ({
	cmd: ["insta", "i"],
	desc: "Download Instagram post/reel",
	usage: "insta <url>",
	handler,
});
