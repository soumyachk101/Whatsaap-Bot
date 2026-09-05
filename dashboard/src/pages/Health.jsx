import { useEffect, useState, useRef } from 'react'
import { getHealth, fmtUptime, fmtBytes, requestPair, clearAuth, logoutBot, reconnectBot, restartBot } from '../lib/api.js'
import { useToast } from '../App.jsx'
import * as Icons from '../components/Icons.jsx'

function DangerAction({ label, confirmLabel, description, warning, onConfirm, disabled }) {
 const [confirm, setConfirm] = useState(false)
 const [loading, setLoading] = useState(false)
 const timer = useRef(null)

 useEffect(() => {
 if (confirm) { timer.current = setTimeout(() => setConfirm(false), 8000) }
 return () => clearTimeout(timer.current)
 }, [confirm])

 async function handle() {
 if (!confirm) { setConfirm(true); return }
 setLoading(true)
 try { await onConfirm() }
 finally { setLoading(false); setConfirm(false) }
 }

 return (
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1.15rem 0', borderBottom: '1px solid var(--border)' }}>
 <div style={{ flex: 1, minWidth: 0 }}>
 <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{label}</h4>
 <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.2rem', lineHeight: 1.5 }}>{description}</p>
 {confirm && <p style={{ fontSize: '0.72rem', color: '#fbbf24', marginTop: '0.4rem', fontWeight: 500 }}>Click again to confirm.</p>}
 </div>
 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
 <button className={`btn ${confirm ? 'btn-danger' : 'btn-secondary'}`} onClick={handle} disabled={loading || disabled} style={{ minWidth: '130px' }}>
 {loading ? 'Working...' : confirm ? `Confirm` : label}
 </button>
 {confirm && <button className="btn btn-ghost" onClick={() => setConfirm(false)} style={{ height: '1.8rem', fontSize: '0.7rem' }}>Cancel</button>}
 </div>
 </div>
 )
}

function MetricBox({ label, value, sub, pct }) {
 const color = pct >= 90 ? '#f87171' : pct >= 70 ? '#fbbf24' : '#34d399'
 const glow = pct >= 90 ? 'rgba(248,113,113,0.15)' : pct >= 70 ? 'rgba(251,191,36,0.12)' : 'rgba(52,211,153,0.08)'
 return (
 <div className="stat-card">
 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
 <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 500, marginBottom: '0.5rem' }}>{label}</p>
 <div style={{ fontSize: '1.4rem', fontWeight: 800, color, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>{value}</div>
 {sub && <p style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>{sub}</p>}
 {pct !== undefined && (
 <div style={{ marginTop: '0.85rem', height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: 9999, overflow: 'hidden', boxShadow: `inset 0 1px 2px rgba(0,0,0,0.2)` }}>
 <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: `linear-gradient(90deg, ${color}cc, ${color})`, transition: 'width 0.8s ease', boxShadow: `0 0 8px ${glow}`, borderRadius: 9999 }} />
 </div>
 )}
 </div>
 )
}

