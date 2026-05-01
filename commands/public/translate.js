import axios from "axios";

const LANG_NAMES = {
	en: "English", hi: "Hindi", es: "Spanish", fr: "French", de: "German",
	ar: "Arabic", zh: "Chinese", ja: "Japanese", ko: "Korean", pt: "Portuguese",
	ru: "Russian", it: "Italian", tr: "Turkish", bn: "Bengali", ur: "Urdu",
	ta: "Tamil", te: "Telugu", mr: "Marathi", gu: "Gujarati", ml: "Malayalam",
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix } = msgInfoObj;

	let targetLang = args[0]?.toLowerCase();
	let text;

	// Check if args[0] is a language code (simple check)
	const isLangCode = targetLang && targetLang.length <= 3 && (LANG_NAMES[targetLang] || targetLang === "zh");
	
	if (isLangCode) {
		text = args.slice(1).join(" ").trim();
	} else {
		// Default to Hindi
		targetLang = "hi";
		text = args.join(" ").trim();
	}

	// Fall back to quoted message if no text given
	if (!text) {
		const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
		text = quoted?.conversation || quoted?.extendedTextMessage?.text || "";
	}

	if (!text)
		return sendMessageWTyping(from, { text: `❌ Provide text or reply to a message to translate.\n\nExample: \`${prefix}tr hi Hello\` or just \`${prefix}tr Hello\` (defaults to Hindi)` }, { quoted: msg });

	try {
		const res = await axios.get("https://translate.googleapis.com/translate_a/single", {
			params: {
				client: "gtx",
				sl: "auto",
				tl: targetLang,
				dt: "t",
				q: text,
			},
			timeout: 8000,
		});

		const translated = res.data[0].map((s) => s[0]).join("");
		const detectedLang = res.data[2];
		const fromName = LANG_NAMES[detectedLang] || detectedLang?.toUpperCase() || "Auto";
		const toName = LANG_NAMES[targetLang] || targetLang.toUpperCase();

		sendMessageWTyping(
			from,
			{ text: `🌐 *Translation*\n${fromName} → ${toName}\n\n${translated}` },
			{ quoted: msg }
		);
	} catch (err) {
		console.error("translate error:", err);
		sendMessageWTyping(from, { text: `❌ Translation failed. Check the language code and try again.` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["tr", "translate"],
	desc: "Translate text to any language (default: Hindi)",
	usage: "tr <lang_code> <text> | reply to a message",
	handler,
});
