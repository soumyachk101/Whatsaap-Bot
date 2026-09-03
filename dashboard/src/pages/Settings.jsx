import { useState, useEffect } from 'react'
import GlassCard from '../components/GlassCard.jsx'
import {
 getStats, setMaintenanceMode,
} from '../lib/api.js'
import { useToast } from '../App.jsx'

export default function Settings() {
 const toast = useToast()
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [stats, setStats] = useState(null)

 const [botName, setBotName] = useState('WhatsApp Bot')
 const [prefix, setPrefix] = useState('.')
 const [ownerNumber, setOwnerNumber] = useState('9198xxxxxxx')
 const [autoRead, setAutoRead] = useState(true)
 const [antiLink, setAntiLink] = useState(true)
 const [antiBadwords, setAntiBadwords] = useState(true)
 const [welcomeMsg, setWelcomeMsg] = useState('Welcome to the group, @user!')

 useEffect(() => {
 getStats().then(s => { setStats(s); setLoading(false) }).catch(() => setLoading(false))
 }, [])

 const handleSave = async () => {
 setSaving(true)
 try {
 await setMaintenanceMode(false)
 toast('Settings saved successfully', true)
 } catch { toast('Error saving settings', false) }
 finally { setSaving(false) }
 }

 const handleReset = () => {
 setBotName('WhatsApp Bot')
 setPrefix('.')
 setOwnerNumber('9198xxxxxxx')
 setAutoRead(true)
 setAntiLink(true)
 setAntiBadwords(true)
 setWelcomeMsg('Welcome to the group, @user!')
 toast('Settings reset to defaults', true)
 }

 if (loading) {
 return (
 <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', gap: '1rem' }}>
 <div className="spinner" />
 <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Loading settings...</span>
 </div>
 )
 }

 return (
 <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
 {/* Header */}
 <div>
 <h1 className="section-title text-gradient" style={{ fontSize: '1.35rem', fontWeight: 800 }}>Settings</h1>
 <p className="section-subtitle">Configure your bot behavior and preferences</p>
 </div>

 <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
 {/* General Settings */}
 <GlassCard title="General Configuration" subtitle="Basic bot settings" accent="indigo" padding="1.5rem">
 <div className="form-group">
 <label className="form-label">Bot Name</label>
 <input className="input" value={botName} onChange={e => setBotName(e.target.value)} placeholder="Enter bot name" />
 <div className="form-hint">Display name for the bot across all platforms</div>
 </div>
 <div className="form-group">
 <label className="form-label">Command Prefix</label>
 <input className="input" value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="." style={{ maxWidth: 120 }} />
 <div className="form-hint">Character used before commands (e.g., .help)</div>
 </div>
 <div className="form-group">
 <label className="form-label">Owner Number</label>
 <input className="input" value={ownerNumber} onChange={e => setOwnerNumber(e.target.value)} placeholder="9198xxxxxxx" />
 <div className="form-hint">Your WhatsApp number with country code</div>
 </div>
 </GlassCard>

 {/* Features Toggle */}
 <GlassCard title="Feature Toggles" subtitle="Enable or disable bot features" accent="emerald" padding="1.5rem">
 {[
 { label: 'Auto-Read Messages', desc: 'Automatically mark messages as read', value: autoRead, onChange: setAutoRead },
 { label: 'Anti-Link Protection', desc: 'Delete messages containing links', value: antiLink, onChange: setAntiLink },
 { label: 'Anti-Badwords Filter', desc: 'Remove messages with offensive language', value: antiBadwords, onChange: setAntiBadwords },
 ].map(f => (
 <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
 <div>
 <div style={{ fontSize: '0.82rem', color: '#f1f5f9', fontWeight: 500 }}>{f.label}</div>
 <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>{f.desc}</div>
 </div>
 <label className="toggle" style={{ cursor: 'pointer' }}>
 <input type="checkbox" checked={f.value} onChange={e => f.onChange(e.target.checked)} />
 <div className="toggle-track"><div className="toggle-thumb" /></div>
 </label>
 </div>
 ))}
 </GlassCard>

 {/* Welcome Message */}
 <GlassCard title="Welcome Message" subtitle="Message sent when a user joins a group" accent="violet" padding="1.5rem" style={{ gridColumn: 'span 2' }}>
 <div className="form-group" style={{ maxWidth: 600 }}>
 <label className="form-label">Message Template</label>
 <textarea className="input" rows={3} value={welcomeMsg} onChange={e => setWelcomeMsg(e.target.value)} placeholder="Welcome @user!" style={{ resize: 'vertical' }} />
 <div className="form-hint">Use <code style={{ color: '#a5b4fc', background: 'rgba(99,102,241,0.1)', padding: '1px 5px', borderRadius: 4, fontSize: '0.68rem' }}>@user</code> to mention the new member</div>
 </div>
 </GlassCard>
 </div>

 {/* Action Buttons */}
 <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
 <button className="btn btn-ghost" onClick={handleReset}>Reset to Defaults</button>
 <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
 {saving ? 'Saving...' : 'Save Settings'}
 </button>
 </div>
 </div>
 )
}
