import downloadHandler from "./download.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	return downloadHandler().handler(sock, msg, from, args, msgInfoObj);
};

export default () => ({
	cmd: ["reddit", "red"],
	desc: "Download post from reddit",
	usage: "reddit <post link>",
	handler,
});
