import { useEffect, useState, useRef } from 'react'
import { getMembers, memberAction } from '../lib/api.js'
import { useToast } from '../App.jsx'

const SORTS = [
  { key: 'totalmsg',    label: 'Total Messages' },
  { key: 'texttotal',   label: 'Text' },
  { key: 'imagetotal',  label: 'Image' },
  { key: 'videototal',  label: 'Video' },
  { key: 'stickertotal',label: 'Sticker' },
  { key: 'pdftotal',    label: 'PDF' },
]

const LIMIT = 50

export default function Members() {
  const toast = useToast()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const [sort,    setSort]    = useState('totalmsg')
  const [order,   setOrder]   = useState('desc')
  const [search,  setSearch]  = useState('')
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
      toast(`Action applied: ${action}`)
      load()
    } catch (err) { toast(err.message, false) }
  }

  function Arrow({ field }) {
    if (sort !== field) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>
    return <span style={{ marginLeft: '4px' }}>{order === 'desc' ? '↓' : '↑'}</span>
  }

  const pages = data ? Math.ceil(data.total / LIMIT) : 0

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.025em' }}>Members</h2>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>{data ? `${data.total.toLocaleString()} members found` : 'Loading...'}</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {SORTS.map(s => (
            <button 
              key={s.key} 
              className={`btn ${sort === s.key ? 'btn-secondary' : 'btn-ghost'}`} 
              onClick={() => handleSort(s.key)}
              style={{ height: '2rem', padding: '0 0.75rem', fontSize: '0.75rem', border: '1px solid var(--border)' }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <input
          className="input mobile-w-full"
          placeholder="Search by JID or name..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          style={{ width: '300px', height: '2.5rem' }}
        />
      </div>

      <div className="table-wrap">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>Loading members...</div>
        ) : !data?.members?.length ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>No members found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>JID</th>
                <th>Name</th>
                {[['totalmsg','Total'],['texttotal','Text'],['imagetotal','Img'],['videototal','Vid'],['stickertotal','Sticker'],['pdftotal','PDF']].map(([f,l]) => (
                  <th key={f} onClick={() => handleSort(f)} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>{l} <Arrow field={f} /></div>
                  </th>
                ))}
                <th>Status</th>
                <th>Warns</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map(m => (
                <tr key={m._id} style={{ opacity: m.isBlock ? 0.6 : 1 }}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{m._id.replace('@s.whatsapp.net', '')}</td>
                  <td className="text-muted">{m.username || '—'}</td>
                  <td style={{ fontWeight: 500 }}>{m.totalmsg    || 0}</td>
                  <td>{m.texttotal  || 0}</td>
                  <td>{m.imagetotal || 0}</td>
                  <td>{m.videototal || 0}</td>
                  <td>{m.stickertotal || 0}</td>
                  <td>{m.pdftotal   || 0}</td>
                  <td>
                    <span className={`badge ${m.isBlock ? 'badge-destructive' : 'badge-success'}`}>
                      {m.isBlock ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td>
                     {m.warning?.length > 0 ? <span className="text-warning font-medium">{m.warning.length}</span> : 0}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {m.isBlock
                        ? <button className="btn btn-secondary" style={{ height: '1.5rem', fontSize: '0.7rem', padding: '0 0.5rem' }} onClick={() => handleAction(m._id, 'unblock')}>Unblock</button>
                        : <button className="btn btn-danger-ghost" style={{ height: '1.5rem', fontSize: '0.7rem', padding: '0 0.5rem' }} onClick={() => handleAction(m._id, 'block')}>Block</button>
                      }
                      <button className="btn btn-ghost" style={{ height: '1.5rem', fontSize: '0.7rem', padding: '0 0.5rem', border: '1px solid var(--border)' }} onClick={() => handleAction(m._id, 'resetWarnings')}>Unwarn</button>
                      <button className="btn btn-ghost" style={{ height: '1.5rem', fontSize: '0.7rem', padding: '0 0.5rem', border: '1px solid var(--border)' }} onClick={() => handleAction(m._id, 'resetMsgCount')}>Zero</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => handlePage(page - 1)}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => handlePage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  )
}
