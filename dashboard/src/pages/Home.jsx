import { useState, useEffect, useMemo } from 'react'
import {
	getStats, getAnalytics, fmtUptime, reconnectBot, clearAuth, restartBot,
	getMaintenanceMode, setMaintenanceMode,
} from '../lib/api.js'
import { useToast } from '../App.jsx'
import { useWebSocket } from '../hooks/useWebSocket.js'
import StatCard from '../components/StatCard.jsx'
import GlassCard from '../components/GlassCard.jsx'
import {
	MessageIcon,
	GroupIcon,
	ActivityIcon,
	UsersIcon,
	BotIcon,
	ErrorIcon,
	WarningIcon,
	RefreshIcon,
	PowerIcon,
} from '../components/Icons.jsx'

// ── Organic Sparkline ───────────────────────────────────────────────────
function Sparkline({ data = [], color = '#4f8ef7', height = 36 }) {
	const max = Math.max(...data, 1)
	const bars = data.slice(-20)
	return (
		<div className="sparkline" style={{ height }}>
			{bars.map((v, i) => (
				<div key={i} className="spark-bar" style={{
					height: `${Math.max((v / max) * 100, 6)}%`,
					background: `linear-gradient(180deg, ${color}, rgba(79, 142, 247, 0.25))`,
					opacity: 0.5 + (i / bars.length) * 0.5,
					borderRadius: '4px 4px 0 0',
				}} />
			))}
		</div>
	)
}

// ── Organic Activity Item ───────────────────────────────────────────────
function ActivityItem({ text, time, color = '#4f8ef7' }) {
	return (
		<div className="activity-item">
			<div className="activity-dot" style={{ background: color, boxShadow: `0 0 8px ${color}55` }} />
			<div className="activity-text">{text}</div>
			<div className="activity-time">{time}</div>
		</div>
	)
}

