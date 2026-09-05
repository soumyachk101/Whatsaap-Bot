import { useState, useCallback } from 'react'
import { login, getMe } from '../lib/api.js'
import { useAuth, useToast } from '../App.jsx'
import { useNavigate } from 'react-router-dom'
import * as Icons from '../components/Icons.jsx'

export default function Login() {
 const { setAuth } = useAuth()
 const toast = useToast()
 const navigate = useNavigate()
 const [password, setPassword] = useState('')
 const [loading, setLoading] = useState(false)

 const handleSubmit = useCallback(async (e) => {
 e.preventDefault()
 if (!password.trim()) {
 toast('Please enter admin password', false)
 return
 }
 setLoading(true)
 try {
 await login(password)
 setAuth(true)
 navigate('/')
 } catch (err) {
 toast(err.message || 'Incorrect password', false)
 } finally {
 setLoading(false)
 }
 }, [password, setAuth, navigate, toast])

 return (
 <div className="login-wrap">
 <div className="login-card">
 <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
 <div className="login-logo">
 <Icons.IconZap size={26} />
 </div>
 <h2 className="login-title">Admin Access</h2>
 <p className="login-subtitle">Enter your admin password to access the bot control center</p>
 </div>

 <div style={{
 marginBottom: '1.5rem',
 padding: '0.85rem 1rem',
 borderRadius: '8px',
 background: 'rgba(99, 102, 241, 0.12)',
 border: '1px solid rgba(99, 102, 241, 0.3)',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'space-between',
 gap: '0.75rem'
 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
 <Icons.IconQrCode size={22} color="#a5b4fc" />
 <div style={{ textAlign: 'left' }}>
 <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e0e7ff' }}>Need to link WhatsApp?</div>
 <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Scan QR or get Pairing code</div>
 </div>
 </div>
 <a
 href="/qr"
 style={{
 padding: '6px 12px',
 borderRadius: '6px',
 background: '#4f46e5',
 color: '#ffffff',
 fontSize: '0.78rem',
 fontWeight: 700,
 textDecoration: 'none',
 whiteSpace: 'nowrap'
 }}
 >
 Open QR →
 </a>
 </div>

 <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
 <div>
 <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
 Admin Password
 </label>
 <div style={{ position: 'relative' }}>
 <Icons.IconLock size={16} color="#64748b" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
 <input
 type="password"
 className="input"
 placeholder="Enter admin password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 autoFocus
 style={{
 fontSize: '0.9rem',
 padding: '0.75rem 1rem 0.75rem 2.5rem',
 background: 'rgba(20, 22, 34, 0.85)',
 border: '1px solid rgba(255, 255, 255, 0.08)',
 borderRadius: 'var(--radius-sm)'
 }}
 />
 </div>
 </div>

 <button type="submit" className="btn btn-primary" disabled={!password.trim() || loading} style={{
 width: '100%',
 padding: '0.85rem',
 fontSize: '0.95rem',
 fontWeight: 700,
 marginTop: '0.5rem',
 boxShadow: loading ? 'none' : '0 4px 20px rgba(99, 102, 241, 0.4)',
 letterSpacing: '0.01em'
 }}>
 {loading ? (
 <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
 <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: '#fff' }} />
 Authenticating...
 </span>
 ) : (
 <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
 <Icons.IconShield size={18} />
 Admin Login
 </span>
 )}
 </button>
 </form>

 <p style={{ fontSize: '0.65rem', color: 'var(--text-faint)', textAlign: 'center', marginTop: '1.5rem', opacity: 0.7 }}>
 Secured admin authentication — authorized access only
 </p>
 </div>
 </div>
 )
}
