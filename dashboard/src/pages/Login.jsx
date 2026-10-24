import { useState, useCallback } from 'react'
import { login } from '../lib/api.js'
import { useAuth, useToast } from '../App.jsx'
import { useNavigate } from 'react-router-dom'
import * as Icons from '../components/Icons.jsx'

export default function Login() {
	const { setAuth } = useAuth()
	const toast = useToast()
	const navigate = useNavigate()
	const [password, setPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [capsLock, setCapsLock] = useState(false)
	const [shake, setShake] = useState(false)

	const handleKeyDown = (e) => {
		if (e.getModifierState) {
			setCapsLock(e.getModifierState('CapsLock'))
		}
	}

	const handleSubmit = useCallback(async (e) => {
		e.preventDefault()
		if (!password.trim()) {
			setError('Please enter your admin password')
			setShake(true)
			setTimeout(() => setShake(false), 600)
			return
		}
		setLoading(true)
		setError('')
		try {
			await login(password)
			setAuth(true)
			toast('Welcome to WhatsApp Bot Admin', true)
			navigate('/')
		} catch (err) {
			setError(err.message || 'Incorrect admin password')
			setShake(true)
			setTimeout(() => setShake(false), 600)
			toast(err.message || 'Incorrect password', false)
		} finally {
			setLoading(false)
		}
	}, [password, setAuth, navigate, toast])

	return (
		<div style={{
			minHeight: '100vh',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			padding: '1.5rem',
			backgroundColor: '#f8f9fc',
			position: 'relative',
			overflow: 'hidden',
			fontFamily: "'Inter', sans-serif"
		}}>
			{/* Subtle radial gradient */}
			<div style={{
				position: 'absolute',
				inset: 0,
				background: 'radial-gradient(ellipse 50% 40% at 50% 0%, #eef4ff, transparent)',
				pointerEvents: 'none',
				zIndex: 0,
			}} />

			<div
				className={`login-card ${shake ? 'anim-shake' : 'page-enter'}`}
				style={{
					position: 'relative',
					zIndex: 1,
					width: '100%',
					maxWidth: '440px',
					background: '#ffffff',
					border: '1px solid #e2e5f0',
					borderRadius: '2.5rem',
					padding: '2.5rem 2.25rem',
					boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.08), 0 4px 20px -2px rgba(0, 0, 0, 0.04)',
					transition: 'transform 0.25s ease, box-shadow 0.25s ease',
				}}
			>
				{/* Brand Logo & Header */}
				<div style={{ textAlign: 'center', marginBottom: '2rem' }}>
					<div style={{
						position: 'relative',
						width: '82px',
						height: '82px',
						margin: '0 auto 1.25rem',
						borderRadius: '50%',
						padding: '3px',
						background: '#4f8ef7',
						boxShadow: '0 4px 20px -2px rgba(79, 142, 247, 0.35)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}>
						<img
							src="/downloadbuddy.jpg"
							alt="Bot Logo"
							onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/favicon.png'; }}
							style={{
								width: '100%',
								height: '100%',
								borderRadius: '50%',
								objectFit: 'cover',
								display: 'block',
							}}
						/>
						{/* Online indicator dot */}
						<div
							title="Engine Online"
							style={{
								position: 'absolute',
								bottom: 2,
								right: 2,
								width: 18,
								height: 18,
								borderRadius: '50%',
								background: '#4f8ef7',
								border: '3px solid #ffffff',
								boxShadow: '0 0 8px rgba(79, 142, 247, 0.6)',
							}}
						/>
					</div>

					<h1 style={{
						fontSize: '1.85rem',
						fontWeight: 700,
						color: '#1a1d2b',
						fontFamily: "'Space Grotesk', sans-serif",
						letterSpacing: '-0.02em',
						margin: '0 0 0.35rem',
					}}>
						WhatsApp Bot
					</h1>
					<p style={{
						fontSize: '0.85rem',
						color: '#6b7080',
						margin: 0,
						fontWeight: 600,
					}}>
						Control Center &amp; Engine Administration
					</p>
				</div>

				{/* Quick QR Connect Banner */}
				<div style={{
					marginBottom: '1.75rem',
					padding: '0.9rem 1.15rem',
					borderRadius: '1.5rem',
					background: 'rgba(79, 142, 247, 0.08)',
					border: '1px solid rgba(79, 142, 247, 0.2)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: '0.75rem',
				}}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
						<div style={{
							width: 38,
							height: 38,
							borderRadius: '50%',
							background: 'rgba(79, 142, 247, 0.15)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							flexShrink: 0,
						}}>
							<Icons.IconQrCode size={19} color="#4f8ef7" />
						</div>
						<div style={{ textAlign: 'left' }}>
							<div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1a1d2b' }}>
								Link WhatsApp Device
							</div>
							<div style={{ fontSize: '0.72rem', color: '#6b7080', marginTop: '1px' }}>
								Scan QR or enter pairing code
							</div>
						</div>
					</div>
					<a
						href="/"
						className="btn"
						style={{
							padding: '0.45rem 0.95rem',
							borderRadius: '9999px',
							background: '#4f8ef7',
							color: '#ffffff',
							fontSize: '0.75rem',
							fontWeight: 700,
							textDecoration: 'none',
							whiteSpace: 'nowrap',
							boxShadow: '0 4px 12px rgba(79, 142, 247, 0.25)',
						}}
					>
						Open QR →
					</a>
				</div>

				{/* Error message alert */}
				{error && (
					<div style={{
						marginBottom: '1.25rem',
						padding: '0.75rem 1rem',
						borderRadius: '1rem',
						background: 'rgba(240, 84, 79, 0.1)',
						border: '1px solid rgba(240, 84, 79, 0.25)',
						color: '#f0544f',
						fontSize: '0.8rem',
						fontWeight: 700,
						display: 'flex',
						alignItems: 'center',
						gap: '0.5rem',
					}}>
						<Icons.IconAlert size={16} color="#f0544f" />
						<span>{error}</span>
					</div>
				)}

				{/* Form */}
				<form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
					<div>
						<label style={{
							display: 'block',
							fontSize: '0.78rem',
							fontWeight: 700,
							color: '#6b7080',
							textTransform: 'uppercase',
							letterSpacing: '0.06em',
							marginBottom: '0.45rem',
						}}>
							Admin Password
						</label>
						<div style={{ position: 'relative' }}>
							<input
								type={showPassword ? 'text' : 'password'}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Enter admin password"
								className="input"
								style={{
									width: '100%',
									padding: '0.85rem 3rem 0.85rem 1.25rem',
									borderRadius: '9999px',
									background: '#ffffff',
									border: '1px solid #e2e5f0',
									fontSize: '0.9rem',
									outline: 'none',
									boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.04)',
								}}
								autoFocus
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								style={{
									position: 'absolute',
									right: '1rem',
									top: '50%',
									transform: 'translateY(-50%)',
									background: 'none',
									border: 'none',
									cursor: 'pointer',
									color: '#6b7080',
									display: 'flex',
									alignItems: 'center',
									padding: '4px',
								}}
							>
								{showPassword ? <Icons.IconEyeOff size={18} /> : <Icons.IconEye size={18} />}
							</button>
						</div>
						{capsLock && (
							<div style={{ fontSize: '0.72rem', color: '#f5a623', marginTop: '0.4rem', fontWeight: 600 }}>
								⚠️ Caps Lock is ON
							</div>
						)}
					</div>

					<button
						type="submit"
						disabled={loading}
						className="btn btn-primary"
						style={{
							width: '100%',
							padding: '0.85rem',
							borderRadius: '9999px',
							fontSize: '0.95rem',
							fontWeight: 700,
							cursor: loading ? 'not-allowed' : 'pointer',
						}}
					>
						{loading ? 'Authenticating...' : 'Sign In to Dashboard'}
					</button>
				</form>
			</div>
		</div>
	)
}
