import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { login } from '../lib/api.js'
import { useAuth } from '../App.jsx'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { auth, setAuth }       = useAuth()
  const navigate                = useNavigate()
  const location                = useLocation()
  const from                    = location.state?.from?.pathname || '/'

  if (auth === true) { navigate(from, { replace: true }); return null }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(password)
      setAuth(true)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Incorrect password.')
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: 'var(--background)'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <div className="card-header" style={{ textAlign: 'center', paddingBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.025em' }}>Admin Login</h1>
          <p className="card-description">Restricted system access. Please authenticate.</p>
        </div>

        <div className="card-content">
          {error && (
            <div style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444', 
              padding: '0.75rem', 
              borderRadius: 'var(--radius)', 
              fontSize: '0.875rem', 
              marginBottom: '1.5rem',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Password</label>
              <input
                className="input"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                required
              />
            </div>
            
            <button 
              className="btn btn-primary" 
              type="submit" 
              disabled={loading}
              style={{ width: '100%', height: '2.75rem' }}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
