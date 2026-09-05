import { useState, useEffect, useRef, useMemo } from 'react'
import { getGroups, updateGroup, getCommands } from '../lib/api.js'
import { useToast } from '../App.jsx'
import * as Icons from '../components/Icons.jsx'

const SORTS = [
 { key: 'totalmsg', label: 'By Volume' },
 { key: 'memberCount', label: 'By Members' },
 { key: 'isBotOn', label: 'Active First' },
 { key: 'adminOnly', label: 'Admin Only' }
]

function GroupCard({ grp, allCommands, onUpdate, onAddBlock, onRemoveBlock }) {
 const [selectedCmd, setSelectedCmd] = useState('')
 const [loading, setLoading] = useState(false)
 const [expanded, setExpanded] = useState(false)

 const handleToggle = async (field, val) => {
 setLoading(true)
 await onUpdate(grp._id, { [field]: val })
 setLoading(false)
 }

 const available = allCommands.filter(c => !(grp.cmdBlocked || []).includes(c))

 return (
		<div className="card card-hover" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
			<div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: grp.isBotOn
				? 'linear-gradient(90deg, transparent, rgba(16,185,129,0.4), transparent)'
				: 'linear-gradient(90deg, transparent, rgba(100,116,139,0.2), transparent)' }} />

			<div style={{ paddingBottom: '0.85rem', marginBottom: '0.85rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.6rem' }}>
				<div style={{ minWidth: 0, flex: 1 }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
						<h3 title={grp.grpName} style={{ fontSize: '0.875rem', fontWeight: 700, color: grp.isBotOn ? 'var(--text-main)' : 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
							{grp.grpName || 'Unnamed Group'}
						</h3>
						<div className={`status-dot ${grp.isBotOn ? 'online' : 'offline'}`} style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0 }} />
					</div>
					<p style={{ fontSize: '0.65rem', color: 'var(--text-faint)', fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
						{grp._id}
					</p>
				</div>
				<div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0, alignItems: 'center' }}>
					{grp.adminOnly && <span className="badge badge-rose" style={{ fontSize: '0.6rem', padding: '0.15rem 0.4rem' }}>Admin</span>}
					<span className={`badge ${grp.isBotOn ? 'badge-emerald' : 'badge-zinc'}`} style={{ fontSize: '0.6rem', padding: '0.15rem 0.45rem' }}>{grp.isBotOn ? 'Active' : 'Off'}</span>
				</div>
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.85rem' }}>
				<div style={{ padding: '0.5rem 0.65rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
					<span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Messages</span>
					<span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: "'Plus Jakarta Sans'" }}>{(grp.totalMsgCount || grp.totalmsg || 0).toLocaleString()}</span>
				</div>
				<div style={{ padding: '0.5rem 0.65rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
					<span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Members</span>
					<span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: "'Plus Jakarta Sans'" }}>{grp.members?.length || grp.memberCount || 0}</span>
				</div>
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
				{[
					{ field: 'isBotOn', label: 'Bot Active', desc: 'Enable responses' },
					{ field: 'adminOnly', label: 'Admin Only', desc: 'Admins only' },
					{ field: 'restrictedMode', label: 'Restricted', desc: 'Limited commands' },
					{ field: 'antilink', label: 'Anti-Link', desc: 'Block links' },
					{ field: 'nsfw', label: 'NSFW Filter', desc: 'Filter media' },
				].map(item => {
					const isChecked = Boolean(grp[item.field]);
					return (
						<div key={item.field} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.1rem 0' }}>
							<div>
								<span style={{ fontSize: '0.73rem', fontWeight: 600, color: isChecked ? 'var(--text-main)' : 'var(--text-muted)' }}>{item.label}</span>
								<div style={{ fontSize: '0.62rem', color: 'var(--text-faint)' }}>{item.desc}</div>
							</div>
							<label className="toggle" style={{ cursor: 'pointer' }}>
								<input type="checkbox" checked={isChecked} onChange={(e) => handleToggle(item.field, e.target.checked)} disabled={loading} />
								<div className="toggle-track"><div className="toggle-thumb" /></div>
							</label>
						</div>
					);
				})}
			</div>

			<button className="btn btn-ghost" onClick={() => setExpanded(!expanded)} style={{ fontSize: '0.72rem', padding: '0.45rem 0', width: '100%', justifyContent: 'center', color: 'var(--text-dim)', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
				{expanded ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icons.IconChevronDown size={13} style={{ transform: 'rotate(180deg)' }} /> Hide Blocks</span> : <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icons.IconChevronDown size={13} /> Manage Blocks</span>}
			</button>

			{expanded && (
				<div style={{ padding: '0.85rem', marginTop: '0.65rem', background: 'rgba(255,255,255,0.015)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
					<div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
						Blocked: {(grp.cmdBlocked?.length || 0)}
					</div>
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.6rem' }}>
						{grp.cmdBlocked?.length ? grp.cmdBlocked.map(c => (
							<span key={c} className="badge badge-rose" style={{ padding: '0.1rem 0.4rem', fontSize: '0.62rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
								#{c} <button onClick={() => onRemoveBlock(grp._id, c)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.7rem', padding: 0, opacity: 0.7 }}><Icons.IconX size={10} /></button>
							</span>
						)) : <span style={{ fontSize: '0.65rem', color: 'var(--text-faint)' }}>None</span>}
					</div>
					<form onSubmit={e => { e.preventDefault(); if (selectedCmd) { onAddBlock(grp._id, selectedCmd); setSelectedCmd('') } }} style={{ display: 'flex', gap: '0.3rem' }}>
						<select className="input" style={{ fontSize: '0.72rem', padding: '0.35rem 0.5rem', flex: 1 }} value={selectedCmd} onChange={e => setSelectedCmd(e.target.value)}>
							<option value="">Block command...</option>
							{available.map(c => <option key={c} value={c}>#{c}</option>)}
						</select>
						<button className="btn btn-secondary" type="submit" disabled={!selectedCmd} style={{ fontSize: '0.72rem', padding: '0.35rem 0.6rem' }}>Block</button>
					</form>
				</div>
			)}
		</div>
 )
}

export default function Groups() {
 const toast = useToast()
 const [groups, setGroups] = useState([])
 const [allCommands, setAllCommands] = useState([])
 const [loading, setLoading] = useState(true)
 const [search, setSearch] = useState('')
 const [sort, setSort] = useState('totalmsg')

 useEffect(() => {
 Promise.all([getGroups(), getCommands()])
 .then(([grps, cmds]) => {
 setGroups(grps || [])
 const set = new Set()
 if (cmds) {
 ;['publicCommands', 'groupCommands', 'adminCommands', 'ownerCommands'].forEach(cat => {
 if (Array.isArray(cmds[cat])) cmds[cat].forEach(item => { if (Array.isArray(item.cmd)) item.cmd.forEach(c => set.add(c)) })
 })
 }
 setAllCommands(Array.from(set).sort())
 })
 .catch(() => toast('Failed to load groups', false))
 .finally(() => setLoading(false))
 }, [])

 const rows = useMemo(() => {
 const q = search.toLowerCase()
 return [...groups].filter(g => {
 if (!q) return true
 return (g.grpName || '').toLowerCase().includes(q) || (g._id || '').includes(q)
 }).sort((a, b) => {
 if (sort === 'totalmsg') return (b.totalMsgCount || b.totalmsg || 0) - (a.totalMsgCount || a.totalmsg || 0)
 if (sort === 'memberCount') return ((b.members?.length || b.memberCount) || 0) - ((a.members?.length || a.memberCount) || 0)
 if (sort === 'isBotOn') return a.isBotOn === b.isBotOn ? 0 : a.isBotOn ? -1 : 1
 if (sort === 'adminOnly') return a.adminOnly === b.adminOnly ? 0 : a.adminOnly ? -1 : 1
 return 0
 })
 }, [groups, search, sort])

 async function handleUpdate(jid, data) {
 const prev = [...groups]
 setGroups(g => g.map(x => x._id === jid ? { ...x, ...data } : x))
 try { await updateGroup(jid, data); toast('Group updated', true) }
 catch (err) { setGroups(prev); toast(err.message, false) }
 }

 async function handleAddBlock(jid, cmd) {
 const grp = groups.find(g => g._id === jid)
 if (!grp) return
 const updated = [...new Set([...(grp.cmdBlocked || []), cmd])]
 setGroups(prev => prev.map(g => g._id === jid ? { ...g, cmdBlocked: updated } : g))
 try { await updateGroup(jid, { cmdBlocked: updated }); toast(`Blocked #${cmd}`, true) }
 catch (err) { setGroups(prev => prev.map(g => g._id === jid ? { ...g, cmdBlocked: grp.cmdBlocked } : g)); toast(err.message, false) }
 }

 async function handleRemoveBlock(jid, cmd) {
 const grp = groups.find(g => g._id === jid)
 if (!grp) return
 const updated = (grp.cmdBlocked || []).filter(c => c !== cmd)
 setGroups(prev => prev.map(g => g._id === jid ? { ...g, cmdBlocked: updated } : g))
 try { await updateGroup(jid, { cmdBlocked: updated }); toast(`Unblocked #${cmd}`, true) }
 catch (err) { setGroups(prev => prev.map(g => g._id === jid ? { ...g, cmdBlocked: grp.cmdBlocked } : g)); toast(err.message, false) }
 }

 const activeCount = groups.filter(g => g.isBotOn !== false).length

 return (
 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
 <div>
 					<h1 className="section-title" style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
						<Icons.IconGroups size={20} style={{ color: '#a5b4fc' }} />
						Group Settings
					</h1>
 <p className="section-subtitle">{groups.length} groups · {activeCount} active</p>
 </div>
 <div style={{ position: 'relative' }}>
 <Icons.IconSearch size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
 <input className="input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.2rem', width: '240px', fontSize: '0.8rem' }} />
 </div>
 </div>

 	<div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', gap: '4px', alignSelf: 'flex-start' }}>
		{SORTS.map(s => {
			const active = sort === s.key;
			return (
				<button
					key={s.key}
					type="button"
					className={`btn ${active ? 'btn-primary' : 'btn-ghost'}`}
					onClick={() => setSort(s.key)}
					style={{
						fontSize: '0.72rem',
						padding: '0.35rem 0.85rem',
						borderRadius: '6px',
						fontWeight: active ? 700 : 500,
						background: active ? 'linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
						color: active ? '#ffffff' : 'var(--text-dim)',
						borderColor: active ? '#4338ca' : 'transparent',
					}}
				>
					{s.label}
				</button>
			);
		})}
	</div>

 {loading ? (
 <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '30vh', gap: '0.75rem' }}>
 <div className="spinner" />
 <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Loading groups...</span>
 </div>
 ) : rows.length ? (
 <div className="grid grid-cols-3">
 {rows.map(g => (
 <GroupCard key={g._id} grp={g} allCommands={allCommands} onUpdate={handleUpdate} onAddBlock={handleAddBlock} onRemoveBlock={handleRemoveBlock} />
 ))}
 </div>
 ) : (
 <div className="card empty-state">No groups registered. They appear as the bot receives messages.</div>
 )}
 </div>
 )
}
