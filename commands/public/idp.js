import axios from "axios";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping } = msgInfoObj;
	if (!args[0] || args[0].includes("http"))
		return sendMessageWTyping(from, { text: `*Provide Username*` }, { quoted: msg });
	let prof = args[0];

	const igCookie = process.env.INSTAGRAM_COOKIE || "";

	let config = {
		method: "get",
		maxBodyLength: Infinity,
		url: `https://i.instagram.com/api/v1/users/web_profile_info/?username=${prof}`,
		headers: {
			"User-Agent": "iphone_ua",
			"x-ig-app-id": "936619743392459",
			Cookie: igCookie,
		},
	};

	axios
		.request(config)
		.then((res) => {
			if (res.data.status === "ok" && res.data.data.user) {
				sendMessageWTyping(
					from,
					{
						image: { url: res.data.data.user.profile_pic_url_hd },
						caption: `*Here is the Profile Picture of ${prof}*`,
					},
					{ quoted: msg }
				);
			} else {
				sendMessageWTyping(from, { text: `*No Data Found or User is Private*` }, { quoted: msg });
			}
		})
		.catch(async (err) => {
			console.error("IDP Error:", err.message);
			sendMessageWTyping(from, { text: "*Error fetching profile picture. Check bot logs.*" }, { quoted: msg });
		});
};

export default () => ({
	cmd: ["idp", "dp"],
	desc: "Get Instagram Profile Picture",
	usage: "idp | dp <username>",
	handler,
});
