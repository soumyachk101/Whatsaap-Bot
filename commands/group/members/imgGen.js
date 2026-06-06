import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";

const ai = new GoogleGenAI({
	apiKey: GOOGLE_API_KEY,
});

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, evv } = msgInfoObj;

	if (!GOOGLE_API_KEY) {
		return sendMessageWTyping(from, { text: "```Google API Key is Missing```" }, { quoted: msg });
	}

	if (!args[0]) {
		return sendMessageWTyping(
			from,
			{ text: "Please provide a prompt to generate an image from." },
			{ quoted: msg }
		);
	}

	try {
		const response = await ai.models.generateImages({
			model: "imagen-3.0-generate-002",
			prompt: evv,
			config: {
				numberOfImages: 1,
				outputMimeType: "image/jpeg",
				aspectRatio: "1:1",
			},
		});

		const generatedImage = response.generatedImages?.[0];

		if (!generatedImage?.image?.imageBytes) {
			throw new Error("No image data received from API");
		}

		// Convert base64 to buffer
		const imageBuffer = Buffer.from(generatedImage.image.imageBytes, "base64");

		await sendMessageWTyping(from, { image: imageBuffer }, { quoted: msg });
	} catch (err) {
		console.log("Gemini Error:", err);
		return sendMessageWTyping(from, { text: "Something went wrong generating the image: " + err.message }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["make"],
	desc: "Generate an image from a prompt using Google Gemini Imagen 3.0",
	usage: "make <prompt>",
	handler,
});
