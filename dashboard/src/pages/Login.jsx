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
 <div className="login-wrap">
 <div className="login-card">
 <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
 <div className="login-logo">
 <Icons.IconZap size={26} />
 </div>
 <h2 className="login-title">Admin Access</h2>
 <p className="login-subtitle">Enter your credentials to access the bot control center</p>
 </div>

 <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
 <div>
 <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
 fontSize: '0.9rem',
 padding: '0.75rem 1rem',
 background: 'rgba(20, 22, 34, 0.85)',
 border: '1px solid rgba(255, 255, 255, 0.08)',
 borderRadius: 'var(--radius-sm)'
 }}
 />
 </div>

 <button type="submit" className="btn btn-primary" disabled={!password.trim() || loading} style={{
 width: '100%',
 padding: '0.75rem',
 fontSize: '0.9rem',
 marginTop: '0.5rem',
 boxShadow: loading ? 'none' : '0 4px 16px rgba(99, 102, 241, 0.3)'
 }}>
 {loading ? (
 <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
 <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: '#fff' }} />
 Authenticating...
 </span>
 ) : 'Sign In'}
 </button>
 </form>

 <p style={{ fontSize: '0.65rem', color: 'var(--text-faint)', textAlign: 'center', marginTop: '1.5rem', opacity: 0.7 }}>
 Secured admin authentication
 </p>
 </div>
 </div>
 )
}
