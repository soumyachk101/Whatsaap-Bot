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
 .then(d => setAll([
 ...(d.publicCommands || []).map(c => ({ ...c, type: 'public' })),
 ...(d.groupCommands || []).map(c => ({ ...c, type: 'group' })),
 ...(d.adminCommands || []).map(c => ({ ...c, type: 'admin' })),
 ...(d.ownerCommands || []).map(c => ({ ...c, type: 'owner' })),
 ]))
 .catch(() => toast('Failed to load commands', false))
 .finally(() => setLoading(false))
 }, [])

 const rows = useMemo(() => {
 const q = search.toLowerCase()
 return all.filter(c => {
 if (filter !== 'all' && c.type !== filter) return false
 if (q && !c.cmd.join(' ').toLowerCase().includes(q) && !(c.desc || '').toLowerCase().includes(q)) return false
 return true
 })
 }, [all, filter, search])

 async function handleToggle(cmd, aliases, currentlyDisabled) {
 const newDisabled = !currentlyDisabled
 setAll(prev => prev.map(c => c.cmd.some(k => aliases.includes(k)) ? { ...c, disabledGlobally: newDisabled } : c))
 try {
 await toggleCommand(cmd, newDisabled, aliases)
 toast(newDisabled ? `Disabled: #${cmd}` : `Enabled: #${cmd}`)
 } catch (err) {
 setAll(prev => prev.map(c => c.cmd.some(k => aliases.includes(k)) ? { ...c, disabledGlobally: currentlyDisabled } : c))
 toast(err.message, false)
 }
 }

 return (
 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
 <div>
 <h1 className="section-title" style={{ fontSize: '1.35rem' }}>
 <Icons.IconCommands size={20} style={{ marginRight: 8, verticalAlign: 'text-bottom', color: '#a5b4fc' }} />
 Command Catalog
 </h1>
 <p className="section-subtitle">{all.length} total commands — toggle global availability</p>
 </div>
 <span className="badge badge-zinc" style={{ padding: '0.3rem 0.75rem' }}>{rows.length} shown</span>
 </div>

 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
 <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
 {FILTERS.map(f => (
 <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)} style={{ fontSize: '0.72rem', padding: '0.35rem 0.75rem', textTransform: 'capitalize' }}>
 {f}
 </button>
 ))}
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
 {rows.map(c => {
 const style = TYPE_STYLES[c.type] || TYPE_STYLES.public
 return (
 <tr key={c.cmd[0]}>
 <td style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: '#f1f5f9', fontSize: '0.8rem' }}>
 {c.cmd.map(a => `#${a}`).join(', ')}
 </td>
 <td><span className={`badge ${style.cls}`}>{style.label}</span></td>
 <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{c.desc || '—'}</td>
 <td style={{ textAlign: 'right' }}>
 <label className="toggle-switch" style={{ verticalAlign: 'middle' }}>
 <input type="checkbox" checked={!c.disabledGlobally} onChange={() => handleToggle(c.cmd[0], c.cmd, c.disabledGlobally)} />
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
