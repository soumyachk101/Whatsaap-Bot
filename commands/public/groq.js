import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
let groq;
if (GROQ_API_KEY) {
	groq = new Groq({ apiKey: GROQ_API_KEY });
}

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, evv } = msgInfoObj;

	if (!GROQ_API_KEY) {
		return sendMessageWTyping(from, { text: "```Groq API Key is Missing in .env```" }, { quoted: msg });
	}

	if (!evv) return sendMessageWTyping(from, { text: "Please provide a prompt. Example: -groq Hello!" });

	try {
		const chatCompletion = await groq.chat.completions.create({
			messages: [
				{
					role: "system",
					content: "You are a helpful assistant. Reply in WhatsApp format. Use *bold* for emphasis where needed.",
				},
				{
					role: "user",
					content: evv,
				},
			],
			model: "llama-3.3-70b-versatile",
		});

		const response = chatCompletion.choices[0]?.message?.content || "No response from Groq.";
		return sendMessageWTyping(from, { text: "_*Groq AI:*_\n\n" + response.trim() }, { quoted: msg });
	} catch (error) {
		console.error("Groq Error:", error);
		return sendMessageWTyping(from, { text: "Error calling Groq API: " + error.message }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["groq", "llama"],
	desc: "Chat with Groq AI (Llama 3)",
	usage: "groq <prompt>",
	handler,
});
