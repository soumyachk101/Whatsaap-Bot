import { useEffect, useState, useRef } from 'react'
import { getMembers, memberAction } from '../lib/api.js'
import { useToast } from '../App.jsx'
import * as Icons from '../components/Icons.jsx'

const SORTS = [
 { key: 'totalmsg', label: 'Messages' },
 { key: 'texttotal', label: 'Text' },
 { key: 'imagetotal', label: 'Images' },
 { key: 'videototal', label: 'Videos' },
 { key: 'stickertotal', label: 'Stickers' },
 { key: 'pdftotal', label: 'PDFs' },
]

const LIMIT = 50

export default function Members() {
 const toast = useToast()
 const [data, setData] = useState(null)
 const [loading, setLoading] = useState(true)
 const [page, setPage] = useState(1)
 const [sort, setSort] = useState('totalmsg')
 const [order, setOrder] = useState('desc')
 const [search, setSearch] = useState('')
 const debounce = useRef(null)

 function load(p = page, s = sort, o = order, q = search) {
 setLoading(true)
 getMembers({ page: p, limit: LIMIT, sort: s, order: o, search: q })
 .then(setData)
 .catch(() => toast('Failed to load members', false))
 .finally(() => setLoading(false))
 }

 useEffect(() => { load() }, [])

 function handleSearch(val) {
 setSearch(val)
 setPage(1)
 clearTimeout(debounce.current)
 debounce.current = setTimeout(() => load(1, sort, order, val), 350)
 }

 function handleSort(key) {
 const newOrder = sort === key ? (order === 'desc' ? 'asc' : 'desc') : 'desc'
 setSort(key); setOrder(newOrder); setPage(1)
 load(1, key, newOrder, search)
 }

 function handlePage(p) { setPage(p); load(p, sort, order, search) }

 async function handleAction(jid, action) {
 try { await memberAction(jid, action); toast(`Action: ${action}`, true); load() }
 catch (err) { toast(err.message, false) }
 }

 const rankColor = (r) => r === 1 ? '#fbbf24' : r === 2 ? '#d4d4d8' : r === 3 ? '#cd7f32' : 'var(--text-dim)'

 const pages = data ? Math.ceil(data.total / LIMIT) : 0

 return (
 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
 <div>
 <h1 className="section-title" style={{ fontSize: '1.35rem' }}>
 <Icons.IconMembers size={20} style={{ marginRight: 8, verticalAlign: 'text-bottom', color: '#a5b4fc' }} />
 Members Leaderboard
 </h1>
 <p className="section-subtitle">{data ? `${data.total.toLocaleString()} registered participants` : 'Loading...'}</p>
 </div>
 <div style={{ position: 'relative' }}>
 <Icons.IconSearch size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
 <input className="input" placeholder="Search JID or name..." value={search} onChange={e => handleSearch(e.target.value)} style={{ paddingLeft: '2.2rem', width: '260px', fontSize: '0.8rem' }} />
 </div>
 </div>

 <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
 {SORTS.map(s => (
 <button key={s.key} className={`btn ${sort === s.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleSort(s.key)} style={{ fontSize: '0.72rem', padding: '0.35rem 0.75rem' }}>
 {s.label} {sort === s.key && (order === 'desc' ? '↓' : '↑')}
 </button>
 ))}
 </div>

 <div className="table-wrap">
 {loading ? (
 <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
 <div className="spinner" style={{ margin: '0 auto 1rem' }} />
 Loading members...
 </div>
 ) : !data?.members?.length ? (
 <div className="empty-state">No members found.</div>
 ) : (
 <table>
 <thead>
 <tr>
 <th style={{ width: '55px' }}>#</th>
 <th>Participant</th>
 <th>Username</th>
 {[['totalmsg','Total'],['texttotal','Txt'],['imagetotal','Img'],['videototal','Vid'],['stickertotal','Stk'],['pdftotal','PDF']].map(([f,l]) => (
 <th key={f} style={{ cursor: 'pointer', transition: 'color 0.2s' }} onClick={() => handleSort(f)}
 onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
 onMouseLeave={e => e.currentTarget.style.color = ''}>
 <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>{l} {sort === f ? (order === 'desc' ? '↓' : '↑') : '↕'}</span>
 </th>
 ))}
 <th>Status</th>
 <th style={{ textAlign: 'right' }}>Actions</th>
 </tr>
 </thead>
 <tbody>
 {data.members.map((m, idx) => {
 const rank = (page - 1) * LIMIT + idx + 1
 const isTop = rank <= 3
 return (
 <tr key={m._id} style={{ opacity: m.isBlock ? 0.55 : 1, background: isTop ? 'rgba(255,255,255,0.015)' : 'transparent', transition: 'background 0.15s' }}
 onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
 onMouseLeave={e => e.currentTarget.style.background = isTop ? 'rgba(255,255,255,0.015)' : 'transparent'}
 >
 <td style={{ fontWeight: 800, color: rankColor(rank), fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '0.85rem' }}>
 #{rank}
 </td>
 <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', color: 'var(--text-muted)' }}>
 {m._id.replace('@s.whatsapp.net', '')}
 </td>
 <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>{m.username || '—'}</td>
 <td style={{ fontWeight: 700, color: '#f1f5f9', fontFamily: "'Plus Jakarta Sans'" }}>{(m.totalmsg || 0).toLocaleString()}</td>
 <td>{(m.texttotal || 0).toLocaleString()}</td>
 <td>{(m.imagetotal || 0).toLocaleString()}</td>
 <td>{(m.videototal || 0).toLocaleString()}</td>
 <td>{(m.stickertotal || 0).toLocaleString()}</td>
 <td>{(m.pdftotal || 0).toLocaleString()}</td>
 <td>
 <span className={`badge ${m.isBlock ? 'badge-rose' : 'badge-emerald'}`}>{m.isBlock ? 'Blocked' : 'Active'}</span>
 </td>
 <td>
 <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
 {m.isBlock
 ? <button className="btn btn-sm btn-secondary" onClick={() => handleAction(m._id, 'unblock')}>Unblock</button>
 : <button className="btn btn-sm btn-danger" onClick={() => handleAction(m._id, 'block')}>Block</button>
 }
 <button className="btn btn-sm btn-secondary" onClick={() => handleAction(m._id, 'resetMsgCount')}>Reset</button>
 </div>
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 )}
 </div>

 {pages > 1 && (
 <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
 <button className="btn btn-secondary" disabled={page <= 1} onClick={() => handlePage(page - 1)}>← Prev</button>
 <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, minWidth: '80px', textAlign: 'center' }}>{page} / {pages}</span>
 <button className="btn btn-secondary" disabled={page >= pages} onClick={() => handlePage(page + 1)}>Next →</button>
 </div>
 )}
 </div>
 )
}
