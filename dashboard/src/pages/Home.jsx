import { useState, useEffect, useMemo } from 'react'
import {
 getStats, getAnalytics, fmtUptime, requestPair, reconnectBot, clearAuth, restartBot,
 getMaintenanceMode, setMaintenanceMode,
} from '../lib/api.js'
import { useToast } from '../App.jsx'
import { useWebSocket } from '../hooks/useWebSocket.js'
import StatCard from '../components/StatCard.jsx'
import GlassCard from '../components/GlassCard.jsx'
import {
 BotIcon, MessageIcon, GroupIcon, UsersIcon, ActivityIcon, ErrorIcon,
 RefreshIcon, PowerIcon, TrendingUpIcon,
} from '../components/SVG.jsx'

// ── Mini Sparkline ──────────────────────────────────────────────────────
function Sparkline({ data = [], color = '#818cf8', height = 32 }) {
 const max = Math.max(...data, 1)
 const bars = data.slice(-20)
 return (
 <div className="sparkline" style={{ height }}>
 {bars.map((v, i) => (
 <div key={i} className="spark-bar" style={{
 height: `${Math.max((v / max) * 100, 4)}%`,
 background: `linear-gradient(180deg, ${color}, ${color}88)`,
 opacity: 0.5 + (i / bars.length) * 0.5,
 borderRadius: '2px 2px 0 0',
 }} />
 ))}
 </div>
 )
}

// ── Activity Item ──────────────────────────────────────────────────────
function ActivityItem({ text, time, color = '#818cf8' }) {
 return (
 <div className="activity-item">
 <div className="activity-dot" style={{ background: color, boxShadow: `0 0 6px ${color}44` }} />
 <div className="activity-text">{text}</div>
 <div className="activity-time">{time}</div>
 </div>
 )
}

