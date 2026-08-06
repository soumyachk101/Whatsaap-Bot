import { useEffect, useState, useRef } from 'react'
import { getMembers, memberAction } from '../lib/api.js'
import { useToast } from '../App.jsx'

const SORTS = [
  { key: 'totalmsg', label: 'Total Messages' },
  { key: 'texttotal', label: 'Text' },
  { key: 'imagetotal', label: 'Images' },
  { key: 'videototal', label: 'Videos' },
  { key: 'stickertotal', label: 'Stickers' },
  { key: 'pdftotal', label: 'Documents' },
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
    debounce.current = setTimeout(() => load(1, sort, order, val), 380)
  }

  function handleSort(key) {
    const newOrder = sort === key ? (order === 'desc' ? 'asc' : 'desc') : 'desc'
    setSort(key); setOrder(newOrder); setPage(1)
    load(1, key, newOrder, search)
  }

  function handlePage(p) { setPage(p); load(p, sort, order, search) }

  async function handleAction(jid, action) {
    try {
      await memberAction(jid, action)
      toast(`Action applied: ${action}`, true)
      load()
    } catch (err) { toast(err.message, false) }
  }

  function Arrow({ field }) {
    if (sort !== field) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>
    return <span style={{ marginLeft: '4px' }}>{order === 'desc' ? '↓' : '↑'}</span>
  }

  const pages = data ? Math.ceil(data.total / LIMIT) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>Members Leaderboard</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            {data ? `${data.total.toLocaleString()} registered participants` : 'Loading...'}
          </p>
        </div>

        <input
          className="input"
          placeholder="Search by JID or name..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          style={{ width: '280px' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {SORTS.map(s => (
          <button 
            key={s.key} 
            className={`btn ${sort === s.key ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => handleSort(s.key)}
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem' }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="table-container">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Loading members...</div>
        ) : !data?.members?.length ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>No members found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Rank</th>
                <th>Participant JID</th>
                <th>Username</th>
                {[['totalmsg','Total'],['texttotal','Text'],['imagetotal','Img'],['videototal','Vid'],['stickertotal','Sticker'],['pdftotal','PDF']].map(([f,l]) => (
                  <th key={f} onClick={() => handleSort(f)} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>{l} <Arrow field={f} /></div>
                  </th>
                ))}
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((m, idx) => {
                const rank = (page - 1) * LIMIT + idx + 1
                return (
                  <tr key={m._id} style={{ opacity: m.isBlock ? 0.6 : 1 }}>
                    <td style={{ fontWeight: 700, color: rank === 1 ? '#f59e0b' : rank === 2 ? '#9ca3af' : rank === 3 ? '#b45309' : 'var(--text-dim)' }}>
                      #{rank}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                      {m._id.replace('@s.whatsapp.net', '')}
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>{m.username || '—'}</td>
                    <td style={{ fontWeight: 700, color: '#fafafa' }}>{(m.totalmsg || 0).toLocaleString()}</td>
                    <td>{(m.texttotal || 0).toLocaleString()}</td>
                    <td>{(m.imagetotal || 0).toLocaleString()}</td>
                    <td>{(m.videototal || 0).toLocaleString()}</td>
                    <td>{(m.stickertotal || 0).toLocaleString()}</td>
                    <td>{(m.pdftotal || 0).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${m.isBlock ? 'badge-rose' : 'badge-emerald'}`}>
                        {m.isBlock ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {m.isBlock
                          ? <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => handleAction(m._id, 'unblock')}>Unblock</button>
                          : <button className="btn btn-danger" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => handleAction(m._id, 'block')}>Block</button>
                        }
                        <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => handleAction(m._id, 'resetMsgCount')}>Reset</button>
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
          <button className="btn btn-secondary" disabled={page <= 1} onClick={() => handlePage(page - 1)}>
            Previous
          </button>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Page {page} of {pages}
          </span>
          <button className="btn btn-secondary" disabled={page >= pages} onClick={() => handlePage(page + 1)}>
            Next
          </button>
        </div>
      )}

    </div>
  )
}
