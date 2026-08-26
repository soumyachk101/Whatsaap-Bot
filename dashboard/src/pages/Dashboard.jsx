import { useEffect, useState } from 'react'
import {
 AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
 getStats, getAnalytics, fmtUptime, requestPair, reconnectBot, clearAuth, restartBot,
 getMaintenanceMode, setMaintenanceMode,
} from '../lib/api.js'
import { useToast } from '../App.jsx'
import { useWebSocket } from '../hooks/useWebSocket.js'

function MetricCard({ title, value, subtext, icon, accentColor }) {
 const color = accentColor || 'var(--accent)'
 const bgColor = accentColor ? `${accentColor}15` : 'var(--accent-soft)'
 const borderColor = accentColor ? `${accentColor}30` : 'var(--accent-border)'
 const glowColor = accentColor ? `${accentColor}40` : 'rgba(16, 185, 129, 0.2)'
 return (
 <div className="card card-hover" style={{ position: 'relative', overflow: 'hidden' }}>
 <div className="stat-header">
 <span className="stat-label">{title}</span>
 <div className="stat-icon-wrapper" style={{
 background: `linear-gradient(135deg, ${bgColor}, transparent)`,
 borderColor,
 color,
 boxShadow: `0 4px 12px ${glowColor}`
 }}>
 {icon}
 </div>
 </div>
 <div className="stat-value">{value ?? '—'}</div>
 <div style={{
 fontSize: '0.6875rem',
 color: 'var(--text-dim)',
 marginTop: '0.35rem',
 fontWeight: 500,
 display: 'flex',
 alignItems: 'center',
 gap: '0.35rem'
 }}>
 <span style={{
 width: '6px',
 height: '6px',
 borderRadius: '50%',
 background: color,
 opacity: 0.6
 }} />
 {subtext}
 </div>
 </div>
 )
}

const CustomTooltip = ({ active, payload, label }) => {
 if (active && payload && payload.length) {
 const data = payload[0]
 return (
 <div style={{
 background: 'rgba(9, 9, 13, 0.96)',
 backdropFilter: 'blur(16px)',
 WebkitBackdropFilter: 'blur(16px)',
 border: '1px solid rgba(255, 255, 255, 0.12)',
 borderRadius: '12px',
 padding: '0.75rem 1rem',
 boxShadow: '0 12px 32px -5px rgba(0, 0, 0, 0.9), 0 0 20px rgba(16, 185, 129, 0.1)',
 color: '#fafafa',
 minWidth: '150px',
 }}>
 <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.3rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
 {label || data.name}
 </p>
 <p style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981', margin: 0, letterSpacing: '-0.02em' }}>
 {data.value?.toLocaleString()} <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-dim)' }}>messages</span>
 </p>
 </div>
 )
 }
 return null
}

