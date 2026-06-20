import { ensureUserData, getUserData, userData } from "../../sqlite-DB/userDataDb.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command } = msgInfoObj;
	const sender = msg.key.participant || msg.key.remoteJid;

	await ensureUserData(sender);

	const sub = (args[0] || "list").toLowerCase();
	const data = await getUserData(sender);
	const todos = data?.todos || [];

	if (sub === "add" || sub === "a") {
		const text = args.slice(1).join(" ").trim();
		if (!text) {
			return sendMessageWTyping(
				from,
				{ text: `❌ *Usage:* \`${prefix}${command} add <task>\`\n\n*Example:* \`${prefix}${command} add Buy groceries\`` },
				{ quoted: msg }
			);
		}
		const newTodo = {
			id: Date.now(),
			text,
			done: false,
			createdAt: new Date().toISOString(),
		};
		await userData.updateOne({ _id: sender }, { $push: { todos: newTodo } });
		return sendMessageWTyping(
			from,
			{ text: `✅ *Todo added!*\n\n📝 ${text}\n\n_Total: ${todos.length + 1} task(s)_` },
			{ quoted: msg }
		);
	}

	if (sub === "list" || sub === "l" || sub === "all") {
		if (todos.length === 0) {
			return sendMessageWTyping(
				from,
				{ text: `📋 *Your Todo List is empty!*\n\nAdd one with: \`${prefix}${command} add <task>\`` },
				{ quoted: msg }
			);
		}
		const open = todos.filter((t) => !t.done);
		const done = todos.filter((t) => t.done);
		let txt = `📋 *Your Todo List* (${open.length} pending, ${done.length} done)\n\n`;
		open.forEach((t, i) => {
			txt += `*${i + 1}.* ⬜ ${t.text}\n`;
		});
		if (done.length > 0) {
			txt += `\n*— Completed —*\n`;
			done.slice(0, 10).forEach((t) => {
				txt += `✅ ~~${t.text}~~\n`;
			});
		}
		return sendMessageWTyping(from, { text: txt.trim() }, { quoted: msg });
	}

	if (sub === "done" || sub === "d" || sub === "complete" || sub === "c") {
		const idx = parseInt(args[1]);
		if (isNaN(idx) || idx < 1) {
			return sendMessageWTyping(
				from,
				{ text: `❌ *Usage:* \`${prefix}${command} done <number>\`\n\n*Example:* \`${prefix}${command} done 1\`` },
				{ quoted: msg }
			);
		}
		const openTodos = todos.filter((t) => !t.done);
		if (idx > openTodos.length) {
			return sendMessageWTyping(from, { text: "❌ Todo number not found in pending list." }, { quoted: msg });
		}
		const target = openTodos[idx - 1];
		const updated = todos.map((t) => (t.id === target.id ? { ...t, done: true, doneAt: new Date().toISOString() } : t));
		await userData.updateOne({ _id: sender }, { $set: { todos: updated } });
		return sendMessageWTyping(
			from,
			{ text: `🎉 *Done!*\n\n✅ ~~${target.text}~~\n\n_Kaam ho gaya bhai! 💪_` },
			{ quoted: msg }
		);
	}

	if (sub === "del" || sub === "delete" || sub === "remove" || sub === "rm") {
		const idx = parseInt(args[1]);
		if (isNaN(idx) || idx < 1) {
			return sendMessageWTyping(
				from,
				{ text: `❌ *Usage:* \`${prefix}${command} del <number>\`` },
				{ quoted: msg }
			);
		}
		if (idx > todos.length) {
			return sendMessageWTyping(from, { text: "❌ Todo number not found." }, { quoted: msg });
		}
		const removed = todos[idx - 1];
		const updated = todos.filter((_, i) => i !== idx - 1);
		await userData.updateOne({ _id: sender }, { $set: { todos: updated } });
		return sendMessageWTyping(from, { text: `🗑️ *Deleted:* ${removed.text}` }, { quoted: msg });
	}

	if (sub === "clear" || sub === "reset") {
		await userData.updateOne({ _id: sender }, { $set: { todos: [] } });
		return sendMessageWTyping(from, { text: `🧹 *All todos cleared!*\n\nFresh start bhai! ✨` }, { quoted: msg });
	}

	return sendMessageWTyping(
		from,
		{
			text: `📋 *Todo List Commands:*\n\n` +
				`• \`${prefix}${command} add <task>\` — add a new todo\n` +
				`• \`${prefix}${command} list\` — view all todos\n` +
				`• \`${prefix}${command} done <num>\` — mark complete\n` +
				`• \`${prefix}${command} del <num>\` — delete a todo\n` +
				`• \`${prefix}${command} clear\` — remove all`,
		},
		{ quoted: msg }
	);
};

export default () => ({
	cmd: ["todo", "todos", "task"],
	desc: "Manage your personal todo list",
	usage: "todo add <task> | todo list | todo done 1 | todo del 1 | todo clear",
	handler,
});