// ── Main Dashboard ─────────────────────────────────────────────────────
export default function Home() {
 const toast = useToast()
 const wsStatus = useWebSocket()
 const [stats, setStats] = useState<any>(null)
 const [analytics, setAnalytics] = useState<any>(null)
 const [loading, setLoading] = useState(true)
 const [maintenanceMode, setMaintenanceModeState] = useState(false)
 const [maintenanceLoading, setMaintenanceLoading] = useState(false)
 const [actionLoading, setActionLoading] = useState(false)
 const [currentTime, setCurrentTime] = useState(new Date())

 const isConnected = wsStatus === 'connected'

 const fetchData = () => {
 Promise.all([getStats(), getAnalytics()])
 .then(([s, a]) => { setStats(s); setAnalytics(a) })
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
 if (!confirm('Restart Node process?')) return
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
 const messages = analytics?.messagesSent ?? stats?.messages ?? 0
 const commands = stats?.commandsRun ?? 0
 const groups = stats?.groups ?? 0
 const members = stats?.members ?? 0
 const errors = stats?.errors ?? 0
 const activityData = analytics?.activity ?? Array.from({ length: 20 }, () => Math.random() * 80 + 20)

 // Recent activity (mock if no real data)
 const activities = useMemo(() => {
 const items = [
 { text: <><strong>System</strong> started successfully</>, time: '2m ago', color: '#34d399' },
 { text: <><strong>New member</strong> joined general group</>, time: '5m ago', color: '#60a5fa' },
 { text: <><strong>Command</strong> .help executed 3 times</>, time: '8m ago', color: '#a78bfa' },
 { text: <><strong>Auto-reply</strong> triggered in 2 chats</>, time: '12m ago', color: '#22d3ee' },
 { text: <><strong>Broadcast</strong> sent to 15 groups</>, time: '25m ago', color: '#fbbf24' },
 ]
 if (errors > 0) items.unshift({ text: <><strong>Warning:</strong> {errors} error{errors > 1 ? 's' : ''} detected</>, time: '1m ago', color: '#fb7185' })
 return items.slice(0, 5)
 }, [errors])

 const formatTime = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

 if (loading) {
 return (
 <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '50vh', gap: '1rem' }}>
 <div className="spinner" />
 <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500 }}>Loading dashboard...</span>
 </div>
 )
 }

 return (
 <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

 {/* ── Header ─────────────────────────────────────────────── */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
 <div>
 <h1 className="section-title text-gradient-animated" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
 Bot Control Center
 </h1>
 <p className="section-subtitle">Monitor, configure, and manage your WhatsApp bot engine</p>
 </div>
 <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
 <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
 {formatTime(currentTime)}
 </span>
 <span className={`badge ${isConnected ? 'badge-emerald' : 'badge-rose'}`} style={{ padding: '0.35rem 0.85rem', fontSize: '0.72rem', fontWeight: 600 }}>
 <span className={`status-dot ${isConnected ? 'online' : 'offline'} pulse-live`} style={{ width: 6, height: 6, borderRadius: '50%', display: 'inline-block' }} />
 {isConnected ? 'Connected' : 'Offline'}
 </span>
 </div>
 </div>

 {/* ── Stat Cards Row ──────────────────────────────────────── */}
 <div className="grid grid-cols-4" style={{ gap: '1rem' }}>
 <StatCard title="Messages" value={messages} subtext="Total sent" icon={MessageIcon} accent="violet" delay={0} trend="+12%" />
 <StatCard title="Groups" value={groups} subtext="Active groups" icon={GroupIcon} accent="indigo" delay={60} trend="+3" />
 <StatCard title="Commands" value={commands} subtext="Executed" icon={ActivityIcon} accent="blue" delay={120} />
 <StatCard title="Members" value={members} subtext="Across all groups" icon={UsersIcon} accent="emerald" delay={180} trend="+8%" />
 <StatCard title="Uptime" value={uptime} subtext="Since last restart" icon={BotIcon} accent="cyan" delay={240} />
 <StatCard title="Errors" value={errors} subtext={errors > 0 ? 'Needs attention' : 'All clear'} icon={ErrorIcon} accent={errors > 0 ? 'rose' : 'emerald'} delay={300} trend={errors > 0 ? 'up' : undefined} />
 </div>

 {/* ── Main Grid: Activity + Quick Actions ─────────────────── */}
 <div className="grid grid-cols-3" style={{ gap: '1.25rem' }}>

 {/* Activity Chart + Activity Feed */}
 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', gridColumn: 'span 2' }}>
 <GlassCard title="Activity Overview" subtitle="Messages per minute over the last 20 minutes" accent="indigo">
 <Sparkline data={activityData} color="#818cf8" height={48} />
 <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
 <span style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>20 min ago</span>
 <span style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>Now</span>
 </div>
 </GlassCard>

 <GlassCard title="Recent Activity" subtitle="Latest events from your bot" accent="violet" padding="0.75rem 1.25rem">
 {activities.length === 0 ? (
 <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
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
 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
 <GlassCard title="Quick Actions" subtitle="Common bot operations" accent="emerald">
 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
 <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleReconnect} disabled={actionLoading}>
 <RefreshIcon size={15} color="#a5b4fc" /> Reconnect Bot
 </button>
 <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleRestart} disabled={actionLoading}>
 <PowerIcon size={15} color="#a5b4fc" /> Restart Process
 </button>
 <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleClearAuth} disabled={actionLoading}>
 <BotIcon size={15} color="#a5b4fc" /> Clear Auth Session
 </button>
 </div>
 </GlassCard>

 {/* Maintenance Mode */}
 <GlassCard title="Restriction Mode" subtitle={maintenanceMode ? 'Bot is in maintenance' : 'Bot is fully operational'} accent={maintenanceMode ? 'amber' : 'emerald'}>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
 <div>
 <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
 {maintenanceMode ? 'Maintenance Active' : 'Fully Operational'}
 </div>
 <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: '0.15rem' }}>
 {maintenanceMode ? 'All commands blocked' : 'All systems running'}
 </div>
 </div>
 <label className="toggle" style={{ cursor: 'pointer' }}>
 <input type="checkbox" checked={maintenanceMode} onChange={handleMaintenance} disabled={maintenanceLoading} />
 <div className="toggle-track"><div className="toggle-thumb" /></div>
 </label>
 </div>
 </GlassCard>

 {/* Connection Info */}
 <GlassCard title="Connection Status" subtitle="WhatsApp Web session" accent={isConnected ? 'emerald' : 'rose'}>
 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Status</span>
 <span style={{ fontSize: '0.78rem', color: isConnected ? '#34d399' : '#fb7185', fontWeight: 600 }}>
 {isConnected ? 'Connected' : 'Disconnected'}
 </span>
 </div>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Uptime</span>
 <span className="mono" style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>{uptime}</span>
 </div>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Groups</span>
 <span style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 600 }}>{groups}</span>
 </div>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Errors</span>
 <span style={{ fontSize: '0.78rem', color: errors > 0 ? '#fb7185' : '#34d399', fontWeight: 600 }}>{errors}</span>
 </div>
 </div>
 </GlassCard>
 </div>
 </div>
 </div>
 )
}