export default function Health() {
 const toast = useToast()
 const [data, setData] = useState(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [tick, setTick] = useState(0)

 const [phone, setPhone] = useState('')
 const [pairLoading, setPairLoading] = useState(false)
 const [pairCode, setPairCode] = useState('')
 const [reconnecting, setReconnecting] = useState(false)

 function load() {
 getHealth()
 .then(d => { setData(d); setError('') })
 .catch(err => setError(err.message))
 .finally(() => setLoading(false))
 }

 useEffect(() => { load(); const t = setInterval(load, 10_000); return () => clearInterval(t) }, [])
 useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 1000); return () => clearInterval(t) }, [])

 async function handleReconnect() {
 setReconnecting(true)
 try { await reconnectBot(); toast('Reconnecting...'); setTimeout(() => { load(); setReconnecting(false) }, 15_000) }
 catch (err) { toast(err.message, false); setReconnecting(false) }
 }

 async function handleRestart() {
 toast('Restarting process...')
 try { await restartBot() } catch (_) {}
 let attempts = 0
 const max = 40
 const iv = setInterval(async () => {
 attempts++
 if (attempts >= max) { clearInterval(iv); toast('Server did not come back. Check manually.', false); return }
 try { const r = await fetch('/api/status'); if (r.ok) { clearInterval(iv); window.location.reload() } } catch (_) {}
 }, 1500)
 }

 async function handleLogout() { try { await logoutBot(); toast('Bot logged out'); load() } catch (err) { toast(err.message, false) } }
 async function handleClearAuth() { try { await clearAuth(); toast('Auth cleared. Click Reconnect.') } catch (err) { toast(err.message, false) } }

 async function handlePair() {
 if (!phone.trim()) return
 setPairCode(''); setPairLoading(true)
 try { const r = await requestPair(phone.trim()); setPairCode(r.code); toast('Pairing code generated') }
 catch (err) { toast(err.message, false) }
 finally { setPairLoading(false) }
 }

 if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--text-dim)', fontSize: '0.85rem' }}>Loading system health...</div>
 if (error) return <div className="card" style={{ padding: '1.5rem', color: '#fb7185', borderColor: 'rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.04)', textAlign: 'center' }}>{error}</div>
 if (!data) return null

 const { memory = {}, uptime = 0, connected = false, nodeVersion = '—', pid = '—', platform = '—' } = data || {}
 const mem = {
  heapUsed: memory?.heapUsed || 0,
  heapTotal: memory?.heapTotal || 1,
  rss: memory?.rss || 0,
  external: memory?.external || 0,
 }
 const heapPct = Math.round((mem.heapUsed / (mem.heapTotal || 1)) * 100)

 return (
 <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
 <div>
 <h2 className="section-title text-gradient" style={{ fontSize: '1.5rem' }}>Engine Health</h2>
 <p className="section-subtitle">System diagnostics and process management</p>
 </div>
 <span className={`badge ${connected ? 'badge-emerald' : 'badge-rose'}`} style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem' }}>
 <span className={connected ? 'status-dot online' : 'status-dot offline'} style={{ width: 6, height: 6, borderRadius: '50%' }} />
 {connected ? 'WhatsApp Connected' : 'Disconnected'}
 </span>
 </div>

 {/* Memory */}
 <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.25), transparent)' }} />
 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
 <Icons.IconServer size={18} style={{ color: '#a5b4fc' }} />
 <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)' }}>Memory Utilization</h3>
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
 <MetricBox label="Heap Used" value={fmtBytes(mem.heapUsed)} sub={`${heapPct}% capacity`} pct={heapPct} />
 <MetricBox label="Heap Total" value={fmtBytes(mem.heapTotal)} />
 <MetricBox label="RSS" value={fmtBytes(mem.rss)} sub="Resident Set" />
 <MetricBox label="External" value={fmtBytes(mem.external)} />
 </div>
 </div>

 {/* Process Info */}
 <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.25), transparent)' }} />
 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
 <Icons.IconCpu size={18} style={{ color: '#a5b4fc' }} />
 <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)' }}>Process Info</h3>
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
 <MetricBox label="Uptime" value={fmtUptime(uptime + tick)} sub="Since last restart" />
 <MetricBox label="PID" value={pid} />
 <MetricBox label="Node.js" value={nodeVersion} />
 <MetricBox label="Platform" value={platform} />
 </div>
 </div>

 {/* Core Management */}
 <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.25), transparent)' }} />
 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
 <Icons.IconWrench size={18} style={{ color: '#a5b4fc' }} />
 <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)' }}>Core Management</h3>
 </div>

 {/* Reconnect */}
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
 <div style={{ flex: 1 }}>
 <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Reconnect Bot</h4>
 <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Fresh WhatsApp socket without restart</p>
 </div>
 <button className="btn btn-secondary" onClick={handleReconnect} disabled={reconnecting} style={{ minWidth: '120px', fontSize: '0.75rem' }}>
 <Icons.IconRefresh size={14} /> {reconnecting ? 'Reconnecting...' : 'Reconnect'}
 </button>
 </div>

 {/* Pairing */}
 <div style={{ padding: '1.15rem 0', borderBottom: '1px solid var(--border)' }}>
 <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>Pair via Phone</h4>
 <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.85rem' }}>Generate pairing code instead of QR</p>
 <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
 <input className="input" type="tel" placeholder="e.g. 919876543210" value={phone} onChange={e => setPhone(e.target.value)} style={{ maxWidth: '240px', fontSize: '0.8rem' }} />
 <button className="btn btn-secondary" onClick={handlePair} disabled={pairLoading || !phone.trim()} style={{ fontSize: '0.75rem' }}>
 <Icons.IconPhone size={14} /> {pairLoading ? '...' : 'Get Code'}
 </button>
 </div>
 {pairCode && (
 <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(99,102,241,0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.15)', textAlign: 'center' }}>
 <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Pairing Code</p>
 <p className="pairing-code" style={{ margin: '0.4rem 0' }}>{pairCode}</p>
 <button className="btn btn-sm btn-primary" onClick={() => { navigator.clipboard.writeText(pairCode); toast('Copied!') }}>
 <Icons.IconCopy size={13} /> Copy
 </button>
 </div>
 )}
 </div>

 {/* Actions */}
 <DangerAction label="Logout Bot" description="Disconnect from WhatsApp immediately" onConfirm={handleLogout} disabled={!connected} />
 <DangerAction label="Clear Auth Database" description="Permanently delete session credentials" onConfirm={handleClearAuth} />

 {/* Restart */}
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 0' }}>
 <div style={{ flex: 1 }}>
 <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Restart Process</h4>
 <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Spawns fresh Node.js process, last resort</p>
 </div>
 <button className="btn btn-danger" onClick={handleRestart} style={{ minWidth: '120px', fontSize: '0.75rem' }}>
 <Icons.IconCpu size={14} /> Restart
 </button>
 </div>
 </div>
 </div>
 )
}
