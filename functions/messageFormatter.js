// ──────────────────────────────────────────────────────────────
// DownloadBuddy · Clean WhatsApp Message Formatter
// Clean, natural formatting with zero truncation and no rigid double-line ASCII cages.
// ──────────────────────────────────────────────────────────────

const BOX_W = 32;

/**
 * Clean card formatter for WhatsApp messages.
 * Never truncates text and never outputs rigid ASCII grid double-lines.
 */
export const premiumBox = (lines, title, icon, footer, opts = {}) => {
	const parts = [];

	if (title) {
		const displayTitle = icon ? `${icon} *${title}*` : `*${title}*`;
		parts.push(`╭━━『 ${displayTitle} 』━━╮`);
	}

	const arr = Array.isArray(lines) ? lines : [lines];
	const cleaned = arr
		.filter((l) => l !== null && l !== undefined)
		.map((l) => String(l).trimEnd());

	const content = cleaned.join("\n").trim();
	if (content) {
		parts.push(content);
	}

	if (footer) {
		const footerText = opts.footerIcon ? `${opts.footerIcon} ${footer}` : footer;
		parts.push(`💡 _${footerText}_`);
	}

	return parts.join("\n\n").trim();
};

export const box = premiumBox;
export const doubleBox = (lines, title, icon) => premiumBox(lines, title, icon);
export const infoBox = (lines, title, icon) => premiumBox(lines, title, icon);

// ── Separators ───────────────────────────────────────────────

export const thinSep = () => "─".repeat(BOX_W);
export const thickSep = () => "═".repeat(BOX_W);
export const dotSep = () => "·".repeat(BOX_W);
export const starSep = () => "☆".repeat(BOX_W);

// ── Branded footer ───────────────────────────────────────────

export const brandedFooter = () => {
	const d = new Date().toLocaleDateString("en-IN", {
		day: "numeric", month: "short", year: "numeric"
	});
	return "\n" + thickSep() + "\n⚡ *DownloadBuddy* · " + d;
};

// ── Section header ───────────────────────────────────────────

export const sectionHeader = (icon, title) =>
	`${icon} *${title.toUpperCase()}*`;

// ── Progress bar ─────────────────────────────────────────────

export const progressBar = (pct, segments = 10) => {
	const c = Math.min(100, Math.max(0, pct));
	const f = Math.round((c / 100) * segments);
	const bar = "█".repeat(f) + "░".repeat(segments - f);
	return `${bar} \`${c}%\``;
};

// ── Stat card ────────────────────────────────────────────────

export const statCard = (stats) => {
	const rows = stats.map((s) => `│ ${s.label}: \`${s.value}\``).join("\n");
	return `╭${"─".repeat(BOX_W)}╮\n${rows}\n╰${"─".repeat(BOX_W)}╯`;
};

// ── Send helper ──────────────────────────────────────────────

export const sendWithTyping = async (sock, to, msgObj, opts = {}) => {
	if (opts.typingMs > 0) await new Promise((r) => setTimeout(r, opts.typingMs));
	const sendOpts = { ...(opts.sendOpts || {}) };
	if (opts.quoted) sendOpts.quoted = opts.quoted;
	return sock.sendMessage(to, msgObj, sendOpts);
};

// ══════════════════════════════════════════════════════════════
// PREMIUM FORMATTING HELPERS
// ══════════════════════════════════════════════════════════════

/**
 * Formats a key-value pair for settings displays
 */
export const keyValue = (key, value, valueEmoji = "") =>
	` ${valueEmoji} *${key}:* \`${value}\``;

/**
 * Formats a bullet list item
 */
export const bulletItem = (text, icon = "•") =>
	` ${icon} ${text}`;

/**
 * Formats a section divider
 */
export const sectionDivider = (icon, text) =>
	`${thinSep()}\n${icon} *${text.toUpperCase()}*\n${thinSep()}`;

/**
 * Formats toggle state with visual indicator
 */
export const toggleState = (isOn) =>
	isOn ? "✅ *ON*" : "❌ *OFF*";

/**
 * Formats warning level with visual bars
 */
