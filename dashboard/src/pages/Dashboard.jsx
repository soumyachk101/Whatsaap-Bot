import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { getStats, getAnalytics, fmtUptime } from '../lib/api.js'

function MetricCard({ title, value, description, icon }) {
  return (
    <div className="card">
      <div className="card-header" style={{ paddingBottom: '0.5rem', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 className="card-title" style={{ fontSize: '0.875rem', fontWeight: 500 }}>{title}</h3>
        <div style={{ color: 'var(--muted-foreground)' }}>{icon}</div>
      </div>
      <div className="card-content">
        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value ?? '—'}</div>
        <p className="card-description">{description}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats,     setStats]     = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([getStats(), getAnalytics()])
      .then(([s, a]) => { setStats(s); setAnalytics(a) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Loading...</div>

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.025em' }}>Dashboard</h2>
        <p className="text-muted" style={{ marginTop: '0.25rem' }}>Overview of your bot's performance and usage.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <MetricCard 
          title="Total Groups" 
          value={stats?.groupCount} 
          description="Active chats managed" 
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>} 
        />
        <MetricCard 
          title="Total Members" 
          value={stats?.memberCount} 
          description="Unique users seen" 
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>} 
        />
        <MetricCard 
          title="Total Messages" 
          value={analytics?.totalMessages?.toLocaleString()} 
          description="Processed since genesis" 
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>} 
        />
        <MetricCard 
          title="Uptime" 
          value={stats ? fmtUptime(stats.uptime) : null} 
          description="Current session duration" 
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>} 
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Top Active Groups</h3>
            <p className="card-description">Groups with the highest message volume.</p>
          </div>
          <div className="card-content">
            {analytics?.topGroups?.length ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={analytics.topGroups.slice(0, 10)} layout="vertical" margin={{ left: -20 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                     cursor={{ fill: 'var(--muted)' }}
                     contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                     itemStyle={{ color: 'var(--foreground)' }}
                  />
                  <Bar dataKey="messages" fill="var(--foreground)" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted" style={{ fontSize: '0.875rem' }}>No data available.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
