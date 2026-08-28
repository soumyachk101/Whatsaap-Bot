// ──────────────────────────────────────────────────────────────
// DownloadBuddy · Message Formatter
// Centralised visual helpers so every reply looks consistent.
// ──────────────────────────────────────────────────────────────

const SEPARATOR_THIN = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
const SEPARATOR_THICK = "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬";
const SEPARATOR_DOT = "──────────────────────────────";
const SEPARATOR_BLOCK = "╰──────────────────────────────╯";

const BOX_TOP = "╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮";
const BOX_BOTTOM = "╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯";
const BOX_SIDE = "┃";

const FOOTER =
 "\n" + SEPARATOR_THIN +
 "\n⚡ *DownloadBuddy* · " +
 new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/* ── Separators ──────────────────────────────────────────── */

export const thinSep = () => SEPARATOR_THIN;
export const thickSep = () => SEPARATOR_THICK;
export const dotSep = () => SEPARATOR_DOT;

/* ── Box wrapper ─────────────────────────────────────────── */

/**
 * Wrap content inside a single-line ASCII box.
 * @param {string[]} lines – body lines (already formatted)
 * @param {string} [title] – optional centered title on top line
 * @param {string} [side] – side char, default "┃"
 */
export const box = (lines, title, side = BOX_SIDE) => {
 const parts = [];
 if (title) {
 const padded = title.padStart(Math.floor((30 + title.length) / 2));
 parts.push(`${BOX_TOP} ${padded}`);
 } else {
 parts.push(BOX_TOP);
 }
 for (const l of lines) parts.push(`${side} ${l}`);
 parts.push(BOX_BOTTOM);
 return parts.join("\n");
};

/* ── Reaction sequence ───────────────────────────────────── */

/**
 * Returns an array of { react, delay } steps.
 * Call them in order with the delay in between.
 *
 * @param {object} sock
 * @param {string} to – JID to react on
 * @param {object} key – message key to react on
 * @param {string[]} emojis – e.g. ["👀", "✅"]
 */
export const reactSequence = (sock, to, key, emojis = ["👀", "✅"]) => {
 return emojis.map((emoji, i) => ({
 emoji,
 delay: i === 0 ? 0 : 350,
 send: () =>
 sock.sendMessage(to, { react: { text: emoji, key } }).catch(() => {}),
 }));
};

/* ── Progress bar ────────────────────────────────────────── */

/**
 * Unicode block progress bar.
 * @param {number} pct 0–100
 * @param {number} [segments=10]
 * @returns {string}
 */
export const progressBar = (pct, segments = 10) => {
 const clamped = Math.min(100, Math.max(0, pct));
 const filled = Math.round((clamped / 100) * segments);
 return "█".repeat(filled) + "░".repeat(segments - filled) + ` \`${clamped}%\``;
};

/* ── Stat card ───────────────────────────────────────────── */

/**
 * @param {{ label: string, value: string|number }[]} stats
 * @returns {string}
 */
export const statCard = (stats) => {
 const rows = stats.map((s) => `│ ${s.label}: \`${s.value}\``).join("\n");
 return `╭────────────────────────
${rows}
╰────────────────────────`;
};

/* ── Branded footer ──────────────────────────────────────── */

export const brandedFooter = () => FOOTER;

/* ── Section header ──────────────────────────────────────── */

export const sectionHeader = (icon, title) =>
 `${icon} *${title.toUpperCase()}*`;

/* ── Error template ──────────────────────────────────────── */

export const errorMsg = (reason, hint) =>
 `❌ *${reason}*\n_${hint}_`;

/* ── Success template ────────────────────────────────────── */

export const successMsg = (action) =>
 `✅ *${action}*`;

/* ── Typing + send wrapper ───────────────────────────────── */

/**
 * Sends a typing delay then the message.
 *
 * @param {object} sock
 * @param {string} to
 * @param {object} messageObj – e.g. { text: "..." }
 * @param {object} [options]
 * @param {number} [options.typingMs=600] – fake "typing…" pause
 * @param {object} [options.sendOpts={}] – extra sendMessage options
 * @param {object} [options.quoted] – quoted message
 * @returns {Promise}
 */
export const sendWithTyping = async (
 sock,
 to,
 messageObj,
 { typingMs = 0, sendOpts = {}, quoted } = {}
) => {
 if (typingMs > 0) {
 await new Promise((r) => setTimeout(r, typingMs));
 }
 const opts = { ...sendOpts };
 if (quoted) opts.quoted = quoted;
 return sock.sendMessage(to, messageObj, opts);
};

