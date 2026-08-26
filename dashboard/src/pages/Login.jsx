import { useState, useEffect, useCallback } from 'react'
import { login, getMe } from '../lib/api.js'
import { useAuth, useToast } from '../App.jsx'
import { useNavigate } from 'react-router-dom'

export default function Login() {
 const { setAuth } = useAuth()
 const toast = useToast()
 const navigate = useNavigate()
 const [password, setPassword] = useState('')
 const [loading, setLoading] = useState(false)

 const handleSubmit = useCallback(async (e) => {
 e.preventDefault()
 setLoading(true)
 try {
 await login(password)
 setAuth(true)
 navigate('/')
 } catch (err) {
 toast(err.message || 'Login failed', false)
 } finally {
 setLoading(false)
 }
 }, [password, setAuth, navigate, toast])

 return (
 <div className="login-container">
 <div className="login-card fade-in-up">
 <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
 <div style={{
 width: '56px',
 height: '56px',
 margin: '0 auto 1rem',
 borderRadius: 'var(--radius-lg)',
 background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.1))',
 border: '1px solid rgba(16, 185, 129, 0.25)',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 fontSize: '1.5rem',
 boxShadow: '0 0 30px -6px rgba(16, 185, 129, 0.3)'
 }}>
 <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#10b981' }}>
 <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
 </svg>
 </div>
 <h2 style={{
 fontSize: '1.5rem',
 fontWeight: 800,
 letterSpacing: '-0.03em',
 color: '#fff',
 marginBottom: '0.5rem',
 fontFamily: "'Plus Jakarta Sans', sans-serif"
 }}>
 Admin Access
 </h2>
 <p style={{
 fontSize: '0.8125rem',
 color: 'var(--text-dim)',
 maxWidth: '300px',
 margin: '0 auto',
 lineHeight: 1.6
 }}>
 Enter your credentials to access the dashboard
 </p>
 </div>

 <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
 <div>
 <label style={{
 display: 'block',
 fontSize: '0.75rem',
 fontWeight: 600,
 color: 'var(--text-muted)',
 marginBottom: '0.5rem',
 textTransform: 'uppercase',
 letterSpacing: '0.06em'
 }}>
 Admin Password
 </label>
 <input
 type="password"
 className="input"
 placeholder="Enter admin password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 autoFocus
 style={{
 fontSize: '0.9375rem',
 padding: '0.75rem 1rem',
 background: 'rgba(22, 24, 34, 0.8)',
 border: '1px solid rgba(255, 255, 255, 0.08)',
 borderRadius: 'var(--radius-sm)'
 }}
 />
 </div>

 <button
 type="submit"
 className="btn btn-primary"
 disabled={!password.trim() || loading}
 style={{
 width: '100%',
 padding: '0.75rem',
 fontSize: '0.9375rem',
 marginTop: '0.5rem',
 boxShadow: loading ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)'
 }}
 >
 {loading ? (
 <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
 <span className="spinner" style={{
 width: '18px',
 height: '18px',
 borderWidth: '2px',
 borderTopColor: '#fff'
 }} />
 Authenticating...
 </span>
 ) : 'Sign In'}
 </button>
 </form>

 <p style={{
 fontSize: '0.6875rem',
 color: 'var(--text-dim)',
 textAlign: 'center',
 marginTop: '1.5rem',
 opacity: 0.7
 }}>
 Secured admin authentication required
 </p>
 </div>
 </div>
 )
}