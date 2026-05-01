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
      toast(newDisabled ? `Command disabled: ${cmd}` : `Command enabled: ${cmd}`)
    } catch (err) {
      setAll(prev => prev.map(c =>
        c.cmd.some(k => aliases.includes(k)) ? { ...c, disabledGlobally: currentlyDisabled } : c
      ))
      toast(err.message, false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.025em' }}>Commands</h2>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>Manage and toggle bot commands globally.</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {TYPE_FILTERS.map(f => (
            <button 
              key={f} 
              className={`btn ${filter === f ? 'btn-secondary' : 'btn-ghost'}`} 
              onClick={() => setFilter(f)}
              style={{ height: '2rem', padding: '0 0.75rem', fontSize: '0.75rem', textTransform: 'capitalize', border: '1px solid var(--border)' }}
            >
              {f}
            </button>
          ))}
        </div>
        <div>
          <input
            className="input"
            placeholder="Search commands..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '250px', height: '2rem' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '30vh', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Loading commands...</div>
      ) : (
        <div className="table-wrap">
          {rows.length ? (
            <table>
              <thead>
                <tr>
                  <th>Command</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(c => (
                  <tr key={c.cmd[0]}>
                    <td style={{ fontWeight: 500, fontFamily: 'monospace' }}>{c.cmd.join(', ')}</td>
                    <td>
                      <span className="badge" style={{ textTransform: 'capitalize' }}>
                        {c.type}
                      </span>
                    </td>
                    <td className="text-muted">{c.desc || '—'}</td>
                    <td>
                      <label className="toggle">
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
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>No commands found.</div>
          )}
        </div>
      )}
    </div>
  )
}
