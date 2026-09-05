import { useEffect, useState, useMemo } from 'react'
import {
 AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
 getStats, getAnalytics, fmtUptime, requestPair, reconnectBot, clearAuth, restartBot,
 getMaintenanceMode, setMaintenanceMode,
} from '../lib/api.js'
import { useToast } from '../App.jsx'
import { useWebSocket } from '../hooks/useWebSocket.js'
import * as Icons from '../components/Icons.jsx'
import StatCard from '../components/StatCard.jsx'

// ── Chart Tooltip
const CustomTooltip = ({ active, payload, label }) => {
 if (active && payload && payload.length) {
 return (
 <div className="chart-tooltip">
 <p style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
 <p style={{ fontSize: '0.95rem', fontWeight: 800, color: '#a5b4fc', margin: 0, letterSpacing: '-0.02em' }}>
 {payload[0].value?.toLocaleString()} <span style={{ fontSize: '0.65rem', fontWeight: 500, color: '#64748b' }}>msgs</span>
 </p>
 </div>
 )
 }
 return null
}

// ── WhatsApp Status Banner ─────────────────────────────────────────────────
function ConnectionBanner({ isConnected, onReconnect, onPair, phone, setPhone, pairCode, pairingLoading, onPairSubmit }) {
 return (
 <div className="card" style={{
 background: isConnected
 ? 'linear-gradient(135deg, rgba(16,185,129,0.04) 0%, rgba(6,182,212,0.02) 100%)'
 : 'linear-gradient(135deg, rgba(244,63,94,0.04) 0%, rgba(245,158,11,0.02) 100%)',
 border: `1px solid ${isConnected ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.12)'}`,
 position: 'relative',
 overflow: 'hidden'
 }}>
 {isConnected && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.3), transparent)' }} />}
 {!isConnected && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(244,63,94,0.2), transparent)' }} />}

 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
 <div style={{
 width: 42, height: 42, borderRadius: 'var(--radius-md)',
 background: isConnected ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.08)',
 border: `1px solid ${isConnected ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.15)'}`,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 boxShadow: isConnected ? '0 0 20px rgba(16,185,129,0.1)' : 'none',
 transition: 'all 0.3s ease'
 }}>
 <Icons.IconWhatsApp size={24} style={{ color: isConnected ? '#34d399' : '#f87171' }} />
 </div>
 <div>
 <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
 WhatsApp Connection
 </h3>
 <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.1rem', fontWeight: 500 }}>
 {isConnected ? 'Bot is active and connected to WhatsApp' : 'No active connection. Link a device to begin.'}
 </p>
 </div>
 </div>

 <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
 <button className="btn btn-secondary" onClick={onReconnect} style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem' }}>
 <Icons.IconRefresh size={14} />
 Reconnect
 </button>
 </div>
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
 <form onSubmit={onPairSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
 <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
 <Icons.IconPhone size={13} style={{ marginRight: 4 }} />
 Link via Phone Number
 </label>
 <div style={{ display: 'flex', gap: '0.4rem' }}>
 <input type="text" className="input" placeholder="e.g. 919876543210" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ flex: 1 }} />
 <button type="submit" className="btn btn-primary" disabled={pairingLoading} style={{ whiteSpace: 'nowrap', fontSize: '0.75rem', padding: '0.4rem 0.85rem' }}>
 {pairingLoading ? 'Generating...' : 'Get Code'}
 </button>
 </div>
 <span style={{ fontSize: '0.65rem', color: 'var(--text-faint)' }}>Full number with country code, digits only</span>
 </form>

 <div style={{
 background: 'var(--bg-card)',
 border: '1px solid var(--border)',
 borderRadius: 'var(--radius-md)',
 padding: '1rem',
 display: 'flex',
 flexDirection: 'column',
 justifyContent: 'center',
 alignItems: 'center',
 minHeight: '90px',
 position: 'relative',
 overflow: 'hidden'
 }}>
 {pairCode ? (
 <div style={{ textAlign: 'center' }}>
 <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
 Pairing Code
 </div>
 <div className="pairing-code">{pairCode}</div>
 <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.4rem', lineHeight: 1.4 }}>
 WhatsApp → Linked Devices → Link
 </div>
 </div>
 ) : (
 <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.72rem' }}>
 {isConnected ? (
 <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
 <div className="status-dot online" style={{ width: 6, height: 6 }} />
 <span style={{ color: '#34d399', fontWeight: 600 }}>Connected &amp; Active</span>
 </div>
 ) : 'Enter number to generate pairing code'}
 </div>
 )}
 </div>
 </div>
 </div>
 )
}

