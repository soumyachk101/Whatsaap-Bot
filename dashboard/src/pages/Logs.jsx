import { useState, useEffect, useMemo, useRef } from 'react'
import GlassCard from '../components/GlassCard.jsx'
import { SearchIcon, RefreshIcon } from '../components/SVG.jsx'
import { getLogs } from '../lib/api.js'

const LOG_LEVELS = ['info', 'warn', 'error', 'debug']

// ── Logs Page ──────────────────────────────────────────────────────────
export default function Logs() {
 const [logs, setLogs] = useState([])
 const [filter, setFilter] = useState('all')
 const [search, setSearch] = useState('')
 const [autoScroll, setAutoScroll] = useState(true)
 const [loading, setLoading] = useState(true)
 const bottomRef = useRef(null)

 const fetchRealLogs = () => {
  getLogs(filter === 'all' ? '' : filter, 200)
   .then(res => {
    if (Array.isArray(res?.logs)) setLogs(res.logs)
   })
   .catch(() => {})
   .finally(() => setLoading(false))
 }

 useEffect(() => {
  fetchRealLogs()
  const timer = setInterval(fetchRealLogs, 3000)
  return () => clearInterval(timer)
 }, [filter])

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
  fetchRealLogs()
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
