import { useEffect, useState } from 'react'
import { getGroups, updateGroup } from '../lib/api.js'
import { useToast } from '../App.jsx'

function GroupCard({ grp, onUpdate, onAddBlock, onRemoveBlock }) {
  const [blockInput, setBlockInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleToggle = async (field, val) => {
    setLoading(true)
    await onUpdate(grp._id, { [field]: val })
    setLoading(false)
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 className="card-title" style={{ fontSize: '1rem', fontWeight: 600, wordBreak: 'break-word' }}>{grp.grpName || 'Unknown Group'}</h3>
            <p className="text-muted" style={{ fontSize: '0.75rem', fontFamily: 'monospace', marginTop: '0.25rem' }}>{grp._id.replace('@g.us', '')}</p>
          </div>
          <div className={`badge ${grp.isBotOn ? 'badge-success' : 'badge-destructive'}`}>
            {grp.isBotOn ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      <div className="card-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: 'var(--secondary)', borderRadius: 'var(--radius)' }}>
            <span className="text-muted">Total Msgs</span>
            <span style={{ fontWeight: 500 }}>{grp.totalmsg || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: 'var(--secondary)', borderRadius: 'var(--radius)' }}>
            <span className="text-muted">Members</span>
            <span style={{ fontWeight: 500 }}>{grp.memberCount || 0}</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Bot Enabled</span>
            <label className="toggle">
              <input type="checkbox" checked={grp.isBotOn} onChange={(e) => handleToggle('isBotOn', e.target.checked)} disabled={loading} />
              <span className="slider" />
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Anti-Link</span>
            <label className="toggle">
              <input type="checkbox" checked={grp.antilink} onChange={(e) => handleToggle('antilink', e.target.checked)} disabled={loading} />
              <span className="slider" />
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>NSFW Filter</span>
            <label className="toggle">
              <input type="checkbox" checked={grp.nsfw} onChange={(e) => handleToggle('nsfw', e.target.checked)} disabled={loading} />
              <span className="slider" />
            </label>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 'auto' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Blocked Commands</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.75rem' }}>
            {grp.cmdBlocked?.length ? grp.cmdBlocked.map(c => (
              <span key={c} className="badge" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.125rem 0.25rem 0.125rem 0.5rem' }}>
                {c}
                <button onClick={() => onRemoveBlock(grp._id, c)} style={{ background: 'transparent', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '0.875rem', lineHeight: 1 }}>×</button>
              </span>
            )) : <span className="text-muted" style={{ fontSize: '0.75rem' }}>None</span>}
          </div>
          <form 
            onSubmit={e => { e.preventDefault(); if (blockInput) { onAddBlock(grp._id, blockInput); setBlockInput('') } }}
            style={{ display: 'flex', gap: '0.5rem' }}
          >
            <input
              className="input"
              style={{ height: '2rem', fontSize: '0.75rem' }}
              placeholder="Command name..."
              value={blockInput}
              onChange={e => setBlockInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            />
            <button className="btn btn-secondary" type="submit" style={{ height: '2rem', padding: '0 0.75rem', fontSize: '0.75rem' }}>Block</button>
          </form>
        </div>
      </div>
    </div>
  )
}

const SORTS = [
  { key: 'totalmsg', label: 'By Volume' },
  { key: 'memberCount', label: 'By Members' },
  { key: 'isBotOn', label: 'Active First' }
]

export default function Groups() {
  const toast = useToast()
  const [groups,  setGroups]  = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [sort,    setSort]    = useState('totalmsg')

  useEffect(() => {
    getGroups()
      .then(setGroups)
      .catch(() => toast('Failed to load groups', false))
      .finally(() => setLoading(false))
  }, [])

  const rows = [...groups].filter(g => {
    if (!search) return true
    const q = search.toLowerCase()
    return (g.grpName || '').toLowerCase().includes(q) || g._id.includes(q)
  }).sort((a, b) => {
    if (sort === 'totalmsg') return (b.totalmsg || 0) - (a.totalmsg || 0)
    if (sort === 'memberCount') return (b.memberCount || 0) - (a.memberCount || 0)
    if (sort === 'isBotOn') return (a.isBotOn === b.isBotOn) ? 0 : a.isBotOn ? -1 : 1
    return 0
  })

  async function handleUpdate(jid, data) {
    const prev = [...groups]
    setGroups(g => g.map(x => x._id === jid ? { ...x, ...data } : x))
    try {
      await updateGroup(jid, data)
      toast('Group updated')
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
      toast(`Blocked: ${cmd}`)
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
      toast(`Unblocked: ${cmd}`)
    } catch (err) {
      setGroups(prev => prev.map(g => g._id === jid ? { ...g, cmdBlocked: grp.cmdBlocked } : g))
      toast(err.message, false)
    }
  }

  const activeCount = groups.filter(g => g.isBotOn).length

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.025em' }}>Groups</h2>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>{groups.length} total · <span className="text-success">{activeCount} active</span></p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {SORTS.map(s => (
            <button 
              key={s.key} 
              className={`btn ${sort === s.key ? 'btn-secondary' : 'btn-ghost'}`} 
              onClick={() => setSort(s.key)}
              style={{ height: '2rem', padding: '0 0.75rem', fontSize: '0.75rem', border: '1px solid var(--border)' }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <input
          className="input"
          placeholder="Search groups..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '300px', height: '2.5rem' }}
        />
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>Loading groups...</div>
      ) : rows.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {rows.map(g => (
            <GroupCard
              key={g._id}
              grp={g}
              onUpdate={handleUpdate}
              onAddBlock={handleAddBlock}
              onRemoveBlock={handleRemoveBlock}
            />
          ))}
        </div>
      ) : (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>No groups found.</div>
      )}
    </div>
  )
}
