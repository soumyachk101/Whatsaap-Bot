import { useState, useEffect } from 'react'
import { broadcast, getGroups } from '../lib/api.js'
import { useToast } from '../App.jsx'

export default function Broadcast() {
  const toast = useToast()
  const [text, setText]       = useState('')
  const [loading, setLoading] = useState(false)
  
  const [groups, setGroups] = useState([])
  const [targetType, setTargetType] = useState('active') // 'active', 'all', 'custom'
  const [selectedJids, setSelectedJids] = useState([])

  useEffect(() => {
    getGroups()
      .then(data => {
        console.log('Fetched groups for broadcast:', data)
        setGroups(data || [])
      })
      .catch(err => {
        console.error('Failed to fetch groups:', err)
        toast('Failed to load groups list', false)
      })
  }, [])

  const activeGroups = groups.filter(g => g.isBotOn)

  function handleToggleGroup(jid) {
    setSelectedJids(prev => 
      prev.includes(jid) ? prev.filter(j => j !== jid) : [...prev, jid]
    )
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!text.trim()) return

    let targetJids = []
    if (targetType === 'active') {
      targetJids = activeGroups.map(g => g._id)
    } else if (targetType === 'all') {
      targetJids = groups.map(g => g._id)
    } else if (targetType === 'custom') {
      targetJids = selectedJids
      if (targetJids.length === 0) {
        toast('Please select at least one group for custom broadcast.', false)
        return
      }
    }

    if (!confirm(`Are you sure you want to broadcast this message to ${targetJids.length} group(s)?`)) return

    setLoading(true)
    try {
      const res = await broadcast(text, targetJids)
      toast(`Broadcast sent to ${res.groupsSent || targetJids.length} groups!`)
      setText('')
      setSelectedJids([])
    } catch (err) {
      toast(err.message, false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.025em' }}>Broadcast</h2>
        <p className="text-muted" style={{ marginTop: '0.25rem' }}>Send a global message to specific groups or your entire network.</p>
      </div>

      <div className="card">
        <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 className="card-title">Compose Message</h3>
          <p className="card-description">This message will be sent immediately to the selected targets.</p>
        </div>

        <form onSubmit={handleSend} style={{ padding: '0 1.5rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Target Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Target Audience</label>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              
              <label style={{ 
                display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '1rem', 
                border: `1px solid ${targetType === 'active' ? 'var(--foreground)' : 'var(--border)'}`, 
                borderRadius: 'var(--radius)', cursor: 'pointer',
                backgroundColor: targetType === 'active' ? 'var(--secondary)' : 'transparent'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="radio" name="target" value="active" checked={targetType === 'active'} onChange={() => setTargetType('active')} style={{ cursor: 'pointer' }} />
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Active groups</span>
                </div>
                <span className="text-muted" style={{ fontSize: '0.75rem', paddingLeft: '1.5rem' }}>Only where bot is ON ({activeGroups.length})</span>
              </label>

              <label style={{ 
                display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '1rem', 
                border: `1px solid ${targetType === 'all' ? 'var(--foreground)' : 'var(--border)'}`, 
                borderRadius: 'var(--radius)', cursor: 'pointer',
                backgroundColor: targetType === 'all' ? 'var(--secondary)' : 'transparent'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="radio" name="target" value="all" checked={targetType === 'all'} onChange={() => setTargetType('all')} style={{ cursor: 'pointer' }} />
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>All groups</span>
                </div>
                <span className="text-muted" style={{ fontSize: '0.75rem', paddingLeft: '1.5rem' }}>Every group ({groups.length})</span>
              </label>

              <label style={{ 
                display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '1rem', 
                border: `1px solid ${targetType === 'custom' ? 'var(--foreground)' : 'var(--border)'}`, 
                borderRadius: 'var(--radius)', cursor: 'pointer',
                backgroundColor: targetType === 'custom' ? 'var(--secondary)' : 'transparent'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="radio" name="target" value="custom" checked={targetType === 'custom'} onChange={() => setTargetType('custom')} style={{ cursor: 'pointer' }} />
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Custom selection</span>
                </div>
                <span className="text-muted" style={{ fontSize: '0.75rem', paddingLeft: '1.5rem' }}>Select specific groups</span>
              </label>
            </div>

            {targetType === 'custom' && (
              <div style={{ 
                marginTop: '0.5rem', 
                maxHeight: '300px', 
                overflowY: 'auto', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius)', 
                padding: '0.5rem',
                backgroundColor: 'rgba(255,255,255,0.02)'
              }}>
                {groups.length === 0 ? <p className="text-muted" style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'center' }}>No groups found in database.</p> : 
                  groups.map(g => (
                    <label key={g._id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem', 
                      padding: '0.75rem', 
                      cursor: 'pointer', 
                      borderRadius: '4px',
                      borderBottom: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={selectedJids.includes(g._id)} 
                        onChange={() => handleToggleGroup(g._id)}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>
                          {g.grpName || g._id.split('@')[0] || 'Unknown Group'}
                        </span>
                        <span className="text-muted" style={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>
                          {g._id}
                        </span>
                      </div>
                    </label>
                  ))
                }
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Message Content</label>
            <textarea
              className="input"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Type your announcement here..."
              rows={8}
              required
              style={{ height: 'auto', padding: '1rem', resize: 'vertical', fontFamily: 'inherit', backgroundColor: 'var(--background)' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <p className="text-muted" style={{ fontSize: '0.75rem' }}>
              Targeting <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>
                {targetType === 'active' ? activeGroups.length : targetType === 'all' ? groups.length : selectedJids.length}
              </span> groups.
            </p>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || !text.trim() || (targetType === 'custom' && selectedJids.length === 0)}
              style={{ minWidth: '160px' }}
            >
              {loading ? 'Sending...' : 'Send Broadcast'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
