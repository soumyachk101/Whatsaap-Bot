import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth, useToast } from '../App.jsx'
import { getStats, logout, fmtUptime } from '../lib/api.js'
import { useWebSocket } from '../hooks/useWebSocket.js'

// Simple SVG Icons for a clean, professional look
const Icons = {
  Dashboard: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"></rect><rect x="14" y="3" width="7" height="5" rx="1"></rect><rect x="14" y="12" width="7" height="9" rx="1"></rect><rect x="3" y="16" width="7" height="5" rx="1"></rect></svg>,
  Commands: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>,
  Groups: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Members: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  Analytics: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
  Broadcast: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>,
  Health: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>,
}

const NAV = [
  { to: '/',          icon: Icons.Dashboard,  label: 'Dashboard',  end: true },
  { to: '/commands',  icon: Icons.Commands,   label: 'Commands' },
  { to: '/groups',    icon: Icons.Groups,     label: 'Groups' },
  { to: '/members',   icon: Icons.Members,    label: 'Members' },
  { to: '/analytics', icon: Icons.Analytics,  label: 'Analytics' },
  { to: '/broadcast', icon: Icons.Broadcast,  label: 'Broadcast' },
  { to: '/health',    icon: Icons.Health,     label: 'Bot Health' },
]

export default function Layout({ children }) {
  const { setAuth } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const wsStatus = useWebSocket()
  const [stats, setStats] = useState(null)

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
  const activeLabel = NAV.find(n => n.to === location.pathname)?.label || 'Dashboard'

  return (
    <div className="shell">
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px', marginBottom: 32 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden' }}>
            <img src="/downloadbuddy.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '-0.025em' }}>DownloadBuddy</h1>
          </div>
        </div>

        <nav className="nav">
          {NAV.map(({ to, icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
              {icon}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: connected ? '#10b981' : '#ef4444' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>
              {connected ? 'Operational' : 'Disconnected'}
            </span>
          </div>
          <div style={{ padding: '0 0.75rem', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
            Uptime: {stats ? fmtUptime(stats.uptime) : '0s'}
          </div>
          <button className="btn btn-ghost" onClick={handleLogout} style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--muted-foreground)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Log out
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="top-bar">
          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>
            {activeLabel}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
             <div style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
               {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
             </div>
          </div>
        </header>

        <div className="content-container">
          {children}
        </div>
      </main>
    </div>
  )
}
