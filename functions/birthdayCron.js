import { userData } from "../sqlite-DB/userDataDb.js";

let cronRef = null;
let intervalId = null;

const WISHES = [
	(age) => `🎂 *HAPPY BIRTHDAY!* 🎉\n\nWishing you an amazing day filled with joy, love, and lots of cake! 🎂🎈\n\nMay this year bring you everything your heart desires! 💖`,
	(age) => `🎉 *HAPPY BIRTHDAY!* 🎂\n\nIt's your special day — time to celebrate YOU! 🥳🎁\n\nWishing you happiness, success, and all the good things in life! ✨`,
	(age) => `🥳 *HAPPY BIRTHDAY!* 🎂\n\nAnother year around the sun! 🌞 May this one be your best yet — full of adventures, laughter, and unforgettable moments! 🎈`,
	(age) => `🎁 *HAPPY BIRTHDAY!* 🎉\n\nWishing you a day as wonderful as you are! 🌟\n\nKeep being awesome! 🎂💕`,
	(age) => `🎈 *HAPPY BIRTHDAY!* 🎂\n\nTime to blow out the candles and make a wish! 🕯️✨\n\nMay all your wishes come true! 💫`,
];

const getRandomWish = (age) => WISHES[Math.floor(Math.random() * WISHES.length)](age);

class BirthdayCron {
	constructor(sock) {
		this.sock = sock;
		this.lastCheckedDate = null; // YYYY-MM-DD
		this.started = false;
	}

	async checkAndWish() {
		if (!this.sock) return;

		const today = new Date();
		const dateKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

		// Already wished today
		if (this.lastCheckedDate === dateKey) return;
		this.lastCheckedDate = dateKey;

		const day = today.getDate();
		const month = today.getMonth() + 1;
		const year = today.getFullYear();

		try {
			// Find all users with a birthday matching today
			const allUsers = await userData.find({}).toArray();
			const birthdayPeople = allUsers.filter((u) => u.birthday && u.birthday.day === day && u.birthday.month === month);

			if (birthdayPeople.length === 0) return;

			console.log(`🎂 [BirthdayCron] Found ${birthdayPeople.length} birthday(s) today.`);

			// Get all groups the bot is in
			let groups = [];
			try {
				groups = await this.sock.groupFetchAllParticipating();
			} catch (e) {
				console.error("[BirthdayCron] groupFetchAll error:", e.message);
				return;
			}

			for (const person of birthdayPeople) {
				const age = person.birthday.year ? year - person.birthday.year : null;
				const ageStr = age ? `Turning *${age}* today! 🎈` : "";
				const message = `${getRandomWish(age)}\n\n${ageStr}`;

				// Wish in every group where this person is a member
				for (const groupId of Object.keys(groups)) {
					const group = groups[groupId];
					const participants = group.participants || [];
					if (participants.some((p) => p.id === person._id || p.jid === person._id || p === person._id)) {
						try {
							await this.sock.sendMessage(groupId, { text: message, mentions: [person._id] });
							await new Promise((r) => setTimeout(r, 500));
						} catch (e) {
							console.error(`[BirthdayCron] Failed to wish in ${groupId}:`, e.message);
						}
					}
				}

				// Also wish privately
				try {
					const jid = person._id.includes("@") ? person._id : person._id.split(":")[0] + "@s.whatsapp.net";
					await this.sock.sendMessage(jid, { text: message });
				} catch (e) {
					// ignore
				}
			}
		} catch (e) {
			console.error("[BirthdayCron] error:", e);
		}
	}

	start(intervalMinutes = 30) {
		if (this.started) return;
		this.started = true;

		// Run after 10s (give time for groups to load), then every intervalMinutes
		setTimeout(() => this.checkAndWish(), 10_000);
		intervalId = setInterval(() => this.checkAndWish(), intervalMinutes * 60 * 1000);
		console.log(`🎂 [BirthdayCron] Started (interval: ${intervalMinutes} min)`);
	}

	stop() {
		if (intervalId) clearInterval(intervalId);
		this.started = false;
	}

	markToday() {
		// Force re-check on next interval (e.g. user just added birthday)
		this.lastCheckedDate = null;
	}
}

const startBirthdayCron = (sock) => {
	if (cronRef) {
		cronRef.started = false; // allow restart
	}
	cronRef = new BirthdayCron(sock);
	cronRef.start(30);
	return cronRef;
};

const getBirthdayCron = () => cronRef;

const setBirthdaySock = (sock) => {
	if (!cronRef) {
		cronRef = new BirthdayCron(sock);
	} else {
		cronRef.sock = sock;
	}
};

export { startBirthdayCron, getBirthdayCron, setBirthdaySock, BirthdayCron };
export default startBirthdayCron;
