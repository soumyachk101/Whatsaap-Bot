import downloadHandler from "../../public/download.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	return downloadHandler().handler(sock, msg, from, args, msgInfoObj);
};

export default () => ({
	cmd: ["twitter", "tw", "x"],
	desc: "Download Twitter/X video",
	usage: "twitter <tweet url>",
	handler,
});
