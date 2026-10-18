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
  { to: '/members', icon: Icons.IconTrophy, label: 'User Leaderboard' },
]

const NAV_SYSTEM = [
  { to: '/analytics', icon: Icons.IconAnalytics, label: 'Analytics' },
  { to: '/broadcast', icon: Icons.IconBroadcast, label: 'Broadcast' },
  { to: '/health', icon: Icons.IconHealth, label: 'Engine Health' },
  { to: '/logs', icon: Icons.IconLogs, label: 'System Logs' },
  { to: '/plugins', icon: Icons.IconPlugins, label: 'Plugins' },
  { to: '/qr', icon: Icons.IconQrCode, label: 'QR Pairing' },
]

const NAV_TOOLS = [
  { to: '/settings', icon: Icons.IconSettings, label: 'Settings' },
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
  const allNav = [...NAV_MAIN, ...NAV_SYSTEM, ...NAV_TOOLS]
  const activeLabel = allNav.find(n => n.to === location.pathname)?.label || 'Control Center'

  return (
    <div className="shell">
      <div className={`overlay ${isMenuOpen ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)} />

      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="brand-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <img
            src="/downloadbuddy.jpg"
            alt="Bot Logo"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/favicon.png'; }}
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid #5D7052',
              boxShadow: '0 4px 14px -2px rgba(93, 112, 82, 0.3)',
              flexShrink: 0,
            }}
          />
          <div>
            <div className="brand-name" style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.15rem' }}>
              WhatsApp Bot
            </div>
            <div className="brand-subtitle" style={{ color: '#C18C5D', fontWeight: 700, fontSize: '0.72rem' }}>
              Admin Engine v2.2
            </div>
          </div>
        </div>

        <div className="section-label">Core Management</div>
        <nav className="nav">
          {NAV_MAIN.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
              <span className="nav-icon-box">
                <Icon size={18} />
              </span>
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="section-label" style={{ marginTop: '0.85rem' }}>Engine &amp; Tools</div>
        <nav className="nav">
          {NAV_SYSTEM.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
              <span className="nav-icon-box">
                <Icon size={18} />
              </span>
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="section-label" style={{ marginTop: '0.85rem' }}>Configuration</div>
        <nav className="nav">
          {NAV_TOOLS.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
              <span className="nav-icon-box">
                <Icon size={18} />
              </span>
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="status-card" style={{
            background: '#FEFEFA',
            border: `1px solid ${connected ? 'rgba(93, 112, 82, 0.3)' : 'rgba(168, 84, 72, 0.3)'}`,
            boxShadow: '0 4px 14px -2px rgba(93, 112, 82, 0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className={`status-dot ${connected ? 'online' : 'offline'}`} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: connected ? '#5D7052' : '#A85448' }}>
                  {connected ? 'Engine Online' : 'Engine Offline'}
                </span>
              </div>
              <span className="badge badge-zinc" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
                {stats ? fmtUptime(stats.uptime) : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.68rem', color: '#78786C', fontWeight: 600 }}>
              <span>Heap: {stats?.memoryUsage?.heapUsed ? Math.round(stats.memoryUsage.heapUsed / 1024 / 1024) + 'MB' : '—'}</span>
              <span style={{ opacity: 0.5 }}>•</span>
              <span>Groups: {stats?.groupCount ?? '—'}</span>
            </div>
          </div>

          <button className="nav-item signout-btn" onClick={handleLogout} style={{ width: '100%', background: 'transparent', border: '1px solid transparent', cursor: 'pointer', textAlign: 'left', font: 'inherit', color: '#78786C', marginTop: '0.25rem' }}>
            <span className="nav-icon-box">
              <Icons.IconLogout size={18} />
            </span>
            <span className="nav-label">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="menu-toggle" onClick={() => setIsMenuOpen(true)}>
              <Icons.IconMenu size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
              <span style={{ color: '#78786C', fontWeight: 600 }}>Admin</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#B2B2A4' }}><polyline points="9 18 15 12 9 6"></polyline></svg>
              <span style={{ fontWeight: 700, color: '#2C2C24', fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.05rem' }}>{activeLabel}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className={`badge ${connected ? 'badge-emerald' : 'badge-rose'}`}>
              <span className={connected ? 'status-dot online' : 'status-dot offline'} style={{ width: 6, height: 6, borderRadius: '50%' }} />
              {connected ? 'Active Connection' : 'Disconnected'}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#78786C', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
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