// ── Maintenance Mode Card ──────────────────────────────────────────────────
function MaintenanceCard({ maintenanceMode, onToggle, loading }) {
 return (
 <div className="card" style={{
 background: maintenanceMode ? 'rgba(245,158,11,0.04)' : 'var(--bg-surface)',
 border: maintenanceMode ? '1px solid rgba(245,158,11,0.2)' : '1px solid var(--border)',
 transition: 'all 0.4s ease',
 position: 'relative',
 overflow: 'hidden'
 }}>
 {maintenanceMode && (
 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.35), transparent)' }} />
 )}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
 <div style={{
 width: 38, height: 38, borderRadius: 'var(--radius-md)',
 background: maintenanceMode ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.08)',
 border: `1px solid ${maintenanceMode ? 'rgba(245,158,11,0.2)' : 'rgba(99,102,241,0.15)'}`,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 transition: 'all 0.3s ease'
 }}>
 {maintenanceMode ? <Icons.IconLock size={18} style={{ color: '#fbbf24' }} /> : <Icons.IconUnlock size={18} style={{ color: '#a5b4fc' }} />}
 </div>
 <div>
 <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
 Command Restriction Mode
 </h3>
 <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
 {maintenanceMode
 ? 'Only welcome, stats, and search commands are active.'
 : 'All commands active. Toggle on to restrict functionality.'}
 </p>
 </div>
 </div>

 <button
 className={`btn ${maintenanceMode ? 'btn-danger' : 'btn-primary'}`}
 onClick={onToggle}
 disabled={loading}
 style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', minWidth: '140px' }}
 >
 {loading ? '...' : maintenanceMode ? 'Disable' : 'Enable Restriction'}
 </button>
 </div>
 </div>
 )
}

// ── Action Buttons Card ────────────────────────────────────────────────────
function ActionButtons({ actionLoading, onReconnect, onClearAuth, onRestart }) {
 const actions = [
 { label: 'Reconnect', desc: 'Fresh socket without restart', onClick: onReconnect, icon: Icons.IconRefresh, variant: 'secondary' },
 { label: 'Clear Session', desc: 'Remove auth credentials', onClick: onClearAuth, icon: Icons.IconTrash, variant: 'secondary' },
 { label: 'Restart', desc: 'Full process restart', onClick: onRestart, icon: Icons.IconCpu, variant: 'danger' },
 ]

 return (
 <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.2), transparent)' }} />
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
 <div>
 <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
 Process Controls
 </h3>
 <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>Manage bot lifecycle and connection state</p>
 </div>
 </div>
 <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
 {actions.map(a => (
 <button key={a.label} className={`btn btn-${a.variant}`} onClick={a.onClick} disabled={actionLoading} style={{ fontSize: '0.75rem', padding: '0.5rem 0.9rem' }}>
 <a.icon size={14} />
 {a.label}
 </button>
 ))}
 </div>
 </div>
 )
}