export const warningBars = (count, max) => {
	const filled = "🔴".repeat(Math.min(count, max));
	const empty = "⚪".repeat(Math.max(0, max - count));
	return `${filled}${empty} *(${count}/${max})*`;
};

/**
 * Formats a command with prefix for display
 */
export const formatCmd = (prefix, cmd) =>
	`\`${prefix}${cmd}\``;

/**
 * Formats a placeholder description
 */
export const formatPlaceholder = (placeholder, desc) =>
	` • \`${placeholder}\` — ${desc}`;

/**
 * Creates a compact one-line box for simple messages
 */
export const compactBox = (text, icon = "") => {
	const content = icon ? `${icon} ${text}` : text;
	const padded = content.padEnd(BOX_W);
	return `┃${padded}┃`;
};

// ══════════════════════════════════════════════════════════════
// PREMIUM TEMPLATES
// ══════════════════════════════════════════════════════════════

// ── Welcome ──────────────────────────────────────────────────

const WELCOME_TEMPLATES = [
	(mention, group) => [
		`╭━━『 *Welcome* 🎉 』━━╮`,
		"",
		`👋 Hello ${mention}!`,
		group ? `Welcome to *${group}*! 🚀` : "Welcome to the group! 🚀",
		"",
		"💡 Type `.help` or `#help` to explore commands!",
	].join("\n"),

	(mention, group) => [
		`╭━━『 *Welcome Aboard* 🌟 』━━╮`,
		"",
		`🚀 Hey ${mention}, welcome aboard!`,
		group ? `Enjoy your stay in *${group}* ✨` : "Enjoy your stay! ✨",
		"",
		"💡 Feel free to chat and have fun!",
	].join("\n"),

	(mention, group) => [
		`╭━━『 *New Member* 👋 』━━╮`,
		"",
		`✨ A new member has arrived!`,
		`🔥 Welcome ${mention}${group ? ` to *${group}*` : ""}!`,
		"",
		"💡 Type `.help` or `#help` to see what I can do.",
	].join("\n"),
];

export const randomWelcome = (name, groupName = "") => {
	const idx = Math.floor(Math.random() * WELCOME_TEMPLATES.length);
	return WELCOME_TEMPLATES[idx](name, groupName);
};

const GOODBYE_TEMPLATES = [
	(mention, group) => [
		`╭━━『 *Goodbye* 👋 』━━╮`,
		"",
		`👋 Farewell ${mention}!`,
		group ? `We will miss you in *${group}*! 😢` : "We will miss you! 😢",
		"",
		"✨ Wishing you all the best!",
	].join("\n"),

	(mention, group) => [
		`╭━━『 *Farewell* 🚪 』━━╮`,
		"",
		`🚶 ${mention} has left the group.`,
		group ? `Departed from *${group}*` : "",
		"",
		"👋 Take care until next time!",
	].join("\n"),

	(mention, group) => [
		`╭━━『 *Goodbye* ✈️ 』━━╮`,
		"",
		`✈️ Bon voyage, ${mention}!`,
		group ? `Left *${group}*` : "",
		"",
		"⭐ Wishing you good luck ahead!",
	].join("\n"),
];

export const randomGoodbye = (name, groupName = "") => {
	const idx = Math.floor(Math.random() * GOODBYE_TEMPLATES.length);
	return GOODBYE_TEMPLATES[idx](name, groupName);
};

// ── Bot Status ───────────────────────────────────────────────

