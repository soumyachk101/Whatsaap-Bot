// Compatibility / love meter — viral group fun feature

const COMMENTS = [
	{ min: 95, txt: "💍 *Made for each other!* Dil le gaya re!" },
	{ min: 85, txt: "💖 *Soulmates!* Cupid is working overtime!" },
	{ min: 75, txt: "😍 *Excellent match!* Sparks are flying!" },
	{ min: 65, txt: "💕 *Great chemistry!* Keep it going!" },
	{ min: 55, txt: "💗 *Cute pair!* Give it a chance!" },
	{ min: 45, txt: "💛 *Hmm, not bad.* Could work with effort!" },
	{ min: 35, txt: "💚 *Just friends?* Maybe more, maybe less!" },
	{ min: 25, txt: "💙 *Risky match.* Proceed with caution!" },
	{ min: 15, txt: "💜 *Low compatibility.* Long shot!" },
	{ min: 0, txt: "🖤 *Oof!* Better as strangers!" },
];

// Deterministic hash → 0-99
const hashScore = (a, b) => {
	const combined = [a, b].sort().join("|");
	let h = 0;
	for (let i = 0; i < combined.length; i++) {
		h = (h * 31 + combined.charCodeAt(i)) | 0;
	}
	return Math.abs(h) % 100;
};

const getComment = (score) => {
	for (const c of COMMENTS) {
		if (score >= c.min) return c.txt;
	}
	return COMMENTS[COMMENTS.length - 1].txt;
};

const buildBar = (score) => {
	const total = 20;
	const filled = Math.round((score / 100) * total);
	return "▓".repeat(filled) + "░".repeat(total - filled);
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command } = msgInfoObj;

	const mentionedJids =
		msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

	let userA, userB;

	// Case 1: replied-to message
	const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
	const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;

	if (quoted && quotedParticipant) {
		userA = quotedParticipant;
		userB = mentionedJids[0] || (args[0] ? args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net" : null);
	} else if (mentionedJids.length >= 2) {
		[userA, userB] = mentionedJids;
	} else if (mentionedJids.length === 1) {
		// Pair with the sender
		userA = msg.key.participant || msg.key.remoteJid;
		userB = mentionedJids[0];
	} else {
		return sendMessageWTyping(
			from,
			{
				text:
					`💘 *Love Meter Usage:*\n\n` +
					`• Tag two people: \`${prefix}${command} @user1 @user2\`\n` +
					`• Tag one (paired with you): \`${prefix}${command} @user\`\n` +
					`• Reply to a message + tag someone: \`${prefix}${command} @user\` (on quoted msg)`,
			},
			{ quoted: msg }
		);
	}

	if (!userA || !userB) {
		return sendMessageWTyping(from, { text: "❌ Need two people to calculate love! Tag someone." }, { quoted: msg });
	}
	if (userA === userB) {
		return sendMessageWTyping(
			from,
			{ text: "😅 *Self-love is 100%,* but for matching, you need two different people!" },
			{ quoted: msg }
		);
	}

	const score = hashScore(userA, userB);
	const comment = getComment(score);
	const bar = buildBar(score);

	// Extract display numbers
	const numA = userA.split("@")[0].split(":")[0];
	const numB = userB.split("@")[0].split(":")[0];

	const text =
		`💘 *Love Meter* 💘\n\n` +
		`❤️ @${numA}\n` +
		`💜 @${numB}\n\n` +
		`${bar}\n` +
		`🔥 *Compatibility:* ${score}%\n\n` +
		`${comment}`;

	return sendMessageWTyping(
		from,
		{ text, mentions: [userA, userB] },
		{ quoted: msg }
	);
};

export default () => ({
	cmd: ["ship", "love", "match", "compatibility"],
	desc: "Love compatibility meter (viral group fun)",
	usage: "ship @user1 @user2 | ship @user | ship (on a quoted msg + @user)",
	handler,
});