// ── Top Groups Mini List ───────────────────────────────────────────────────
function TopGroupsList({ groups }) {
 if (!groups?.length) return null

 const rankStyles = [
 { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', color: '#fbbf24', glow: 'rgba(245,158,11,0.15)' },
 { bg: 'rgba(161,161,170,0.06)', border: 'rgba(255,255,255,0.08)', color: '#d4d4d8', glow: 'none' },
 { bg: 'rgba(205,127,50,0.06)', border: 'rgba(205,127,50,0.15)', color: '#cd7f32', glow: 'none' },
 { bg: 'rgba(255,255,255,0.02)', border: 'var(--border)', color: 'var(--text-dim)', glow: 'none' },
 { bg: 'rgba(255,255,255,0.02)', border: 'var(--border)', color: 'var(--text-dim)', glow: 'none' },
 ]

 return (
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
 {groups.slice(0, 5).map((g, i) => {
 const r = rankStyles[i] || rankStyles[3]
 return (
 <div key={i} style={{
 padding: '0.8rem 1rem',
 background: 'var(--bg-surface)',
 borderRadius: 'var(--radius-md)',
 border: `1px solid ${r.border}`,
 display: 'flex',
 alignItems: 'center',
 gap: '0.75rem',
 transition: 'all 0.25s ease',
 cursor: 'default',
 boxShadow: r.glow !== 'none' ? `0 0 16px ${r.glow}` : 'none'
 }}
 onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
 onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = r.border }}
 >
 <div style={{
 width: 28, height: 28,
 borderRadius: 'var(--radius-sm)',
 background: r.bg,
 border: `1px solid ${r.border}`,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 fontSize: '0.7rem', fontWeight: 800, color: r.color,
 flexShrink: 0,
 fontFamily: "'Plus Jakarta Sans', sans-serif"
 }}>
 {i + 1}
 </div>
 <div style={{ minWidth: 0, flex: 1 }}>
 <div style={{ fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>{g.name}</div>
 <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 500 }}>
 {g.messages.toLocaleString()} msgs
 </div>
 </div>
 <div style={{
 width: 7, height: 7, borderRadius: '50%',
 background: g.active ? '#10b981' : '#475569',
 flexShrink: 0,
 boxShadow: g.active ? '0 0 6px rgba(16,185,129,0.4)' : 'none'
 }} />
 </div>
 )
 })}
 </div>
 )
}

