import { useState, useMemo, useEffect } from 'react'
import GlassCard from '../components/GlassCard.jsx'
import { SearchIcon } from '../components/Icons.jsx'
import * as Icons from '../components/Icons.jsx'
import { getPlugins, togglePlugin as apiTogglePlugin } from '../lib/api.js'
import { useToast } from '../App.jsx'

const CATEGORIES = ['All', 'Media', 'Moderation', 'Utility', 'Fun']

export default function Plugins() {
 const toast = useToast()
 const [plugins, setPlugins] = useState([])
 const [search, setSearch] = useState('')
 const [category, setCategory] = useState('All')
 const [loading, setLoading] = useState(true)

 useEffect(() => {
 getPlugins()
 .then(res => {
 if (Array.isArray(res?.plugins)) {
 setPlugins(res.plugins)
 } else {
 setPlugins([])
 }
 })
 .catch(() => {
 setPlugins([])
 })
 .finally(() => setLoading(false))
 }, [])

 const filtered = useMemo(() => {
 let result = plugins
 if (category !== 'All') result = result.filter(p => p.category === category)
 if (search.trim()) {
 const q = search.toLowerCase()
 result = result.filter(p => p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q))
 }
 return result
 }, [plugins, search, category])

 const handleTogglePlugin = async (id) => {
 const current = plugins.find(p => p.id === id)
 if (!current) return
 const nextVal = !current.enabled

 setPlugins(prev => prev.map(p => p.id === id ? { ...p, enabled: nextVal } : p))

 try {
 await apiTogglePlugin(id, nextVal)
 } catch (err) {
 setPlugins(prev => prev.map(p => p.id === id ? { ...p, enabled: !nextVal } : p))
 toast(err.message || 'Failed to toggle plugin', false)
 }
 }

 const activeCount = plugins.filter(p => p.enabled).length

 return (
 <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
 <div>
 <h1 className="section-title text-gradient" style={{ fontSize: '1.35rem', fontWeight: 800 }}>Plugins</h1>
 <p className="section-subtitle">{loading ? 'Loading plugins...' : `${activeCount} of ${plugins.length} plugins active`}</p>
 </div>
 </div>

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

 <div className="grid grid-cols-3" style={{ gap: '1rem' }}>
 {filtered.map((plugin, i) => (
 <div key={plugin.id} className="plugin-card anim-scale-in" style={{ animationDelay: `${i * 40}ms` }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
 <div className="plugin-icon" style={{ background: plugin.bg || 'rgba(255,255,255,0.03)', border: `1px solid ${plugin.border || 'rgba(255,255,255,0.06)'}` }}>
 {plugin.icon && <plugin.icon size={22} color={plugin.color || '#818cf8'} />}
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

 {!loading && filtered.length === 0 && (
 <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
 {plugins.length === 0 ? 'No plugins available. Install plugins to see them here.' : 'No plugins match your search.'}
 </div>
 )}
 </div>
 </div>
 )
}