export default function Dashboard() {
 const toast = useToast()
 const wsStatus = useWebSocket()
 const [stats, setStats] = useState(null)
 const [analytics, setAnalytics] = useState(null)
 const [loading, setLoading] = useState(true)

 const [phone, setPhone] = useState('')
 const [pairCode, setPairCode] = useState('')
 const [pairingLoading, setPairingLoading] = useState(false)
 const [actionLoading, setActionLoading] = useState(false)
 const [maintenanceMode, setMaintenanceModeState] = useState(false)
 const [maintenanceLoading, setMaintenanceLoading] = useState(false)

 const isConnected = wsStatus === 'connected'

 const fetchData = () => {
 Promise.all([getStats(), getAnalytics()])
 .then(([s, a]) => { setStats(s); setAnalytics(a) })
 .catch(() => {})
 .finally(() => setLoading(false))
 }

 useEffect(() => {
 fetchData()
 const t = setInterval(fetchData, 30000)
 return () => clearInterval(t)
 }, [])

 useEffect(() => {
 getMaintenanceMode()
 .then(r => { if (r?.maintenanceMode != null) setMaintenanceModeState(r.maintenanceMode) })
 .catch(() => {})
 }, [])

 const handleMaintenanceToggle = async () => {
 const newVal = !maintenanceMode
 setMaintenanceLoading(true)
 try {
 const res = await setMaintenanceMode(newVal)
 setMaintenanceModeState(res?.maintenanceMode ?? newVal)
 toast(`Maintenance mode ${newVal ? 'enabled' : 'disabled'}. Only welcome, stats, and search commands will work.`, true)
 } catch (err) {
 toast(err.message || 'Failed to toggle maintenance mode', false)
 } finally {
 setMaintenanceLoading(false)
 }
 }

 const handlePair = async (e) => {
 e.preventDefault()
 if (!phone) return toast('Please enter phone number with country code', false)
 setPairingLoading(true)
 setPairCode('')
 try {
 const res = await requestPair(phone)
 if (res.code) {
 setPairCode(res.code)
 toast('Pairing code generated!', true)
 } else {
 toast('Failed to generate code', false)
 }
 } catch (err) {
 toast(err.message || 'Error generating pairing code', false)
 } finally {
 setPairingLoading(false)
 }
 }

 const handleReconnect = async () => {
 setActionLoading(true)
 try {
 await reconnectBot()
 toast('Reconnection triggered!', true)
 fetchData()
 } catch (err) {
 toast(err.message || 'Reconnect failed', false)
 } finally {
 setActionLoading(false)
 }
 }

 const handleClearAuth = async () => {
 if (!confirm('Clear session auth? You will need to re-link WhatsApp.')) return
 setActionLoading(true)
 try {
 await clearAuth()
 toast('Session cleared.', true)
 handleReconnect()
 } catch (err) {
 toast(err.message || 'Clear auth failed', false)
 } finally {
 setActionLoading(false)
 }
 }

 const handleRestart = async () => {
 if (!confirm('Restart background Node process?')) return
 setActionLoading(true)
 try {
 await restartBot()
 toast('Process restart initiated. Refresh in 10s.', true)
 } catch (err) {
 toast(err.message || 'Restart failed', false)
 } finally {
 setActionLoading(false)
 }
 }

 if (loading) {
 return (
 <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '50vh', gap: '1rem' }}>
 <div className="spinner" />
 <span style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>Loading control center...</span>
 </div>
 )
 }

 return (
 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

 {/* ── Page Title ────────────────────────────────────────────── */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
 <div>
 <h1 className="section-title gradient-text">
 Bot Control Center
 </h1>
 <p className="section-subtitle">
 Manage connection, view live metrics, and control your WhatsApp bot.
 </p>
 </div>

 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
 <span className={`badge ${isConnected ? 'badge-emerald' : 'badge-rose'}`} style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}>
 <span className={isConnected ? 'pulse-live' : ''} style={{ width: 6, height: 6, borderRadius: '50%', background: isConnected ? '#10b981' : '#ef4444', flexShrink: 0 }} />
 {isConnected ? 'WhatsApp Active' : 'Disconnected'}
 </span>
 </div>
 </div>

 {/* ── Maintenance Mode Card ─────────────────────────────────── */}
 <div className="card" style={{
 background: maintenanceMode ? 'rgba(245, 158, 11, 0.06)' : 'var(--bg-surface)',
 border: maintenanceMode ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid var(--border)',
 transition: 'all 0.4s ease',
 position: 'relative',
 overflow: 'hidden'
 }}>
 {maintenanceMode && (
 <div style={{
 position: 'absolute',
 top: 0, left: 0, right: 0,
 height: '1px',
 background: 'linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.4), transparent)'
 }} />
 )}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
 <div style={{
 width: 36, height: 36, borderRadius: 'var(--radius-sm)',
 background: maintenanceMode ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.1)',
 border: `1px solid ${maintenanceMode ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.15)'}`,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 fontSize: '1rem',
 transition: 'all 0.3s ease'
 }}>
 {maintenanceMode ? '🔒' : '🔓'}
 </div>
 <div>
 <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
 Command Restriction Mode
 </h3>
 <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
 {maintenanceMode
 ? 'Only welcome, stats, and search commands are active. All other commands are disabled.'
 : 'All commands are active. Toggle on to restrict to welcome, stats, and search only.'}
 </p>
 </div>
 </div>

 <button
 className={`btn ${maintenanceMode ? 'btn-danger' : 'btn-primary'}`}
 onClick={handleMaintenanceToggle}
 disabled={maintenanceLoading}
 style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', minWidth: '120px' }}
 >
 {maintenanceLoading ? '...' : maintenanceMode ? 'Disable Restriction' : 'Enable Restriction'}
 </button>
 </div>
 </div>

 {/* ── WhatsApp Control Card ────────────────────────────────── */}
 <div className="card" style={{ background: 'var(--bg-surface)', position: 'relative', overflow: 'hidden' }}>
 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.2), transparent)' }} />
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
 <div>
 <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
 WhatsApp Linking & Controls
 </h3>
 <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
 Generate pairing code or manage connection state.
 </p>
 </div>

 <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
 <button className="btn btn-secondary" onClick={handleReconnect} disabled={actionLoading} style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>
 <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
 Reconnect
 </button>
 <button className="btn btn-secondary" onClick={handleClearAuth} disabled={actionLoading} style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>
 <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
 Clear Session
 </button>
 <button className="btn btn-danger" onClick={handleRestart} disabled={actionLoading} style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>
 <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
 Restart
 </button>
 </div>
 </div>

 <div className="grid grid-cols-2" style={{ gap: '1.25rem', alignItems: 'start' }}>

 {/* Pairing Form */}
 <form onSubmit={handlePair} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
 <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
 Link Device via Phone Number
 </label>
 <div style={{ display: 'flex', gap: '0.4rem' }}>
 <input
 type="text"
 className="input"
 placeholder="e.g. 919876543210"
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 />
 <button type="submit" className="btn btn-primary" disabled={pairingLoading} style={{ whiteSpace: 'nowrap' }}>
 {pairingLoading ? 'Generating...' : 'Get Code'}
 </button>
 </div>
 <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)' }}>
 Full WhatsApp number with country code, digits only.
 </span>
 </form>

 {/* Pairing Code Display */}
 <div style={{
 background: 'var(--bg-card)',
 border: '1px solid var(--border)',
 borderRadius: 'var(--radius-md)',
 padding: '1.25rem',
 display: 'flex',
 flexDirection: 'column',
 justifyContent: 'center',
 alignItems: 'center',
 minHeight: '100px',
 position: 'relative',
 overflow: 'hidden'
 }}>
 {pairCode ? (
 <div style={{ textAlign: 'center' }}>
 <div style={{ fontSize: '0.625rem', color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
 Pairing Code
 </div>
 <div className="pairing-code">
 {pairCode}
 </div>
 <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', marginTop: '0.5rem', lineHeight: 1.4 }}>
 WhatsApp → Linked Devices → Link with phone number
 </div>
 </div>
 ) : (
 <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
 {isConnected ? (
 <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
 <div className="pulse-live" style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
 <span style={{ color: '#34d399', fontWeight: 600 }}>WhatsApp is connected & active</span>
 </div>
 ) : 'Enter number to generate an 8-digit pairing code'}
 </div>
 )}
 </div>
 </div>
 </div>

 {/* ── Metric Cards ──────────────────────────────────────────── */}
 <div className="grid grid-cols-4">
 <MetricCard
 title="Total Groups"
 value={stats?.groupCount?.toLocaleString()}
 subtext="Active WhatsApp groups"
 accentColor="#3b82f6"
 icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}
 />
 <MetricCard
 title="Total Members"
 value={stats?.memberCount?.toLocaleString()}
 subtext="Unique participants"
 accentColor="#8b5cf6"
 icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>}
 />
 <MetricCard
 title="Total Messages"
 value={analytics?.totalMessages?.toLocaleString()}
 subtext="All-time volume"
 accentColor="#10b981"
 icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>}
 />
 <MetricCard
 title="System Uptime"
 value={stats ? fmtUptime(stats.uptime) : '0s'}
 subtext="Continuous process time"
 accentColor="#f59e0b"
 icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
 />
 </div>

 {/* ── Activity Chart ────────────────────────────────────────── */}
 <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.3), transparent)' }} />
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
 <div>
 <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
 Group Activity Volume
 </h3>
 <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
 Message throughput across highest volume groups
 </p>
 </div>
 <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Top 10</span>
 </div>

 {analytics?.topGroups?.length ? (
 <ResponsiveContainer width="100%" height={260}>
 <AreaChart data={analytics.topGroups.slice(0, 10)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
 <defs>
 <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
 <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
 </linearGradient>
 <filter id="chartGlow">
 <feGaussianBlur stdDeviation="2" result="blur" />
 <feComposite in="SourceGraphic" in2="blur" operator="over" />
 </filter>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke="#1e1e22" />
 <XAxis dataKey="name" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
 <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
 <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1, strokeDasharray: '3 3' }} />
 <Area type="monotone" dataKey="messages" stroke="#10b981" strokeWidth={2.5} fill="url(#areaGrad)" filter="url(#chartGlow)" />
 </AreaChart>
 </ResponsiveContainer>
 ) : <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>No group activity recorded yet.</p>}
 </div>

 {/* ── Top Groups List ──────────────────────────────────────── */}
 {analytics?.topGroups?.length ? (
 <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent)' }} />
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
 <div>
 <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
 Most Active Groups
 </h3>
 <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>Highest message throughput</p>
 </div>
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
 {analytics.topGroups.slice(0, 5).map((g, i) => {
 const rankColors = ['#f59e0b', '#a1a1aa', '#cd7f32', 'var(--text-dim)', 'var(--text-dim)']
 const rankBg = i === 0 ? 'rgba(245,158,11,0.1)' : i < 3 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)'
 const rankBorder = i === 0 ? 'rgba(245,158,11,0.2)' : i < 3 ? 'rgba(255,255,255,0.08)' : 'var(--border)'
 return (
 <div key={i} style={{
 padding: '0.875rem 1rem',
 background: 'var(--bg-surface)',
 borderRadius: 'var(--radius-md)',
 border: `1px solid ${rankBorder}`,
 display: 'flex',
 alignItems: 'center',
 gap: '0.75rem',
 transition: 'all 0.25s ease',
 cursor: 'default'
 }}
 onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
 onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = rankBorder }}
 >
 <div style={{
 width: 32, height: 32,
 borderRadius: 'var(--radius-sm)',
 background: rankBg,
 border: `1px solid ${rankBorder}`,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 fontSize: '0.75rem', fontWeight: 800, color: rankColors[i],
 flexShrink: 0,
 }}>
 {i + 1}
 </div>
 <div style={{ minWidth: 0, flex: 1 }}>
 <div style={{ fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
 <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontWeight: 500 }}>
 {g.messages.toLocaleString()} messages
 </div>
 </div>
 <div style={{
 width: 8, height: 8, borderRadius: '50%',
 background: g.active ? '#10b981' : '#64748b',
 flexShrink: 0,
 boxShadow: g.active ? '0 0 6px rgba(16, 185, 129, 0.4)' : 'none'
 }} />
 </div>
 )
 })}
 </div>
 </div>
 ) : null}

 </div>
 )
}