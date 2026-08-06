import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  getStats, getAnalytics, fmtUptime, requestPair, reconnectBot, clearAuth, restartBot,
} from '../lib/api.js'
import { useToast } from '../App.jsx'
import { useWebSocket } from '../hooks/useWebSocket.js'

function MetricCard({ title, value, subtext, icon }) {
  return (
    <div className="card card-hover">
      <div className="stat-header">
        <span className="stat-label">{title}</span>
        <div className="stat-icon-wrapper">{icon}</div>
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>{subtext}</div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0]
    return (
      <div style={{
        background: '#18181b',
        border: '1px solid #27272a',
        borderRadius: '8px',
        padding: '0.6rem 0.85rem',
        color: '#fafafa',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem', fontWeight: 600 }}>
          {label || data.name}
        </p>
        <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#10b981', margin: 0 }}>
          {data.value?.toLocaleString()} messages
        </p>
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const toast = useToast()
  const wsStatus = useWebSocket()
  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  // Pairing code state
  const [phone, setPhone] = useState('')
  const [pairCode, setPairCode] = useState('')
  const [pairingLoading, setPairingLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const isConnected = wsStatus === 'connected'

  const fetchData = () => {
    Promise.all([getStats(), getAnalytics()])
      .then(([s, a]) => { setStats(s); setAnalytics(a) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, 30_000)
    return () => clearInterval(t)
  }, [])

  const handlePair = async (e) => {
    e.preventDefault()
    if (!phone) return toast('Please enter phone number with country code', false)
    setPairingLoading(true)
    setPairCode('')
    try {
      const res = await requestPair(phone)
      if (res.code) {
        setPairCode(res.code)
        toast('Pairing code generated successfully!', true)
      } else {
        toast('Failed to generate code', false)
      }
    } catch (err) {
      toast(err.message || 'Error generating pairing code', false)
    } finally {
      setPairingLoading(false)
    }
  }

  const handleReconnect = async () => {
    setActionLoading(true)
    try {
      await reconnectBot()
      toast('Bot reconnection triggered!', true)
      fetchData()
    } catch (err) {
      toast(err.message || 'Reconnect failed', false)
    } finally {
      setActionLoading(false)
    }
  }

  const handleClearAuth = async () => {
    if (!confirm('Are you sure you want to clear session auth? You will need to re-link WhatsApp.')) return
    setActionLoading(true)
    try {
      await clearAuth()
      toast('Session cleared. Generating new connection...', true)
      handleReconnect()
    } catch (err) {
      toast(err.message || 'Clear auth failed', false)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRestart = async () => {
    if (!confirm('Restart background Node process?')) return
    setActionLoading(true)
    try {
      await restartBot()
      toast('Process restart initiated. Refresh in 10s.', true)
    } catch (err) {
      toast(err.message || 'Restart failed', false)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '50vh', gap: '1rem' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid var(--border)', borderTopColor: '#fafafa', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>Loading control center...</span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* ── Page Title Header ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            Bot Control Center
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            Manage WhatsApp connection, live metrics, and bot controls.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className={`badge ${isConnected ? 'badge-emerald' : 'badge-rose'}`} style={{ padding: '0.35rem 0.75rem' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: isConnected ? '#10b981' : '#ef4444' }} />
            {isConnected ? 'WhatsApp Active' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* ── WhatsApp Pairing & Control Section ──────────────────────────── */}
      <div className="card" style={{ background: '#121215' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>WhatsApp Linking & Controls</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Generate phone pairing code or manage connection state.</p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleReconnect} disabled={actionLoading}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
              Reconnect
            </button>
            <button className="btn btn-secondary" onClick={handleClearAuth} disabled={actionLoading}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              Clear Session
            </button>
            <button className="btn btn-danger" onClick={handleRestart} disabled={actionLoading}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
              Restart Process
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2" style={{ gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Pairing Input Form */}
          <form onSubmit={handlePair} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Link Device via Phone Number
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="input"
                placeholder="e.g. 919876543210 (Country code included)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={pairingLoading} style={{ whiteSpace: 'nowrap' }}>
                {pairingLoading ? 'Generating...' : 'Get Code'}
              </button>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Enter full WhatsApp number with country code (digits only, no + sign).
            </span>
          </form>

          {/* Pairing Code Display Box */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justify: 'center',
            alignItems: 'center',
            minHeight: '94px',
          }}>
            {pairCode ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Pairing Code
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '0.25em', color: '#10b981', fontFamily: 'monospace' }}>
                  {pairCode}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                  Enter this code in WhatsApp &gt; Linked Devices &gt; Link with phone number
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
                {isConnected ? '✓ WhatsApp is currently connected & active' : 'Enter number above to generate an 8-digit pairing code'}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Metric Cards Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-4">
        <MetricCard
          title="Total Groups"
          value={stats?.groupCount?.toLocaleString()}
          subtext="Active WhatsApp groups"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}
        />
        <MetricCard
          title="Total Members"
          value={stats?.memberCount?.toLocaleString()}
          subtext="Unique participants"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>}
        />
        <MetricCard
          title="Total Messages"
          value={analytics?.totalMessages?.toLocaleString()}
          subtext="All-time volume"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>}
        />
        <MetricCard
          title="System Uptime"
          value={stats ? fmtUptime(stats.uptime) : '0s'}
          subtext="Continuous process time"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
        />
      </div>

      {/* ── Main Activity Chart Card ─────────────────────────────────────── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>Top Groups Activity Volume</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Messages count breakdown across highest volume groups</p>
          </div>
          <span className="badge badge-purple">Top Groups</span>
        </div>

        {analytics?.topGroups?.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={analytics.topGroups.slice(0, 10)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="messages" stroke="#10b981" strokeWidth={2} fillOpacity={0.15} fill="#10b981" />
            </AreaChart>
          </ResponsiveContainer>
        ) : <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>No group activity recorded yet.</p>}
      </div>

      {/* ── Top 5 Active Groups Cards ────────────────────────────────────── */}
      {analytics?.topGroups?.length ? (
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>🔥 Most Active Groups</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Highest message throughput</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {analytics.topGroups.slice(0, 5).map((g, i) => (
              <div key={i} style={{ padding: '0.875rem', background: '#121215', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>#{i + 1} Group</div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fafafa' }}>
                  {g.messages.toLocaleString()} <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400 }}>msgs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

    </div>
  )
}
