import { useEffect, useState } from 'react'
import { getGroups, updateGroup, getCommands } from '../lib/api.js'
import { useToast } from '../App.jsx'

function GroupCard({ grp, allCommands, onUpdate, onAddBlock, onRemoveBlock }) {
  const [selectedCmd, setSelectedCmd] = useState('')
  const [loading, setLoading] = useState(false)

  const handleToggle = async (field, val) => {
    setLoading(true)
    await onUpdate(grp._id, { [field]: val })
    setLoading(false)
  }

  const availableToBlock = allCommands.filter(c => !(grp.cmdBlocked || []).includes(c))

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 className="card-title" style={{ fontSize: '1rem', fontWeight: 600, wordBreak: 'break-word' }}>{grp.grpName || 'Unknown Group'}</h3>
            <p className="text-muted" style={{ fontSize: '0.75rem', fontFamily: 'monospace', marginTop: '0.25rem' }}>{grp._id.replace('@g.us', '')}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            {grp.adminOnly && (
              <span className="badge badge-warning" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Admin Only</span>
            )}
            <div className={`badge ${grp.isBotOn ? 'badge-success' : 'badge-destructive'}`}>
              {grp.isBotOn ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>
      </div>

      <div className="card-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: 'var(--secondary)', borderRadius: 'var(--radius)' }}>
            <span className="text-muted">Total Msgs</span>
            <span style={{ fontWeight: 500 }}>{grp.totalMsgCount || grp.totalmsg || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: 'var(--secondary)', borderRadius: 'var(--radius)' }}>
            <span className="text-muted">Members</span>
            <span style={{ fontWeight: 500 }}>{grp.members?.length || grp.memberCount || 0}</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Bot Enabled</span>
            <label className="toggle">
              <input type="checkbox" checked={grp.isBotOn || false} onChange={(e) => handleToggle('isBotOn', e.target.checked)} disabled={loading} />
              <span className="slider" />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Admin Only Mode</span>
              <p className="text-muted" style={{ fontSize: '0.7rem', margin: 0 }}>Bot responds to admins only</p>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={grp.adminOnly || false} onChange={(e) => handleToggle('adminOnly', e.target.checked)} disabled={loading} />
              <span className="slider" />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Anti-Link</span>
            <label className="toggle">
              <input type="checkbox" checked={grp.antilink || false} onChange={(e) => handleToggle('antilink', e.target.checked)} disabled={loading} />
              <span className="slider" />
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>NSFW Filter</span>
            <label className="toggle">
              <input type="checkbox" checked={grp.nsfw || false} onChange={(e) => handleToggle('nsfw', e.target.checked)} disabled={loading} />
              <span className="slider" />
            </label>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 'auto' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Blocked Commands</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.75rem', minHeight: '1.75rem' }}>
            {grp.cmdBlocked?.length ? grp.cmdBlocked.map(c => (
              <span key={c} className="badge badge-destructive" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.125rem 0.25rem 0.125rem 0.5rem' }}>
                #{c}
                <button onClick={() => onRemoveBlock(grp._id, c)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.875rem', lineHeight: 1 }}>×</button>
              </span>
            )) : <span className="text-muted" style={{ fontSize: '0.75rem' }}>No commands blocked</span>}
          </div>
          
          <form 
            onSubmit={e => { 
              e.preventDefault()
              if (selectedCmd) { 
                onAddBlock(grp._id, selectedCmd)
                setSelectedCmd('') 
              } 
            }}
            style={{ display: 'flex', gap: '0.5rem' }}
          >
            <select
              className="input"
              style={{ height: '2.25rem', fontSize: '0.75rem', flex: 1, backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
              value={selectedCmd}
              onChange={e => setSelectedCmd(e.target.value)}
            >
              <option value="">-- Select command to block --</option>
              {availableToBlock.map(c => (
                <option key={c} value={c}>#{c}</option>
              ))}
            </select>
            <button className="btn btn-secondary" type="submit" disabled={!selectedCmd} style={{ height: '2.25rem', padding: '0 0.75rem', fontSize: '0.75rem' }}>Block</button>
          </form>
        </div>
      </div>
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
  const [groups,  setGroups]  = useState([])
  const [allCommands, setAllCommands] = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [sort,    setSort]    = useState('totalmsg')

  useEffect(() => {
    Promise.all([getGroups(), getCommands()])
      .then(([grpsData, cmdsData]) => {
        setGroups(grpsData)

        // Extract all command names from command categories
        const namesSet = new Set()
        if (cmdsData) {
          ['publicCommands', 'groupCommands', 'adminCommands', 'ownerCommands'].forEach(cat => {
            if (Array.isArray(cmdsData[cat])) {
              cmdsData[cat].forEach(item => {
                if (Array.isArray(item.cmd)) {
                  item.cmd.forEach(c => namesSet.add(c))
                }
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
    return (g.grpName || '').toLowerCase().includes(q) || g._id.includes(q)
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
      toast(`Blocked: #${cmd}`)
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
      toast(`Unblocked: #${cmd}`)
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
              allCommands={allCommands}
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
