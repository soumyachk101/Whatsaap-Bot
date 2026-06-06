import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { getAnalytics } from '../lib/api.js'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6']; // Indigo, Emerald, Amber, Pink, Blue

function MiniMetricCard({ title, value, description, icon }) {
  return (
    <div className="card">
      <div className="card-header" style={{ padding: '1.25rem', paddingBottom: '0.25rem', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>{title}</span>
        <div style={{ color: 'var(--muted-foreground)' }}>{icon}</div>
      </div>
      <div className="card-content" style={{ padding: '1.25rem', paddingTop: 0 }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em' }}>{value}</div>
        <p className="card-description" style={{ fontSize: '0.75rem', marginTop: '0.125rem' }}>{description}</p>
      </div>
    </div>
  )
}

export default function Analytics() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    getAnalytics()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Loading analytics...</div>
  if (error)   return <div className="card" style={{ padding: '1rem', color: 'var(--destructive)', borderColor: 'var(--destructive)' }}>Error: {error}</div>
  if (!data)   return null

  const { 
    topGroups, 
    topMembers, 
    typeBreakdown, 
    totalMessages, 
    activeGroups, 
    blockedMembers, 
    totalGroups, 
    totalMembers 
  } = data

  const typeData = [
    { name: 'Text',    value: typeBreakdown.text },
    { name: 'Image',   value: typeBreakdown.image },
    { name: 'Video',   value: typeBreakdown.video },
    { name: 'Sticker', value: typeBreakdown.sticker },
    { name: 'PDF',     value: typeBreakdown.pdf },
  ].filter(d => d.value > 0)

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.025em' }}>Analytics</h2>
        <p className="text-muted" style={{ marginTop: '0.25rem' }}>Detailed breakdown of message types and user activity.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <MiniMetricCard 
          title="Total Messages" 
          value={totalMessages.toLocaleString()} 
          description="Processed since genesis" 
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>}
        />
        <MiniMetricCard 
          title="Active Groups" 
          value={`${activeGroups} / ${totalGroups}`} 
          description="Groups with bot active" 
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}
        />
        <MiniMetricCard 
          title="Unique Users" 
          value={totalMembers.toLocaleString()} 
          description="Total members tracked" 
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>}
        />
        <MiniMetricCard 
          title="Blocked Users" 
          value={blockedMembers.toLocaleString()} 
          description="Restricted from bot commands" 
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>}
        />
      </div>

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        {/* Type Breakdown */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Message Types</h3>
            <p className="card-description">Distribution of media and text.</p>
          </div>
          <div className="card-content">
            {typeData.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="value" paddingAngle={3} stroke="none">
                    {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-muted" style={{ fontSize: '0.875rem' }}>No data available.</p>}
          </div>
        </div>

        {/* Detailed List */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Breakdown</h3>
            <p className="card-description">Exact counts per message type.</p>
          </div>
          <div className="card-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {typeData.map(({ name, value }, i) => {
              const pct = totalMessages ? Math.round((value / totalMessages) * 100) : 0
              return (
                <div key={name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 500 }}>{name}</span>
                    <span className="text-muted">{value.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div style={{ height: '0.5rem', background: 'var(--muted)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: COLORS[i % COLORS.length], borderRadius: '9999px' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Top Active Groups */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Top Active Groups</h3>
            <p className="card-description">Groups with the highest message volume.</p>
          </div>
          <div className="card-content">
            {topGroups.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topGroups.slice(0, 5)} layout="vertical" margin={{ left: -20, right: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                     cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                     contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                     itemStyle={{ color: 'var(--foreground)' }}
                  />
                  <Bar dataKey="messages" radius={[0, 4, 4, 0]} barSize={14}>
                    {topGroups.slice(0, 5).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted" style={{ fontSize: '0.875rem' }}>No data available.</p>}
          </div>
        </div>

        {/* Top Members */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Top Active Members</h3>
            <p className="card-description">Users with the highest engagement.</p>
          </div>
          <div className="card-content">
            {topMembers.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topMembers.slice(0, 5)} layout="vertical" margin={{ left: -20, right: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                     cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                     contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                     itemStyle={{ color: 'var(--foreground)' }}
                  />
                  <Bar dataKey="messages" radius={[0, 4, 4, 0]} barSize={14}>
                    {topMembers.slice(0, 5).map((_, i) => (
                      <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted" style={{ fontSize: '0.875rem' }}>No data available.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
