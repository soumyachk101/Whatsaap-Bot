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
			background: 'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 0.95) 65%, #07090e 100%)',
			position: 'relative',
			overflow: 'hidden',
			fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
		}}>
			{/* Ambient glowing background orbs */}
			<div style={{
				position: 'absolute',
				top: '15%',
				left: '50%',
				transform: 'translateX(-50%)',
				width: '500px',
				height: '350px',
				background: 'radial-gradient(circle, rgba(129, 140, 248, 0.18) 0%, rgba(99, 102, 241, 0.05) 60%, transparent 80%)',
				filter: 'blur(60px)',
				pointerEvents: 'none',
				zIndex: 0,
			}} />

			<div
				className={`login-card ${shake ? 'anim-shake' : 'page-enter'}`}
				style={{
					position: 'relative',
					zIndex: 1,
					width: '100%',
					maxWidth: '430px',
					background: 'rgba(17, 24, 39, 0.75)',
					backdropFilter: 'blur(24px)',
					WebkitBackdropFilter: 'blur(24px)',
					border: '1px solid rgba(255, 255, 255, 0.08)',
					borderRadius: '24px',
					padding: '2.5rem 2rem',
					boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05), 0 0 35px rgba(99, 102, 241, 0.12)',
					transition: 'transform 0.2s ease, box-shadow 0.2s ease',
				}}
			>
				{/* Top ambient highlight line */}
				<div style={{
					position: 'absolute',
					top: 0,
					left: '10%',
					right: '10%',
					height: '1.5px',
					background: 'linear-gradient(90deg, transparent, #818cf8, #a78bfa, transparent)',
					borderRadius: '9999px',
				}} />

				{/* Brand Logo & Header */}
				<div style={{ textAlign: 'center', marginBottom: '2rem' }}>
					<div style={{
						position: 'relative',
						width: '84px',
						height: '84px',
						margin: '0 auto 1.25rem',
						borderRadius: '24px',
						padding: '3px',
						background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 50%, #c084fc 100%)',
						boxShadow: '0 0 30px rgba(99, 102, 241, 0.35)',
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
								borderRadius: '21px',
								objectFit: 'cover',
								background: '#1e1b4b',
								display: 'block',
							}}
						/>
						{/* Online indicator dot */}
						<div
							title="Engine Online"
							style={{
								position: 'absolute',
								bottom: -3,
								right: -3,
								width: 18,
								height: 18,
								borderRadius: '50%',
								background: '#10b981',
								border: '3px solid #0f172a',
								boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)',
							}}
						/>
					</div>

					<h1 style={{
						fontSize: '1.6rem',
						fontWeight: 800,
						color: '#ffffff',
						letterSpacing: '-0.025em',
						margin: '0 0 0.4rem',
						background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)',
						WebkitBackgroundClip: 'text',
						WebkitTextFillColor: 'transparent',
					}}>
						WhatsApp Bot
					</h1>
					<p style={{
						fontSize: '0.82rem',
						color: '#94a3b8',
						margin: 0,
						fontWeight: 500,
						letterSpacing: '-0.01em',
					}}>
						Control Center & Engine Administration
					</p>
				</div>

				{/* Quick QR Connect Banner */}
				<div style={{
					marginBottom: '1.75rem',
					padding: '0.85rem 1rem',
					borderRadius: '14px',
					background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.06) 100%)',
					border: '1px solid rgba(129, 140, 248, 0.25)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: '0.75rem',
					transition: 'all 0.25s ease',
				}}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
						<div style={{
							width: 38,
							height: 38,
							borderRadius: '10px',
							background: 'rgba(99, 102, 241, 0.2)',
							border: '1px solid rgba(99, 102, 241, 0.3)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							flexShrink: 0,
						}}>
							<Icons.IconQrCode size={20} color="#a5b4fc" />
						</div>
						<div style={{ textAlign: 'left' }}>
							<div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9' }}>
								Link WhatsApp Device
							</div>
							<div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1px' }}>
								Scan QR or enter pairing code
							</div>
						</div>
					</div>
					<a
						href="/"
						style={{
							padding: '0.45rem 0.85rem',
							borderRadius: '8px',
							background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
							color: '#ffffff',
							fontSize: '0.75rem',
							fontWeight: 700,
							textDecoration: 'none',
							whiteSpace: 'nowrap',
							boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
							transition: 'transform 0.15s ease',
							display: 'inline-flex',
							alignItems: 'center',
							gap: '4px'
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
						borderRadius: '10px',
						background: 'rgba(244, 63, 94, 0.1)',
						border: '1px solid rgba(244, 63, 94, 0.3)',
						color: '#fb7185',
						fontSize: '0.78rem',
						fontWeight: 600,
						display: 'flex',
						alignItems: 'center',
						gap: '0.5rem',
					}}>
						<Icons.IconAlert size={16} color="#fb7185" />
						<span>{error}</span>
					</div>
				)}

				{/* Form */}
				<form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
					<div>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
							<label style={{
								fontSize: '0.72rem',
								fontWeight: 700,
								color: '#94a3b8',
								textTransform: 'uppercase',
								letterSpacing: '0.06em',
							}}>
								Master Password
							</label>
							{capsLock && (
								<span style={{ fontSize: '0.68rem', color: '#fbbf24', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
									<Icons.WarningIcon size={12} color="#fbbf24" />
									Caps Lock ON
								</span>
							)}
						</div>

						<div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
							<div style={{ position: 'absolute', left: 14, pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
								<Icons.IconLock size={18} color="#64748b" />
							</div>

							<input
								type={showPassword ? 'text' : 'password'}
								placeholder="Enter admin password"
								value={password}
								onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
								onKeyDown={handleKeyDown}
								onKeyUp={handleKeyDown}
								autoFocus
								required
								style={{
									width: '100%',
									fontSize: '0.925rem',
									padding: '0.85rem 2.8rem 0.85rem 2.75rem',
									background: 'rgba(15, 23, 42, 0.8)',
									border: error ? '1px solid rgba(244, 63, 94, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
									borderRadius: '12px',
									color: '#ffffff',
									outline: 'none',
									transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
									boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
								}}
								onFocus={(e) => {
									e.target.style.borderColor = 'rgba(129, 140, 248, 0.6)'
									e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.2), inset 0 2px 4px rgba(0, 0, 0, 0.2)'
								}}
								onBlur={(e) => {
									e.target.style.borderColor = error ? 'rgba(244, 63, 94, 0.5)' : 'rgba(255, 255, 255, 0.1)'
									e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
								}}
							/>

							{/* Eye Toggle Button */}
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								title={showPassword ? 'Hide password' : 'Show password'}
								style={{
									position: 'absolute',
									right: 12,
									background: 'none',
									border: 'none',
									padding: '6px',
									color: showPassword ? '#818cf8' : '#64748b',
									cursor: 'pointer',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									borderRadius: '6px',
									transition: 'color 0.2s ease',
								}}
							>
								{showPassword ? <Icons.IconEyeOff size={18} /> : <Icons.IconEye size={18} />}
							</button>
						</div>
					</div>

					<button
						type="submit"
						className="btn btn-primary"
						disabled={!password.trim() || loading}
						style={{
							width: '100%',
							padding: '0.875rem',
							fontSize: '0.925rem',
							fontWeight: 700,
							marginTop: '0.25rem',
							borderRadius: '12px',
							background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
							border: '1px solid rgba(129, 140, 248, 0.3)',
							boxShadow: loading ? 'none' : '0 8px 24px -4px rgba(99, 102, 241, 0.45)',
							letterSpacing: '-0.01em',
							cursor: loading ? 'not-allowed' : 'pointer',
							transition: 'all 0.2s ease',
						}}
					>
						{loading ? (
							<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
								<span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: '#ffffff' }} />
								Verifying Credentials...
							</span>
						) : (
							<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
								<Icons.IconShield size={18} />
								Enter Control Center
							</span>
						)}
					</button>
				</form>

				{/* Footer security note */}
				<div style={{
					marginTop: '2rem',
					paddingTop: '1.25rem',
					borderTop: '1px solid rgba(255, 255, 255, 0.05)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					gap: '0.5rem',
					color: '#64748b',
					fontSize: '0.7rem',
				}}>
					<span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
					<span>Encrypted Session · SQLite Admin Vault</span>
				</div>
			</div>
		</div>
	)
}
