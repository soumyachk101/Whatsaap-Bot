import { useEffect, useState, useMemo } from 'react'
import { getCommands, toggleCommand } from '../lib/api.js'
import { useToast } from '../App.jsx'

const TYPE_FILTERS = ['all', 'public', 'group', 'admin', 'owner']

export default function Commands() {
  const toast = useToast()
  const [all,     setAll]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    getCommands()
      .then(d => setAll([
        ...(d.publicCommands || []).map(c => ({ ...c, type: 'public' })),
        ...(d.groupCommands  || []).map(c => ({ ...c, type: 'group' })),
        ...(d.adminCommands  || []).map(c => ({ ...c, type: 'admin' })),
        ...(d.ownerCommands  || []).map(c => ({ ...c, type: 'owner' })),
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
    setAll(prev => prev.map(c =>
      c.cmd.some(k => aliases.includes(k)) ? { ...c, disabledGlobally: newDisabled } : c
    ))
    try {
      await toggleCommand(cmd, newDisabled, aliases)
      toast(newDisabled ? `Disabled: #${cmd}` : `Enabled: #${cmd}`)
    } catch (err) {
      setAll(prev => prev.map(c =>
        c.cmd.some(k => aliases.includes(k)) ? { ...c, disabledGlobally: currentlyDisabled } : c
      ))
      toast(err.message, false)
    }
  }

  const badgeClass = (type) => {
    switch (type) {
      case 'public': return 'badge-emerald'
      case 'group':  return 'badge-blue'
      case 'admin':  return 'badge-amber'
      case 'owner':  return 'badge-purple'
      default:       return 'badge-zinc'
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Page Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
            Command Catalog
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
            View all available bot commands and toggle their global availability.
          </p>
        </div>
        <span className="badge badge-zinc" style={{ padding: '0.3rem 0.75rem' }}>
          {all.length} Total Commands
        </span>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {TYPE_FILTERS.map(f => (
            <button 
              key={f} 
              className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setFilter(f)}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', textTransform: 'capitalize' }}
            >
              {f}
            </button>
          ))}
        </div>
        <input
          className="input"
          placeholder="Search commands or descriptions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '260px' }}
        />
      </div>

      {/* Commands Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '30vh', gap: '0.75rem' }}>
          <div className="spinner" />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>Loading command catalog...</span>
        </div>
      ) : (
        <div className="table-container">
          {rows.length ? (
            <table>
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Command Aliases</th>
                  <th style={{ width: '14%' }}>Scope Type</th>
                  <th style={{ width: '44%' }}>Description</th>
                  <th style={{ width: '14%', textAlign: 'right' }}>Global Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(c => (
                  <tr key={c.cmd[0]}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', color: '#fafafa', fontSize: '0.8125rem' }}>
                      {c.cmd.map(a => `#${a}`).join(', ')}
                    </td>
                    <td>
                      <span className={`badge ${badgeClass(c.type)}`} style={{ textTransform: 'capitalize' }}>
                        {c.type}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {c.desc || 'No description available'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <label className="toggle-switch" style={{ verticalAlign: 'middle' }}>
                        <input
                          type="checkbox"
                          checked={!c.disabledGlobally}
                          onChange={() => handleToggle(c.cmd[0], c.cmd, c.disabledGlobally)}
                        />
                        <span className="slider" />
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
              No commands match current filter or search criteria.
            </div>
          )}
        </div>
      )}

    </div>
  )
}
