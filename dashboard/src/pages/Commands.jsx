import { useState, useEffect, useMemo } from 'react'
import { getCommands, toggleCommand } from '../lib/api.js'
import { useToast } from '../App.jsx'
import * as Icons from '../components/Icons.jsx'

const FILTERS = ['all', 'public', 'group', 'admin', 'owner']

const TYPE_STYLES = {
 public: { cls: 'badge-emerald', label: 'Public' },
 group: { cls: 'badge-blue', label: 'Group' },
 admin: { cls: 'badge-amber', label: 'Admin' },
 owner: { cls: 'badge-violet', label: 'Owner' },
}

export default function Commands() {
 const toast = useToast()
 const [all, setAll] = useState([])
 const [loading, setLoading] = useState(true)
 const [filter, setFilter] = useState('all')
 const [search, setSearch] = useState('')

 useEffect(() => {
		getCommands()
			.then(d => {
				const normalize = (list, type) => (list || []).map(c => {
					const cmdArr = Array.isArray(c.cmd) ? c.cmd : (c.cmd ? [c.cmd] : ['unknown'])
					return {
						...c,
						type,
						cmd: cmdArr,
						primaryCmd: cmdArr[0] || 'unknown',
						desc: c.desc || c.description || ''
					}
				})
				setAll([
					...normalize(d.publicCommands, 'public'),
					...normalize(d.groupCommands, 'group'),
					...normalize(d.adminCommands, 'admin'),
					...normalize(d.ownerCommands, 'owner'),
				])
			})
			.catch(() => toast('Failed to load commands', false))
			.finally(() => setLoading(false))
	}, [])

	const rows = useMemo(() => {
		const q = search.toLowerCase()
		return all.filter(c => {
			if (filter !== 'all' && c.type !== filter) return false
			const cmdStr = (c.cmd || []).join(' ').toLowerCase()
			if (q && !cmdStr.includes(q) && !(c.desc || '').toLowerCase().includes(q)) return false
			return true
		})
	}, [all, filter, search])

	async function handleToggle(cmd, aliases, currentlyDisabled) {
		const newDisabled = !currentlyDisabled
		const safeAliases = Array.isArray(aliases) ? aliases : [cmd]
		setAll(prev => prev.map(c => (c.cmd || []).some(k => safeAliases.includes(k)) ? { ...c, disabledGlobally: newDisabled } : c))
		try {
			await toggleCommand(cmd, newDisabled, safeAliases)
			toast(newDisabled ? `Disabled: #${cmd}` : `Enabled: #${cmd}`)
		} catch (err) {
			setAll(prev => prev.map(c => (c.cmd || []).some(k => safeAliases.includes(k)) ? { ...c, disabledGlobally: currentlyDisabled } : c))
			toast(err.message, false)
		}
	}

 return (
 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
 <div>
 <h1 className="section-title" style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
 <Icons.IconCommands size={20} style={{ color: '#a5b4fc' }} />
 Command Catalog
 </h1>
 <p className="section-subtitle">{all.length} total commands — toggle global availability</p>
 </div>
 <span className="badge badge-zinc" style={{ padding: '0.3rem 0.75rem' }}>{rows.length} shown</span>
 </div>

 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
 		<div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', gap: '4px' }}>
			{FILTERS.map(f => {
				const active = filter === f;
				return (
					<button
						key={f}
						type="button"
						className={`btn ${active ? 'btn-primary' : 'btn-ghost'}`}
						onClick={() => setFilter(f)}
						style={{
							fontSize: '0.72rem',
							padding: '0.35rem 0.85rem',
							borderRadius: '6px',
							fontWeight: active ? 700 : 500,
							textTransform: 'capitalize',
							background: active ? 'linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
							color: active ? '#ffffff' : 'var(--text-dim)',
							borderColor: active ? '#4338ca' : 'transparent',
						}}
					>
						{f}
					</button>
				);
			})}
		</div>
 <div style={{ position: 'relative', width: '260px' }}>
 <Icons.IconSearch size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
 <input className="input" placeholder="Search commands..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.2rem', fontSize: '0.8rem' }} />
 </div>
 </div>

 {loading ? (
 <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '30vh', gap: '0.75rem' }}>
 <div className="spinner" />
 <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Loading commands...</span>
 </div>
 ) : (
 <div className="table-wrap">
 {rows.length ? (
 <table>
 <thead>
 <tr>
 <th style={{ width: '28%' }}>Command Aliases</th>
 <th style={{ width: '12%' }}>Scope</th>
 <th style={{ width: '46%' }}>Description</th>
 <th style={{ width: '14%', textAlign: 'right' }}>Status</th>
 </tr>
 </thead>
 <tbody>
 					{rows.map((c, i) => {
						const style = TYPE_STYLES[c.type] || TYPE_STYLES.public
						const primary = c.primaryCmd || c.cmd?.[0] || 'cmd'
						return (
							<tr key={`${primary}-${i}`}>
								<td style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: '#f1f5f9', fontSize: '0.8rem' }}>
									{(c.cmd || [primary]).map(a => `#${a}`).join(', ')}
								</td>
								<td><span className={`badge ${style.cls}`}>{style.label}</span></td>
								<td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{c.desc || '—'}</td>
								<td style={{ textAlign: 'right' }}>
									<label className="toggle-switch" style={{ verticalAlign: 'middle' }}>
										<input type="checkbox" checked={!c.disabledGlobally} onChange={() => handleToggle(primary, c.cmd, c.disabledGlobally)} />
										<span className="slider" />
									</label>
								</td>
							</tr>
						)
					})}
 </tbody>
 </table>
 ) : (
 <div className="empty-state">No commands match current filters</div>
 )}
 </div>
 )}
 </div>
 )
}
