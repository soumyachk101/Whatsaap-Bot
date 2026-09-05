import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth, useToast } from '../App.jsx'
import { getStats, logout, fmtUptime } from '../lib/api.js'
import { useWebSocket } from '../hooks/useWebSocket.js'
import * as Icons from '../components/Icons.jsx'

const NAV_MAIN = [
 { to: '/', icon: Icons.IconDashboard, label: 'Control Center', end: true },
 { to: '/commands', icon: Icons.IconCommands, label: 'Command Catalog' },
 { to: '/groups', icon: Icons.IconGroups, label: 'Group Settings' },
 { to: '/members', icon: Icons.IconMembers, label: 'User Leaderboard' },
]

const NAV_SYSTEM = [
 { to: '/analytics', icon: Icons.IconAnalytics, label: 'Analytics' },
 { to: '/broadcast', icon: Icons.IconBroadcast, label: 'Broadcast' },
 { to: '/health', icon: Icons.IconHealth, label: 'Engine Health' },
 { to: '/logs', icon: Icons.LogsIcon, label: 'System Logs' },
 { to: '/plugins', icon: Icons.PluginsIcon, label: 'Plugins' },
 { to: '/qr', icon: Icons.IconQrCode, label: 'QR Pairing' },
]

const NAV_TOOLS = [
 { to: '/settings', icon: Icons.SettingsIcon, label: 'Settings' },
]

export default function Layout({ children }) {
 const { setAuth } = useAuth()
 const toast = useToast()
 const navigate = useNavigate()
 const location = useLocation()
 const wsStatus = useWebSocket()
 const [stats, setStats] = useState(null)
 const [isMenuOpen, setIsMenuOpen] = useState(false)

 useEffect(() => { setIsMenuOpen(false) }, [location.pathname])

 useEffect(() => {
 const fetchStats = () => getStats().then(setStats).catch(() => {})
 fetchStats()
 const t = setInterval(fetchStats, 30_000)
 return () => clearInterval(t)
 }, [])

 async function handleLogout() {
 try {
 await logout()
 setAuth(false)
 navigate('/login')
 } catch {
 toast('Logout failed', false)
 }
 }

 const connected = wsStatus === 'connected'
 const allNav = [...NAV_MAIN, ...NAV_SYSTEM]
 const activeLabel = allNav.find(n => n.to === location.pathname)?.label || 'Control Center'

 return (
 <div className="shell">
 <div className={`overlay ${isMenuOpen ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)} />

 <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>

 <div className="brand-logo">
 <div className="brand-icon">
 <Icons.IconZap size={22} />
 </div>
 <div>
 <div className="brand-name">WhatsApp Bot</div>
 <div className="brand-subtitle">Admin Engine v2.2</div>
 </div>
 </div>

 <div className="section-label">Core Management</div>
 <nav className="nav">
 {NAV_MAIN.map(({ to, icon: Icon, label, end }) => (
 <NavLink key={to} to={to} end={end} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
 <Icon size={17} />
 <span>{label}</span>
 </NavLink>
 ))}
 </nav>

 <div className="section-label" style={{ marginTop: '0.85rem' }}>Engine &amp; Tools</div>
 <nav className="nav">
 {NAV_SYSTEM.map(({ to, icon: Icon, label }) => (
 <NavLink key={to} to={to} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
 <Icon size={17} />
 <span>{label}</span>
 </NavLink>
 ))}
 </nav>

 <div className="section-label" style={{ marginTop: '0.85rem' }}>Configuration</div>
 <nav className="nav">
 {NAV_TOOLS.map(({ to, icon: Icon, label }) => (
 <NavLink key={to} to={to} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
 <Icon size={17} />
 <span>{label}</span>
 </NavLink>
 ))}
 </nav>

 <div className="sidebar-footer">
 <div className="status-card" style={{
 background: connected
 ? 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(6,182,212,0.02) 100%)'
 : 'rgba(244,63,94,0.03)',
 border: `1px solid ${connected ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.08)'}`,
 boxShadow: connected ? '0 0 20px -6px rgba(16,185,129,0.12)' : 'none',
 transition: 'all 0.4s ease'
 }}>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
 <div className={`status-dot ${connected ? 'online' : 'offline'}`} />
 <span style={{ fontSize: '0.72rem', fontWeight: 600, color: connected ? '#34d399' : '#f87171' }}>
 {connected ? 'Engine Online' : 'Engine Offline'}
 </span>
 </div>
 <span className="badge badge-zinc" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>
 {stats ? fmtUptime(stats.uptime) : '—'}
 </span>
 </div>
 <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.6rem', color: 'var(--text-faint)' }}>
 <span>Heap: {stats?.memoryUsage?.heapUsed ? Math.round(stats.memoryUsage.heapUsed / 1024 / 1024) + 'MB' : '—'}</span>
 <span style={{ opacity: 0.4 }}>|</span>
 <span>Groups: {stats?.groupCount ?? '—'}</span>
 </div>
 </div>

 <button className="btn btn-ghost" onClick={handleLogout} style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--text-dim)', fontSize: '0.72rem', padding: '0.45rem 0.75rem' }}>
 <Icons.IconLogout size={15} />
 Sign Out
 </button>
 </div>
 </aside>

 <main className="main">
 <header className="top-bar">
 <div style={{ display: 'flex', alignItems: 'center' }}>
 <button className="menu-toggle" onClick={() => setIsMenuOpen(true)}>
 <Icons.IconMenu size={20} />
 </button>
 <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
 <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Admin</span>
 <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-faint)' }}><polyline points="9 18 15 12 9 6"></polyline></svg>
 <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{activeLabel}</span>
 </div>
 </div>
 <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
 <span className={`badge ${connected ? 'badge-emerald' : 'badge-rose'}`}>
 <span className={connected ? 'status-dot online' : 'status-dot offline'} style={{ width: 5, height: 5, borderRadius: '50%' }} />
 {connected ? 'Connected' : 'Offline'}
 </span>
 <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>
 {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
 </span>
 </div>
 </header>

 <div className="content-container">
 {children}
 </div>
 </main>
 </div>
 )
}
