import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { sanitizeUserError } from "../../functions/errorUtils.js";
import dotenv from "dotenv";
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";

let groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;
let genAI = (GOOGLE_API_KEY && !GOOGLE_API_KEY.startsWith("AQ.")) ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;

// Available fast & powerful models on Groq
const GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];

async function callAI(systemPrompt, userPrompt, temperature = 0.9) {
	if (groq) {
		for (const model of GROQ_MODELS) {
			try {
				const completion = await groq.chat.completions.create({
					model,
					temperature,
					messages: [
						{ role: "system", content: systemPrompt },
						{ role: "user", content: userPrompt },
					],
				});
				const reply = completion.choices[0]?.message?.content?.trim();
				if (reply) return reply;
			} catch (err) {
				console.warn(`[AIMode] Groq ${model} failed:`, err.message);
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
			console.warn("[AIMode] Gemini fallback failed:", err.message);
		}
	}

	return null;
}

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, command, evv, prefix, type, senderJid } = msgInfoObj;

	if (!GROQ_API_KEY && !GOOGLE_API_KEY) {
		return sendMessageWTyping(from, { text: "AI API Key is missing in .env" }, { quoted: msg });
	}

	// ── Extract quoted context & mentioned users ────────────────────────────
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

	const quotedParticipant = contextInfo?.participant || "";
	const mentionedJids = contextInfo?.mentionedJid || [];
	const mentions = [];

	let targetName = evv ? evv.trim() : "";

	// If no text provided, but user quoted someone or tagged someone
	if (!targetName && quotedParticipant) {
		targetName = `@${quotedParticipant.split("@")[0]}`;
		mentions.push(quotedParticipant);
	} else if (!targetName && mentionedJids.length > 0) {
		targetName = `@${mentionedJids[0].split("@")[0]}`;
		mentions.push(mentionedJids[0]);
	}

	if (targetName && targetName.startsWith("@")) {
		const targetNum = targetName.replace(/^@/, "").trim();
		const resolvedJid = targetNum.includes("@") ? targetNum : `${targetNum}@s.whatsapp.net`;
		if (!mentions.includes(resolvedJid)) mentions.push(resolvedJid);
	}

	// If roast or other modes have no target and no quote
	if (command === "roast" && !targetName && !quotedText) {
		return sendMessageWTyping(
			from,
			{
				text: `Bhai kake roast korbo? Name/Topic bol ba karo message quote kore \`${prefix || "#"}roast\` lekh! 😂`,
			},
			{ quoted: msg }
		);
	}

	if (!targetName && !quotedText && !["fortune", "joke"].includes(command)) {
		return sendMessageWTyping(
			from,
			{
				text: `Please specify a topic or name! Example: \`${prefix || "#"}${command} Love\``,
			},
			{ quoted: msg }
		);
	}

	// ── Prompts setup with ultra human-like instructions ──────────────────
	const prompts = {
		roast: {
			system: `You are a savage, witty, hilarious person in an Indian WhatsApp group chat who roasts people to ashes.
STRICT HUMAN TEXTING RULES:
- Sound like a REAL, savage, witty human friend texting inside a group chat. NEVER act like an AI or a bot.
- ZERO robotic introductions: NEVER say "Here is your roast:", "Sure thing!", or include quotation marks around the whole message.
- NO AI DISCLAIMERS: Do not say "just kidding", "all in good fun", or give disclaimers.
- ABSOLUTELY NO OVERUSED CLICHÉS:
  * BANNED: Never say "Jio 5G", "BSNL 2G", "SBI lunch break", "Google Lens", "Harvard Dean", "Hanuman Chalisa", "potato/aloo", "Elon Musk".
- DYNAMIC LANGUAGE & SLANG MATCHING:
  * If the input or quoted text is in Bengali or Banglish (words like ami, tui, bhai, korchis, ache, etc.), roast in ULTRA-SAVAGE, natural colloquial Bengali/Banglish (authentic Kolkata/Bangla group chat roast slang).
  * If the input or quoted text is in Hindi or Hinglish, roast in sharp, street-smart modern Hinglish (CarryMinati / Tanmay Bhat / college backbencher style).
  * If English, roast with brutal, dry, internet-culture sarcasm.
- PUNCH THE CONTEXT: If a quoted message or statement is given, tear apart the actual words, logic, and delusion in what they said!
- Keep it punchy: 2 to 5 lines maximum. Use casual WhatsApp formatting (*bold* for emphasis).`,
			user: (() => {
				let prompt = `Target: ${targetName || "This person"}`;
				if (quotedText) {
					prompt += `\nTarget's actual message/statement: "${quotedText}". Make ruthless fun of what they just said and destroy their logic!`;
				}
				return prompt;
			})(),
			temp: 0.95,
		},
		shayari: {
			system: `You are a talented, soulful poet. Write a beautiful, heart-touching or witty 4-line verse (Shayari).
RULES:
- If the user wrote in Hindi/Urdu/Hinglish, write genuine, rhythmic Hindi/Urdu Shayari in Roman/Devanagari script.
- If the user wrote in Bengali, write deep or romantic Bengali Kobita/Shayari.
- If English, write rhythmic, poignant poetry.
- Zero robotic introductions. Format directly for WhatsApp.`,
			user: `Topic: ${targetName || "Dil ki baat"}`,
			temp: 0.85,
		},
		rap: {
			system: `You are a dope underground hip-hop artist dropping bars in a WhatsApp group chat.
RULES:
- Write an energetic 6-8 line rap verse with genuine rhyme scheme, flow, and modern punchlines.
- Match language: If topic is Desi/Hinglish/Bengali, drop authentic desi hip-hop bars (like Seedhe Maut / DIVINE style). If English, dope street bars.
- Sound like a real rapper texting lyrics, no corporate AI introductions.`,
			user: `Topic: ${targetName || "Streets"}`,
			temp: 0.9,
		},
		fortune: {
			system: `You are a witty, slightly sarcastic fortune teller predicting someone's hilarious future on WhatsApp.
RULES:
- Give a 2-3 line humorous, unexpected, highly relatable prediction (job, love life, phone addiction, bills).
- Sound like a funny friend casually reading their future, no generic astrology nonsense.`,
			user: `Person: ${targetName || "Friend"}`,
			temp: 0.85,
		},
		story: {
			system: `You are a captivating storyteller.
RULES:
- Write a short, thrilling, or hilarious 6-8 line micro-story about the topic.
- Keep the reader hooked with a crazy twist or punchline at the end.
- Sound like a human sharing an unforgettable incident.`,
			user: `Topic: ${targetName || "A strange night"}`,
			temp: 0.85,
		},
		recipe: {
			system: `You are a passionate food enthusiast.
RULES:
- Give a quick, mouth-watering, realistic step-by-step recipe for the dish in 4-6 concise bullet points.
- Include one pro-tip/secret ingredient that makes it restaurant-quality.
- WhatsApp formatted, clean and delicious tone.`,
			user: `Dish: ${targetName || "Quick Maggi Twist"}`,
			temp: 0.7,
		},
	};

	const mode = prompts[command];
	if (!mode) return;

	try {
		const result = await callAI(mode.system, mode.user, mode.temp);
		if (!result) {
			return sendMessageWTyping(
				from,
				{ text: "Bhai ektu pore try kor, server ektu busy ache! 🤖" },
				{ quoted: msg }
			);
		}

		// Send clean, direct, human-like response
		return sendMessageWTyping(
			from,
			{
				text: result,
				mentions: mentions.length > 0 ? mentions : undefined,
			},
			{ quoted: msg }
		);
	} catch (error) {
		console.error("[AIMode Error]:", error);
		return sendMessageWTyping(from, { text: sanitizeUserError(error, command) }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["roast", "shayari", "rap", "fortune", "story", "recipe"],
	desc: "Human-like AI Fun Modes (Savage Roast, Shayari, Rap, Fortune, Story, Recipe)",
	usage: "roast <name> | quote a message & roast | shayari <topic>",
	handler,
});
