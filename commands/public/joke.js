import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { sanitizeUserError } from "../../functions/errorUtils.js";
import dotenv from "dotenv";
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";

let groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;
let genAI = (GOOGLE_API_KEY && !GOOGLE_API_KEY.startsWith("AQ.")) ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;

// Available models on Groq
const GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];

async function callAI(systemPrompt, userPrompt) {
	if (groq) {
		for (const model of GROQ_MODELS) {
			try {
				const completion = await groq.chat.completions.create({
					model,
					temperature: 0.95,
					messages: [
						{ role: "system", content: systemPrompt },
						{ role: "user", content: userPrompt },
					],
				});
				const reply = completion.choices[0]?.message?.content?.trim();
				if (reply) return reply;
			} catch (err) {
				console.warn(`[Joke] Groq ${model} failed:`, err.message);
			}
		}
	}

	if (genAI) {
		try {
			const model = genAI.getGenerativeModel({
				model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
				systemInstruction: systemPrompt,
			});
			const result = await model.generateContent(userPrompt);
			const reply = result.response.text()?.trim();
			if (reply) return reply;
		} catch (err) {
			console.warn("[Joke] Gemini fallback failed:", err.message);
		}
	}

	return null;
}

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, evv, type } = msgInfoObj;

	if (!GROQ_API_KEY && !GOOGLE_API_KEY) {
		return sendMessageWTyping(from, { text: "AI API Key missing in .env" }, { quoted: msg });
	}

	// Extract quoted message context if any
	const contextInfo =
		msg.message?.extendedTextMessage?.contextInfo ||
		msg.message?.[type]?.contextInfo;
	const quotedMessage = contextInfo?.quotedMessage;
	let quotedText = "";
	if (quotedMessage) {
		quotedText =
			quotedMessage.conversation ||
			quotedMessage.extendedTextMessage?.text ||
			quotedMessage.imageMessage?.caption ||
			quotedMessage.videoMessage?.caption ||
			"";
	}

	const topic = evv ? evv.trim() : "";

	const systemPrompt = `You are a hilarious, witty friend texting inside a WhatsApp group chat who drops laugh-out-loud funny jokes, standup punchlines, and relatable comedy.
STRICT HUMAN-LIKE RULES:
- Sound like an actual funny person casually texting friends, NEVER like an AI bot or an automated service.
- NEVER say "Here is a joke for you", "Sure!", "Here's one:", or include robotic introductions.
- DO NOT wrap the output in quotes.
- BANNED: No outdated 90s dad jokes ("Why did the chicken cross the road?", "Why did the tomato blush?", cheesy puns, etc.).
- Deliver fresh, relatable situational comedy about daily struggles: college, exams, boss/office politics, coding bugs, relationships, relatives, money, laziness, gym, etc.
- LANGUAGE MATCHING:
  * If the user wrote in Bengali / Banglish or requested "bangla/bengali", deliver a hilarious Bengali joke/anecdote in authentic Bengali or Banglish (Bangla group chat slang, Gopal Bhar style wit or modern relatable memes).
  * If the user wrote in Hindi / Hinglish or requested "hindi", deliver a funny, authentic desi stand-up style punchline / chutkula in Hinglish.
  * If the user wrote in English or unspecified, deliver modern, witty, relatable WhatsApp-style comedy.
- Keep it punchy (2-6 lines max). Deliver good comic timing with casual emojis.`;

	let userPrompt = "Tell a really funny, unexpected, laugh-out-loud joke or relatable incident.";
	if (topic) {
		userPrompt = `Topic/Category requested by user: "${topic}". Make a hilarious, fresh joke about this!`;
	}
	if (quotedText) {
		userPrompt += `\nContext/Quoted message from friend: "${quotedText}". Spin a funny joke or witty punchline around this situation!`;
	}

	try {
		const joke = await callAI(systemPrompt, userPrompt);
		if (!joke) {
			return sendMessageWTyping(
				from,
				{ text: "Bhai ektu pore try kor, comedy mood ashchhe na! 😅 (AI busy)" },
				{ quoted: msg }
			);
		}

		// Directly send the joke without any robotic prefixes
		return sendMessageWTyping(from, { text: joke }, { quoted: msg });
	} catch (err) {
		console.error("[Joke error]:", err);
		return sendMessageWTyping(from, { text: sanitizeUserError(err, "joke") }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["joke", "jokes", "chutkula"],
	desc: "Get fresh, hilarious AI jokes in Bengali, Hindi, or English",
	usage: "joke | joke <topic/category> | quote a message and type joke",
	handler,
});
