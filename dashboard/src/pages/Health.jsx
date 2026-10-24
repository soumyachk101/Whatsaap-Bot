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
 <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a1d2b' }}>{label}</h4>
 <p style={{ fontSize: '0.78rem', color: '#9ca1b5', marginTop: '0.2rem', lineHeight: 1.5 }}>{description}</p>
 {confirm && <p style={{ fontSize: '0.72rem', color: '#f5a623', marginTop: '0.4rem', fontWeight: 500 }}>Click again to confirm.</p>}
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
 const color = pct >= 90 ? '#f0544f' : pct >= 70 ? '#f5a623' : '#34c77b'
 const glow = pct >= 90 ? 'rgba(240,84,79,0.15)' : pct >= 70 ? 'rgba(245,166,35,0.12)' : 'rgba(52,199,123,0.08)'
 return (
 <div className="stat-card">
 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
 <p style={{ fontSize: '0.75rem', color: '#9ca1b5', fontWeight: 500, marginBottom: '0.5rem' }}>{label}</p>
 <div style={{ fontSize: '1.4rem', fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}>{value}</div>
 {sub && <p style={{ fontSize: '0.7rem', color: '#c5c8d4', marginTop: '0.2rem' }}>{sub}</p>}
 {pct !== undefined && (
 <div style={{ marginTop: '0.85rem', height: '4px', background: '#e2e5f0', borderRadius: 9999, overflow: 'hidden' }}>
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

 if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: '#9ca1b5', fontSize: '0.85rem' }}>Loading system health...</div>
 if (error) return <div className="card" style={{ padding: '1.5rem', color: '#f0544f', borderColor: 'rgba(240,84,79,0.3)', background: '#fef2f2', textAlign: 'center' }}>{error}</div>
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
 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(79,142,247,0.2), transparent)' }} />
 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
 <Icons.IconServer size={18} style={{ color: '#4f8ef7' }} />
 <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: '#1a1d2b' }}>Memory Utilization</h3>
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
 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(79,142,247,0.2), transparent)' }} />
 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
 <Icons.IconCpu size={18} style={{ color: '#4f8ef7' }} />
 <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: '#1a1d2b' }}>Process Info</h3>
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
 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(79,142,247,0.2), transparent)' }} />
 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
 <Icons.IconWrench size={18} style={{ color: '#4f8ef7' }} />
 <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: '#1a1d2b' }}>Core Management</h3>
 </div>

 {/* Reconnect */}
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
 <div style={{ flex: 1 }}>
 <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a1d2b' }}>Reconnect Bot</h4>
 <p style={{ fontSize: '0.78rem', color: '#9ca1b5', marginTop: '0.2rem' }}>Fresh WhatsApp socket without restart</p>
 </div>
 <button className="btn btn-secondary" onClick={handleReconnect} disabled={reconnecting} style={{ minWidth: '120px', fontSize: '0.75rem' }}>
 <Icons.IconRefresh size={14} /> {reconnecting ? 'Reconnecting...' : 'Reconnect'}
 </button>
 </div>

 {/* Pairing */}
 <div style={{ padding: '1.15rem 0', borderBottom: '1px solid var(--border)' }}>
 <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a1d2b', marginBottom: '0.25rem' }}>Pair via Phone</h4>
 <p style={{ fontSize: '0.78rem', color: '#9ca1b5', marginBottom: '0.85rem' }}>Generate pairing code instead of QR</p>
 <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
 <input className="input" type="tel" placeholder="e.g. 919876543210" value={phone} onChange={e => setPhone(e.target.value)} style={{ maxWidth: '240px', fontSize: '0.8rem' }} />
 <button className="btn btn-secondary" onClick={handlePair} disabled={pairLoading || !phone.trim()} style={{ fontSize: '0.75rem' }}>
 <Icons.IconPhone size={14} /> {pairLoading ? '...' : 'Get Code'}
 </button>
 </div>
 {pairCode && (
 <div style={{ marginTop: '1rem', padding: '1rem', background: '#eef4ff', borderRadius: 'var(--radius-md)', border: '1px solid rgba(79,142,247,0.25)', textAlign: 'center' }}>
 <p style={{ fontSize: '0.65rem', color: '#9ca1b5', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Pairing Code</p>
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
 <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a1d2b' }}>Restart Process</h4>
 <p style={{ fontSize: '0.78rem', color: '#9ca1b5', marginTop: '0.2rem' }}>Spawns fresh Node.js process, last resort</p>
 </div>
 <button className="btn btn-danger" onClick={handleRestart} style={{ minWidth: '120px', fontSize: '0.75rem' }}>
 <Icons.IconCpu size={14} /> Restart
 </button>
 </div>
 </div>
 </div>
 )
}