export const botStatusMessages = {
	connected: (grp) => premiumBox([
		"⚡ Live & ready!",
		grp ? `_${grp}_` : "",
		"🚀 _All systems go_"
	], "ONLINE", "🟢", null, { compact: true }),

	reconnecting: () => premiumBox([
		"⏳ Reconnecting…",
		"",
		"_Please wait a moment._"
	], "RECONNECTING", "🔄", null, { compact: true }),

	offline: () => premiumBox([
		"😔 Experiencing issues",
		"",
		"💪 _Back soon — hang in there!_"
	], "OFFLINE", "🔴", null, { compact: true }),

	activated: (grp) => premiumBox([
		`🚀 Live in *${grp}*!`,
		"",
		"✅ _All commands ready_",
		"",
		`💡 ${formatCmd("#", "help")}`
	], "ACTIVATED", "✅", null, { compact: true }),

	deactivated: (grp) => premiumBox([
		`😴 Napping in *${grp}*`,
		"",
		"_Only essential commands available._"
	], "DEACTIVATED", "😴", null, { compact: true }),

	maintenanceOn: () => premiumBox([
		"🔧 Under maintenance",
		"",
		"_Only essential commands available._",
		"_Check back later!_"
	], "MAINTENANCE", "🔧", null, { compact: true }),

	maintenanceOff: () => premiumBox([
		"🎉 All systems restored!",
		"",
		"⚡ _Full power back_"
	], "RESTORED", "✅", null, { compact: true }),
};

// ── Errors / Access ──────────────────────────────────────────

export const errorMsg = (reason, hint) => premiumBox([
	`❌ *${reason}*`,
	"",
	`_${hint}_`
], "ERROR", "❌", null, { variant: "error" });

export const successMsg = (action) => premiumBox([
	`✅ *${action}*`
], "SUCCESS", "✅", null, { variant: "success", compact: true });

export const accessDenied = (r = "ACCESS DENIED") => premiumBox([
	"🚫",
	`*${r}*`,
	"",
	"_You don't have permission._"
], "DENIED", "🚫", null, { variant: "error" });

export const cmdNotFound = (p, cmd) => premiumBox([
	`❌ *Not found:*`,
	`\`${p}${cmd}\``,
	"",
	`_Type \`${p}help\` to browse commands._`
], "NOT FOUND", "🔍", null, { variant: "error" });

export const processError = (msg) => premiumBox([
	`❌ *Command Error*`,
	`_${msg}_`
], "ERROR", "❌", null, { variant: "error" });

export const dbError = (msg) => premiumBox([
	`❌ *Database Error*`,
	`_${msg}_`
], "DB ERROR", "❌", null, { variant: "error" });

export const rateLimitMsg = (s) => premiumBox([
	`⏳ *Slow down!*`,
	`_Wait ${s}s before retrying._`
], "RATE LIMIT", "⏳", null, { variant: "warning" });

export const timeoutMsg = (cmd) => premiumBox([
	`⏱️ *Command Timeout*`,
	`_${cmd}_ took too long.`,
	"_Please try again._"
], "TIMEOUT", "⏱️", null, { variant: "warning" });

// ── Warnings ─────────────────────────────────────────────────

export const warningMsg = (user, count, max = 3) => {
	const bars = warningBars(count, max);
	const fin = count >= max;
	return premiumBox([
		`⚠️ *Warning Issued*`,
		`@${user}`,
		bars,
		"",
		fin ? "_⛔ Final warning — removal on next strike._" : "_Clean up or face removal._"
	], fin ? "FINAL WARNING" : "WARNING", "⚠️", null, { variant: fin ? "error" : "warning" });
};

export const warningsCleared = (user) => premiumBox([
	"✅ *Cleared*",
	`@${user}`
], "CLEARED", "✨", null, { variant: "success", compact: true });

export const nsfwAlert = (user) => premiumBox([
	"🚫 *NSFW Not Allowed!*",
	`@${user} has been warned.`
], "NSFW ALERT", "🚫", null, { variant: "error" });

// ── Kick / Promote / Demote ──────────────────────────────────

export const kickMsg = (user) => premiumBox([
	"✅ *Removed*",
	`@${user}`
], "REMOVED", "🔨", null, { variant: "error", compact: true });

export const promoteMsg = (user) => premiumBox([
	"⬆️ *Promoted*",
	`@${user}`,
	"_Admin privileges granted._"
], "PROMOTED", "⭐", null, { variant: "success" });

export const demoteMsg = (user) => premiumBox([
	"⬇️ *Demoted*",
	`@${user}`,
	"_Admin privileges removed._"
], "DEMOTED", "📉", null, { variant: "warning" });

// ── Group Management ─────────────────────────────────────────

