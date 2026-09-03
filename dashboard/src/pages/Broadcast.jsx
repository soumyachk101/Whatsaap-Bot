import { useState, useEffect } from 'react'
import { broadcast, getGroups } from '../lib/api.js'
import { useToast } from '../App.jsx'
import * as Icons from '../components/Icons.jsx'

export default function Broadcast() {
 const toast = useToast()
 const [text, setText] = useState('')
 const [loading, setLoading] = useState(false)
 const [groups, setGroups] = useState([])
 const [targetType, setTargetType] = useState('active')
 const [selectedJids, setSelectedJids] = useState([])

 useEffect(() => {
 getGroups()
 .then(data => setGroups(data || []))
 .catch(err => toast('Failed to load groups', false))
 }, [])

 const activeGroups = groups.filter(g => g.isBotOn)

 function handleToggle(jid) {
 setSelectedJids(prev => prev.includes(jid) ? prev.filter(j => j !== jid) : [...prev, jid])
 }

 async function handleSend(e) {
 e.preventDefault()
 if (!text.trim()) return

 let targetJids = []
 if (targetType === 'active') targetJids = activeGroups.map(g => g._id)
 else if (targetType === 'all') targetJids = groups.map(g => g._id)
 else if (targetType === 'custom') {
 targetJids = selectedJids
 if (!targetJids.length) return toast('Select at least one group', false)
 }

 if (!confirm(`Send broadcast to ${targetJids.length} group(s)?`)) return

 setLoading(true)
 try {
 const res = await broadcast(text, targetJids)
 toast(`Sent to ${res.sent || 0} groups (${res.failed || 0} failed)`)
 setText('')
 setSelectedJids([])
 } catch (err) { toast(err.message, false) }
 finally { setLoading(false) }
 }

 const count = targetType === 'active' ? activeGroups.length : targetType === 'all' ? groups.length : selectedJids.length

 return (
 <div style={{ maxWidth: '800px' }}>
 <div style={{ marginBottom: '1.75rem' }}>
 <h2 className="section-title" style={{ fontSize: '1.45rem' }}>
 <Icons.IconBroadcast size={22} style={{ marginRight: 10, verticalAlign: 'text-bottom', color: '#a5b4fc' }} />
 Broadcast
 </h2>
 <p className="section-subtitle">Send a global message to specific groups or your entire network</p>
 </div>

 <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.25), transparent)' }} />

 <div style={{ paddingBottom: '1.25rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)' }}>
 <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>Compose Message</h3>
 <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>Sent immediately to selected targets</p>
 </div>

 <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
 {/* Target Selection */}
 <div>
 <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Target Audience</label>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
 {[
 { key: 'active', label: 'Active Groups', desc: `Bot ON (${activeGroups.length})`, icon: <Icons.IconWifi size={18} style={{ color: '#34d399' }} /> },
 { key: 'all', label: 'All Groups', desc: `Every group (${groups.length})`, icon: <Icons.IconGlobe size={18} style={{ color: '#60a5fa' }} /> },
 { key: 'custom', label: 'Custom', desc: 'Select specific', icon: <Icons.IconUsers size={18} style={{ color: '#a78bfa' }} /> },
 ].map(opt => (
 <label key={opt.key} style={{
 display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '1rem',
 border: `1px solid ${targetType === opt.key ? 'rgba(99,102,241,0.35)' : 'var(--border)'}`,
 borderRadius: 'var(--radius-md)', cursor: 'pointer',
 background: targetType === opt.key ? 'rgba(99,102,241,0.05)' : 'transparent',
 transition: 'all 0.2s ease'
 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
 <input type="radio" name="target" value={opt.key} checked={targetType === opt.key} onChange={() => setTargetType(opt.key)} style={{ cursor: 'pointer' }} />
 <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-main)' }}>{opt.label}</span>
 </div>
 <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', paddingLeft: '1.35rem' }}>
 {opt.icon}
 <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{opt.desc}</span>
 </div>
 </label>
 ))}
 </div>
 </div>

 {/* Custom group selection */}
 {targetType === 'custom' && (
 <div style={{
 maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border)',
 borderRadius: 'var(--radius-md)', padding: '0.5rem', background: 'rgba(255,255,255,0.015)'
 }}>
 {groups.length === 0 ? <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>No groups in database</p> :
 groups.map(g => (
 <label key={g._id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.65rem 0.5rem', cursor: 'pointer', borderRadius: 'var(--radius-sm)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
 <input type="checkbox" checked={selectedJids.includes(g._id)} onChange={() => handleToggle(g._id)} style={{ width: '15px', height: '15px', cursor: 'pointer' }} />
 <div style={{ minWidth: 0, flex: 1 }}>
 <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>{g.grpName || g._id.split('@')[0] || 'Unknown'}</span>
 <span style={{ fontSize: '0.65rem', color: 'var(--text-faint)', fontFamily: "'JetBrains Mono', monospace", display: 'block' }}>{g._id}</span>
 </div>
 <span className={`badge ${g.isBotOn ? 'badge-emerald' : 'badge-zinc'}`} style={{ fontSize: '0.6rem' }}>{g.isBotOn ? 'Active' : 'Off'}</span>
 </label>
 ))
 }
 </div>
 )}

 {/* Message input */}
 <div>
 <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Message Content</label>
 <textarea className="input" value={text} onChange={e => setText(e.target.value)} placeholder="Type your announcement..." rows={6} required style={{ fontSize: '0.85rem', lineHeight: 1.6, background: 'var(--bg-input)' }} />
 </div>

 {/* Send bar */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
 <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
 Targeting <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{count}</span> group{count !== 1 ? 's' : ''}
 </p>
 <button type="submit" className="btn btn-primary" disabled={loading || !text.trim() || (targetType === 'custom' && !selectedJids.length)} style={{ minWidth: '160px' }}>
 <Icons.IconSend size={15} /> {loading ? 'Sending...' : 'Send Broadcast'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )
}
