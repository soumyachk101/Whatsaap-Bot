import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

let _genAI = null;
const getGenAI = () => {
	if (!_genAI) {
		const apiKey = process.env.GOOGLE_API_KEY;
		if (!apiKey || apiKey.length < 20 || apiKey.startsWith("AQ.")) return null;
		_genAI = new GoogleGenerativeAI(apiKey);
	}
	return _genAI;
};

let _groq = null;
const getGroq = () => {
	if (!_groq && process.env.GROQ_API_KEY) {
		_groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
	}
	return _groq;
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, evv, command } = msgInfoObj;

	if (!evv) return sendMessageWTyping(from, { text: `Please provide a prompt. Example: -${command} Hello!` });

	const groq = getGroq();
	const genAI = getGenAI();

	if (command === "groq" || command === "llama" || !genAI) {
		if (groq) {
			try {
				const completion = await groq.chat.completions.create({
					messages: [
						{ role: "system", content: "You are a helpful, smart AI assistant. Reply in WhatsApp format. Use *bold* for emphasis where needed. Keep your answers concise." },
						{ role: "user", content: evv },
					],
					model: "llama-3.3-70b-versatile",
				});
				const reply = completion.choices[0]?.message?.content || "";
				return sendMessageWTyping(from, { text: `_*AI (${command === "llama" ? "LLaMA" : "Groq"}):*_\n\n` + reply.trim() }, { quoted: msg });
			} catch (groqErr) {
				console.error("Groq Error:", groqErr);
			}
		}
	}

	if (genAI) {
		try {
			const model = genAI.getGenerativeModel({
				model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
				systemInstruction: "You are a helpful, smart AI assistant. Reply in WhatsApp format. Use *bold* for emphasis where needed. Keep your answers concise.",
			});

			const result = await model.generateContent(evv);
			const response = result.response.text();

			return sendMessageWTyping(from, { text: "_*Gemini AI:*_\n\n" + response.trim() }, { quoted: msg });
		} catch (error) {
			console.error("Gemini Error:", error);
			if (groq) {
				try {
					const completion = await groq.chat.completions.create({
						messages: [
							{ role: "system", content: "You are a helpful AI assistant." },
							{ role: "user", content: evv },
						],
						model: "llama-3.3-70b-versatile",
					});
					const reply = completion.choices[0]?.message?.content || "";
					return sendMessageWTyping(from, { text: "_*AI:*_\n\n" + reply.trim() }, { quoted: msg });
				} catch (_) {}
			}
			return sendMessageWTyping(from, { text: "Error calling AI API: " + error.message }, { quoted: msg });
		}
	}

	return sendMessageWTyping(from, { text: "```AI API Key is not configured.```" }, { quoted: msg });
};

export default () => ({
	cmd: ["gemini", "groq", "llama"],
	desc: "Chat with Gemini / Groq AI",
	usage: "gemini <prompt>",
	handler,
});
