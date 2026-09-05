import { Router } from "express";
import { group, updateGroupData } from "../sqlite-DB/groupDataDb.js";
import { member } from "../sqlite-DB/membersDataDb.js";
import { bot, getBotData, clearBotCache } from "../sqlite-DB/botDataDb.js";
import { cmdToText } from "../functions/getAddCommands.js";
import { clearSQLiteAuthState } from "../functions/useSQLiteAuthState.js";
import { getLogs, getRecentActivities, getActivityOverview, getCommandsRun, logSystemEvent } from "../functions/botLogger.js";
import mdClient from "../sqlite.js";

const router = Router();

// ── Auth middleware ────────────────────────────────────────────────────────────
export function requireAdmin(req, res, next) {
	if (req.session && req.session.isAdmin) return next();
	if (req.path.startsWith("/api/")) return res.status(401).json({ error: "Unauthorized" });
	return res.redirect("/admin/login");
}

// ── Public bot status (no auth — used by index.ejs to poll connection state) ──
router.get("/api/status", (req, res) => {
	const isConnected = !!(
		req.app.locals.botConnected ||
		req.app.locals.sock?.user ||
		req.app.locals.sock?.authState?.creds?.me
	);
	res.json({
		connected: isConnected,
	});
});

// ── Public health check endpoint (no auth — for uptime monitoring & container health checks) ──
router.get(["/health", "/api/health"], (req, res) => {
	const mem = process.memoryUsage();
	res.status(200).json({
		status: "ok",
		uptime: Math.floor(process.uptime()),
		timestamp: new Date().toISOString(),
		connected: !!req.app.locals.botConnected,
		memory: {
			heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
			rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
		},
	});
});

// ── Public pairing code endpoint (no auth — used by index.ejs for initial setup) ───────────
router.post("/api/pair", async (req, res) => {
	const { phoneNumber } = req.body;
	if (!phoneNumber) return res.status(400).json({ error: "Phone number required." });

	let sock = req.app.locals.sock;

	if (!sock && req.app.locals.reconnect) {
		req.app.locals.reconnect();
		await new Promise(res => setTimeout(res, 2000));
		sock = req.app.locals.sock;
	}

	if (!sock) return res.status(503).json({ error: "Bot socket is initializing. Please wait 3 seconds and try again." });

	if (sock.user) {
		return res.status(400).json({ error: "Bot is already logged in. Use the admin panel to manage connection." });
	}

	try {
		let clean = String(phoneNumber).replace(/\D/g, "");
		if (clean.length < 7) return res.status(400).json({ error: "Invalid phone number — include country code (e.g. 919876543210)." });
		const code = await sock.requestPairingCode(clean);
		res.json({ ok: true, code });
	} catch (err) {
		console.error("Pairing code error:", err);
		res.status(500).json({ error: err.message || "Failed to generate pairing code." });
	}
});

// ── JSON auth endpoints (used by React app & Dashboard) ─────────────────────────

router.get(["/api/me", "/api/admin/me"], (req, res) => {
	if (req.session?.isAdmin) return res.json({ authenticated: true });
	res.status(401).json({ authenticated: false });
});

router.post(["/api/login", "/api/admin/login"], (req, res) => {
	const { password } = req.body;
	const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";
	if (password === expectedPassword) {
		req.session.isAdmin = true;
		return res.json({ ok: true });
	}
	res.status(401).json({ error: "Incorrect password." });
});

router.post(["/api/logout", "/api/admin/logout"], (req, res) => {
	req.session.destroy(() => res.json({ ok: true }));
});

// ── Legacy form login/logout (kept for QR page fallback) ─────────────────────

router.get("/admin/login", (req, res, next) => {
	if (req.session?.isAdmin) return res.redirect("/admin");
	next();
});

router.post("/admin/login", (req, res) => {
	const { password } = req.body;
	const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";
	if (password === expectedPassword) {
		req.session.isAdmin = true;
		return res.redirect("/admin");
	}
	res.render("login", { error: "Incorrect password." });
});

router.post("/admin/logout", (req, res) => {
	req.session.destroy(() => res.redirect("/admin/login"));
});

