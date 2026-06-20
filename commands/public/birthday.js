import { ensureUserData, getUserData, userData } from "../../sqlite-DB/userDataDb.js";
import { getBirthdayCron } from "../../functions/birthdayCron.js";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command } = msgInfoObj;
	const sender = msg.key.participant || msg.key.remoteJid;

	await ensureUserData(sender);

	const sub = (args[0] || "").toLowerCase();

	// View own birthday
	if (sub === "view" || sub === "show" || sub === "me" || !sub) {
		const data = await getUserData(sender);
		const bday = data?.birthday;
		if (!bday) {
			return sendMessageWTyping(
				from,
				{
					text:
						`🎂 *No birthday set!*\n\n` +
						`Set yours with: \`${prefix}${command} 25-12\`\n` +
						`Or: \`${prefix}${command} 25-12-2000\` (with year)\n\n` +
						`_Bot will auto-wish you in groups on your birthday!_ 🎉`,
				},
				{ quoted: msg }
			);
		}
		const dateStr = `${String(bday.day).padStart(2, "0")}-${MONTH_NAMES[bday.month - 1]}${bday.year ? `-${bday.year}` : ""}`;
		return sendMessageWTyping(from, { text: `🎂 *Your Birthday:* ${dateStr}\n\n_Auto-wishes are ON!_ 🎉` }, { quoted: msg });
	}

	// Clear birthday
	if (sub === "del" || sub === "delete" || sub === "remove" || sub === "clear") {
		await userData.updateOne({ _id: sender }, { $set: { birthday: null } });
		return sendMessageWTyping(from, { text: `🗑️ *Birthday removed.*\n\nYou won't get auto-wishes anymore.` }, { quoted: msg });
	}

	// Set birthday: parse DD-MM or DD-MM-YYYY
	const match = sub.match(/^(\d{1,2})-(\d{1,2})(?:-(\d{4}))?$/);
	if (!match) {
		return sendMessageWTyping(
			from,
			{
				text:
					`🎂 *Birthday Commands:*\n\n` +
					`• \`${prefix}${command} 25-12\` — set as 25 Dec\n` +
					`• \`${prefix}${command} 25-12-2000\` — with year\n` +
					`• \`${prefix}${command} view\` — check yours\n` +
					`• \`${prefix}${command} del\` — remove it`,
			},
			{ quoted: msg }
		);
	}

	const day = parseInt(match[1]);
	const month = parseInt(match[2]);
	const year = match[3] ? parseInt(match[3]) : null;

	if (day < 1 || day > 31 || month < 1 || month > 12) {
		return sendMessageWTyping(from, { text: "❌ Invalid date. Use DD-MM format (e.g. 25-12)." }, { quoted: msg });
	}
	if (year !== null && (year < 1900 || year > new Date().getFullYear())) {
		return sendMessageWTyping(from, { text: "❌ Year must be 1900 or later." }, { quoted: msg });
	}

	// Validate day-in-month
	const daysInMonth = new Date(2024, month, 0).getDate();
	if (day > daysInMonth) {
		return sendMessageWTyping(from, { text: `❌ ${MONTH_NAMES[month - 1]} doesn't have ${day} days.` }, { quoted: msg });
	}

	const bday = { day, month, year };

	// Persist
	await userData.updateOne({ _id: sender }, { $set: { birthday: bday } });

	// Register with the cron (in case it wasn't tracked)
	const cron = getBirthdayCron();
	if (cron) {
		cron.markToday();
	}

	const dateStr = `${String(day).padStart(2, "0")}-${MONTH_NAMES[month - 1]}${year ? `-${year}` : ""}`;
	const ageStr = year ? `\n\n🎈 You'll be *${new Date().getFullYear() - year}* this year!` : "";

	return sendMessageWTyping(
		from,
		{ text: `🎂 *Birthday set!* \n\n📅 ${dateStr}${ageStr}\n\n_Auto-wishes ON for groups! 🎉_` },
		{ quoted: msg }
	);
};

export default () => ({
	cmd: ["birthday", "bday", "bdy"],
	desc: "Set your birthday for auto-wishes",
	usage: "birthday 25-12 | birthday 25-12-2000 | birthday view | birthday del",
	handler,
});
