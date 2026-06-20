// In-memory store of active pomo sessions per user
const activePomodoros = new Map();

const formatMs = (ms) => {
	const totalSec = Math.ceil(ms / 1000);
	const m = Math.floor(totalSec / 60);
	const s = totalSec % 60;
	return `${m}m ${s}s`;
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command } = msgInfoObj;
	const sender = msg.key.participant || msg.key.remoteJid;
	const chatId = from;

	// Parse args: -pomo 25 | -pomo 25 5 | -pomo stop
	const action = (args[0] || "").toLowerCase();

	if (action === "stop" || action === "cancel" || action === "end") {
		const key = `${sender}:${chatId}`;
		const active = activePomodoros.get(key);
		if (!active) {
			return sendMessageWTyping(from, { text: "❌ No active pomo session to stop." }, { quoted: msg });
		}
		clearTimeout(active.focusTimer);
		clearTimeout(active.breakTimer);
		activePomodoros.delete(key);
		return sendMessageWTyping(from, { text: "⏹️ *Pomo session cancelled.*" }, { quoted: msg });
	}

	const focusMin = parseInt(args[0]) || 25;
	const breakMin = parseInt(args[1]) || 5;

	if (focusMin < 1 || focusMin > 120) {
		return sendMessageWTyping(from, { text: "❌ Focus time must be 1-120 minutes." }, { quoted: msg });
	}
	if (breakMin < 1 || breakMin > 30) {
		return sendMessageWTyping(from, { text: "❌ Break time must be 1-30 minutes." }, { quoted: msg });
	}

	const key = `${sender}:${chatId}`;
	if (activePomodoros.has(key)) {
		return sendMessageWTyping(
			from,
			{ text: "⚠️ You already have an active pomo session here. Use `pomo stop` to cancel it." },
			{ quoted: msg }
		);
	}

	const focusMs = focusMin * 60 * 1000;
	const breakMs = breakMin * 60 * 1000;
	const startedAt = Date.now();

	await sendMessageWTyping(
		from,
		{
			text:
				`🍅 *Pomodoro Started!*\n\n` +
				`⏱️ Focus: *${focusMin} min*\n` +
				`☕ Break: *${breakMin} min*\n\n` +
				`_Stay focused! I'll ping you when it's break time._\n\n` +
				`_Stop anytime: \`${prefix}${command} stop\`_`,
		},
		{ quoted: msg }
	);

	const session = { focusTimer: null, breakTimer: null, startedAt };
	activePomodoros.set(key, session);

	session.focusTimer = setTimeout(async () => {
		try {
			await sock.sendMessage(chatId, {
				text:
					`🎉 *Focus session complete!*\n\n` +
					`⏰ You focused for *${focusMin} minutes* — great job! 💪\n\n` +
					`☕ Now take a *${breakMin}-min break*.\nI'll notify you when it's time to get back.`,
			});
		} catch (e) {
			console.error("Pomo focus-end error:", e);
		}

		session.breakTimer = setTimeout(async () => {
			try {
				await sock.sendMessage(chatId, {
					text:
						`⏰ *Break's over!*\n\n` +
						`Ready for another ${focusMin}-min focus session?\n` +
						`Use \`${prefix}${command} ${focusMin} ${breakMin}\` to start the next one.`,
				});
			} catch (e) {
				console.error("Pomo break-end error:", e);
			}
			activePomodoros.delete(key);
		}, breakMs);
	}, focusMs);
};

export default () => ({
	cmd: ["pomo", "pomodoro", "focus", "timer"],
	desc: "Pomodoro focus timer with auto break alerts",
	usage: "pomo 25 | pomo 25 5 (focus + break mins) | pomo stop",
	handler,
});