export const antilinkToggled = (on) => premiumBox([
	`${toggleState(on)}`,
	on ? "_Links will be auto-deleted._" : "_Links are allowed._"
], "ANTI-LINK", on ? "🛡️" : "🔓", null, { variant: on ? "success" : "light", compact: true });

export const nsfwToggled = (on) => premiumBox([
	`${toggleState(on)}`,
	on ? "_Explicit images auto-deleted._" : "_NSFW filter disabled._"
], "NSFW FILTER", on ? "🛡️" : "🔓", null, { variant: on ? "success" : "light", compact: true });

export const chatModeToggled = (on) => premiumBox([
	on ? "💬 All members can chat" : "🔒 Only admins can chat",
	"",
	`${toggleState(on)}`
], "CHAT MODE", on ? "🔓" : "🔒", null, { variant: on ? "success" : "warning", compact: true });

export const adminOnlyToggled = (on) => premiumBox([
	on ? "🛡️ Bot replies to *Admins only*" : "💬 Bot replies to *all members*",
	"",
	`${toggleState(on)}`
], "ADMIN-ONLY", on ? "🛡️" : "🔓", null, { variant: on ? "success" : "light", compact: true });

export const cmdBlocked = (c) => premiumBox([
	`🚫 *Blocked* _${c}_`,
	"_in this group._"
], "BLOCKED", "🚫", null, { variant: "error", compact: true });

export const cmdUnblocked = (c) => premiumBox([
	`✅ *Unblocked* _${c}_`,
	"_in this group._"
], "UNBLOCKED", "✅", null, { variant: "success", compact: true });

export const blockedCmdsList = (c) => premiumBox([
	`*${c.length} blocked:*`,
	"",
	...c.map(x => bulletItem(`\`${x}\``, "🚫"))
], "BLOCKED CMDS", "📋", null, { variant: "warning" });

export const noBlockedCmds = () => premiumBox([
	"✅ *No commands blocked*"
], "BLOCKED CMDS", "✅", null, { variant: "success", compact: true });

export const grpNameUpdated = (n) => premiumBox([
	"✨ *Group name updated!*",
	n
], "GROUP NAME", "📝", null, { variant: "success", compact: true });

export const grpLinkMsg = (l) => premiumBox([
	"🔗 *Group Invite Link:*",
	"",
	l
], "LINK", "🔗", null, { variant: "light" });

export const botNotAdmin = () => premiumBox([
	"_I'm not an admin._",
	"",
	"_Please promote me._"
], "ERROR", "❌", null, { variant: "error", compact: true });

export const addedMsg = (s) => {
	const m = {
		200: ["✅", "ADDED", "_Number added to group._", "success"],
		400: ["❌", "INVALID", "_Invalid number — add country code._", "error"],
		403: ["❌", "PRIVACY", "_Privacy settings block adding._", "error"],
		408: ["❌", "RECENT", "_Number left recently._", "error"],
		409: ["❌", "EXISTS", "_Already in group._", "error"],
		500: ["❌", "FULL", "_Group is full._", "error"]
	};
	const i = m[s] || ["❌", "ERROR", "_An error occurred._", "error"];
	return premiumBox([`${i[0]} *${i[1]}*`, i[2]], i[1], i[0], null, { variant: i[3] || "error", compact: true });
};

// ── Welcome Settings ─────────────────────────────────────────

export const welcomeSet = () => premiumBox([
	"✅ *Welcome Message Set!*",
	"",
	`_Use ${formatCmd("#", "welcome preview")} to test._`
], "SET", "✅", null, { variant: "success", compact: true });

export const welcomeDisabled = () => premiumBox([
	"_Welcome disabled._",
	"",
	`_Use ${formatCmd("#", "welcome on")} to enable._`
], "DISABLED", "😴", null, { variant: "light", compact: true });

export const welcomeEnabled = () => premiumBox([
	"_Welcome messages enabled!_ ✅"
], "ENABLED", "✅", null, { variant: "success", compact: true });

export const welcomeReset = () => premiumBox([
	"_Reset to default templates._ ✅"
], "RESET", "🔄", null, { variant: "success", compact: true });

