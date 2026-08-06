import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth, useToast } from '../App.jsx'
import { getStats, logout, fmtUptime } from '../lib/api.js'
import { useWebSocket } from '../hooks/useWebSocket.js'

const Icons = {
  Dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"></rect><rect x="14" y="3" width="7" height="5" rx="1"></rect><rect x="14" y="12" width="7" height="9" rx="1"></rect><rect x="3" y="16" width="7" height="5" rx="1"></rect></svg>,
  Commands: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>,
  Groups: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Members: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  Analytics: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
  Broadcast: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>,
  Health: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>,
  Logout: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>,
}

const NAV_MAIN = [
  { to: '/',          icon: Icons.Dashboard,  label: 'Control Center', end: true },
  { to: '/commands',  icon: Icons.Commands,   label: 'Command Catalog' },
  { to: '/groups',    icon: Icons.Groups,     label: 'Group Settings' },
  { to: '/members',   icon: Icons.Members,    label: 'User Leaderboard' },
]

const NAV_SYSTEM = [
  { to: '/analytics', icon: Icons.Analytics,  label: 'Analytics' },
  { to: '/broadcast', icon: Icons.Broadcast,  label: 'Broadcast' },
  { to: '/health',    icon: Icons.Health,     label: 'Engine Health' },
]

export default function Layout({ children }) {
  const { setAuth } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const wsStatus = useWebSocket()
  const [stats, setStats] = useState(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

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
          <img 
            src="/downloadbuddy.jpg?v=2" 
            alt="DownloadBuddy Logo" 
            className="brand-avatar"
            onError={(e) => { e.target.src = '/favicon.png' }}
          />
          <div>
            <div className="brand-name">DownloadBuddy</div>
            <div className="brand-subtitle">WhatsApp Bot Engine</div>
          </div>
        </div>

        <div className="section-label">Core Management</div>
        <nav className="nav">
          {NAV_MAIN.map(({ to, icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
              {icon}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="section-label" style={{ marginTop: '0.75rem' }}>Engine & Tools</div>
        <nav className="nav">
          {NAV_SYSTEM.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
              {icon}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
          <div className="sidebar-status-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className={connected ? 'pulse-live' : ''} style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: connected ? '#10b981' : '#ef4444', flexShrink: 0 }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: connected ? '#34d399' : '#f87171' }}>
                  {connected ? 'Engine Online' : 'Engine Offline'}
                </span>
              </div>
              <span className="badge badge-zinc" style={{ fontSize: '0.625rem', padding: '0.1rem 0.4rem' }}>
                {stats ? fmtUptime(stats.uptime) : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.625rem', color: 'var(--text-dim)' }}>
              <span>Heap: {stats?.memoryUsage?.heapUsed ? Math.round(stats.memoryUsage.heapUsed / 1024 / 1024) + 'MB' : '—'}</span>
              <span>·</span>
              <span>Groups: {stats?.groupCount ?? '—'}</span>
            </div>
          </div>

          <button className="btn btn-ghost" onClick={handleLogout} style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--text-dim)', fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>
            {Icons.Logout}
            Sign Out
          </button>
        </div>

      </aside>

      <main className="main">
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="menu-toggle" onClick={() => setIsMenuOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Admin</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-dim)' }}><polyline points="9 18 15 12 9 6"></polyline></svg>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                {activeLabel}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className={`badge ${connected ? 'badge-emerald' : 'badge-rose'}`}>
              <span className={connected ? 'pulse-live' : ''} style={{ width: 5, height: 5, borderRadius: '50%', background: connected ? '#10b981' : '#ef4444' }} />
              {connected ? 'Connected' : 'Offline'}
            </span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontWeight: 500, fontFamily: 'monospace' }}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