// ── Main Dashboard: Control Center ──────────────────────────────────────
export default function Home() {
	const toast = useToast()
	const wsStatus = useWebSocket()
	const [stats, setStats] = useState(null)
	const [analytics, setAnalytics] = useState(null)
	const [warnings, setWarnings] = useState(0)
	const [loading, setLoading] = useState(true)
	const [maintenanceMode, setMaintenanceModeState] = useState(false)
	const [maintenanceLoading, setMaintenanceLoading] = useState(false)
	const [actionLoading, setActionLoading] = useState(false)
	const [currentTime, setCurrentTime] = useState(new Date())

	const isConnected = wsStatus === 'connected'

	const fetchData = () => {
		Promise.all([getStats(), getAnalytics()])
			.then(([s, a]) => { setStats(s); setAnalytics(a); setWarnings(a?.warnedMembers ?? 0) })
			.catch(() => {})
			.finally(() => setLoading(false))
	}

	useEffect(() => { fetchData(); const t = setInterval(fetchData, 30_000); return () => clearInterval(t) }, [])
	useEffect(() => {
		getMaintenanceMode().then(r => { if (r?.maintenanceMode != null) setMaintenanceModeState(r.maintenanceMode) }).catch(() => {})
	}, [])
	useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t) }, [])

	const handleMaintenance = async () => {
		const newVal = !maintenanceMode
		setMaintenanceLoading(true)
		try {
			const res = await setMaintenanceMode(newVal)
			setMaintenanceModeState(res?.maintenanceMode ?? newVal)
			toast(`Restriction mode ${newVal ? 'enabled' : 'disabled'}`, true)
		} catch (err) { toast(err.message || 'Failed to toggle', false) }
		finally { setMaintenanceLoading(false) }
	}

	const handleReconnect = async () => {
		setActionLoading(true)
		try { await reconnectBot(); toast('Reconnection triggered', true); fetchData() }
		catch (err) { toast(err.message, false) }
		finally { setActionLoading(false) }
	}

	const handleRestart = async () => {
		if (!confirm('Restart Node process on server?')) return
		setActionLoading(true)
		try { await restartBot(); toast('Restart initiated', true) }
		catch (err) { toast(err.message, false) }
		finally { setActionLoading(false) }
	}

	const handleClearAuth = async () => {
		if (!confirm('Clear session auth? You will need to re-link WhatsApp.')) return
		setActionLoading(true)
		try { await clearAuth(); toast('Session cleared', true); handleReconnect() }
		catch (err) { toast(err.message, false) }
		finally { setActionLoading(false) }
	}

	// Derive display values
	const uptime = stats?.uptime ? fmtUptime(stats.uptime) : '—'
	const messages = analytics?.totalMessages ?? stats?.messages ?? 0
	const commands = stats?.commandsRun ?? 0
	const groups = analytics?.totalGroups ?? stats?.groupCount ?? stats?.groups ?? 0
	const activeGroups = analytics?.activeGroups ?? groups
	const members = analytics?.totalMembers ?? stats?.memberCount ?? stats?.members ?? 0
	const activeSenders = analytics?.activeSenders ?? members
	const errors = stats?.errors ?? 0
	const activityData = Array.isArray(analytics?.activity) && analytics.activity.length > 0
		? analytics.activity
		: Array.from({ length: 20 }, () => 0)

	const last10Msgs = activityData.slice(10).reduce((a, b) => a + b, 0)
	const prev10Msgs = activityData.slice(0, 10).reduce((a, b) => a + b, 0)
	let msgTrend = analytics?.messageTrend
	if (!msgTrend) {
		if (last10Msgs > 0 || prev10Msgs > 0) {
			if (prev10Msgs === 0) msgTrend = `+${last10Msgs}`
			else {
				const diff = Math.round(((last10Msgs - prev10Msgs) / prev10Msgs) * 100)
				msgTrend = `${diff >= 0 ? '+' : ''}${diff}%`
			}
		} else {
			msgTrend = '0/min'
		}
	}

	const groupPct = analytics?.activeGroupsPct ?? (groups > 0 ? Math.round((activeGroups / groups) * 100) : 100)
	const memberPct = analytics?.activeSendersPct ?? (members > 0 ? Math.round((activeSenders / members) * 100) : 0)
	const warnPct = analytics?.warnedMembersPct ?? (members > 0 ? Math.round((warnings / members) * 100) : 0)

	const activities = useMemo(() => {
		if (Array.isArray(analytics?.recentActivity) && analytics.recentActivity.length > 0) {
			return analytics.recentActivity.map(a => ({
				text: a.text,
				time: a.time,
				color: a.color || '#4f8ef7',
			}))
		}
		return [
			{ text: 'Bot Engine online and listening for messages', time: 'Just now', color: '#4f8ef7' },
			{ text: 'All active WhatsApp groups monitored with 0ms cache', time: 'Just now', color: '#f5a623' },
		]
	}, [analytics?.recentActivity])

	const formatTime = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

	if (loading) {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '50vh', gap: '1rem' }}>
				<div className="spinner" />
				<span style={{ fontSize: '0.85rem', color: '#6b7080', fontWeight: 600 }}>Loading control center...</span>
			</div>
		)
	}

	return (
		<div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

			{/* ── Header ─────────────────────────────────────────────── */}
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
				<div>
					<h1 className="section-title" style={{ fontSize: '1.85rem', fontWeight: 700, color: '#1a1d2b' }}>
						Bot Control Center
					</h1>
					<p className="section-subtitle">Monitor, configure, and manage your WhatsApp bot engine</p>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
					<span style={{
						fontSize: '0.75rem',
						color: '#6b7080',
						fontFamily: "'JetBrains Mono', monospace",
						background: '#ffffff',
						padding: '0.4rem 0.95rem',
						borderRadius: '9999px',
						border: '1px solid #e2e5f0',
						boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
					}}>
						{formatTime(currentTime)}
					</span>
				</div>
			</div>

			{/* ── Stat Cards Row ─────────────────────────────────────── */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
				<StatCard
					title="Messages"
					value={messages}
					subtext={last10Msgs > 0 ? `${last10Msgs} in last 10m` : 'All-time volume'}
					icon={MessageIcon}
					accent="moss"
					delay={0}
					trend={msgTrend}
				/>
				<StatCard
					title="Groups"
					value={groups}
					subtext={`${activeGroups} of ${groups} active`}
					icon={GroupIcon}
					accent="clay"
					delay={60}
					trend={`+${groupPct}%`}
				/>
				<StatCard
					title="Commands"
					value={commands}
					subtext="Session executions"
					icon={ActivityIcon}
					accent="moss"
					delay={120}
					trend={commands > 0 ? `+${commands}` : undefined}
				/>
				<StatCard
					title="Members"
					value={members}
					subtext={`${activeSenders} active senders`}
					icon={UsersIcon}
					accent="emerald"
					delay={180}
					trend={`+${memberPct}%`}
				/>
				<StatCard
					title="Uptime"
					value={uptime}
					subtext="Since last restart"
					icon={BotIcon}
					accent="blue"
					delay={240}
					trend={isConnected ? 'online' : 'offline'}
				/>
				<StatCard
					title="Errors"
					value={errors}
					subtext={errors > 0 ? `${errors} logged errors` : 'All clear'}
					icon={ErrorIcon}
					accent={errors > 0 ? 'rose' : 'moss'}
					delay={300}
					trend={errors > 0 ? `+${errors}` : '0%'}
				/>
				<StatCard
					title="Active Warnings"
					value={warnings}
					subtext={`${warnPct}% of user base`}
					icon={WarningIcon}
					accent={warnings > 0 ? 'amber' : 'moss'}
					delay={360}
					trend={warnings > 0 ? `${warnPct}%` : '0%'}
				/>
			</div>

			{/* ── Main Grid: Activity + Quick Actions ─────────────────── */}
			<div className="grid grid-cols-3" style={{ gap: '1.5rem' }}>

				{/* Activity Chart + Activity Feed */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', gridColumn: 'span 2' }}>
					<GlassCard title="Activity Pulse" subtitle="Messages per minute over the last 20 minutes" accent="moss">
						<Sparkline data={activityData} color="#4f8ef7" height={52} />
						<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.65rem' }}>
							<span style={{ fontSize: '0.72rem', color: '#9ca1b5', fontWeight: 600 }}>20 min ago</span>
							<span style={{ fontSize: '0.72rem', color: '#4f8ef7', fontWeight: 700 }}>Real-time</span>
						</div>
					</GlassCard>

					<GlassCard title="Recent Activity" subtitle="Latest live events from your bot engine" accent="clay" padding="1.5rem 1.75rem">
						{activities.length === 0 ? (
							<div style={{ padding: '2rem 0', textAlign: 'center', color: '#6b7080', fontSize: '0.85rem' }}>
								No recent activity
							</div>
						) : (
							activities.map((a, i) => (
								<ActivityItem key={i} text={a.text} time={a.time} color={a.color} />
							))
						)}
					</GlassCard>
				</div>

				{/* Quick Actions Sidebar */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
					<GlassCard title="Quick Operations" subtitle="Engine controls" accent="moss">
						<div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
							<button className="btn btn-primary" style={{ width: '100%' }} onClick={handleReconnect} disabled={actionLoading}>
								<RefreshIcon size={16} /> Reconnect WhatsApp Bot
							</button>
							<button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleRestart} disabled={actionLoading}>
								<PowerIcon size={16} /> Restart PM2 Process
							</button>
							<button className="btn btn-danger" style={{ width: '100%' }} onClick={handleClearAuth} disabled={actionLoading}>
								<BotIcon size={16} /> Reset Auth Credentials
							</button>
						</div>
					</GlassCard>

					{/* Maintenance Mode */}
					<GlassCard title="Restriction Mode" subtitle={maintenanceMode ? 'Bot is in maintenance' : 'Bot is fully operational'} accent={maintenanceMode ? 'clay' : 'moss'}>
						<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
							<div>
								<div style={{ fontSize: '0.85rem', color: '#1a1d2b', fontWeight: 700 }}>
									{maintenanceMode ? 'Maintenance Active' : 'Fully Operational'}
								</div>
								<div style={{ fontSize: '0.72rem', color: '#6b7080', marginTop: '0.2rem' }}>
									{maintenanceMode ? 'All public commands paused' : 'Accepting commands normally'}
								</div>
							</div>
							<label className="toggle" style={{ cursor: 'pointer' }}>
								<input type="checkbox" checked={maintenanceMode} onChange={handleMaintenance} disabled={maintenanceLoading} />
								<div className="toggle-track"><div className="toggle-thumb" /></div>
							</label>
						</div>
					</GlassCard>

					{/* Connection Info */}
					<GlassCard title="Session Health" subtitle="WhatsApp Web socket session" accent={isConnected ? 'moss' : 'sienna'}>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span style={{ fontSize: '0.82rem', color: '#6b7080' }}>Status</span>
								<span style={{ fontSize: '0.82rem', color: isConnected ? '#4f8ef7' : '#f0544f', fontWeight: 700 }}>
									{isConnected ? 'Connected' : 'Disconnected'}
								</span>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span style={{ fontSize: '0.82rem', color: '#6b7080' }}>Uptime</span>
								<span className="mono" style={{ fontSize: '0.82rem', color: '#1a1d2b', fontWeight: 600 }}>{uptime}</span>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span style={{ fontSize: '0.82rem', color: '#6b7080' }}>Active Groups</span>
								<span style={{ fontSize: '0.82rem', color: '#1a1d2b', fontWeight: 700 }}>{groups}</span>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span style={{ fontSize: '0.82rem', color: '#6b7080' }}>Logged Errors</span>
								<span style={{ fontSize: '0.82rem', color: errors > 0 ? '#f0544f' : '#4f8ef7', fontWeight: 700 }}>{errors}</span>
							</div>
						</div>
					</GlassCard>
				</div>
			</div>
		</div>
	)
}
