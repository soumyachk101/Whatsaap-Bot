import { useEffect, useState } from 'react'
import { getGroups, updateGroup, getCommands } from '../lib/api.js'
import { useToast } from '../App.jsx'

function GroupCard({ grp, allCommands, onUpdate, onAddBlock, onRemoveBlock }) {
 const [selectedCmd, setSelectedCmd] = useState('')
 const [loading, setLoading] = useState(false)
 const [isExpanded, setIsExpanded] = useState(false)

 const handleToggle = async (field, val) => {
 setLoading(true)
 await onUpdate(grp._id, { [field]: val })
 setLoading(false)
 }

 const availableToBlock = allCommands.filter(c => !(grp.cmdBlocked || []).includes(c))

 return (
 <div className="card card-hover" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
 <div style={{
 position: 'absolute',
 top: 0, left: 0, right: 0,
 height: '1px',
 background: grp.isBotOn !== false
 ? 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.4), transparent)'
 : 'linear-gradient(90deg, transparent, rgba(100, 116, 139, 0.2), transparent)'
 }} />

 <div style={{ paddingBottom: '0.875rem', marginBottom: '0.875rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
 <div style={{ minWidth: 0, flex: 1 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
 <h3 style={{
 fontSize: '0.875rem',
 fontWeight: 700,
 color: grp.isBotOn !== false ? 'var(--text-main)' : 'var(--text-dim)',
 whiteSpace: 'nowrap',
 overflow: 'hidden',
 textOverflow: 'ellipsis',
 flex: 1
 }}>
 {grp.grpName || 'Unnamed Group'}
 </h3>
 <span
 className={`pulse-live`}
 style={{
 width: '7px',
 height: '7px',
 borderRadius: '50%',
 background: grp.isBotOn !== false ? '#10b981' : '#64748b',
 flexShrink: 0,
 boxShadow: grp.isBotOn !== false ? '0 0 8px rgba(16, 185, 129, 0.5)' : 'none'
 }}
 />
 </div>
 <p style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
 {grp._id}
 </p>
 </div>

 <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
 {grp.adminOnly && (
 <span className="badge badge-rose">Admin Only</span>
 )}
 <span className={`badge ${grp.isBotOn !== false ? 'badge-emerald' : 'badge-zinc'}`}>
 {grp.isBotOn !== false ? 'Active' : 'Disabled'}
 </span>
 </div>
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
 <div style={{
 padding: '0.5rem 0.65rem',
 background: 'var(--bg-surface)',
 borderRadius: 'var(--radius-sm)',
 border: '1px solid var(--border)',
 display: 'flex',
 justifyContent: 'space-between',
 alignItems: 'center'
 }}>
 <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontWeight: 500 }}>Messages</span>
 <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
 {(grp.totalMsgCount || grp.totalmsg || 0).toLocaleString()}
 </span>
 </div>
 <div style={{
 padding: '0.5rem 0.65rem',
 background: 'var(--bg-surface)',
 borderRadius: 'var(--radius-sm)',
 border: '1px solid var(--border)',
 display: 'flex',
 justifyContent: 'space-between',
 alignItems: 'center'
 }}>
 <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontWeight: 500 }}>Members</span>
 <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
 {grp.members?.length || grp.memberCount || 0}
 </span>
 </div>
 </div>

 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1rem' }}>
 {[
 { field: 'isBotOn', label: 'Bot Response Active', desc: 'Enable bot responses', highlight: true },
 { field: 'adminOnly', label: 'Admin Only Mode', desc: 'Only group admins can use bot' },
 { field: 'restrictedMode', label: 'Restricted Mode', desc: 'Only welcome, stats & search allowed' },
 { field: 'antilink', label: 'Anti-Link Protection', desc: 'Block links in chat' },
 { field: 'nsfw', label: 'NSFW Media Filter', desc: 'Filter inappropriate media' },
 ].map(item => (
 <div key={item.field} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 <div>
 <span style={{
 fontSize: '0.75rem',
 fontWeight: 600,
 color: item.highlight && grp[item.field] !== false ? 'var(--text-main)' : 'var(--text-muted)'
 }}>{item.label}</span>
 {item.desc && <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{item.desc}</div>}
 </div>
 <label className="toggle-switch">
 <input type="checkbox" checked={grp[item.field] !== false} onChange={(e) => handleToggle(item.field, e.target.checked)} disabled={loading} />
 <span className="slider" />
 </label>
 </div>
 ))}
 </div>

 <button
 className="btn btn-ghost"
 onClick={() => setIsExpanded(!isExpanded)}
 style={{
 fontSize: '0.75rem',
 padding: '0.4rem 0',
 width: '100%',
 justifyContent: 'center',
 color: 'var(--text-dim)',
 borderTop: '1px solid var(--border)',
 marginTop: 'auto',
 paddingTop: '0.75rem'
 }}
 >
 {isExpanded ? '▲ Hide Command Blocks' : '▼ Manage Command Blocks'}
 </button>

 {isExpanded && (
 <div className="card" style={{
 padding: '1rem',
 marginTop: '0.75rem',
 background: 'rgba(255,255,255,0.02)',
 border: '1px dashed var(--border)'
 }}>
 <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
 Blocked Commands ({grp.cmdBlocked?.length || 0})
 </div>

 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.6rem', minHeight: '24px' }}>
 {grp.cmdBlocked?.length ? grp.cmdBlocked.map(c => (
 <span key={c} className="badge badge-rose" style={{
 padding: '0.1rem 0.45rem',
 fontSize: '0.65rem',
 display: 'inline-flex',
 alignItems: 'center',
 gap: '4px',
 transition: 'all 0.2s ease'
 }}>
 #{c}
 <button onClick={() => onRemoveBlock(grp._id, c)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.75rem', lineHeight: 1, padding: 0, opacity: 0.7, transition: 'opacity 0.2s' }}
 onMouseEnter={e => e.target.style.opacity = '1'}
 onMouseLeave={e => e.target.style.opacity = '0.7'}
 >×</button>
 </span>
 )) : <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)' }}>No commands blocked</span>}
 </div>

 <form
 onSubmit={e => {
 e.preventDefault()
 if (selectedCmd) {
 onAddBlock(grp._id, selectedCmd)
 setSelectedCmd('')
 }
 }}
 style={{ display: 'flex', gap: '0.35rem' }}
 >
 <select
 className="input"
 style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem', flex: 1 }}
 value={selectedCmd}
 onChange={e => setSelectedCmd(e.target.value)}
 >
 <option value="">Select command...</option>
 {availableToBlock.map(c => (
 <option key={c} value={c}>#{c}</option>
 ))}
 </select>
 <button className="btn btn-secondary" type="submit" disabled={!selectedCmd} style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}>
 Block
 </button>
 </form>
 </div>
 )}
 </div>
 )
}

