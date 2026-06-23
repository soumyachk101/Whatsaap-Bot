import { member } from "../../sqlite-DB/membersDataDb.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command, isGroup, groupMetadata, senderJid } = msgInfoObj;

	// Confessions only make sense in groups
	if (!isGroup) {
		return sendMessageWTyping(
			from,
			{ text: `❌ Confessions only work in groups.` },
			{ quoted: msg }
		);
	}

	const body = args.join(" ").trim();

	if (!body) {
		return sendMessageWTyping(
			from,
			{
				text:
					`🤫 *Anonymous Confession*\n\n` +
					`Send a message anonymously to this group. Your identity is hidden.\n\n` +
					`Usage: \`${prefix}${command} your confession here\`\n\n` +
					`_Note: Bot admins can still see your ID via logs, but other members cannot._`,
			},
			{ quoted: msg }
		);
	}

	if (body.length > 1000) {
		return sendMessageWTyping(
			from,
			{ text: `❌ Confession too long (max 1000 chars). Yours: ${body.length}` },
			{ quoted: msg }
		);
	}

	// Generate a random confession ID
	const confessionId = Math.random().toString(36).slice(2, 8).toUpperCase();

	// Random anonymous display names
	const anonNames = [
		"🌸 Anonymous Flower", "🌙 Midnight Owl", "🦊 Sneaky Fox",
		"🌊 Deep Wave", "⭐ Falling Star", "🍃 Drifting Leaf",
		"🔥 Hidden Flame", "🌹 Secret Rose", "🌑 Shadow Walker",
		"🦋 Wandering Butterfly", "🌙 Lost Moon", "🎭 Masked Stranger",
	];
	const anonName = anonNames[Math.floor(Math.random() * anonNames.length)];

	// Build confession message (NO quoted reply — that would leak identity)
	const confessionText =
		`🤫 *Anonymous Confession* \`#${confessionId}\`\n\n` +
		`${body}\n\n` +
		`━━━━━━━━━━━━━━\n` +
		`_${anonName}_`;

	try {
		await sendMessageWTyping(from, { text: confessionText });

		// Delete original message to keep it anonymous
		try {
			await sock.sendMessage(from, { delete: msg.key });
		} catch (deleteErr) {
			console.error("Failed to delete confession command message:", deleteErr.message);
		}

		// Acknowledge to the sender privately (via DM)
		await sock.sendMessage(senderJid, {
			text:
				`✅ Your confession \`#${confessionId}\` has been posted anonymously to *${groupMetadata?.subject || "this group"}*!`,
		});
	} catch (err) {
		console.error("confess error:", err);
		sendMessageWTyping(
			from,
			{ text: `❌ Failed to post confession: ${err.message}` },
			{ quoted: msg }
		);
	}
};

export default () => ({
	cmd: ["confess", "anon"],
	desc: "Send an anonymous confession to the group",
	usage: "confess <message>",
	handler,
});
