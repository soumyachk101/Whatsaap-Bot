import { useEffect, useState, useMemo } from 'react'
import {
 BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
 PieChart, Pie, AreaChart, Area, CartesianGrid, RadarChart, Radar,
 PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import { getAnalytics } from '../lib/api.js'
import * as Icons from '../components/Icons.jsx'

const PALETTE = [
 { main: '#4f8ef7', gradId: 'blueG' },
 { main: '#34c77b', gradId: 'greenG' },
 { main: '#f5a623', gradId: 'amberG' },
 { main: '#8b5cf6', gradId: 'purpleG' },
 { main: '#f0544f', gradId: 'redG' },
]

const ACCENT_COLORS = {
 violet: { bg: 'rgba(79,142,247,0.12)', border: 'rgba(79,142,247,0.25)', glow: 'rgba(79,142,247,0.15)' },
 emerald: { bg: 'rgba(77,109,71,0.12)', border: 'rgba(77,109,71,0.25)', glow: 'rgba(77,109,71,0.15)' },
 blue: { bg: 'rgba(82,110,112,0.12)', border: 'rgba(82,110,112,0.25)', glow: 'rgba(82,110,112,0.15)' },
 rose: { bg: 'rgba(240,84,79,0.12)', border: 'rgba(240,84,79,0.25)', glow: 'rgba(240,84,79,0.15)' },
 cyan: { bg: 'rgba(74,122,120,0.12)', border: 'rgba(74,122,120,0.25)', glow: 'rgba(74,122,120,0.15)' },
 amber: { bg: 'rgba(245,166,35,0.12)', border: 'rgba(245,166,35,0.25)', glow: 'rgba(245,166,35,0.15)' },
}

function MetricTile({ title, value, subtext, accent, icon, delay = 0 }) {
 const c = ACCENT_COLORS[accent] || ACCENT_COLORS.violet
 return (
 <div className="stat-card page-enter" style={{ animationDelay: `${delay}ms`, borderLeft: `3px solid ${c.border.replace('0.25', '0.5')}` }}>
 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${c.border}, transparent)` }} />
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
 <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b7080' }}>{title}</span>
 <div style={{
 width: 34, height: 34,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 borderRadius: 'var(--radius-sm)',
 background: c.bg, border: `1px solid ${c.border}`,
 boxShadow: `0 4px 10px ${c.glow}`
 }}>
 {icon}
 </div>
 </div>
 <div style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#1a1d2b', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.2 }}>
 {value}
 </div>
 <div style={{ fontSize: '0.72rem', color: '#6b7080', marginTop: '0.3rem', fontWeight: 600 }}>{subtext}</div>
 </div>
 )
}

const GlassTooltip = ({ active, payload, label }) => {
	if (active && payload?.length) {
		const title = label || payload[0]?.payload?.subject || payload[0]?.payload?.name || ''
		return (
			<div className="chart-tooltip">
				{title && (
					<div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
						<span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4f8ef7', display: 'inline-block' }} />
						{title}
					</div>
				)}
				{payload.map((entry, i) => (
					<div key={i} style={{ fontSize: '0.85rem', fontWeight: 700, color: entry.color || '#4f8ef7', marginTop: '0.15rem', display: 'flex', justifyContent: 'space-between', gap: '1.2rem' }}>
						<span>{entry.name || 'Messages'}:</span>
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
 const [chartType, setChartType] = useState('area')
 const [mediaView, setMediaView] = useState('donut')
 const [memberView, setMemberView] = useState('chart')

 const fetch = () => {
 setLoading(true)
 getAnalytics()
 .then(setData)
 .catch(err => setError(err.message))
 .finally(() => setLoading(false))
 }

 useEffect(() => { fetch() }, [])

 const {
  topGroups = [],
  topMembers = [],
  typeBreakdown = {},
  totalMessages = 0,
  activeGroups = 0,
  blockedMembers = 0,
  totalGroups = 0,
  totalMembers = 0
 } = data || {}

 const radarData = useMemo(() => {
  if (topGroups && topGroups.length >= 3) {
   return topGroups.slice(0, 6).map((g) => ({
    subject: (g.name || 'Group').length > 14 ? (g.name || 'Group').slice(0, 12) + '…' : (g.name || 'Group'),
    messages: g.messages || 0,
   }))
  }
  return [
   { subject: 'Text', messages: typeBreakdown?.text || 0 },
   { subject: 'Images', messages: typeBreakdown?.image || 0 },
   { subject: 'Videos', messages: typeBreakdown?.video || 0 },
   { subject: 'Stickers', messages: typeBreakdown?.sticker || 0 },
   { subject: 'PDFs', messages: typeBreakdown?.pdf || 0 },
  ]
 }, [topGroups, typeBreakdown])

 if (loading) {
 return (
 <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '1.25rem' }}>
 <div style={{ width: '44px', height: '44px', border: '2.5px solid #e2e5f0', borderTopColor: '#4f8ef7', borderRadius: '50%', animation: 'spin 0.7s linear infinite', boxShadow: '0 0 20px rgba(99,102,241,0.15)' }} />
 <span style={{ fontSize: '0.82rem', color: '#9ca1b5', fontWeight: 500 }}>Generating visual analytics...</span>
 </div>
 )
 }

 if (error) {
 return (
 <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: 'rgba(240,84,79,0.3)', background: 'rgba(240,84,79,0.04)' }}>
 <p style={{ color: '#f0544f', fontWeight: 600, marginBottom: '1rem' }}>Failed: {error}</p>
 <button className="btn btn-secondary" onClick={fetch}>Retry</button>
 </div>
 )
 }

 if (!data) return null

 const mediaTotal = (typeBreakdown.image || 0) + (typeBreakdown.video || 0) + (typeBreakdown.sticker || 0) + (typeBreakdown.pdf || 0)
 const textTotal = typeBreakdown.text || 0
 const textPct = totalMessages ? Math.round((textTotal / totalMessages) * 100) : 0
 const mediaPct = totalMessages ? Math.round((mediaTotal / totalMessages) * 100) : 0

 const typeData = [
 { name: 'Text Messages', value: typeBreakdown.text || 0, color: '#4f8ef7', gradId: 'blueG', icon: <Icons.IconMessage size={18} /> },
 { name: 'Images', value: typeBreakdown.image || 0, color: '#8b5cf6', gradId: 'purpleG', icon: <Icons.IconImage size={18} /> },
 { name: 'Videos', value: typeBreakdown.video || 0, color: '#34c77b', gradId: 'greenG', icon: <Icons.IconVideo size={18} /> },
 { name: 'Stickers', value: typeBreakdown.sticker || 0, color: '#34c77b', gradId: 'greenG', icon: <Icons.IconZap size={18} /> },
 { name: 'Documents', value: typeBreakdown.pdf || 0, color: '#f0544f', gradId: 'redG', icon: <Icons.IconFileText size={18} /> },
 ].filter(d => d.value > 0)

 const SvgDefs = () => (
 <svg style={{ height: 0, width: 0, position: 'absolute' }}>
 <defs>
 <linearGradient id="blueG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f8ef7" stopOpacity={0.85} /><stop offset="100%" stopColor="#4f8ef7" stopOpacity={0.1} /></linearGradient>
 <linearGradient id="greenG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34c77b" stopOpacity={0.85} /><stop offset="100%" stopColor="#34c77b" stopOpacity={0.1} /></linearGradient>
 <linearGradient id="amberG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f5a623" stopOpacity={0.85} /><stop offset="100%" stopColor="#f5a623" stopOpacity={0.1} /></linearGradient>
 <linearGradient id="purpleG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.85} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.1} /></linearGradient>
 <linearGradient id="redG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f0544f" stopOpacity={0.85} /><stop offset="100%" stopColor="#f0544f" stopOpacity={0.1} /></linearGradient>
 <filter id="glow1"><feGaussianBlur stdDeviation="3" result="b" /><feComposite in="SourceGraphic" in2="b" operator="over" /></filter>
 </defs>
 </svg>
 )

 const SectionCard = ({ children, gradient }) => (
 <div className="card page-enter" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
 {gradient && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: gradient }} />}
 {children}
 </div>
 )

 const SegmentedControl = ({ value, onChange, options, setChartType, setMediaView, setMemberView }) => {
  const handle = onChange || setChartType || setMediaView || setMemberView || (() => {})
  return (
   <div style={{ display: 'flex', background: '#f1f3f9', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e5f0', gap: '2px' }}>
    {options.map(opt => {
     const active = value === opt.key
     return (
      <button
       key={opt.key}
       type="button"
       onClick={() => handle(opt.key)}
       className={`btn ${active ? 'btn-secondary' : 'btn-ghost'}`}
       style={{
        height: '1.85rem',
        padding: '0 0.75rem',
        fontSize: '0.72rem',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: active ? 700 : 500,
        background: active ? '#eef4ff' : 'transparent',
        borderColor: active ? 'rgba(79,142,247,0.4)' : 'transparent',
        color: active ? '#4f8ef7' : 'var(--text-dim)',
        boxShadow: 'none',
        transition: 'all 0.2s ease',
       }}
      >
       {opt.label}
      </button>
     )
    })}
   </div>
  )
 }

 return (
 <div className="page-enter">
 <SvgDefs />
	<div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
		<div>
			<h2 className="section-title text-gradient" style={{ fontSize: '1.65rem' }}>Visual Analytics</h2>
			<p className="section-subtitle" style={{ fontSize: '0.8rem' }}>Traffic spectrum, media breakdown, and member engagement insights</p>
		</div>
		<div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
			<button className="btn btn-secondary" onClick={fetch} style={{ height: '2.1rem', padding: '0 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}>
				<Icons.IconRefresh size={14} /> Sync Live Data
			</button>
		</div>
	</div>

	{/* ── Metric Tiles ──────────────────────────────────────────── */}
	<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
		<MetricTile title="Total Volume" value={totalMessages.toLocaleString()} subtext="Messages processed" accent="violet" icon={<Icons.IconMessage size={17} />} delay={0} />
		<MetricTile title="Active Groups" value={`${activeGroups} / ${totalGroups}`} subtext={`${totalGroups ? Math.round(activeGroups / totalGroups * 100) : 0}% active`} accent="emerald" icon={<Icons.IconGlobe size={17} />} delay={60} />
		<MetricTile title="Members" value={totalMembers.toLocaleString()} subtext="Unique users" accent="blue" icon={<Icons.IconUsers size={17} />} delay={120} />
		<MetricTile title="Restricted" value={blockedMembers.toLocaleString()} subtext="Blocked users" accent="rose" icon={<Icons.IconAlert size={17} />} delay={180} />
	</div>

	{/* ── Content Density Bar ──────────────────────────────────── */}
	<SectionCard gradient="linear-gradient(90deg, transparent, rgba(79,142,247,0.2), rgba(139,92,246,0.1), transparent)">
		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
			<div>
				<h4 style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Message Content Density</h4>
				<p style={{ fontSize: '0.7rem', color: '#9ca1b5', marginTop: '0.1rem' }}>Text vs Media balance</p>
			</div>
			<div style={{ display: 'flex', gap: '1.1rem', fontSize: '0.78rem' }}>
				<span style={{ color: '#4f8ef7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
					<span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />
					Text: {textPct}%
				</span>
				<span style={{ color: '#f5a623', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
					<span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--secondary)' }} />
					Media: {mediaPct}%
				</span>
			</div>
		</div>
		<div style={{ height: '0.75rem', width: '100%', background: '#f1f3f9', borderRadius: 9999, overflow: 'hidden', display: 'flex', border: '1px solid var(--border-subtle)', boxShadow: 'inset 0 1px 3px rgba(44,44,36,0.08)' }}>
			<div style={{ width: `${textPct}%`, background: 'var(--primary)', transition: 'width 0.8s ease' }} />
			<div style={{ width: `${mediaPct}%`, background: 'var(--secondary)', transition: 'width 0.8s ease' }} />
		</div>
	</SectionCard>

	{/* ── Group Traffic ─────────────────────────────────────────── */}
	<SectionCard gradient="linear-gradient(90deg, transparent, rgba(79,142,247,0.2), rgba(79,142,247,0.1), transparent)" style={{ marginTop: '1.5rem' }}>
		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
			<div>
				<h3 style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Group Traffic Spectrum</h3>
				<p className="section-subtitle">Volume distribution across top groups</p>
			</div>
			<SegmentedControl value={chartType} onChange={setChartType} options={[
				{ key: 'area', label: 'Area' }, { key: 'bar', label: 'Bar' }, { key: 'radar', label: 'Radar' }
			]} />
		</div>
 <div style={{ height: 300 }}>
 <ResponsiveContainer width="100%" height="100%">
 {chartType === 'area' ? (
 <AreaChart data={topGroups.slice(0, 8)} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
 <CartesianGrid strokeDasharray="4 4" stroke="#f1f3f9" vertical={false} />
 <XAxis dataKey="name" tick={{ fill: '#6b7080', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} dy={8} />
 <YAxis tick={{ fill: '#6b7080', fontSize: 11 }} axisLine={false} tickLine={false} dx={-8} />
 <Tooltip content={<GlassTooltip />} cursor={{ stroke: '#e2e5f0', strokeWidth: 1, strokeDasharray: '3 3' }} />
 <Area type="monotone" dataKey="messages" stroke="#4f8ef7" strokeWidth={2.5} fillOpacity={1} fill="url(#blueG)" filter="url(#glow1)" />
 </AreaChart>
 ) : chartType === 'bar' ? (
 <BarChart data={topGroups.slice(0, 8)} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
 <CartesianGrid strokeDasharray="4 4" stroke="#f1f3f9" vertical={false} />
 <XAxis dataKey="name" tick={{ fill: '#6b7080', fontSize: 11 }} axisLine={false} tickLine={false} dy={8} />
 <YAxis tick={{ fill: '#6b7080', fontSize: 11 }} axisLine={false} tickLine={false} dx={-8} />
 <Tooltip content={<GlassTooltip />} cursor={{ fill: '#f8f9fc', rx: 6 }} />
 <Bar dataKey="messages" radius={[6, 6, 0, 0]} barSize={22} activeBar={{ stroke: '#c8cde0', strokeWidth: 1 }}>
 {topGroups.slice(0, 8).map((_, i) => <Cell key={i} fill={`url(#${PALETTE[i % PALETTE.length].gradId})`} />)}
 </Bar>
 </BarChart>
 ) : (
 <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
  <PolarGrid stroke="#e2e5f0" />
  <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7080', fontSize: 11, fontWeight: 600 }} />
  <PolarRadiusAxis stroke="#e2e5f0" tick={{ fill: '#6b7080', fontSize: 10 }} />
  <Radar name="Messages" dataKey="messages" stroke="#4f8ef7" fill="#4f8ef7" fillOpacity={0.35} />
  <Tooltip content={<GlassTooltip />} />
 </RadarChart>
 )}
 </ResponsiveContainer>
 </div>
 </SectionCard>

 {/* ── Media Categories ─────────────────────────────────────── */}
 <SectionCard gradient="linear-gradient(90deg, transparent, rgba(139,92,246,0.25), rgba(240,84,79,0.15), transparent)" style={{ marginTop: '1.5rem' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
 <div>
 <h3 style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Media Categories</h3>
 <p className="section-subtitle">Visual breakdown of content formats</p>
 </div>
 <SegmentedControl value={mediaView} onChange={setMediaView} options={[
 { key: 'donut', label: 'Donut' }, { key: 'bar', label: 'Bar' }
 ]} />
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
 {typeData.map(({ name, value, color, icon }) => {
 const pct = totalMessages ? Math.round(value / totalMessages * 100) : 0
 return (
 <div key={name} style={{
 padding: '1rem',
 background: '#f8f9fc',
 borderRadius: 'var(--radius-md)',
 border: `1px solid ${color}25`,
 transition: 'all 0.25s ease',
 cursor: 'default',
 position: 'relative',
 overflow: 'hidden'
 }}
 onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = `${color}50`; e.currentTarget.style.boxShadow = `0 8px 20px ${color}15` }}
 onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = `${color}25`; e.currentTarget.style.boxShadow = '' }}
 >
 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${color}50, transparent)` }} />
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
 <span style={{ color }}>{icon}</span>
 <span className="badge" style={{ fontSize: '0.6rem', background: `${color}18`, color, borderColor: `${color}35` }}>{pct}%</span>
 </div>
 <div style={{ fontSize: '0.72rem', color: '#6b7080', fontWeight: 600 }}>{name}</div>
 <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1a1d2b', marginTop: '0.15rem', letterSpacing: '-0.02em', fontFamily: "'JetBrains Mono', monospace" }}>{value.toLocaleString()}</div>
 <div style={{ marginTop: '0.5rem', height: '4px', background: '#f1f3f9', borderRadius: 9999, overflow: 'hidden' }}>
 <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)`, transition: 'width 0.8s ease' }} />
 </div>
 </div>
 )
 })}
 </div>

 <div style={{ height: 260, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
 {mediaView === 'donut' ? (
 <>
 <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none', zIndex: 0 }}>
 <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#1a1d2b', letterSpacing: '-0.02em', fontFamily: "'Space Grotesk', sans-serif" }}>{totalMessages.toLocaleString()}</div>
 <div style={{ fontSize: '0.68rem', color: '#6b7080', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Total Messages</div>
 </div>
 <div style={{ width: '100%', height: '100%', zIndex: 10, position: 'relative' }}>
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie data={typeData} cx="50%" cy="50%" innerRadius={75} outerRadius={105} dataKey="value" paddingAngle={5} stroke="none" cornerRadius={6}>
 {typeData.map((entry, i) => <Cell key={i} fill={`url(#${entry.gradId})`} />)}
 </Pie>
 <Tooltip content={<GlassTooltip />} />
 </PieChart>
 </ResponsiveContainer>
 </div>
 </>
 ) : (
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={typeData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
 <CartesianGrid strokeDasharray="4 4" stroke="#f1f3f9" vertical={false} />
 <XAxis dataKey="name" tick={{ fill: '#6b7080', fontSize: 11 }} axisLine={false} tickLine={false} dy={8} />
 <YAxis tick={{ fill: '#6b7080', fontSize: 11 }} axisLine={false} tickLine={false} dx={-8} />
 <Tooltip content={<GlassTooltip />} cursor={{ fill: '#f8f9fc', rx: 6 }} />
 <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={24} activeBar={{ stroke: '#c8cde0', strokeWidth: 1 }}>
 {typeData.map((entry, i) => <Cell key={i} fill={`url(#${entry.gradId})`} />)}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 )}
 </div>
 </SectionCard>

 {/* ── Member Analytics ─────────────────────────────────────── */}
 <SectionCard gradient="linear-gradient(90deg, transparent, rgba(139,92,246,0.15), rgba(79,142,247,0.1), transparent)" style={{ marginTop: '1.5rem' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
 <div>
 <h3 style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Member Engagement</h3>
 <p className="section-subtitle">Activity breakdown per member</p>
 </div>
 <SegmentedControl value={memberView} onChange={setMemberView} options={[
 { key: 'chart', label: 'Volume' }, { key: 'stacked', label: 'Stacked' }, { key: 'cards', label: 'Rank Cards' }
 ]} />
 </div>

 {memberView === 'chart' && (
 <div style={{ height: 300 }}>
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={topMembers.slice(0, 10)} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
 <CartesianGrid strokeDasharray="4 4" stroke="#f1f3f9" vertical={false} />
 <XAxis dataKey="name" tick={{ fill: '#6b7080', fontSize: 11 }} axisLine={false} tickLine={false} dy={8} />
 <YAxis tick={{ fill: '#6b7080', fontSize: 11 }} axisLine={false} tickLine={false} dx={-8} />
 <Tooltip content={<GlassTooltip />} cursor={{ fill: '#f8f9fc', rx: 6 }} />
 <Bar dataKey="messages" name="Total" radius={[6, 6, 0, 0]} barSize={22}>
 {topMembers.slice(0, 10).map((_, i) => <Cell key={i} fill={`url(#${PALETTE[i % PALETTE.length].gradId})`} />)}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 )}

 {memberView === 'stacked' && (
 <div style={{ height: 300 }}>
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={topMembers.slice(0, 10)} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
 <CartesianGrid strokeDasharray="4 4" stroke="#f1f3f9" vertical={false} />
 <XAxis dataKey="name" tick={{ fill: '#6b7080', fontSize: 11 }} axisLine={false} tickLine={false} dy={8} />
 <YAxis tick={{ fill: '#6b7080', fontSize: 11 }} axisLine={false} tickLine={false} dx={-8} />
 <Tooltip content={<GlassTooltip />} cursor={{ fill: '#f8f9fc', rx: 6 }} />
 <Bar dataKey="text" name="Text" stackId="a" fill="url(#blueG)" radius={[0, 0, 4, 4]} barSize={22} />
 <Bar dataKey="image" name="Images" stackId="a" fill="url(#purpleG)" barSize={22} />
 <Bar dataKey="video" name="Videos" stackId="a" fill="url(#greenG)" barSize={22} />
 <Bar dataKey="sticker" name="Stickers" stackId="a" fill="url(#amberG)" radius={[4, 4, 0, 0]} barSize={22} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 )}

 {memberView === 'cards' && (
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
 {topMembers.slice(0, 10).map((m, i) => {
 const isTop = i < 3
 return (
 <div key={i} style={{
 padding: '1rem',
 background: isTop ? '#f8f9fc' : '#ffffff',
 borderRadius: 'var(--radius-md)',
 border: `1px solid ${isTop ? '#e2e5f0' : 'var(--border)'}`,
 transition: 'all 0.25s ease',
 cursor: 'default',
 position: 'relative',
 overflow: 'hidden'
 }}
 onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#e2e5f0' }}
 onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = isTop ? '#e2e5f0' : 'var(--border)' }}
 >
 {isTop && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${['#4f8ef7','#34c77b','#f5a623','#8b5cf6','#f0544f'][i % 5]}40, transparent)` }} />}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
 <span style={{
 width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
 borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: 800,
 background: i === 0 ? '#fef8e8' : i < 3 ? '#f8f9fc' : '#f1f3f9',
 border: `1px solid ${i === 0 ? 'rgba(245,166,35,0.25)' : i < 3 ? '#e2e5f0' : 'var(--border)'}`,
 color: i === 0 ? '#f5a623' : i === 1 ? '#9ca1b5' : i === 2 ? '#cd7f32' : 'var(--text-dim)',
 fontFamily: "'Plus Jakarta Sans', sans-serif"
 }}>
 {i + 1}
 </span>
 <span style={{ fontSize: '0.65rem', color: '#c5c8d4', fontWeight: 600 }}>
 <Icons.IconZap size={12} style={{ marginRight: 2, verticalAlign: 'middle' }} />
 {(m.xp || 0).toLocaleString()} XP
 </span>
 </div>
 <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
 <div style={{ fontSize: '1.15rem', fontWeight: 800, color: ['#4f8ef7','#34c77b','#f5a623','#8b5cf6','#f0544f'][i % 5], letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans'" }}>
 {m.messages.toLocaleString()} <span style={{ fontSize: '0.65rem', color: '#c5c8d4', fontWeight: 400 }}>msgs</span>
 </div>
 <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.65rem', marginTop: '0.5rem', color: '#c5c8d4', flexWrap: 'wrap' }}>
 <span>Text: {m.text || 0}</span>
 <span style={{ opacity: 0.3 }}>·</span>
 <span>Media: {(m.image || 0) + (m.video || 0) + (m.sticker || 0)}</span>
 </div>
 </div>
 )
 })}
 </div>
 )}
 </SectionCard>
 </div>
 )
}