export const welcomeSettings = (status, prefix = "#") => [
	"╭━━『 *Welcome Settings* 🎉 』━━╮",
	"",
	`📊 *Status:* ${status}`,
	"",
	"┏━━━━━━━━━━━━━━━━━",
	"┃ ⚙️ COMMANDS",
	"┗━━━━━━━━━━━━━━━━━",
	`│ ➜ \`${prefix}welcome <message>\` — Set custom text`,
	`│ ➜ \`${prefix}welcome preview\` — Test preview`,
	`│ ➜ \`${prefix}welcome reset\` — Reset to default`,
	`│ ➜ \`${prefix}welcome off\` — Turn off welcome`,
	`│ ➜ \`${prefix}welcome on\` — Turn on welcome`,
	"╰━━━━━━━━━━━━━━━━━",
	"",
	"💡 *Placeholders for custom message:*",
	"• `@user` — Mentions the new member",
	"• `{group}` — Group name",
	"• `{name}` — Member name",
	"• `{desc}` — Group description",
].join("\n");

// ── Goodbye Settings ─────────────────────────────────────────

export const goodbyeSet = () => "✅ *Goodbye Message Set!*";

export const goodbyeDisabled = () => "😴 *Goodbye messages disabled for this group.*";

export const goodbyeEnabled = () => "✅ *Goodbye messages enabled!*";

export const goodbyeReset = () => "✅ *Goodbye message reset to default templates.*";

export const goodbyeSettings = (status, prefix = "#") => [
	"╭━━『 *Goodbye Settings* 👋 』━━╮",
	"",
	`📊 *Status:* ${status}`,
	"",
	"┏━━━━━━━━━━━━━━━━━",
	"┃ ⚙️ COMMANDS",
	"┗━━━━━━━━━━━━━━━━━",
	`│ ➜ \`${prefix}goodbye <message>\` — Set custom text`,
	`│ ➜ \`${prefix}goodbye preview\` — Test preview`,
	`│ ➜ \`${prefix}goodbye reset\` — Reset to default`,
	`│ ➜ \`${prefix}goodbye off\` — Turn off goodbye`,
	`│ ➜ \`${prefix}goodbye on\` — Turn on goodbye`,
	"╰━━━━━━━━━━━━━━━━━",
	"",
	"💡 *Placeholders you can use:*",
	"• `@user` — Tag the leaving member",
	"• `{group}` — Group name",
	"• `{name}` — Member name",
	"• `{desc}` — Group description",
].join("\n");

// ── Block / Unblock ──────────────────────────────────────────

export const userBlocked = () => premiumBox([
	"❌ *Blocked*",
	"_This user is now blocked._"
], "BLOCKED", "🚫", null, { variant: "error", compact: true });

export const userUnblocked = () => premiumBox([
	"✅ *Unblocked*"
], "UNBLOCKED", "✅", null, { variant: "success", compact: true });

export const cannotBlock = () => premiumBox([
	"_Can't block Bot / Owner / Admin_ 💀"
], "ERROR", "💀", null, { variant: "error", compact: true });

// ── Maintenance / Restrictions ───────────────────────────────

export const maintenanceMsg = () => premiumBox([
	"🔒 *Restricted Mode*",
	"",
	"_Only essential commands available._",
	"_Check back later!_"
], "RESTRICTED", "🔒", null, { variant: "warning" });

export const globallyDisabled = () => premiumBox([
	"_Globally disabled._ 🚫"
], "DISABLED", "🚫", null, { variant: "error", compact: true });

export const commandBlocked = () => premiumBox([
	"_Blocked in this group._ 🚫"
], "BLOCKED", "🚫", null, { variant: "error", compact: true });

// ── Access control ───────────────────────────────────────────

export const ownerOnlyMsg = () => premiumBox([
	"_Only the Bot Owner can use this._ 🚫"
], "OWNER ONLY", "👑", null, { variant: "error", compact: true });

