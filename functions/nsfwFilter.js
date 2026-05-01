import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

const model = genAI.getGenerativeModel({
	model: "gemini-1.5-flash", // Use flash for speed
	safetySettings: [
		{
			category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
			threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE, // Strict for filter
		},
	],
});

/**
 * Checks if an image is NSFW using Gemini.
 * @param {Buffer} imageBuffer - The image buffer to check.
 * @returns {Promise<boolean>} - True if NSFW, false otherwise.
 */
export const checkNSFW = async (imageBuffer) => {
	if (!GOOGLE_API_KEY) return false;

	try {
		const result = await model.generateContent([
			{
				inlineData: {
					data: imageBuffer.toString("base64"),
					mimeType: "image/jpeg",
				},
			},
			"Is this image sexually explicit or NSFW? Answer only with 'yes' or 'no'.",
		]);

		const response = await result.response;
		const text = response.text().toLowerCase();
		return text.includes("yes");
	} catch (error) {
		// If Gemini blocks it due to safety settings, it's likely NSFW
		if (error.message?.includes("SAFETY") || error.message?.includes("block")) {
			return true;
		}
		console.error("[NSFW Filter Error]", error.message);
		return false;
	}
};
