import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";

let groq;
if (GROQ_API_KEY) {
	groq = new Groq({ apiKey: GROQ_API_KEY });
}

let genAI;
if (GOOGLE_API_KEY) {
	genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
}

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, command, evv, prefix } = msgInfoObj;

	if (!GROQ_API_KEY && !GOOGLE_API_KEY) {
		return sendMessageWTyping(from, { text: "```Both Groq and Gemini API Keys are missing in .env```" }, { quoted: msg });
	}

	if (!evv && command !== "fortune") {
		return sendMessageWTyping(from, { text: `❌ Please specify a name or topic!\nExample: \`${prefix || "#"}${command} Elon Musk\`` }, { quoted: msg });
	}

	const prompts = {
		roast: {
			system: `You are an extremely savage, hilarious, witty Indian roaster (in CarryMinati and Tanmay Bhat style).
Your task is to roast the person/topic named in 4-6 lines of peak, relatable, punchy Hinglish.

Rules & Tone Guidelines:
- DO NOT give dry, boring, or safe corporate AI advice.
- Use savage Indian slang, internet memes, and hilarious comparisons (e.g. Jio 5G, 2G dimaag, Google Lens, SBI lunch break, backbenchers, etc.).
- Make every line a funny punchline!

Example Roast 1 (Target: Rahul):
Rahul bhai ka confidence level Jio 5G jaisa high hai, lekin dimaag abhi bhi BSNL 2G pe chalta hai!
Inki baatein sunke Google Lens bhi bolta hai: "Result not found, please search something sensible."
Itne shaant rehte hain jaise SBI branch mein 2 baje ka lunch break chal raha ho.

Example Roast 2 (Target: Rohan):
Rohan bhai ki shakal dekh ke Snapchat ke filters bhi crash ho jaate hain.
Class mein inka aana aur Chhoti Advance ka khatam hona, dono ek hi timing pe hota hai!
Gyan aise baant te hain jaise khud Harvard ke Dean hon, aur exam mein pass hone ke liye Hanuman Chalisa padhte hain.`,
			user: `Roast Target: ${evv}`,
		},
		shayari: {
			system: "You are a master poet. Write a beautiful, poetic 4-line verse in English about the given topic.",
			user: `Topic: ${evv}`,
		},
		rap: {
			system: "You are a talented rap artist. Write an energetic 8-line rap with rhyming lyrics in English about the given topic.",
			user: `Topic: ${evv}`,
		},
		fortune: {
			system: "You are a witty fortune teller. Provide a humorous 3-4 line fortune reading in English for the given name.",
			user: `Name: ${evv || "Friend"}`,
		},
		story: {
			system: "You are a creative author. Write a short, captivating 8-line story in English about the given topic.",
			user: `Topic: ${evv}`,
		},
		recipe: {
			system: "You are a professional chef. Provide a clean, easy-to-follow recipe in English for the given dish or ingredients.",
			user: `Recipe/Ingredients: ${evv}`,
		},
	};

	const mode = prompts[command];
	if (!mode) return;

	try {
		await sendMessageWTyping(from, { text: "Thinking... 🤖" }, { quoted: msg });

		let response = "";
		let success = false;

		if (GROQ_API_KEY) {
			try {
				const chatCompletion = await groq.chat.completions.create({
					messages: [
						{ role: "system", content: mode.system },
						{ role: "user", content: mode.user },
					],
					model: "llama-3.1-8b-instant",
					temperature: command === "roast" ? 0.95 : 0.7,
				});
				response = chatCompletion.choices[0]?.message?.content || "";
				if (response) success = true;
			} catch (groqError) {
				console.warn("Groq failed, trying Gemini fallback:", groqError.message);
			}
		}

		if (!success && GOOGLE_API_KEY) {
			const model = genAI.getGenerativeModel({
				model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
				systemInstruction: mode.system,
			});
			const result = await model.generateContent(mode.user);
			response = result.response.text() || "";
			success = true;
		}

		if (!success) {
			throw new Error("AI service is currently unavailable. Please verify your API keys.");
		}

		return sendMessageWTyping(from, { text: `_*AI ${command.toUpperCase()}:*_\n\n` + response.trim() }, { quoted: msg });
	} catch (error) {
		console.error("AI Mode Error:", error);
		return sendMessageWTyping(from, { text: "Error: " + error.message }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["roast", "shayari", "rap", "fortune", "story", "recipe"],
	desc: "AI Fun Modes (Savage Roast in Hinglish, Shayari/Rap/Story/Recipe in English)",
	usage: "roast <name> | shayari <topic> | etc.",
	handler,
});
