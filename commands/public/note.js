import { ensureUserData, getUserData, userData } from "../../sqlite-DB/userDataDb.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command } = msgInfoObj;
	const sender = msg.key.participant || msg.key.remoteJid;

	await ensureUserData(sender);

	const sub = (args[0] || "list").toLowerCase();
	const data = await getUserData(sender);
	const notes = data?.notes || [];

	// Get text — either from quoted message, or from args after subcommand
	const getNoteText = () => {
		const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
		if (quoted) {
			if (quoted.conversation) return quoted.conversation;
			if (quoted.extendedTextMessage?.text) return quoted.extendedTextMessage.text;
			if (quoted.imageMessage?.caption) return quoted.imageMessage.caption;
			if (quoted.videoMessage?.caption) return quoted.videoMessage.caption;
		}
		return args.slice(1).join(" ").trim();
	};

	if (sub === "save" || sub === "s" || sub === "add" || sub === "a") {
		const text = getNoteText();
		if (!text) {
			return sendMessageWTyping(
				from,
				{ text: `❌ *Usage:* \`${prefix}${command} save <text>\`\n\nOr reply to a message with \`${prefix}${command} save\`` },
				{ quoted: msg }
			);
		}
		if (text.length > 1000) {
			return sendMessageWTyping(from, { text: "❌ Note too long (max 1000 chars)." }, { quoted: msg });
		}
		const note = {
			id: Date.now(),
			text,
			createdAt: new Date().toISOString(),
		};
		await userData.updateOne({ _id: sender }, { $push: { notes: note } });
		return sendMessageWTyping(
			from,
			{ text: `📌 *Note saved!*\n\n${text.length > 100 ? text.slice(0, 100) + "..." : text}\n\n_Total: ${notes.length + 1} note(s)_` },
			{ quoted: msg }
		);
	}

	if (sub === "list" || sub === "l" || sub === "all") {
		if (notes.length === 0) {
			return sendMessageWTyping(
				from,
				{ text: `📒 *No notes yet!*\n\nSave one with: \`${prefix}${command} save <text>\`` },
				{ quoted: msg }
			);
		}
		let txt = `📒 *Your Notes* (${notes.length} total)\n\n`;
		notes.slice(-15).forEach((n, i) => {
			const display = n.text.length > 80 ? n.text.slice(0, 80) + "..." : n.text;
			txt += `*${i + 1}.* ${display}\n`;
		});
		if (notes.length > 15) txt += `\n_Showing latest 15 of ${notes.length}._`;
		return sendMessageWTyping(from, { text: txt.trim() }, { quoted: msg });
	}

	if (sub === "view" || sub === "show" || sub === "read" || sub === "v") {
		const idx = parseInt(args[1]);
		if (isNaN(idx) || idx < 1 || idx > notes.length) {
			return sendMessageWTyping(from, { text: `❌ Invalid number. Use \`${prefix}${command} list\` to see notes.` }, { quoted: msg });
		}
		const note = notes[idx - 1];
		const date = new Date(note.createdAt).toLocaleString();
		return sendMessageWTyping(
			from,
			{ text: `📌 *Note #${idx}*\n\n${note.text}\n\n_Saved: ${date}_` },
			{ quoted: msg }
		);
	}

	if (sub === "del" || sub === "delete" || sub === "remove" || sub === "rm") {
		const idx = parseInt(args[1]);
		if (isNaN(idx) || idx < 1 || idx > notes.length) {
			return sendMessageWTyping(from, { text: `❌ Invalid number. Use \`${prefix}${command} list\` to see notes.` }, { quoted: msg });
		}
		const updated = notes.filter((_, i) => i !== idx - 1);
		await userData.updateOne({ _id: sender }, { $set: { notes: updated } });
		return sendMessageWTyping(from, { text: `🗑️ *Note #${idx} deleted.*` }, { quoted: msg });
	}

	if (sub === "clear" || sub === "reset") {
		await userData.updateOne({ _id: sender }, { $set: { notes: [] } });
		return sendMessageWTyping(from, { text: `🧹 *All notes cleared!*` }, { quoted: msg });
	}

	return sendMessageWTyping(
		from,
		{
			text: `📒 *Notes Commands:*\n\n` +
				`• \`${prefix}${command} save <text>\` — save a note (or reply to msg)\n` +
				`• \`${prefix}${command} list\` — view all notes\n` +
				`• \`${prefix}${command} view <num>\` — read a note\n` +
				`• \`${prefix}${command} del <num>\` — delete a note\n` +
				`• \`${prefix}${command} clear\` — remove all notes`,
		},
		{ quoted: msg }
	);
};

export default () => ({
	cmd: ["note", "notes", "bookmark", "save"],
	desc: "Save and manage personal notes/bookmarks",
	usage: "note save <text> | note list | note view 1 | note del 1",
	handler,
});