const SORTS = [
 { key: 'totalmsg', label: 'By Volume' },
 { key: 'memberCount', label: 'By Members' },
 { key: 'isBotOn', label: 'Active First' },
 { key: 'adminOnly', label: 'Admin Only First' }
]

export default function Groups() {
 const toast = useToast()
 const [groups, setGroups] = useState([])
 const [allCommands, setAllCommands] = useState([])
 const [loading, setLoading] = useState(true)
 const [search, setSearch] = useState('')
 const [sort, setSort] = useState('totalmsg')

 useEffect(() => {
 Promise.all([getGroups(), getCommands()])
 .then(([grpsData, cmdsData]) => {
 setGroups(grpsData || [])
 const namesSet = new Set()
 if (cmdsData) {
 ['publicCommands', 'groupCommands', 'adminCommands', 'ownerCommands'].forEach(cat => {
 if (Array.isArray(cmdsData[cat])) {
 cmdsData[cat].forEach(item => {
 if (Array.isArray(item.cmd)) item.cmd.forEach(c => namesSet.add(c))
 })
 }
 })
 }
 setAllCommands(Array.from(namesSet).sort())
 })
 .catch(() => toast('Failed to load groups data', false))
 .finally(() => setLoading(false))
 }, [])

 const rows = [...groups].filter(g => {
 if (!search) return true
 const q = search.toLowerCase()
 return (g.grpName || '').toLowerCase().includes(q) || (g._id || '').includes(q)
 }).sort((a, b) => {
 if (sort === 'totalmsg') return (b.totalMsgCount || b.totalmsg || 0) - (a.totalMsgCount || a.totalmsg || 0)
 if (sort === 'memberCount') return ((b.members?.length || b.memberCount) || 0) - ((a.members?.length || a.memberCount) || 0)
 if (sort === 'isBotOn') return (a.isBotOn === b.isBotOn) ? 0 : a.isBotOn ? -1 : 1
 if (sort === 'adminOnly') return (a.adminOnly === b.adminOnly) ? 0 : a.adminOnly ? -1 : 1
 return 0
 })

 async function handleUpdate(jid, data) {
 const prev = [...groups]
 setGroups(g => g.map(x => x._id === jid ? { ...x, ...data } : x))
 try {
 await updateGroup(jid, data)
 toast('Group updated', true)
 } catch (err) {
 setGroups(prev)
 toast(err.message, false)
 }
 }

 async function handleAddBlock(jid, cmd) {
 const grp = groups.find(g => g._id === jid)
 if (!grp) return
 const updated = [...new Set([...(grp.cmdBlocked || []), cmd])]
 setGroups(prev => prev.map(g => g._id === jid ? { ...g, cmdBlocked: updated } : g))
 try {
 await updateGroup(jid, { cmdBlocked: updated })
 toast(`Blocked #${cmd}`, true)
 } catch (err) {
 setGroups(prev => prev.map(g => g._id === jid ? { ...g, cmdBlocked: grp.cmdBlocked } : g))
 toast(err.message, false)
 }
 }

 async function handleRemoveBlock(jid, cmd) {
 const grp = groups.find(g => g._id === jid)
 if (!grp) return
 const updated = (grp.cmdBlocked || []).filter(c => c !== cmd)
 setGroups(prev => prev.map(g => g._id === jid ? { ...g, cmdBlocked: updated } : g))
 try {
 await updateGroup(jid, { cmdBlocked: updated })
 toast(`Unblocked #${cmd}`, true)
 } catch (err) {
 setGroups(prev => prev.map(g => g._id === jid ? { ...g, cmdBlocked: grp.cmdBlocked } : g))
 toast(err.message, false)
 }
 }

 const activeCount = groups.filter(g => g.isBotOn !== false).length

 return (
 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

 <div className="section-header">
 <div>
 <h1 className="section-title" style={{ fontSize: '1.375rem' }}>
 Group Settings
 </h1>
 <p className="section-subtitle">
 {groups.length} total groups registered · {activeCount} active
 </p>
 </div>

 <input
 className="input"
 placeholder="Search group name or JID..."
 value={search}
 onChange={e => setSearch(e.target.value)}
 style={{ width: '260px' }}
 />
 </div>

 <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
 {SORTS.map(s => (
 <button
 key={s.key}
 className={`btn ${sort === s.key ? 'btn-primary' : 'btn-secondary'}`}
 onClick={() => setSort(s.key)}
 style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
 >
 {s.label}
 </button>
 ))}
 </div>

 {loading ? (
 <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '30vh', gap: '0.75rem' }}>
 <div className="spinner" />
 <span style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>Loading group settings...</span>
 </div>
 ) : rows.length ? (
 <div className="grid grid-cols-3">
 {rows.map(g => (
 <GroupCard
 key={g._id}
 grp={g}
 allCommands={allCommands}
 onUpdate={handleUpdate}
 onAddBlock={handleAddBlock}
 onRemoveBlock={handleRemoveBlock}
 />
 ))}
 </div>
 ) : (
 <div className="card empty-state">
 No groups registered in database yet. Groups will appear automatically as the bot receives messages.
 </div>
 )}

 </div>
 )
}