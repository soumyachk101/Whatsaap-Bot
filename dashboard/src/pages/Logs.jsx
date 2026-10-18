import { useState, useEffect, useMemo, useRef } from 'react'
import { SearchIcon, RefreshIcon } from '../components/Icons.jsx'
import { getLogs } from '../lib/api.js'

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
			result = result.filter(l => (l.msg || '').toLowerCase().includes(q) || (l.level || '').includes(q))
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
					<h1 className="section-title" style={{ fontSize: '1.35rem', fontWeight: 800 }}>System Logs</h1>
					<p className="section-subtitle">Real-time event stream and diagnostics</p>
				</div>
				<button className="btn btn-secondary" onClick={refresh} disabled={loading}>
					<RefreshIcon size={15} color="var(--primary)" /> Refresh
				</button>
			</div>

			{/* Log Stats */}
			<div className="grid grid-cols-5" style={{ gap: '0.75rem' }}>
				{[
					{ label: 'Total', value: stats.total, color: 'var(--text-main)', bg: 'var(--stone)' },
					{ label: 'Info', value: stats.info, color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
					{ label: 'Warn', value: stats.warn, color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
					{ label: 'Error', value: stats.error, color: 'var(--burnt-sienna)', bg: 'rgba(168,84,72,0.1)' },
					{ label: 'Debug', value: stats.debug, color: 'var(--primary)', bg: 'rgba(93,112,82,0.1)' },
				].map((s, i) => (
					<div key={s.label} className="anim-scale-in" style={{
						background: s.bg, border: `1px solid var(--border-subtle)`, borderRadius: 'var(--radius-sm)',
						padding: '0.75rem 1rem', animationDelay: `${i * 50}ms`,
					}}>
						<div style={{ fontSize: '1.35rem', fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
						<div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.15rem' }}>
							{s.label}
						</div>
					</div>
				))}
			</div>

			{/* Filters */}
			<div className="card" style={{ padding: '0.75rem 1.25rem' }}>
				<div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
					{/* Level filters */}
					<div style={{ display: 'inline-flex', background: 'var(--stone)', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', gap: '4px' }}>
						{['all', 'info', 'warn', 'error', 'debug'].map(level => {
							const active = filter === level;
							return (
								<button key={level} onClick={() => setFilter(level)} style={{
									padding: '0.3rem 0.75rem', borderRadius: 6, fontSize: '0.74rem', fontWeight: active ? 700 : 600,
									cursor: 'pointer', border: '1px solid',
									borderColor: active ? 'var(--primary)' : 'transparent',
									background: active ? 'var(--primary)' : 'transparent',
									color: active ? '#ffffff' : 'var(--text-muted)',
									transition: 'all 0.2s ease', fontFamily: 'inherit',
									textTransform: 'capitalize',
								}}>
									{level}
								</button>
							);
						})}
					</div>

					{/* Search */}
					<div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
						<SearchIcon size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
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
						<input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
						Auto-scroll
					</label>
				</div>
			</div>

			{/* Log Entries Terminal */}
			<div className="card" style={{ padding: '0', maxHeight: 'calc(100vh - 360px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
				{loading ? (
					<div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
						<div className="spinner" style={{ margin: '0 auto 1rem' }} />
						Loading logs...
					</div>
				) : (
					<div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 360px)', padding: '0.5rem 0' }}>
						{filtered.length === 0 ? (
							<div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
								No logs match your filter
							</div>
						) : (
							filtered.map((log, i) => (
								<div key={i} className="log-entry anim-fade" style={{ animationDelay: `${Math.min(i * 8, 200)}ms` }}>
									<span className="log-time">{log.time || '—'}</span>
									<span className={`log-level log-level-${log.level || 'info'}`}>{log.level || 'info'}</span>
									<span className="log-msg">{log.msg}</span>
								</div>
							))
						)}
						<div ref={bottomRef} />
					</div>
				)}
			</div>
		</div>
	)
}
