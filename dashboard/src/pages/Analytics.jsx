import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, AreaChart, Area, CartesianGrid, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import { getAnalytics } from '../lib/api.js'

const PALETTE = [
  { name: 'Cyan', main: '#38bdf8', light: '#7dd3fc', dark: '#0284c7', gradId: 'cyanG' },
  { name: 'Emerald', main: '#34d399', light: '#6ee7b7', dark: '#059669', gradId: 'emeraldG' },
  { name: 'Rose', main: '#fb7185', light: '#fecdd3', dark: '#e11d48', gradId: 'roseG' },
  { name: 'Amber', main: '#fbbf24', light: '#fde68a', dark: '#d97706', gradId: 'amberG' },
  { name: 'Purple', main: '#c084fc', light: '#e9d5ff', dark: '#7e22ce', gradId: 'purpleG' },
]

function MetricTile({ title, value, subtext, iconClass, icon, badge, highlightColor }) {
  return (
    <div 
      className="glass-card" 
      style={{ 
        padding: '1.35rem', 
        position: 'relative', 
        overflow: 'hidden',
        borderLeft: highlightColor ? `3px solid ${highlightColor}` : undefined 
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>{title}</span>
        <div className={`icon-box ${iconClass}`}>{icon}</div>
      </div>
      <div style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.035em', marginBottom: '0.25rem', color: '#fff' }}>
        {value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
        <span className="text-muted">{subtext}</span>
        {badge && (
          <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.12rem 0.45rem', textTransform: 'uppercase' }}>
            {badge}
          </span>
        )}
      </div>
    </div>
  )
}

const CustomGlassTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(9, 9, 13, 0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        borderRadius: '10px',
        padding: '0.75rem 1rem',
        boxShadow: '0 12px 30px -5px rgba(0, 0, 0, 0.8), 0 0 15px rgba(56, 189, 248, 0.15)',
        color: '#fff',
        minWidth: '150px',
      }}>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} />
          {label || payload[0]?.name || 'Metric'}
        </div>
        {payload.map((entry, idx) => (
          <div key={idx} style={{ fontSize: '0.9rem', fontWeight: 700, color: entry.color || '#38bdf8', marginTop: '0.2rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <span>{entry.name || 'Count'}:</span>
            <span>{entry.value?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [chartType, setChartType] = useState('area') // 'area' | 'bar' | 'radar'
  const [mediaView, setMediaView] = useState('donut') // 'donut' | 'bar'
  const [memberView, setMemberView] = useState('chart') // 'chart' | 'stacked' | 'cards'
  const [timeFilter, setTimeFilter] = useState('all') // '24h' | '7d' | 'all'

  const fetchAnalytics = () => {
    setLoading(true)
    getAnalytics()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '65vh', gap: '1.25rem' }}>
        <div style={{ width: '48px', height: '48px', border: '3px solid rgba(255,255,255,0.08)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Generating visual analytics...</span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', borderColor: '#ef4444' }}>
        <p style={{ color: '#ef4444', fontWeight: 600, marginBottom: '1rem' }}>Failed to load analytics: {error}</p>
        <button className="btn btn-secondary" onClick={fetchAnalytics}>Retry</button>
      </div>
    )
  }

  if (!data) return null

  const {
    topGroups,
    topMembers,
    typeBreakdown,
    totalMessages,
    activeGroups,
    blockedMembers,
    totalGroups,
    totalMembers,
  } = data

  const mediaTotal = (typeBreakdown.image || 0) + (typeBreakdown.video || 0) + (typeBreakdown.sticker || 0) + (typeBreakdown.pdf || 0)
  const textTotal = typeBreakdown.text || 0
  const textPct = totalMessages ? Math.round((textTotal / totalMessages) * 100) : 0
  const mediaPct = totalMessages ? Math.round((mediaTotal / totalMessages) * 100) : 0

  const typeData = [
    { name: 'Text Messages', value: typeBreakdown.text, color: '#38bdf8', icon: '💬', gradId: 'cyanG' },
    { name: 'Images', value: typeBreakdown.image, color: '#34d399', icon: '🖼️', gradId: 'emeraldG' },
    { name: 'Videos', value: typeBreakdown.video, color: '#fb7185', icon: '🎥', gradId: 'roseG' },
    { name: 'Stickers', value: typeBreakdown.sticker, color: '#fbbf24', icon: '🎭', gradId: 'amberG' },
    { name: 'Documents / PDFs', value: typeBreakdown.pdf, color: '#c084fc', icon: '📄', gradId: 'purpleG' },
  ].filter(d => d.value > 0)

  const radarData = [
    { subject: 'Text', A: typeBreakdown.text || 0 },
    { subject: 'Images', A: typeBreakdown.image || 0 },
    { subject: 'Videos', A: typeBreakdown.video || 0 },
    { subject: 'Stickers', A: typeBreakdown.sticker || 0 },
    { subject: 'PDFs', A: typeBreakdown.pdf || 0 },
  ]

  return (
    <div>
      {/* SVG Gradient definitions */}
      <svg style={{ height: 0, width: 0, position: 'absolute' }}>
        <defs>
          <linearGradient id="cyanG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#818cf8" stopOpacity={0.08} />
          </linearGradient>
          <linearGradient id="emeraldG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0.08} />
          </linearGradient>
          <linearGradient id="purpleG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c084fc" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.08} />
          </linearGradient>
          <linearGradient id="roseG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb7185" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#e11d48" stopOpacity={0.08} />
          </linearGradient>
          <linearGradient id="amberG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#d97706" stopOpacity={0.08} />
          </linearGradient>
        </defs>
      </svg>

      {/* Page Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #fff 0%, #a1a1aa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Visual Analytics Engine
          </h2>
          <p className="text-muted" style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>
            High-precision traffic spectrum, media categories, and member engagement insights.
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            {['all', '7d', '24h'].map(t => (
              <button
                key={t}
                onClick={() => setTimeFilter(t)}
                className={`btn ${timeFilter === t ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ height: '1.85rem', padding: '0 0.65rem', fontSize: '0.72rem', textTransform: 'uppercase', borderRadius: '4px' }}
              >
                {t === 'all' ? 'All Time' : t === '7d' ? '7 Days' : '24 Hours'}
              </button>
            ))}
          </div>

          <button
            className="btn btn-ghost"
            onClick={fetchAnalytics}
            title="Refresh Live Data"
            style={{ height: '2.1rem', padding: '0 0.65rem', border: '1px solid var(--border)', fontSize: '0.8rem' }}
          >
            🔄 Sync
          </button>
        </div>
      </div>

      {/* Top 4 Key Performance Metrics */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <MetricTile
          title="Total Volume"
          value={totalMessages.toLocaleString()}
          subtext="Messages processed"
          iconClass="icon-box-cyan"
          badge="Live"
          highlightColor="#38bdf8"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>}
        />
        <MetricTile
          title="Active Groups"
          value={`${activeGroups} / ${totalGroups}`}
          subtext={`${totalGroups ? Math.round((activeGroups / totalGroups) * 100) : 0}% Active Rate`}
          iconClass="icon-box-emerald"
          highlightColor="#34d399"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}
        />
        <MetricTile
          title="Tracked Members"
          value={totalMembers.toLocaleString()}
          subtext="Unique WhatsApp users"
          iconClass="icon-box-purple"
          highlightColor="#c084fc"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>}
        />
        <MetricTile
          title="Restricted Members"
          value={blockedMembers.toLocaleString()}
          subtext="Blocked users"
          iconClass="icon-box-amber"
          highlightColor="#fbbf24"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>}
        />
      </div>

      {/* Content Ratio Progress Banner */}
      <div className="glass-card" style={{ padding: '1.35rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Message Content Density</h4>
            <p className="text-muted" style={{ fontSize: '0.75rem' }}>Real-time Text vs Rich Media balance</p>
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.825rem' }}>
            <span style={{ color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8' }} />
              💬 Text: {textPct}% ({textTotal.toLocaleString()})
            </span>
            <span style={{ color: '#c084fc', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#c084fc' }} />
              🖼️ Media: {mediaPct}% ({mediaTotal.toLocaleString()})
            </span>
          </div>
        </div>
        <div style={{ height: '0.85rem', width: '100%', background: 'rgba(255,255,255,0.04)', borderRadius: '9999px', overflow: 'hidden', display: 'flex', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: `${textPct}%`, background: 'linear-gradient(90deg, #38bdf8, #818cf8)', transition: 'width 0.8s ease' }} />
          <div style={{ width: `${mediaPct}%`, background: 'linear-gradient(90deg, #c084fc, #f472b6)', transition: 'width 0.8s ease' }} />
        </div>
      </div>

      {/* Main Group Spectrum Chart */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 className="card-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>Group Traffic Spectrum</h3>
            <p className="card-description">Volume distribution across top active WhatsApp groups</p>
          </div>

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setChartType('area')}
              className={`btn ${chartType === 'area' ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ height: '2rem', padding: '0 0.75rem', fontSize: '0.75rem' }}
            >
              📈 Area Stream
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`btn ${chartType === 'bar' ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ height: '2rem', padding: '0 0.75rem', fontSize: '0.75rem' }}
            >
              📊 Bar Chart
            </button>
            <button
              onClick={() => setChartType('radar')}
              className={`btn ${chartType === 'radar' ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ height: '2rem', padding: '0 0.75rem', fontSize: '0.75rem' }}
            >
              🎯 Radar Spectrum
            </button>
          </div>
        </div>

        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={topGroups.slice(0, 8)} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomGlassTooltip />} />
                <Area type="monotone" dataKey="messages" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#cyanG)" />
              </AreaChart>
            ) : chartType === 'bar' ? (
              <BarChart data={topGroups.slice(0, 8)} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomGlassTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)', rx: 4, ry: 4 }} />
                <Bar dataKey="messages" radius={[8, 8, 0, 0]} barSize={28}>
                  {topGroups.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length].main} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <RadarChart cx="50%" cy="50%" outerRadius={110} data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 600 }} />
                <PolarRadiusAxis stroke="rgba(255,255,255,0.1)" />
                <Radar name="Messages" dataKey="A" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.4} />
                <Tooltip content={<CustomGlassTooltip />} />
              </RadarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 🎬 MEDIA CATEGORIES SUPER SECTION */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 className="card-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>🎨 Media Categories Analysis</h3>
            <p className="card-description">Visual breakdown of media and text formats processed</p>
          </div>

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setMediaView('donut')}
              className={`btn ${mediaView === 'donut' ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ height: '1.85rem', padding: '0 0.65rem', fontSize: '0.72rem' }}
            >
              🍩 Donut Ring
            </button>
            <button
              onClick={() => setMediaView('bar')}
              className={`btn ${mediaView === 'bar' ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ height: '1.85rem', padding: '0 0.65rem', fontSize: '0.72rem' }}
            >
              📊 Format Comparison
            </button>
          </div>
        </div>

        {/* 5 Format Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
          {typeData.map(({ name, value, color, icon }) => {
            const pct = totalMessages ? Math.round((value / totalMessages) * 100) : 0
            return (
              <div key={name} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius)', border: `1px solid ${color}35`, position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>{icon}</span>
                  <span className="badge" style={{ fontSize: '0.65rem', background: `${color}20`, color, borderColor: `${color}40` }}>{pct}%</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>{name}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginTop: '0.2rem' }}>{value.toLocaleString()}</div>
                <div style={{ marginTop: '0.5rem', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Dynamic Media Graph */}
        <div style={{ height: 280, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          {mediaView === 'donut' ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={105}
                    dataKey="value"
                    paddingAngle={5}
                    stroke="none"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomGlassTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>
                  {totalMessages.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                  Total Formats
                </div>
              </div>
            </>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomGlassTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)', rx: 4, ry: 4 }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={32}>
                  {typeData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 👥 MEMBERS ENGAGEMENT SUPER SECTION */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 className="card-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>👥 Members Activity Analytics</h3>
            <p className="card-description">Engagement, volume, and message breakdown per member</p>
          </div>

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setMemberView('chart')}
              className={`btn ${memberView === 'chart' ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ height: '1.85rem', padding: '0 0.65rem', fontSize: '0.72rem' }}
            >
              📊 Total Volume
            </button>
            <button
              onClick={() => setMemberView('stacked')}
              className={`btn ${memberView === 'stacked' ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ height: '1.85rem', padding: '0 0.65rem', fontSize: '0.72rem' }}
            >
              🧩 Text vs Media
            </button>
            <button
              onClick={() => setMemberView('cards')}
              className={`btn ${memberView === 'cards' ? 'btn-secondary' : 'btn-ghost'}`}
              style={{ height: '1.85rem', padding: '0 0.65rem', fontSize: '0.72rem' }}
            >
              🏆 Rank Cards
            </button>
          </div>
        </div>

        {memberView === 'chart' ? (
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMembers.slice(0, 10)} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomGlassTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)', rx: 4, ry: 4 }} />
                <Bar dataKey="messages" name="Total Messages" radius={[8, 8, 0, 0]} barSize={26}>
                  {topMembers.slice(0, 10).map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length].main} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : memberView === 'stacked' ? (
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMembers.slice(0, 10)} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomGlassTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)', rx: 4, ry: 4 }} />
                <Bar dataKey="text" name="Text Messages" stackId="a" fill="#38bdf8" radius={[0, 0, 4, 4]} barSize={26} />
                <Bar dataKey="image" name="Images" stackId="a" fill="#34d399" />
                <Bar dataKey="video" name="Videos" stackId="a" fill="#fb7185" />
                <Bar dataKey="sticker" name="Stickers" stackId="a" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {topMembers.slice(0, 10).map((m, i) => {
              const memMedia = (m.image || 0) + (m.video || 0) + (m.sticker || 0) + (m.pdf || 0)
              return (
                <div key={i} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className={`rank-badge ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other'}`}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>
                      ⚡ XP: {(m.xp || 0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.name}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: PALETTE[i % PALETTE.length].main }}>
                    {m.messages.toLocaleString()} <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', fontWeight: 400 }}>msgs</span>
                  </div>

                  {/* Micro Breakdown Pill */}
                  <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.68rem', marginTop: '0.6rem', color: 'var(--muted-foreground)' }}>
                    <span>💬 {m.text || 0}</span>
                    <span>🖼️ {memMedia}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
