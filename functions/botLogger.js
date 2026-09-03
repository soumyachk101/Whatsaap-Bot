/**
 * Real-time In-Memory Bot Event Logger & Activity Tracker
 */

const MAX_LOGS = 500;
const logs = [];
const activities = [];
const minuteBuckets = new Map(); // timestamp minute -> count

let totalCommandsRun = 0;

export function addLog(level, msg, category = "system") {
	const now = new Date();
	const time = now.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});

	const entry = {
		id: Date.now() + "-" + Math.random().toString(36).substr(2, 5),
		timestamp: Date.now(),
		time,
		level, // 'info' | 'warn' | 'error' | 'debug'
		msg,
		category,
	};

	logs.unshift(entry);
	if (logs.length > MAX_LOGS) logs.pop();
	return entry;
}

export function logMessageEvent(sender, groupName) {
	const minuteKey = Math.floor(Date.now() / 60000);
	minuteBuckets.set(minuteKey, (minuteBuckets.get(minuteKey) || 0) + 1);

	// Cleanup buckets older than 30 minutes
	const cutoff = minuteKey - 30;
	for (const k of minuteBuckets.keys()) {
		if (k < cutoff) minuteBuckets.delete(k);
	}
}

export function logCommandEvent(command, sender, groupName) {
	totalCommandsRun++;
	const target = groupName ? `group "${groupName}"` : "DM";
	const cleanSender = sender.split("@")[0].slice(-4);
	const text = `Command #${command} executed by ...${cleanSender} in ${target}`;

	addLog("info", text, "command");

	// Add to recent activity
	const actEntry = {
		id: Date.now(),
		text: `Command #${command} executed in ${groupName || "direct message"}`,
		time: "Just now",
		color: "#a78bfa",
		timestamp: Date.now(),
	};
	activities.unshift(actEntry);
	if (activities.length > 20) activities.pop();
}

export function logSystemEvent(text, color = "#34d399") {
	addLog("info", text, "system");
	activities.unshift({
		id: Date.now(),
		text,
		time: "Just now",
		color,
		timestamp: Date.now(),
	});
	if (activities.length > 20) activities.pop();
}

export function getLogs(limit = 150, level = null) {
	if (!level || level === "all") return logs.slice(0, limit);
	return logs.filter(l => l.level === level).slice(0, limit);
}

export function getRecentActivities() {
	const now = Date.now();
	return activities.slice(0, 8).map(a => {
		const diffSec = Math.floor((now - a.timestamp) / 1000);
		let timeStr = "Just now";
		if (diffSec >= 60) {
			const diffMin = Math.floor(diffSec / 60);
			timeStr = `${diffMin}m ago`;
		} else if (diffSec > 5) {
			timeStr = `${diffSec}s ago`;
		}
		return {
			...a,
			time: timeStr,
		};
	});
}

export function getActivityOverview() {
	const currentMinute = Math.floor(Date.now() / 60000);
	const points = [];
	for (let i = 19; i >= 0; i--) {
		const m = currentMinute - i;
		points.push(minuteBuckets.get(m) || 0);
	}
	return points;
}

export function getCommandsRun() {
	return totalCommandsRun;
}

// Initial system boot log
addLog("info", `Bot engine initialized successfully on Node.js ${process.version}`, "system");
logSystemEvent("Bot Engine online and operational", "#34d399");
