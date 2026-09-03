import { useState, useEffect, useMemo, useRef } from 'react'
import GlassCard from '../components/GlassCard.jsx'
import { SearchIcon, RefreshIcon } from '../components/SVG.jsx'

// ── Mock Log Generator ──────────────────────────────────────────────────
const LOG_LEVELS = ['info', 'warn', 'error', 'debug']
const LOG_MESSAGES = {
 info: ['Message received from +9198xxxxxxx', 'Group metadata updated: "General"', 'Auto-reply sent to 9195xxxxxxx', 'Plugin loaded: sticker.js', 'Session keepalive ping sent', 'Profile picture updated for 9198xxxxxxx', 'Broadcast delivered to 23/25 groups'],
 warn: ['Rate limit approaching for +9198xxxxxxx', 'Slow response from WhatsApp API (2.3s)', 'Memory usage above 75%', 'Retry attempt 2/3 for message delivery', 'Connection quality degraded', 'Queue size exceeding 100 items'],
 error: ['Failed to send message to +9198xxxxxxx: timeout', 'Database connection lost, retrying...', 'Authentication token expired', 'WebSocket connection dropped unexpectedly', 'Failed to parse incoming message payload', 'Rate limit exceeded, backing off for 60s'],
 debug: ['Processing message ID: 3AB4...8F2C', 'Cache hit for group 9198xxxxxxx@g.us', 'Webhook payload received, size: 1.2KB', 'Session check: connected=true, battery=82%', 'Plugin execution time: 45ms'],
}

function generateLogs(count = 200) {
 const logs = []
 const now = Date.now()
 for (let i = 0; i < count; i++) {
 const level = LOG_LEVELS[Math.floor(Math.random() * LOG_LEVELS.length)]
 const msgs = LOG_MESSAGES[level]
 const msg = msgs[Math.floor(Math.random() * msgs.length)]
 const t = new Date(now - i * 3000 - Math.floor(Math.random() * 2000))
 const time = t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
 logs.push({ time, level, msg })
 }
 return logs
}

// ── Logs Page ──────────────────────────────────────────────────────────
export default function Logs() {
 const [logs, setLogs] = useState([])
 const [filter, setFilter] = useState('all')
 const [search, setSearch] = useState('')
 const [autoScroll, setAutoScroll] = useState(true)
 const [loading, setLoading] = useState(true)
 const bottomRef = useRef(null)

 useEffect(() => {
 setLoading(true)
 // Simulate loading logs
 setTimeout(() => {
 setLogs(generateLogs(150))
 setLoading(false)
 }, 600)
 }, [])

 useEffect(() => {
 if (autoScroll && bottomRef.current) {
 bottomRef.current.scrollIntoView({ behavior: 'smooth' })
 }
 }, [logs, filter, autoScroll])

 const filtered = useMemo(() => {
 let result = logs
 if (filter !== 'all') result = result.filter(l => l.level === filter)
 if (search.trim()) {
 const q = search.toLowerCase()
 result = result.filter(l => l.msg.toLowerCase().includes(q) || l.level.includes(q))
 }
 return result
 }, [logs, filter, search])

 const stats = useMemo(() => ({
 total: logs.length,
 info: logs.filter(l => l.level === 'info').length,
 warn: logs.filter(l => l.level === 'warn').length,
 error: logs.filter(l => l.level === 'error').length,
 debug: logs.filter(l => l.level === 'debug').length,
 }), [logs])

 const refresh = () => {
 setLogs(generateLogs(150))
 }

 return (
 <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
 {/* Header */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
 <div>
 <h1 className="section-title text-gradient" style={{ fontSize: '1.35rem', fontWeight: 800 }}>System Logs</h1>
 <p className="section-subtitle">Real-time event stream and diagnostics</p>
 </div>
 <button className="btn btn-secondary" onClick={refresh} disabled={loading}>
 <RefreshIcon size={15} color="#a5b4fc" /> Refresh
 </button>
 </div>

 {/* Log Stats */}
 <div className="grid grid-cols-5" style={{ gap: '0.75rem' }}>
 {[
 { label: 'Total', value: stats.total, color: '#94a3b8', bg: 'rgba(148,163,184,0.08)' },
 { label: 'Info', value: stats.info, color: '#60a5fa', bg: 'rgba(59,130,246,0.08)' },
 { label: 'Warn', value: stats.warn, color: '#fbbf24', bg: 'rgba(245,158,11,0.08)' },
 { label: 'Error', value: stats.error, color: '#fb7185', bg: 'rgba(244,63,94,0.08)' },
 { label: 'Debug', value: stats.debug, color: '#a78bfa', bg: 'rgba(139,92,246,0.08)' },
 ].map((s, i) => (
 <div key={s.label} className="anim-scale-in" style={{
 background: s.bg, border: `1px solid ${s.color}22`, borderRadius: 12,
 padding: '0.75rem 1rem', animationDelay: `${i * 50}ms`,
 }}>
 <div style={{ fontSize: '1.25rem', fontWeight: 700, color: s.color }}>{s.value}</div>
 <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.1rem' }}>
 {s.label}
 </div>
 </div>
 ))}
 </div>

 {/* Filters */}
 <GlassCard padding="0.85rem 1.25rem" accent="indigo">
 <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
 {/* Level filters */}
 <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
 {['all', 'info', 'warn', 'error', 'debug'].map(level => (
 <button key={level} onClick={() => setFilter(level)} style={{
 padding: '0.3rem 0.7rem', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600,
 cursor: 'pointer', border: '1px solid',
 borderColor: filter === level ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)',
 background: filter === level ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
 color: filter === level ? '#a5b4fc' : '#94a3b8',
 transition: 'all 0.2s ease', fontFamily: 'inherit',
 textTransform: 'capitalize',
 }}>
 {level}
 </button>
 ))}
 </div>

 {/* Search */}
 <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
 <SearchIcon size={15} color="#64748b" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
 <input
 className="input"
 placeholder="Search logs..."
 value={search}
 onChange={e => setSearch(e.target.value)}
 style={{ paddingLeft: '2rem', fontSize: '0.78rem' }}
 />
 </div>

 {/* Auto-scroll */}
 <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
 <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} style={{ accentColor: '#6366f1' }} />
 Auto-scroll
 </label>
 </div>
 </GlassCard>

 {/* Log Entries */}
 <GlassCard padding="0" accent="indigo" style={{ maxHeight: 'calc(100vh - 380px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
 {loading ? (
 <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
 <div className="spinner" style={{ margin: '0 auto 1rem' }} />
 Loading logs...
 </div>
 ) : (
 <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 380px)' }}>
 {filtered.length === 0 ? (
 <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
 No logs match your filter
 </div>
 ) : (
 filtered.map((log, i) => (
 <div key={i} className="log-entry anim-fade" style={{ animationDelay: `${Math.min(i * 8, 200)}ms` }}>
 <span className="log-time">{log.time}</span>
 <span className={`log-level log-level-${log.level}`}>{log.level}</span>
 <span className="log-msg">{log.msg}</span>
 </div>
 ))
 )}
 <div ref={bottomRef} />
 </div>
 )}
 </GlassCard>
 </div>
 )
}
