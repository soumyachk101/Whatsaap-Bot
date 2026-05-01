import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
let groq;
if (GROQ_API_KEY) {
	groq = new Groq({ apiKey: GROQ_API_KEY });
}

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, command, evv } = msgInfoObj;

	if (!GROQ_API_KEY) {
		return sendMessageWTyping(from, { text: "```Groq API Key is Missing in .env```" }, { quoted: msg });
	}

	if (!evv && command !== "fortune") {
		return sendMessageWTyping(from, { text: `Bhai topic toh bata! Example: .${command} Salman Khan` });
	}

	const prompts = {
		roast: {
			system: "You are a savage, funny Indian roaster. Roast the person named in the prompt in exactly 4 lines using Hinglish. Be hilarious but don't cross community guidelines.",
			user: `Roast this person: ${evv}`,
		},
		shayari: {
			system: "You are a master Mirza Ghalib style poet but you write in Hinglish. Write a 4 line beautiful or funny shayari about the topic given.",
			user: `Topic: ${evv}`,
		},
		rap: {
			system: "You are an Indian underground rapper like Divine or Emiway. Write an energetic desi Hindi rap with rhymes in exactly 8 lines using Hinglish about the given topic.",
			user: `Topic: ${evv}`,
		},
		fortune: {
			system: "You are a funny Indian jyotishi (astrologer). Tell a humorous 3-4 line fortune in Hinglish for the given name. Make it absurd and funny.",
			user: `Name: ${evv || "Bhai"}`,
		},
		story: {
			system: "You are a creative storyteller. Write a short, engaging 10-line story in Hinglish about the given topic. Make it interesting and desi.",
			user: `Topic: ${evv}`,
		},
		recipe: {
			system: "You are a Desi Chef. Provide a simple and tasty recipe in Hinglish with clear steps based on the ingredients or dish name provided. Use a friendly, 'Bhai' style tone.",
			user: `Recipe/Ingredients: ${evv}`,
		},
	};

	const mode = prompts[command];
	if (!mode) return;

	try {
		await sendMessageWTyping(from, { text: "Thinking... 🤖" }, { quoted: msg });

		const chatCompletion = await groq.chat.completions.create({
			messages: [
				{ role: "system", content: mode.system },
				{ role: "user", content: mode.user },
			],
			model: "llama-3.1-8b-instant",
		});

		const response = chatCompletion.choices[0]?.message?.content || "No response from AI.";
		return sendMessageWTyping(from, { text: `_*AI ${command.toUpperCase()}:*_\n\n` + response.trim() }, { quoted: msg });
	} catch (error) {
		console.error("AI Mode Error:", error);
		return sendMessageWTyping(from, { text: "Error: " + error.message }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["roast", "shayari", "rap", "fortune", "story", "recipe"],
	desc: "AI Fun Modes (Roast, Shayari, Rap, Fortune, Story, Recipe)",
	usage: "roast <name> | shayari <topic> | etc.",
	handler,
});
