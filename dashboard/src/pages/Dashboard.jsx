import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { getStats, getAnalytics, fmtUptime } from '../lib/api.js'

function MetricCard({ title, value, subtext, iconClass, icon }) {
  return (
    <div className="glass-card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>{title}</span>
        <div className={`icon-box ${iconClass}`}>{icon}</div>
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>
        {value ?? '—'}
      </div>
      <p className="card-description" style={{ fontSize: '0.75rem', margin: 0 }}>{subtext}</p>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0]
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '8px',
        padding: '0.6rem 0.85rem',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
        color: '#fff',
      }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.2rem', fontWeight: 600 }}>
          {label || data.name}
        </p>
        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8', margin: 0 }}>
          {data.value?.toLocaleString()} <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#aaa' }}>msgs</span>
        </p>
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getStats(), getAnalytics()])
      .then(([s, a]) => { setStats(s); setAnalytics(a) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span className="text-muted" style={{ fontSize: '0.875rem' }}>Loading dashboard overview...</span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div>
      {/* SVG Gradient */}
      <svg style={{ height: 0, width: 0, position: 'absolute' }}>
        <defs>
          <linearGradient id="cyanGradDash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#818cf8" stopOpacity={0.1} />
          </linearGradient>
        </defs>
      </svg>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.025em' }}>Overview Dashboard</h2>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>Real-time summary of bot activity and performance.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="badge badge-success" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
            WhatsApp Engine Online
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <MetricCard
          title="Total Groups"
          value={stats?.groupCount?.toLocaleString()}
          subtext="Managed group chats"
          iconClass="icon-box-cyan"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}
        />
        <MetricCard
          title="Total Members"
          value={stats?.memberCount?.toLocaleString()}
          subtext="Registered participants"
          iconClass="icon-box-emerald"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>}
        />
        <MetricCard
          title="Total Messages"
          value={analytics?.totalMessages?.toLocaleString()}
          subtext="Processed messages"
          iconClass="icon-box-purple"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>}
        />
        <MetricCard
          title="Session Uptime"
          value={stats ? fmtUptime(stats.uptime) : '0s'}
          subtext="Active process runtime"
          iconClass="icon-box-amber"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
        />
      </div>

      {/* Main Activity Chart */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="card-title">Top Group Activity Stream</h3>
            <p className="card-description">Highest volume WhatsApp groups</p>
          </div>
          <span className="badge" style={{ fontSize: '0.7rem' }}>Top 10 Volume</span>
        </div>

        {analytics?.topGroups?.length ? (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={analytics.topGroups.slice(0, 10)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="messages" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#cyanGradDash)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : <p className="text-muted" style={{ fontSize: '0.875rem' }}>No activity data available.</p>}
      </div>

      {/* Top 5 Groups Quick Cards List */}
      {analytics?.topGroups?.length ? (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 className="card-title" style={{ marginBottom: '0.25rem' }}>🔥 Most Active Groups</h3>
          <p className="card-description" style={{ marginBottom: '1.25rem' }}>Quick overview of top group volume</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {analytics.topGroups.slice(0, 5).map((g, i) => (
              <div key={i} style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>#{i + 1} Group</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>
                  {g.messages.toLocaleString()} <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', fontWeight: 400 }}>msgs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
