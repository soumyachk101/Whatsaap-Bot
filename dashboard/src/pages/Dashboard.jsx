import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  getStats, getAnalytics, fmtUptime, requestPair, reconnectBot, clearAuth, restartBot,
  getMaintenanceMode, setMaintenanceMode,
} from '../lib/api.js'
import { useToast } from '../App.jsx'
import { useWebSocket } from '../hooks/useWebSocket.js'
import * as Icons from '../components/Icons.jsx'
import StatCard from '../components/StatCard.jsx'

// ── Chart Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#FEFEFA',
        border: '1px solid #DED8CF',
        borderRadius: '16px',
        padding: '0.75rem 1rem',
        boxShadow: '0 8px 24px rgba(93, 112, 82, 0.15)',
        color: '#2C2C24',
      }}>
        <p style={{ fontSize: '0.75rem', color: '#78786C', marginBottom: '0.2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#5D7052', margin: 0, fontFamily: "'Fraunces', Georgia, serif" }}>
          {payload[0].value?.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#78786C' }}>msgs</span>
        </p>
      </div>
    )
  }
  return null
}

// ── WhatsApp Status Banner ──────────────────────────────────────────────────
function ConnectionBanner({ isConnected, onReconnect, phone, setPhone, pairCode, pairingLoading, onPairSubmit }) {
  return (
    <div className="card" style={{
      background: '#FEFEFA',
      border: `1px solid ${isConnected ? 'rgba(93, 112, 82, 0.3)' : 'rgba(168, 84, 72, 0.3)'}`,
      boxShadow: '0 4px 20px -2px rgba(93, 112, 82, 0.12)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: isConnected ? 'rgba(93, 112, 82, 0.12)' : 'rgba(168, 84, 72, 0.12)',
            border: `1px solid ${isConnected ? 'rgba(93, 112, 82, 0.25)' : 'rgba(168, 84, 72, 0.25)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icons.IconWhatsApp size={24} style={{ color: isConnected ? '#5D7052' : '#A85448' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2C2C24', fontFamily: "'Fraunces', Georgia, serif" }}>
              WhatsApp Connection
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#78786C', marginTop: '0.15rem', fontWeight: 500 }}>
              {isConnected ? 'Bot is active and receiving group events' : 'No active connection. Link a device to begin.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={onReconnect} style={{ fontSize: '0.8rem', padding: '0.5rem 1.15rem' }}>
            <Icons.IconRefresh size={15} />
            Reconnect Socket
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(222, 216, 207, 0.6)' }}>
        <form onSubmit={onPairSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#78786C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <Icons.IconPhone size={14} style={{ marginRight: 6 }} />
            Link via Phone Number
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="input"
              placeholder="e.g. 919876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ flex: 1, padding: '0.65rem 1.25rem' }}
            />
            <button type="submit" className="btn btn-primary" disabled={pairingLoading} style={{ fontSize: '0.8rem', padding: '0.65rem 1.25rem' }}>
              {pairingLoading ? 'Generating...' : 'Get Code'}
            </button>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#8E8E80' }}>Full number with country code, digits only</span>
        </form>

        <div style={{
          background: '#FDFCF8',
          border: '1px solid #DED8CF',
          borderRadius: '1.5rem',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100px',
        }}>
          {pairCode ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#78786C', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                Pairing Code
              </div>
              <div style={{
                fontSize: '2rem',
                fontWeight: 700,
                letterSpacing: '0.25em',
                color: '#5D7052',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {pairCode}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#78786C', marginTop: '0.35rem' }}>
                WhatsApp → Linked Devices → Link with code
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#78786C', fontSize: '0.8rem' }}>
              {isConnected ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <div className="status-dot online" />
                  <span style={{ color: '#5D7052', fontWeight: 700 }}>Connected &amp; Active</span>
                </div>
              ) : 'Enter number to generate pairing code'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Maintenance Mode Card ───────────────────────────────────────────────────
function MaintenanceCard({ maintenanceMode, onToggle, loading }) {
  return (
    <div className="card" style={{
      background: '#FEFEFA',
      border: `1px solid ${maintenanceMode ? 'rgba(193, 140, 93, 0.4)' : 'rgba(222, 216, 207, 0.7)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: maintenanceMode ? 'rgba(193, 140, 93, 0.15)' : 'rgba(93, 112, 82, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: maintenanceMode ? '#C18C5D' : '#5D7052',
          }}>
            {maintenanceMode ? <Icons.IconLock size={20} /> : <Icons.IconUnlock size={20} />}
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2C2C24', fontFamily: "'Fraunces', Georgia, serif" }}>
              Command Restriction Mode
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#78786C', marginTop: '0.15rem' }}>
              {maintenanceMode
                ? 'Only start, stats, and search commands are active.'
                : 'All commands active. Toggle on to restrict public bot commands.'}
            </p>
          </div>
        </div>

        <button
          className={`btn ${maintenanceMode ? 'btn-danger' : 'btn-primary'}`}
          onClick={onToggle}
          disabled={loading}
          style={{ minWidth: '150px' }}
        >
          {loading ? 'Updating...' : maintenanceMode ? 'Disable Restriction' : 'Enable Restriction'}
        </button>
      </div>
    </div>
  )
}

// ── Action Buttons Card ─────────────────────────────────────────────────────
function ActionButtons({ actionLoading, onReconnect, onClearAuth, onRestart }) {
  const actions = [
    { label: 'Reconnect Socket', desc: 'Fresh socket without restart', onClick: onReconnect, icon: Icons.IconRefresh, className: 'btn-secondary' },
    { label: 'Reset Credentials', desc: 'Remove auth credentials', onClick: onClearAuth, icon: Icons.IconTrash, className: 'btn-secondary' },
    { label: 'Restart Node Engine', desc: 'Full process restart', onClick: onRestart, icon: Icons.IconCpu, className: 'btn-danger' },
  ]

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(222, 216, 207, 0.6)' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2C2C24', fontFamily: "'Fraunces', Georgia, serif" }}>
            Process &amp; Lifecycle Controls
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#78786C', marginTop: '0.15rem' }}>Manage bot lifecycle and runtime connections</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {actions.map(a => (
          <button key={a.label} className={`btn ${a.className}`} onClick={a.onClick} disabled={actionLoading}>
            <a.icon size={16} />
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Top Groups Mini List ────────────────────────────────────────────────────
function TopGroupsList({ groups }) {
  if (!groups?.length) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
      {groups.slice(0, 5).map((g, i) => (
        <div key={i} style={{
          padding: '1rem 1.25rem',
          background: '#FDFCF8',
          borderRadius: '1.5rem',
          border: '1px solid #DED8CF',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          transition: 'all 0.25s ease',
          boxShadow: '0 2px 10px rgba(93, 112, 82, 0.06)'
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: i === 0 ? 'rgba(193, 140, 93, 0.2)' : 'rgba(93, 112, 82, 0.12)',
            border: `1px solid ${i === 0 ? '#C18C5D' : '#5D7052'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            fontWeight: 800,
            color: i === 0 ? '#C18C5D' : '#5D7052',
            flexShrink: 0,
            fontFamily: "'Fraunces', serif"
          }}>
            {i + 1}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#2C2C24' }}>
              {g.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#78786C', fontWeight: 600 }}>
              {g.messages.toLocaleString()} msgs
            </div>
          </div>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: g.active ? '#5D7052' : '#B2B2A4',
            flexShrink: 0,
          }} />
        </div>
      ))}
    </div>
  )
}

// ── Main Dashboard Component ────────────────────────────────────────────────
export default function Dashboard() {
  const toast = useToast()
  const wsStatus = useWebSocket()
  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  const [phone, setPhone] = useState('')
  const [pairCode, setPairCode] = useState('')
  const [pairingLoading, setPairingLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [maintenanceMode, setMaintenanceModeState] = useState(false)
  const [maintenanceLoading, setMaintenanceLoading] = useState(false)

  const isConnected = wsStatus === 'connected'

  const fetchData = () => {
    Promise.all([getStats(), getAnalytics()])
      .then(([s, a]) => { setStats(s); setAnalytics(a) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 30_000); return () => clearInterval(t) }, [])
  useEffect(() => {
    getMaintenanceMode()
      .then(r => { if (r?.maintenanceMode != null) setMaintenanceModeState(r.maintenanceMode) })
      .catch(() => {})
  }, [])

  const handleMaintenanceToggle = async () => {
    const newVal = !maintenanceMode
    setMaintenanceLoading(true)
    try {
      const res = await setMaintenanceMode(newVal)
      setMaintenanceModeState(res?.maintenanceMode ?? newVal)
      toast(`Restriction mode ${newVal ? 'enabled' : 'disabled'}`, true)
    } catch (err) {
      toast(err.message || 'Failed to toggle', false)
    } finally { setMaintenanceLoading(false) }
  }

  const handlePair = async (e) => {
    e.preventDefault()
    if (!phone) return toast('Enter phone number with country code', false)
    setPairingLoading(true)
    setPairCode('')
    try {
      const res = await requestPair(phone)
      if (res.code) { setPairCode(res.code); toast('Pairing code generated!', true) }
      else { toast('Failed to generate code', false) }
    } catch (err) { toast(err.message || 'Error', false) }
    finally { setPairingLoading(false) }
  }

  const handleReconnect = async () => {
    setActionLoading(true)
    try { await reconnectBot(); toast('Reconnection triggered', true); fetchData() }
    catch (err) { toast(err.message, false) }
    finally { setActionLoading(false) }
  }

  const handleClearAuth = async () => {
    if (!confirm('Clear session auth? You will need to re-link WhatsApp.')) return
    setActionLoading(true)
    try { await clearAuth(); toast('Session cleared', true); handleReconnect() }
    catch (err) { toast(err.message, false) }
    finally { setActionLoading(false) }
  }

  const handleRestart = async () => {
    if (!confirm('Restart Node process on AWS?')) return
    setActionLoading(true)
    try { await restartBot(); toast('Restart initiated.', true) }
    catch (err) { toast(err.message, false) }
    finally { setActionLoading(false) }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '50vh', gap: '1rem' }}>
        <div className="spinner" />
        <span style={{ fontSize: '0.85rem', color: '#78786C', fontWeight: 600 }}>Loading control center...</span>
      </div>
    )
  }

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="section-title" style={{ fontSize: '1.85rem', fontWeight: 700, color: '#2C2C24' }}>
            System Overview &amp; Pairing
          </h1>
          <p className="section-subtitle">Real-time statistics, active connections, and session controls</p>
        </div>
        <span className={`badge ${isConnected ? 'badge-emerald' : 'badge-rose'}`} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
          <span className={isConnected ? 'status-dot online' : 'status-dot offline'} style={{ width: 6, height: 6 }} />
          {isConnected ? 'WhatsApp Active' : 'Disconnected'}
        </span>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-4">
        <StatCard title="Total Groups" value={stats?.groupCount?.toLocaleString()} subtext="Registered groups" icon={Icons.IconGlobe} accent="moss" delay={50} />
        <StatCard title="Total Members" value={stats?.memberCount?.toLocaleString()} subtext="Unique participants" icon={Icons.IconUsers} accent="clay" delay={100} />
        <StatCard title="Total Messages" value={analytics?.totalMessages?.toLocaleString()} subtext="All-time volume" icon={Icons.IconMessage} accent="moss" delay={150} />
        <StatCard title="Uptime" value={stats ? fmtUptime(stats.uptime) : '0s'} subtext="Continuous runtime" icon={Icons.IconClock} accent="blue" delay={200} />
      </div>

      {/* ── Maintenance Mode ───────────────────────────────────────── */}
      <MaintenanceCard
        maintenanceMode={maintenanceMode}
        onToggle={handleMaintenanceToggle}
        loading={maintenanceLoading}
      />

      {/* ── Connection & Pairing ───────────────────────────────────── */}
      <ConnectionBanner
        isConnected={isConnected}
        onReconnect={handleReconnect}
        phone={phone}
        setPhone={setPhone}
        pairCode={pairCode}
        pairingLoading={pairingLoading}
        onPairSubmit={handlePair}
      />

      {/* ── Process Controls ───────────────────────────────────────── */}
      <ActionButtons
        actionLoading={actionLoading}
        onReconnect={handleReconnect}
        onClearAuth={handleClearAuth}
        onRestart={handleRestart}
      />

      {/* ── Activity Chart ─────────────────────────────────────────── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2C2C24', fontFamily: "'Fraunces', Georgia, serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icons.IconBarChart size={18} style={{ color: '#5D7052' }} />
              Group Activity Volume
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#78786C', marginTop: '0.15rem' }}>Message throughput across highest volume groups</p>
          </div>
          <span className="badge badge-emerald">Top 10 Groups</span>
        </div>

        {analytics?.topGroups?.length ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={analytics.topGroups.slice(0, 10)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5D7052" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#5D7052" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#DED8CF" opacity={0.6} />
              <XAxis dataKey="name" tick={{ fill: '#78786C', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#78786C', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="messages" stroke="#5D7052" strokeWidth={3} fill="url(#areaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ fontSize: '0.85rem', color: '#78786C', textAlign: 'center', padding: '2rem' }}>No group activity recorded yet.</p>
        )}
      </div>

      {/* ── Top Groups List ────────────────────────────────────────── */}
      {analytics?.topGroups?.length ? (
        <div className="card">
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2C2C24', fontFamily: "'Fraunces', Georgia, serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icons.IconTrendingUp size={18} style={{ color: '#C18C5D' }} />
              Most Active Groups
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#78786C', marginTop: '0.15rem' }}>Highest throughput WhatsApp groups</p>
          </div>
          <TopGroupsList groups={analytics.topGroups} />
        </div>
      ) : null}

    </div>
  )
}