// ── Main Dashboard Component ───────────────────────────────────────────────
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

 useEffect(() => { fetchData(); const t = setInterval(fetchData, 30_000); return () => clearInterval(t) }, [])
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
 toast(`Restriction mode ${newVal ? 'enabled' : 'disabled'}`, true)
 } catch (err) {
 toast(err.message || 'Failed to toggle', false)
 } finally { setMaintenanceLoading(false) }
 }

 const handlePair = async (e) => {
 e.preventDefault()
 if (!phone) return toast('Enter phone number with country code', false)
 setPairingLoading(true)
 setPairCode('')
 try {
 const res = await requestPair(phone)
 if (res.code) { setPairCode(res.code); toast('Pairing code generated!', true) }
 else { toast('Failed to generate code', false) }
 } catch (err) { toast(err.message || 'Error', false) }
 finally { setPairingLoading(false) }
 }

 const handleReconnect = async () => {
 setActionLoading(true)
 try { await reconnectBot(); toast('Reconnection triggered', true); fetchData() }
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

 const handleRestart = async () => {
 if (!confirm('Restart Node process?')) return
 setActionLoading(true)
 try { await restartBot(); toast('Restart initiated. Refresh in 10s.', true) }
 catch (err) { toast(err.message, false) }
 finally { setActionLoading(false) }
 }

 if (loading) {
 return (
 <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '50vh', gap: '1rem' }}>
 <div className="spinner" />
 <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500 }}>Loading control center...</span>
 </div>
 )
 }

 return (
 <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>

 {/* ── Header ─────────────────────────────────────────────────── */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
 <div>
 <h1 className="section-title text-gradient-animated" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
 Bot Control Center
 </h1>
 <p className="section-subtitle">Monitor, configure, and manage your WhatsApp bot engine</p>
 </div>
 <span className={`badge ${isConnected ? 'badge-emerald' : 'badge-rose'}`} style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem' }}>
 <span className={isConnected ? 'status-dot online' : 'status-dot offline'} style={{ width: 6, height: 6, borderRadius: '50%' }} />
 {isConnected ? 'WhatsApp Active' : 'Disconnected'}
 </span>
 </div>

 {/* ── Stat Cards ─────────────────────────────────────────────── */}
 <div className="grid grid-cols-4">
 <StatCard title="Total Groups" value={stats?.groupCount?.toLocaleString()} subtext="Registered groups" icon={Icons.IconGlobe} accent="violet" delay={50} />
 <StatCard title="Total Members" value={stats?.memberCount?.toLocaleString()} subtext="Unique participants" icon={Icons.IconUsers} accent="indigo" delay={100} />
 <StatCard title="Total Messages" value={analytics?.totalMessages?.toLocaleString()} subtext="All-time volume" icon={Icons.IconMessage} accent="emerald" delay={150} />
 <StatCard title="Uptime" value={stats ? fmtUptime(stats.uptime) : '0s'} subtext="Continuous process time" icon={Icons.IconClock} accent="blue" delay={200} />
 </div>

 {/* ── Maintenance Mode ───────────────────────────────────────── */}
 <MaintenanceCard
 maintenanceMode={maintenanceMode}
 onToggle={handleMaintenanceToggle}
 loading={maintenanceLoading}
 />

 {/* ── Connection & Pairing ───────────────────────────────────── */}
 <ConnectionBanner
 isConnected={isConnected}
 onReconnect={handleReconnect}
 phone={phone}
 setPhone={setPhone}
 pairCode={pairCode}
 pairingLoading={pairingLoading}
 onPairSubmit={handlePair}
 />

 {/* ── Process Controls ───────────────────────────────────────── */}
 <ActionButtons
 actionLoading={actionLoading}
 onReconnect={handleReconnect}
 onClearAuth={handleClearAuth}
 onRestart={handleRestart}
 />

 {/* ── Activity Chart ─────────────────────────────────────────── */}
 <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.25), transparent)' }} />
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
 <div>
 <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '6px' }}>
 <Icons.IconBarChart size={16} style={{ color: '#a5b4fc' }} />
 Group Activity Volume
 </h3>
 <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>Message throughput across highest volume groups</p>
 </div>
 <span className="badge badge-indigo" style={{ fontSize: '0.6rem' }}>Top 10</span>
 </div>

 {analytics?.topGroups?.length ? (
 <ResponsiveContainer width="100%" height={250}>
 <AreaChart data={analytics.topGroups.slice(0, 10)} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
 <defs>
 <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#818cf8" stopOpacity={0.2} />
 <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
 </linearGradient>
 <filter id="chartGlow">
 <feGaussianBlur stdDeviation="2" result="blur" />
 <feComposite in="SourceGraphic" in2="blur" operator="over" />
 </filter>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
 <XAxis dataKey="name" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
 <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
 <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1, strokeDasharray: '3 3' }} />
 <Area type="monotone" dataKey="messages" stroke="#818cf8" strokeWidth={2.5} fill="url(#areaGrad)" filter="url(#chartGlow)" />
 </AreaChart>
 </ResponsiveContainer>
 ) : (
 <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center', padding: '2rem' }}>No group activity recorded yet.</p>
 )}
 </div>

 {/* ── Top Groups List ────────────────────────────────────────── */}
 {analytics?.topGroups?.length ? (
 <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.25), transparent)' }} />
 <div style={{ marginBottom: '1rem' }}>
 <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '6px' }}>
 <Icons.IconTrendingUp size={16} style={{ color: '#60a5fa' }} />
 Most Active Groups
 </h3>
 <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>Highest message throughput</p>
 </div>
 <TopGroupsList groups={analytics.topGroups} />
 </div>
 ) : null}

 </div>
 )
}
