import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
let genAI;
if (GOOGLE_API_KEY) {
	genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
}

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, evv } = msgInfoObj;

	if (!GOOGLE_API_KEY) {
		return sendMessageWTyping(from, { text: "```Google API Key is Missing in .env```" }, { quoted: msg });
	}

	if (!evv) return sendMessageWTyping(from, { text: "Please provide a prompt. Example: -gemini Hello!" });

	try {
		const model = genAI.getGenerativeModel({
			model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
			systemInstruction: "You are a helpful, smart AI assistant. Reply in WhatsApp format. Use *bold* for emphasis where needed. Keep your answers concise.",
		});

		const result = await model.generateContent(evv);
		const response = result.response.text();

		return sendMessageWTyping(from, { text: "_*Gemini AI:*_\n\n" + response.trim() }, { quoted: msg });
	} catch (error) {
		console.error("Gemini Error:", error);
		return sendMessageWTyping(from, { text: "Error calling Gemini API: " + error.message }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["gemini", "groq", "llama"],
	desc: "Chat with Gemini AI",
	usage: "gemini <prompt>",
	handler,
});