export const adminOnlyMsg = () => premiumBox([
	"_Only Group Admins._ 🛡️"
], "ADMIN ONLY", "🛡️", null, { variant: "warning", compact: true });

export const onlyGroupsMsg = () => premiumBox([
	"_Groups only._ 👥"
], "GROUPS ONLY", "👥", null, { variant: "warning", compact: true });

export const provideArgMsg = (a) => premiumBox([
	`❌ *Missing:* _${a}_`
], "MISSING", "❌", null, { variant: "error", compact: true });

export const usageMsg = (u) => premiumBox([
	`_Usage:_ \`${u}\``
], "USAGE", "💡", null, { variant: "light", compact: true });

// ── Help / Menu ──────────────────────────────────────────────

export const helpMenuHeader = (prefix, total) =>
	premiumBox([
		`${keyValue("Prefix", prefix)}`,
		`${keyValue("Commands", total.toString(), "📊")}`
	], "DOWNLOADBUDDY", "✨", null, { variant: "default", compact: true });

export const helpCmdInfo = (name, desc, usage, aliases) => {
	const lns = [
		`📝 _${desc}_`,
		"",
		`💡 *Usage:*`,
		`\`${usage}\``
	];
	if (aliases?.length) {
		lns.push("");
		lns.push("🏷️ *Aliases:*");
		lns.push(...aliases.map(a => bulletItem(`\`${a}\``)));
	}
	return premiumBox(lns, name.toUpperCase(), "📌", null, { variant: "light" });
};

export const startHeader = () =>
	premiumBox([
		"Your WhatsApp media downloader",
		"",
		`_Type ${formatCmd("#", "help")} to explore_`
	], "DOWNLOADBUDDY", "🎬", null, { compact: true });

export const aliveHeader = (status, latency, uptime, memPct) => {
	const lbl = latency < 500 ? "EXCELLENT" : latency < 2000 ? "GOOD" : "SLOW";
	const lat = latency >= 1000 ? (latency/1000).toFixed(2)+"s" : Math.round(latency)+"ms";
	return premiumBox([
		`${status} *${lbl}*`,
		`${keyValue("Latency", lat, "⚡")}`,
		`${keyValue("Uptime", uptime, "⏱️")}`,
		"",
		progressBar(memPct),
		"",
		`_Type ${formatCmd("#", "help")} to explore_`
	], "ENGINE STATUS", "🎾", null, { variant: "default" });
};

// ── Analytics ────────────────────────────────────────────────

export const groupStatsCard = (grp, members, msgs, eng, bd) => {
	const lines = [
		`_${grp}_`,
		`${keyValue("Members", members.toLocaleString(), "👥")}`,
		`${keyValue("Messages", msgs.toLocaleString(), "💬")}`,
		`${keyValue("Engagement", eng.toString(), "⚡")}`
	];
	if (bd) {
		lines.push("");
		lines.push(...bd.split("\n"));
	}
	return premiumBox(lines, "CHAT ANALYTICS", "📊", null, { variant: "default" });
};

export const userStatsCard = (name, stats) =>
	premiumBox([
		`📊 *${name}'s Stats*`,
		"",
		...stats.map(s => `${s.icon||''} *${s.label}:* \`${s.value}\``)
	], "YOUR STATS", "📊", null, { variant: "default" });

export const leaderboardCard = (title, entries) => {
	const medals = ["🥇","🥈","🥉"];
	const lines = entries.slice(0,10).map((e,i) => {
		const medal = medals[i] || `*#${i+1}*`;
		return `${medal} ${e.name} — *${e.value}*`;
	});
	if (entries.length > 10) lines.push("", `_...and ${entries.length-10} more_`);
	return premiumBox(lines, title, "🏆", null, { variant: "default" });
};

export const countHeader = (grp) =>
	premiumBox([
		`📊 *Group Stats*`,
		`_${grp}_`
	], "STATS", "📊", null, { compact: true });

// ── Downloads ────────────────────────────────────────────────

export const downloadSuccess = (title, info) =>
	premiumBox([
		`✅ *${title}*`,
		"",
		...(Array.isArray(info) ? info : [info])
	], "DOWNLOADED", "📥", null, { variant: "success" });

