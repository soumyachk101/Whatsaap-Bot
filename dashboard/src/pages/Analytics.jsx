import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { getAnalytics } from '../lib/api.js'

const COLORS = ['#fafafa', '#a1a1aa', '#52525b', '#27272a', '#18181b']

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

  const { topGroups, topMembers, typeBreakdown, totalMessages } = data

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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
                  <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" paddingAngle={2} stroke="none">
                    {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)' }} />
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
          <div className="card-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {typeData.map(({ name, value }, i) => {
              const pct = totalMessages ? Math.round((value / totalMessages) * 100) : 0
              return (
                <div key={name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 500 }}>{name}</span>
                    <span className="text-muted">{value.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div style={{ height: '0.5rem', background: 'var(--muted)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Top Members</h3>
            <p className="card-description">Users with the highest engagement.</p>
          </div>
          <div className="card-content">
            {topMembers.length ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={topMembers.slice(0, 10)} layout="vertical" margin={{ left: -20 }}>
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