// ── API: Stats ─────────────────────────────────────────────────────────────────
router.get("/api/admin/stats", requireAdmin, async (req, res) => {
	try {
		const [groupCount, memberCount, botData] = await Promise.all([
			group.countDocuments(),
			member.countDocuments(),
			getBotData(),
		]);
		const mem = process.memoryUsage();
		res.json({
			uptime: Math.floor(process.uptime()),
			groupCount,
			memberCount,
			commandsRun: getCommandsRun(),
			memoryUsage: {
				heapUsed: mem.heapUsed,
				heapTotal: mem.heapTotal,
				rss: mem.rss,
			},
			botNumber: process.env.BOT_NUMBER?.split(",")[0] || "Unknown",
			disabledGlobally: botData?.disabledGlobally || [],
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// ── API: Analytics (new) ───────────────────────────────────────────────────────
router.get("/api/admin/analytics", requireAdmin, async (req, res) => {
	try {
		const [groups, members] = await Promise.all([
			group.find({}).toArray(),
			member.find({}).toArray(),
		]);

		// Top 10 groups by messages
		const topGroups = [...groups]
			.sort((a, b) => (b.totalMsgCount || b.totalmsg || 0) - (a.totalMsgCount || a.totalmsg || 0))
			.slice(0, 10)
			.map(g => ({
				name: (g.grpName || g._id).slice(0, 22),
				messages: g.totalMsgCount || g.totalmsg || 0,
				active: g.isBotOn !== false,
			}));

		// Top 10 members by total messages
		const topMembers = [...members]
			.sort((a, b) => (b.totalmsg || 0) - (a.totalmsg || 0))
			.slice(0, 10)
			.map(m => ({
				name: (m.username || m._id.split("@")[0]).slice(0, 22),
				messages: m.totalmsg || 0,
				text: m.texttotal || 0,
				image: m.imagetotal || 0,
				video: m.videototal || 0,
				sticker: m.stickertotal || 0,
				pdf: m.pdftotal || 0,
				xp: m.xp || 0,
			}));

		// Message type aggregation
		const typeBreakdown = members.reduce(
			(acc, m) => {
				acc.text += m.texttotal || 0;
				acc.image += m.imagetotal || 0;
				acc.video += m.videototal || 0;
				acc.sticker += m.stickertotal || 0;
				acc.pdf += m.pdftotal || 0;
				return acc;
			},
			{ text: 0, image: 0, video: 0, sticker: 0, pdf: 0 }
		);

		const memberTotalMessages = Object.values(typeBreakdown).reduce((a, b) => a + b, 0);
		const groupTotalMessages = groups.reduce((acc, g) => acc + (g.totalMsgCount || g.totalmsg || 0), 0);
		const totalMessages = Math.max(groupTotalMessages, memberTotalMessages);

		if (memberTotalMessages === 0 && totalMessages > 0) {
			typeBreakdown.text = totalMessages;
		}

		const activeGroups = groups.filter(g => g.isBotOn !== false).length;
		const blockedMembers = members.filter(m => m.isBlock).length;
		const warnedMembers = members.filter(m => Array.isArray(m.warning) && m.warning.length > 0).length;

		res.json({
			topGroups,
			topMembers,
			typeBreakdown,
			totalMessages,
			activeGroups,
			blockedMembers,
			warnedMembers,
			totalGroups: groups.length,
			totalMembers: members.length,
			activity: getActivityOverview(),
			recentActivity: getRecentActivities(),
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// ── API: Bot Health (new) ──────────────────────────────────────────────────────
router.get("/api/admin/bot/health", requireAdmin, (req, res) => {
	try {
		const mem = process.memoryUsage();
		const isConnected = !!(
			req.app.locals.botConnected ||
			req.app.locals.sock?.user ||
			req.app.locals.sock?.authState?.creds?.me
		);
		res.json({
			uptime: Math.floor(process.uptime()),
			memory: {
				heapUsed: mem.heapUsed,
				heapTotal: mem.heapTotal,
				rss: mem.rss,
				external: mem.external,
			},
			connected: isConnected,
			nodeVersion: process.version,
			pid: process.pid,
			platform: process.platform,
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// ── API: Broadcast (new) ───────────────────────────────────────────────────────
router.post("/api/admin/broadcast", requireAdmin, async (req, res) => {
	const { message, targetJids } = req.body;
	if (!message || !message.trim()) return res.status(400).json({ error: "Message is required." });

	const sock = req.app.locals.sock;
	if (!sock) return res.status(503).json({ error: "Bot is not connected. Cannot send messages." });

	try {
		// Resolve target JIDs
		let jids = targetJids;
		if (!Array.isArray(jids) || jids.length === 0) {
			const activeGroups = await group.find({ isBotOn: true }, { projection: { _id: 1 } }).toArray();
			jids = activeGroups.map(g => g._id);
		}

		let sent = 0, failed = 0;
		for (const jid of jids) {
			try {
				await sock.sendMessage(jid, { text: message.trim() });
				sent++;
				// Small delay to avoid rate limiting
				await new Promise(r => setTimeout(r, 400));
			} catch (_) {
				failed++;
			}
		}

		res.json({ ok: true, sent, failed, total: jids.length });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// ── API: Reconnect — creates a fresh socket without restarting the process ────
// Use this after logout or clear-auth so the bot gets a new QR/pairing code.
router.post("/api/admin/reconnect", requireAdmin, async (req, res) => {
	try {
		const reconnect = req.app.locals.reconnect;
		if (!reconnect) return res.status(503).json({ error: "Reconnect function not available." });

		// Fire and don't await — startSock is async and the QR/connect events
		// will be broadcast via WebSocket once the new socket is ready.
		reconnect();

		res.json({ ok: true, message: "Reconnecting… watch the QR page for the new QR code or use the pairing code." });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// ── API: Restart the Node process (full restart) ───────────────────────────────
// Only needed if reconnect alone isn't enough (e.g. memory issues).
// Spawns a new copy of this process then exits the current one.
router.post("/api/admin/restart", requireAdmin, (req, res) => {
	res.json({ ok: true, message: "Process restarting…" });
	setTimeout(async () => {
		const { spawn } = await import("child_process");
		const child = spawn(process.execPath, process.argv.slice(1), {
			cwd: process.cwd(), env: process.env, stdio: "inherit", detached: true,
		});
		child.unref();
		process.exit(0);
	}, 600);
});

// ── API: Logout bot from WhatsApp (new) ───────────────────────────────────────
router.post("/api/admin/logout-bot", requireAdmin, async (req, res) => {
	const sock = req.app.locals.sock;
	if (!sock) return res.status(503).json({ error: "Bot is not connected." });
	try {
		await sock.logout("Admin logout via dashboard");
		req.app.locals.sock = null;
		res.json({ ok: true, message: "Bot logged out of WhatsApp. Restart the bot to reconnect." });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// ── API: Pairing code (admin dashboard - requires auth) ───────────────────────
router.post("/api/admin/request-pair", requireAdmin, async (req, res) => {
	const { phoneNumber } = req.body;
	if (!phoneNumber) return res.status(400).json({ error: "Phone number is required." });

	const sock = req.app.locals.sock;
	if (!sock) return res.status(503).json({ error: "Bot socket is not ready." });

	if (sock.user) {
		return res.status(400).json({ error: "Bot is already logged in. If you want to link a new number, Logout first." });
	}

	try {
		// Strip everything except digits
		const clean = phoneNumber.replace(/\D/g, "");
		if (clean.length < 7) return res.status(400).json({ error: "Invalid phone number." });

		const code = await sock.requestPairingCode(clean);
		res.json({ ok: true, code });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// ── API: Clear auth database (new) ────────────────────────────────────────────
router.post("/api/admin/clear-auth", requireAdmin, async (req, res) => {
	try {
		clearSQLiteAuthState();
		res.json({ ok: true, message: "Auth cleared. Restart the bot to get a new QR code or pairing code." });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// ── API: Maintenance Mode ───────────────────────────────────────────────────
router.get("/api/admin/maintenance-mode", requireAdmin, async (req, res) => {
	try {
		const botData = await getBotData();
		res.json({ maintenanceMode: botData?.maintenanceMode || false });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.patch("/api/admin/maintenance-mode", requireAdmin, async (req, res) => {
	const { maintenanceMode } = req.body;
	if (typeof maintenanceMode !== "boolean") return res.status(400).json({ error: "maintenanceMode must be a boolean" });
	try {
		await bot.updateOne({ _id: "bot" }, { $set: { maintenanceMode } });
		clearBotCache();
		res.json({ ok: true, maintenanceMode });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// ── API: Commands ──────────────────────────────────────────────────────────────
router.get("/api/admin/commands", requireAdmin, async (req, res) => {
	try {
		const [cmds, botData] = await Promise.all([cmdToText(), getBotData()]);
		const disabled = botData?.disabledGlobally || [];
		const annotate = (list, type) =>
			list.map((c) => ({ ...c, type, disabledGlobally: c.cmd.some((k) => disabled.includes(k)) }));
		res.json({
			publicCommands: annotate(cmds.publicCommands, "public"),
			groupCommands: annotate(cmds.groupCommands, "group"),
			adminCommands: annotate(cmds.adminCommands, "admin"),
			ownerCommands: annotate(cmds.ownerCommands, "owner"),
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.patch("/api/admin/commands/:cmd", requireAdmin, async (req, res) => {
	const { disabled, aliases = [] } = req.body;
	const primary = decodeURIComponent(req.params.cmd);
	const allKeys = [...new Set([primary, ...aliases])];
	try {
		if (disabled) {
			await bot.updateOne(
				{ _id: "bot" },
				{ $setOnInsert: { youtube_session: "" }, $addToSet: { disabledGlobally: { $each: allKeys } } },
				{ upsert: true }
			);
		} else {
			await bot.updateOne({ _id: "bot" }, { $pullAll: { disabledGlobally: allKeys } });
		}
		clearBotCache();
		res.json({ ok: true });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// ── API: Groups ────────────────────────────────────────────────────────────────
router.get("/api/admin/groups", requireAdmin, async (req, res) => {
	try {
		const groups = await group.find({}, { projection: { chatHistory: 0 } }).toArray();
		res.json(groups);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.patch("/api/admin/groups/:jid", requireAdmin, async (req, res) => {
	const jid = decodeURIComponent(req.params.jid);
	const allowed = ["isBotOn", "isChatBotOn", "isImgOn", "is91Only", "isAutoStickerOn", "cmdBlocked", "antilink", "nsfw", "adminOnly", "restrictedMode", "welcome"];
	const update = {};
	for (const key of allowed) {
		if (key in req.body) update[key] = req.body[key];
	}
	if (!Object.keys(update).length) return res.status(400).json({ error: "No valid fields" });
	try {
		await updateGroupData(jid, { $set: update });
		res.json({ ok: true });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.get("/api/admin/groups/:jid/members", requireAdmin, async (req, res) => {
	const jid = decodeURIComponent(req.params.jid);
	try {
		const grp = await group.findOne({ _id: jid }, { projection: { members: 1 } });
		res.json(grp?.members || []);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// ── API: Members ───────────────────────────────────────────────────────────────
router.get("/api/admin/members", requireAdmin, async (req, res) => {
	const { search = "", page = 1, limit = 50, sort = "totalmsg", order = "desc" } = req.query;
	const skip = (parseInt(page) - 1) * parseInt(limit);
	const query = search
		? { $or: [{ _id: { $regex: search, $options: "i" } }, { username: { $regex: search, $options: "i" } }] }
		: {};
	const allowedSort = ["totalmsg", "texttotal", "imagetotal", "videototal", "stickertotal", "pdftotal", "username"];
	const sortField = allowedSort.includes(sort) ? sort : "totalmsg";
	const sortDir = order === "asc" ? 1 : -1;
	try {
		const [members, total] = await Promise.all([
			member.find(query).sort({ [sortField]: sortDir }).skip(skip).limit(parseInt(limit)).toArray(),
			member.countDocuments(query),
		]);
		res.json({ members, total, page: parseInt(page), limit: parseInt(limit) });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.patch("/api/admin/members/:jid", requireAdmin, async (req, res) => {
	const jid = decodeURIComponent(req.params.jid);
	const { action } = req.body;
	try {
		if (action === "block") {
			await member.updateOne({ _id: jid }, { $set: { isBlock: true } });
		} else if (action === "unblock") {
			await member.updateOne({ _id: jid }, { $set: { isBlock: false } });
		} else if (action === "resetWarnings") {
			await member.updateOne({ _id: jid }, { $set: { warning: [] } });
		} else if (action === "resetMsgCount") {
			await member.updateOne({ _id: jid }, {
				$set: { totalmsg: 0, texttotal: 0, imagetotal: 0, videototal: 0, stickertotal: 0, pdftotal: 0 },
			});
		} else {
			return res.status(400).json({ error: "Unknown action" });
		}
		res.json({ ok: true });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// ── API: Real-time System Logs ──────────────────────────────────────────────
router.get("/api/admin/logs", requireAdmin, (req, res) => {
	try {
		const level = req.query.level;
		const limit = Number(req.query.limit) || 150;
		const logList = getLogs(limit, level);
		res.json({
			logs: logList,
			stats: {
				total: logList.length,
				info: logList.filter(l => l.level === "info").length,
				warn: logList.filter(l => l.level === "warn").length,
				error: logList.filter(l => l.level === "error").length,
				debug: logList.filter(l => l.level === "debug").length,
			}
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// ── API: Persistent Plugins ─────────────────────────────────────────────────
const DEFAULT_PLUGINS = [
	{ id: 'sticker', name: 'Sticker Maker', desc: 'Convert images and GIFs to WhatsApp stickers automatically', category: 'Media', color: '#a78bfa', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', icon: '🎨', enabled: true },
	{ id: 'antilink', name: 'Anti-Link', desc: 'Automatically delete messages containing links in groups', category: 'Moderation', color: '#fb7185', bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.2)', icon: '🔗', enabled: true },
	{ id: 'welcome', name: 'Welcome Bot', desc: 'Send customizable welcome messages to new group members', category: 'Utility', color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', icon: '👋', enabled: true },
	{ id: 'games', name: 'Mini Games', desc: 'Fun games like tic-tac-toe, trivia, and word guessing', category: 'Fun', color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', icon: '🎮', enabled: true },
	{ id: 'music', name: 'Music Player', desc: 'Search and play music from YouTube and Spotify', category: 'Media', color: '#a78bfa', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', icon: '🎵', enabled: true },
	{ id: 'moderation', name: 'Auto Mod', desc: 'Auto-mute, warn, and kick users who violate rules', category: 'Moderation', color: '#fb7185', bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.2)', icon: '🛡️', enabled: true },
	{ id: 'currency', name: 'Currency Converter', desc: 'Real-time exchange rates for 150+ currencies', category: 'Utility', color: '#22d3ee', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)', icon: '💱', enabled: true },
	{ id: 'jokes', name: 'Joke Bot', desc: 'Random jokes, memes, and fun facts on demand', category: 'Fun', color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', icon: '😄', enabled: true },
	{ id: 'ocr', name: 'OCR Reader', desc: 'Extract text from images using optical character recognition', category: 'Utility', color: '#22d3ee', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)', icon: '📄', enabled: true },
];

router.get("/api/admin/plugins", requireAdmin, async (req, res) => {
	try {
		const botDoc = await getBotData();
		const savedPlugins = botDoc?.plugins || {};
		const plugins = DEFAULT_PLUGINS.map(p => ({
			...p,
			enabled: savedPlugins[p.id] !== undefined ? Boolean(savedPlugins[p.id]) : p.enabled,
		}));
		res.json({ plugins });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.patch("/api/admin/plugins/:id", requireAdmin, async (req, res) => {
	try {
		const { id } = req.params;
		const { enabled } = req.body;
		if (typeof enabled !== "boolean") return res.status(400).json({ error: "enabled must be boolean" });

		const botDoc = await getBotData();
		const savedPlugins = botDoc?.plugins || {};
		savedPlugins[id] = enabled;

		await bot.updateOne({ _id: "bot" }, { $set: { plugins: savedPlugins } }, { upsert: true });
		clearBotCache();
		logSystemEvent(`Plugin "${id}" ${enabled ? "enabled" : "disabled"}`, enabled ? "#34d399" : "#fb7185");
		res.json({ ok: true, id, enabled });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

export default router;