/* ── Welcome templates ───────────────────────────────────── */

const WELCOME_TEMPLATES = [
	(mention, group) =>
		`🎉 *Welcome to the family, ${mention}!*` + (group ? `\nWelcome to *${group}* 🌟` : "\nWe're hyped to have you here 🌟") +
		`\n\nDrop a hello and let the vibes roll 🎬\n` +
		`Type *#help* to see what this bot can do!`,

	(mention, group) =>
		`👋 *Hey ${mention}, welcome aboard!*` + (group ? `\nGlad you joined *${group}* 🚀` : "") +
		`\n\nYou've just joined the coolest corner of WhatsApp 😎\n` +
		`Sit back, relax, and enjoy the ride 🚀\n` +
		`Need anything? Just type *#help*`,

	(mention, group) =>
		`🌟 *A new star has arrived!*\n\n` +
		`Welcome ${mention} ✨` + (group ? ` to *${group}*` : "") +
		`\nThis group is lit and you're about to make it even better 🔥\n` +
		`Say hi and let's go! 🎉`,

	(mention, group) =>
		`🚀 *Welcome ${mention}!*` + (group ? ` to *${group}*` : "") +
		`\n\nGlad you're here — grab a coffee ☕ and explore!\n` +
		`Use *#help* to unlock all the magic 🪄\n` +
		`Enjoy your stay 🎊`,
];

/**
 * @param {string} name – display name or mention tag of the new member
 * @param {string} [groupName] – optional group name
 * @returns {string}
 */
export const randomWelcome = (name, groupName = "") => {
	const idx = Math.floor(Math.random() * WELCOME_TEMPLATES.length);
	return WELCOME_TEMPLATES[idx](name, groupName);
};

/* ── Bot status messages ─────────────────────────────────── */

export const botStatusMessages = {
 connected: (groupName) =>
 `🟢 *BOT ONLINE*\n\n` +
 `DownloadBuddy is now *live* and ready! ⚡\n` +
 (groupName ? `📍 Group: _${groupName}_\n` : "") +
 `All systems go 🚀`,

 reconnecting: () =>
 `🔄 *Reconnecting…*\n\n` +
 `Hold tight, we'll be back in a few seconds ⏳`,

 offline: () =>
 `🔴 *BOT OFFLINE*\n\n` +
 `We're experiencing some issues 😔\n` +
 `We'll be back soon — hang in there! 💪`,

 activated: (groupName) =>
 `✅ *Bot Activated*\n\n` +
 `DownloadBuddy is now *live* in _${groupName}_! 🚀\n` +
 `All commands are ready to go. Type #help to explore!`,

 deactivated: (groupName) =>
 `😴 *Bot Deactivated*\n\n` +
 `DownloadBuddy is taking a nap in _${groupName}_.\n` +
 `Only essential commands are available.`,

 maintenanceOn: () =>
 `🔧 *Maintenance Mode*\n\n` +
 `The bot is under maintenance right now.\n` +
 `Only essential commands are available. Check back later!`,

 maintenanceOff: () =>
 `✅ *Maintenance Complete*\n\n` +
 `All systems are back online! 🎉\n` +
 `Full power restored ⚡`,
};

/* ── Dev card ────────────────────────────────────────────── */

export const devCard = (name, handle, github, links) => {
 const lines = [
 `👨‍💻 *Developer*`,
 ``,
 `*${name}*`,
 `${handle}`,
 ``,
 `🔗 *Links:*`,
 `GitHub → ${github}`,
 ];
 for (const l of links) lines.push(l);
 return box(lines, "DEV INFO");
};

/* ── Command not-found ───────────────────────────────────── */

export const cmdNotFound = (prefix, cmd) =>
 `❌ *Command not found:* \`${prefix}${cmd}\`\n` +
 `Type \`${prefix}help\` to see what's available.`;

/* ── Access denied ──────────────────────────────────────── */

export const accessDenied = () =>
 `🚫 *Access Denied!*\n_You don't have permission to use this command._`;

/* ── Feature tag pill ────────────────────────────────────── */

export const pill = (icon, text) => `${icon} ${text}`;

export default {
 thinSep,
 thickSep,
 dotSep,
 box,
 reactSequence,
 progressBar,
 statCard,
 brandedFooter,
 sectionHeader,
 errorMsg,
 successMsg,
 sendWithTyping,
 randomWelcome,
 botStatusMessages,
 devCard,
 cmdNotFound,
 accessDenied,
 pill,
};
