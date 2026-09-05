import { readFileEfficiently } from "../../functions/fileUtils.js";

import fs from "fs";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping } = msgInfoObj;

	const donatePath = "./assets/donate.png";
	if (fs.existsSync(donatePath)) {
		try {
			const imageBuffer = await readFileEfficiently(donatePath);
			return await sendMessageWTyping(
				from,
				{
					image: imageBuffer,
					caption: "Donate to keep this bot alive!\n\nhttps://buymeacoffee.com/soumyachk101",
				},
				{ quoted: msg }
			);
		} catch (err) {
			console.warn("Failed to load donation image:", err.message);
		}
	}

	await sendMessageWTyping(
		from,
		{
			text: "Donate to keep this bot alive!\n\nhttps://buymeacoffee.com/soumyachk101",
		},
		{ quoted: msg }
	);
};

export default () => ({
	cmd: ["donate", "donation"],
	desc: "Donate to keep this bot alive",
	usage: "donate",
	handler,
});
