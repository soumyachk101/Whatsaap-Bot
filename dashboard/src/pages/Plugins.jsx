import { useState, useMemo, useEffect } from 'react'
import GlassCard from '../components/GlassCard.jsx'
import { SearchIcon } from '../components/SVG.jsx'
import * as Icons from '../components/Icons.jsx'
import { getPlugins, togglePlugin as apiTogglePlugin } from '../lib/api.js'

// ── Mock Plugins (temporary loading fallback, never persisted) ───────────
const MOCK_PLUGINS = [
 { id: 'sticker', name: 'Sticker Maker', desc: 'Convert images and GIFs to WhatsApp stickers automatically', category: 'Media', color: '#a78bfa', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', icon: Icons.IconPalette, enabled: true },
 { id: 'antilink', name: 'Anti-Link', desc: 'Automatically delete messages containing links in groups', category: 'Moderation', color: '#fb7185', bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.2)', icon: Icons.IconLink, enabled: true },
 { id: 'welcome', name: 'Welcome Bot', desc: 'Send customizable welcome messages to new group members', category: 'Utility', color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', icon: Icons.IconHand, enabled: true },
 { id: 'games', name: 'Mini Games', desc: 'Fun games like tic-tac-toe, trivia, and word guessing', category: 'Fun', color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', icon: Icons.IconGamepad, enabled: true },
 { id: 'music', name: 'Music Player', desc: 'Search and play music from YouTube and Spotify', category: 'Media', color: '#a78bfa', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', icon: Icons.IconMusic, enabled: true },
 { id: 'moderation', name: 'Auto Mod', desc: 'Auto-mute, warn, and kick users who violate rules', category: 'Moderation', color: '#fb7185', bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.2)', icon: Icons.IconShield, enabled: true },
 { id: 'currency', name: 'Currency Converter', desc: 'Real-time exchange rates for 150+ currencies', category: 'Utility', color: '#22d3ee', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)', icon: Icons.IconCurrency, enabled: true },
 { id: 'jokes', name: 'Joke Bot', desc: 'Random jokes, memes, and fun facts on demand', category: 'Fun', color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', icon: Icons.IconSmile, enabled: true },
 { id: 'ocr', name: 'OCR Reader', desc: 'Extract text from images using optical character recognition', category: 'Utility', color: '#22d3ee', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)', icon: Icons.IconFileText, enabled: true },
]

const CATEGORIES = ['All', 'Media', 'Moderation', 'Utility', 'Fun']

// ── Plugins Page ────────────────────────────────────────────────────────
export default function Plugins() {
 const [plugins, setPlugins] = useState(null)
 const [search, setSearch] = useState('')
 const [category, setCategory] = useState('All')

 useEffect(() => {
 // Show mock data as loading placeholder only
 setPlugins(MOCK_PLUGINS)

 getPlugins()
 .then(res => {
 if (Array.isArray(res?.plugins)) {
 setPlugins(res.plugins)
 } else {
 // API returned no plugins — clear the mock data and show empty state
 setPlugins([])
 }
 })
 .catch(() => {
 // API error — clear mock data and show empty state
 setPlugins([])
 })
 }, [])

 const filtered = useMemo(() => {
 if (!plugins) return MOCK_PLUGINS // still loading
 let result = plugins
 if (category !== 'All') result = result.filter(p => p.category === category)
 if (search.trim()) {
 const q = search.toLowerCase()
 result = result.filter(p => p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q))
 }
 return result
 }, [plugins, search, category])

 const handleTogglePlugin = async (id) => {
 const current = plugins?.find(p => p.id === id) || MOCK_PLUGINS.find(p => p.id === id)
 if (!current) return
 const nextVal = !current.enabled

 // Optimistic update — works for both loading (mock) and loaded states
 setPlugins(prev => {
 if (!prev) return prev
 return prev.map(p => p.id === id ? { ...p, enabled: nextVal } : p)
 })

 try {
 await apiTogglePlugin(id, nextVal)
 } catch (err) {
 // Revert on error — only revert real data, not mock loading placeholders
 if (plugins && plugins !== MOCK_PLUGINS) {
 setPlugins(prev => prev.map(p => p.id === id ? { ...p, enabled: !nextVal } : p))
 }
 }
 }

 const activeCount = plugins ? plugins.filter(p => p.enabled).length : 0

 return (
 <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
 {/* Header */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
 <div>
 <h1 className="section-title text-gradient" style={{ fontSize: '1.35rem', fontWeight: 800 }}>Plugins</h1>
 <p className="section-subtitle">{plugins ? `${activeCount} of ${plugins.length} plugins active` : 'Loading plugins...'}</p>
 </div>
 </div>

 {/* Filters */}
 <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
 <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
 {CATEGORIES.map(cat => (
 <button key={cat} onClick={() => setCategory(cat)} style={{
 padding: '0.3rem 0.75rem', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600,
 cursor: 'pointer', border: '1px solid',
 borderColor: category === cat ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)',
 background: category === cat ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
 color: category === cat ? '#a5b4fc' : '#94a3b8',
 transition: 'all 0.2s ease', fontFamily: 'inherit',
 }}>
 {cat}
 </button>
 ))}
 </div>
 <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
 <SearchIcon size={15} color="#64748b" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
 <input
 className="input"
 placeholder="Search plugins..."
 value={search}
 onChange={e => setSearch(e.target.value)}
 style={{ paddingLeft: '2rem', fontSize: '0.78rem' }}
 />
 </div>
 </div>

 {/* Plugin Grid */}
 <div className="grid grid-cols-3" style={{ gap: '1rem' }}>
 {filtered.map((plugin, i) => (
 <div key={plugin.id} className="plugin-card anim-scale-in" style={{ animationDelay: `${i * 40}ms` }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
 <div className="plugin-icon" style={{ background: plugin.bg, border: `1px solid ${plugin.border}` }}>
 <plugin.icon size={22} color={plugin.color} />
 </div>
 <span className={`plugin-badge ${plugin.enabled ? 'badge-emerald' : 'badge-zinc'}`}>
 {plugin.enabled ? 'Active' : 'Inactive'}
 </span>
 </div>
 <h4>{plugin.name}</h4>
 <p>{plugin.desc}</p>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
 <span style={{ fontSize: '0.65rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
 {plugin.category}
 </span>
 <label className="toggle" style={{ cursor: 'pointer' }}>
 <input type="checkbox" checked={plugin.enabled} onChange={() => handleTogglePlugin(plugin.id)} />
 <div className="toggle-track"><div className="toggle-thumb" /></div>
 </label>
 </div>
 </div>
 ))}

 {filtered.length === 0 && plugins !== null && (
 <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
 No plugins available. Install plugins to see them here.
 </div>
 )}
 </div>
 </div>
 )
}
