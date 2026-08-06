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
    <div className="card card-hover" style={{ display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', wordBreak: 'break-word', marginBottom: '0.15rem' }}>
            {grp.grpName || 'Unnamed Group'}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
            {grp._id.replace('@g.us', '')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {grp.adminOnly && (
            <span className="badge badge-rose">Admin Only</span>
          )}
          <span className={`badge ${grp.isBotOn !== false ? 'badge-emerald' : 'badge-purple'}`}>
            {grp.isBotOn !== false ? 'Active' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <div style={{ padding: '0.625rem 0.75rem', background: '#121215', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 500 }}>Total Msgs</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {(grp.totalMsgCount || grp.totalmsg || 0).toLocaleString()}
          </span>
        </div>
        <div style={{ padding: '0.625rem 0.75rem', background: '#121215', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 500 }}>Members</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {grp.members?.length || grp.memberCount || 0}
          </span>
        </div>
      </div>

      {/* Toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-main)' }}>Bot Active</span>
          <label className="toggle-switch">
            <input type="checkbox" checked={grp.isBotOn !== false} onChange={(e) => handleToggle('isBotOn', e.target.checked)} disabled={loading} />
            <span className="slider" />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-main)' }}>Admin Only Mode</span>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Responds only to admins</div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={grp.adminOnly || false} onChange={(e) => handleToggle('adminOnly', e.target.checked)} disabled={loading} />
            <span className="slider" />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-main)' }}>Anti-Link Protection</span>
          <label className="toggle-switch">
            <input type="checkbox" checked={grp.antilink || false} onChange={(e) => handleToggle('antilink', e.target.checked)} disabled={loading} />
            <span className="slider" />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-main)' }}>NSFW Media Filter</span>
          <label className="toggle-switch">
            <input type="checkbox" checked={grp.nsfw || false} onChange={(e) => handleToggle('nsfw', e.target.checked)} disabled={loading} />
            <span className="slider" />
          </label>
        </div>
      </div>

      {/* Blocked Commands Section */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 'auto' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Blocked Commands
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem', minHeight: '26px' }}>
          {grp.cmdBlocked?.length ? grp.cmdBlocked.map(c => (
            <span key={c} className="badge badge-rose" style={{ padding: '0.15rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              #{c}
              <button onClick={() => onRemoveBlock(grp._id, c)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.875rem', lineHeight: 1 }}>×</button>
            </span>
          )) : <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>None</span>}
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
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
            value={selectedCmd}
            onChange={e => setSelectedCmd(e.target.value)}
          >
            <option value="">Select command to block...</option>
            {availableToBlock.map(c => (
              <option key={c} value={c}>#{c}</option>
            ))}
          </select>
          <button className="btn btn-secondary" type="submit" disabled={!selectedCmd} style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>
            Block
          </button>
        </form>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>Groups Management</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            {groups.length} total groups · {activeCount} bot active
          </p>
        </div>

        <input
          className="input"
          placeholder="Search groups..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '280px' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {SORTS.map(s => (
          <button 
            key={s.key} 
            className={`btn ${sort === s.key ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setSort(s.key)}
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem' }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Loading groups...</div>
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
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>No groups match search query.</div>
      )}

    </div>
  )
}
