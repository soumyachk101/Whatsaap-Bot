import { useEffect, useState, useRef } from 'react'
import { getHealth, fmtUptime, fmtBytes, requestPair, clearAuth, logoutBot, reconnectBot, restartBot } from '../lib/api.js'
import { useToast } from '../App.jsx'

function DangerAction({ label, confirmLabel, description, warning, loadingLabel, onConfirm, disabled }) {
  const [confirm,  setConfirm]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    if (confirm) {
      timer.current = setTimeout(() => setConfirm(false), 8000)
    }
    return () => clearTimeout(timer.current)
  }, [confirm])

  async function handle() {
    if (!confirm) { setConfirm(true); return }
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
      setConfirm(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1 }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>{label}</h4>
        <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{description}</p>
        {confirm && (
          <p className="text-warning" style={{ fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 500 }}>
            ⚠️ {warning || 'Click again to confirm.'}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '150px' }}>
        <button
          className="btn btn-danger-ghost"
          onClick={handle}
          disabled={loading || disabled}
        >
          {loading ? loadingLabel || 'Working...' : confirm ? `⚠️ ${confirmLabel || 'Confirm'}` : label}
        </button>
        {confirm && (
          <button className="btn btn-ghost" onClick={() => setConfirm(false)} style={{ height: '2rem', fontSize: '0.75rem' }}>
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

function MetricBox({ label, value, sub, pct }) {
  const colorClass = pct >= 90 ? 'text-danger' : pct >= 70 ? 'text-warning' : ''
  const fillCls = pct >= 90 ? 'crit' : pct >= 70 ? 'warn' : ''

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>{label}</p>
      <div style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }} className={colorClass}>{value}</div>
      {sub && <p className="text-muted" style={{ fontSize: '0.75rem' }}>{sub}</p>}
      {pct !== undefined && (
        <div className="progress-bar" style={{ marginTop: '1rem' }}>
          <div className={`progress-fill ${fillCls}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      )}
    </div>
  )
}

export default function Health() {
  const toast = useToast()
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [tick,        setTick]        = useState(0)

  // Pairing code
  const [phone,       setPhone]       = useState('')
  const [pairLoading, setPairLoading] = useState(false)
  const [pairCode,    setPairCode]    = useState('')
  const [pairErr,     setPairErr]     = useState('')
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
    try {
      await reconnectBot()
      toast('Reconnecting. New QR code generating...')
      setTimeout(() => { load(); setReconnecting(false) }, 15_000)
    } catch (err) {
      toast(err.message, false)
      setReconnecting(false)
    }
  }

  async function handleRestart() {
    toast('Process restarting. Standby...')
    try { await restartBot() } catch (_) {}
    const interval = setInterval(async () => {
      try {
        const r = await fetch('/api/status')
        if (r.ok) { clearInterval(interval); window.location.reload() }
      } catch (_) {}
    }, 1500)
  }

  async function handleLogout() {
    try {
      await logoutBot()
      toast('Bot logged out.')
      load()
    } catch (err) { toast(err.message, false) }
  }

  async function handleClearAuth() {
    try {
      const r = await clearAuth()
      toast(`Auth cleared (${r.deleted} records). Click Reconnect.`)
    } catch (err) { toast(err.message, false) }
  }

  async function handlePair() {
    if (!phone.trim()) return setPairErr('Enter phone number with country code.')
    setPairErr(''); setPairCode(''); setPairLoading(true)
    try {
      const r = await requestPair(phone.trim())
      setPairCode(r.code)
      toast('Pairing code generated.')
    } catch (err) { setPairErr(err.message) }
    finally { setPairLoading(false) }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Loading system health...</div>
  if (error) return <div className="card" style={{ padding: '1rem', color: 'var(--destructive)', borderColor: 'var(--destructive)' }}>Error: {error}</div>
  if (!data) return null

  const { memory, uptime, connected, nodeVersion, pid, platform } = data
  const heapPct = Math.round((memory.heapUsed / memory.heapTotal) * 100)

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.025em' }}>Bot Health</h2>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>System diagnostics and process management.</p>
        </div>
        <div className={`badge ${connected ? 'badge-success' : 'badge-destructive'}`}>
          {connected ? 'WhatsApp Connected' : 'WhatsApp Disconnected'}
        </div>
      </div>

      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--muted-foreground)' }}>Memory Utilization</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <MetricBox label="Heap Used" value={fmtBytes(memory.heapUsed)} sub={`${heapPct}% of total capacity`} pct={heapPct} />
        <MetricBox label="Heap Total" value={fmtBytes(memory.heapTotal)} />
        <MetricBox label="RSS" value={fmtBytes(memory.rss)} sub="Resident Set Size" />
        <MetricBox label="External" value={fmtBytes(memory.external)} />
      </div>

      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--muted-foreground)' }}>Process Info</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <MetricBox label="Uptime" value={fmtUptime(uptime + tick)} sub="Since last restart" />
        <MetricBox label="PID" value={pid} />
        <MetricBox label="Node.js" value={nodeVersion} />
        <MetricBox label="Platform" value={platform} />
      </div>

      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--muted-foreground)' }}>Core Management</h3>
      <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
        
        {/* Reconnect */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Reconnect Bot</h4>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Creates a fresh WhatsApp socket without restarting the process. Use after Logout or Clear Auth.</p>
          </div>
          <button className="btn btn-secondary" onClick={handleReconnect} disabled={reconnecting} style={{ minWidth: '150px' }}>
            {reconnecting ? 'Reconnecting...' : 'Reconnect'}
          </button>
        </div>

        {/* Pairing */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Pair with Phone Number</h4>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: '1rem' }}>Generate a pairing code instead of scanning a QR.</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              type="tel"
              placeholder="e.g. 919876543210"
              value={phone}
              onChange={e => { setPhone(e.target.value); setPairErr(''); setPairCode('') }}
              style={{ maxWidth: '250px' }}
            />
            <button className="btn btn-secondary" onClick={handlePair} disabled={pairLoading || !phone.trim()}>
              {pairLoading ? 'Generating...' : 'Get Code'}
            </button>
          </div>
          {pairErr && <p className="text-danger" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>{pairErr}</p>}
          {pairCode && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Pairing Code</p>
              <p style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'monospace', margin: '0.5rem 0' }}>{pairCode}</p>
              <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(pairCode); toast('Copied!') }} style={{ height: '2rem', fontSize: '0.75rem' }}>Copy Code</button>
            </div>
          )}
        </div>

        {/* Danger Actions */}
        <DangerAction
          label="Logout Bot"
          confirmLabel="Confirm Logout"
          loadingLabel="Logging out..."
          description="Sends a proper logout signal to WhatsApp. The socket becomes unusable. Click Reconnect afterwards."
          warning="This disconnects the bot from WhatsApp immediately."
          disabled={!connected}
          onConfirm={handleLogout}
        />
        
        <DangerAction
          label="Clear Auth Database"
          confirmLabel="Confirm Clear"
          loadingLabel="Clearing..."
          description="Deletes all session credentials from MongoDB. Use when the bot is stuck and won't reconnect."
          warning="This permanently deletes session data from the database."
          onConfirm={handleClearAuth}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Restart Process</h4>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Spawns a fresh Node.js process and exits the current one. Use as a last resort.</p>
          </div>
          <button className="btn btn-danger" onClick={handleRestart} style={{ minWidth: '150px' }}>
            Restart Process
          </button>
        </div>

      </div>
    </div>
  )
}