export const downloadError = (r, h) => premiumBox([
	`❌ *${r}*`,
	"",
	`_${h}_`
], "ERROR", "❌", null, { variant: "error" });

export const downloadProgress = (pct, fn) =>
	premiumBox([
		`\`${fn}\``,
		"",
		progressBar(pct)
	], "DOWNLOADING", "⬇️", null, { variant: "default" });

// ── Search ───────────────────────────────────────────────────

export const searchResults = (q, res) => {
	const lines = [
		`_Searching:_ *${q}*`,
		"",
		...res.slice(0,8).map((r,i) => `${i+1}. ${r}`)
	];
	if (res.length > 8) lines.push(`_...and ${res.length-8} more_`);
	return premiumBox(lines, "SEARCH RESULTS", "🔍", null, { variant: "default" });
};

// ── Broadcast ────────────────────────────────────────────────

export const broadcastMsg = (from, msg) =>
	premiumBox([
		"📢 *Broadcast*",
		`_from ${from}_`,
		"",
		msg
	], "BROADCAST", "📢", null, { variant: "default" });

// ── Misc ─────────────────────────────────────────────────────

export const processingMsg = () => premiumBox([
	"_Processing..._ ⏳"
], "PROCESSING", "⏳", null, { variant: "light", compact: true });

export const featureComingSoon = (f) => premiumBox([
	`🚧 *${f}*`,
	"",
	"_Coming soon! Stay tuned._ ✨"
], "COMING SOON", "🚧", null, { variant: "light" });

export const devCard = (name, handle, github, links, footer) => {
	const lns = [
		"👨‍💻 *Developer*",
		`${name} · ${handle}`,
		"",
		...links
	];
	return premiumBox(lns, "DEV", "👨‍💻", footer, { variant: "default" });
};

export const tagAllMsg = (count) =>
	premiumBox([`👥 *Total Members:* *${count}*`], "TAG ALL", "👥", null, { variant: "default", compact: true });

export const reactionSequence = (sock, to, key, emojis = ["👀","✅"]) =>
	emojis.map((e,i) => ({ emoji: e, delay: i===0?0:350, send: () => sock.sendMessage(to,{react:{text:e,key}}).catch(()=>{}) }));

// ── Default export (back-compat) ─────────────────────────────

export default {
	box: premiumBox,
	premiumBox,
	thinSep, thickSep, dotSep, starSep,
	progressBar, statCard, brandedFooter, sectionHeader,
	keyValue, bulletItem, sectionDivider, toggleState, warningBars,
	formatCmd, formatPlaceholder, compactBox, doubleBox, infoBox,
	reactSequence: reactionSequence,
	sendWithTyping,
	errorMsg, successMsg, accessDenied, cmdNotFound,
	processError, dbError, rateLimitMsg, timeoutMsg,
	randomWelcome, randomGoodbye,
	botStatusMessages,
	warningMsg, warningsCleared, nsfwAlert,
	kickMsg, promoteMsg, demoteMsg,
	antilinkToggled, nsfwToggled, chatModeToggled, adminOnlyToggled,
	cmdBlocked, cmdUnblocked, blockedCmdsList, noBlockedCmds,
	grpNameUpdated, grpLinkMsg, botNotAdmin, addedMsg,
	welcomeSet, welcomeDisabled, welcomeEnabled, welcomeReset, welcomeSettings,
	goodbyeSet, goodbyeDisabled, goodbyeEnabled, goodbyeReset, goodbyeSettings,
	userBlocked, userUnblocked, cannotBlock,
	maintenanceMsg, globallyDisabled, commandBlocked,
	ownerOnlyMsg, adminOnlyMsg, onlyGroupsMsg, provideArgMsg, usageMsg,
	helpMenuHeader, helpCmdInfo, startHeader, aliveHeader,
	groupStatsCard, userStatsCard, leaderboardCard, countHeader,
	downloadSuccess, downloadError, downloadProgress,
	searchResults, broadcastMsg,
	processingMsg, featureComingSoon, devCard, tagAllMsg,
};
