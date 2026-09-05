import { useState, useEffect } from 'react'
import GlassCard from '../components/GlassCard.jsx'
import { useToast } from '../App.jsx'
import * as Icons from '../components/Icons.jsx'

export default function QRCode() {
	const toast = useToast()
	const [qrData, setQrData] = useState(null)
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [connected, setConnected] = useState(false)

	const fetchQR = async () => {
		try {
			const res = await fetch('/api/admin/pair')
			const data = await res.json()
			if (data.qr) setQrData(data.qr)
			if (data.connected) setConnected(true)
		} catch {
			toast('Failed to fetch QR code', false)
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}

	const handleRefresh = async () => {
		setRefreshing(true)
		try {
			await fetch('/api/admin/pair/refresh', { method: 'POST' })
			setConnected(false)
			setQrData(null)
			toast('QR code refreshed — scan with WhatsApp', true)
			await fetchQR()
		} catch {
			toast('Failed to refresh QR code', false)
			setRefreshing(false)
		}
	}

	useEffect(() => {
		fetchQR()
		const interval = setInterval(fetchQR, 15000)
		return () => clearInterval(interval)
	}, [])

	return (
		<div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
			<div>
				<h1 className="section-title text-gradient" style={{ fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
					<Icons.IconQrCode size={22} style={{ color: '#a5b4fc' }} />
					QR Pairing
				</h1>
				<p className="section-subtitle">Scan the QR code with WhatsApp to link your device</p>
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
				<GlassCard title="QR Code" subtitle={connected ? 'Device is linked' : 'Open WhatsApp > Linked Devices > Link a Device'} accent={connected ? 'emerald' : 'indigo'}>
					{loading ? (
						<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '280px', gap: '0.75rem' }}>
							<div className="spinner" />
							<span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Generating QR code...</span>
						</div>
					) : qrData ? (
						<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
							<div
								style={{
									width: 220,
									height: 220,
									background: '#ffffff',
									borderRadius: 'var(--radius-lg)',
									padding: 12,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									boxShadow: '0 0 40px rgba(99, 102, 241, 0.15)',
								}}
							>
								{qrData?.startsWith?.('<svg') ? (
									<div dangerouslySetInnerHTML={{ __html: qrData }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }} />
								) : qrData?.startsWith?.('data:image') ? (
									<img src={qrData} alt="WhatsApp QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
								) : (
									<div dangerouslySetInnerHTML={{ __html: qrData }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
								)}
							</div>
							<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', }}>
								<span className={`status-dot ${connected ? 'online' : ''}`} style={{ background: connected ? '#10b981' : '#f59e0b', boxShadow: connected ? '0 0 8px rgba(16,185,129,0.5)' : '0 0 8px rgba(245,158,11,0.5)', width: 7, height: 7, borderRadius: '50%' }} />
								<span style={{ fontSize: '0.78rem', color: connected ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
									{connected ? 'Connected' : 'Waiting for scan...'}
								</span>
							</div>
							<button
								className="btn btn-secondary"
								onClick={handleRefresh}
								disabled={refreshing}
								style={{ width: '100%' }}
							>
								<Icons.RefreshIcon size={15} color="#a5b4fc" />
								{refreshing ? 'Refreshing...' : 'Refresh QR Code'}
							</button>
						</div>
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '280px', gap: '0.75rem' }}>
							<Icons.IconAlert size={32} color="#fbbf24" />
							<span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 }}>No QR code available</span>
							<button className="btn btn-secondary" onClick={fetchQR} style={{ marginTop: '0.5rem' }}>
								<Icons.RefreshIcon size={15} color="#a5b4fc" />
								Retry
							</button>
						</div>
					)}
				</GlassCard>

				<div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
					<GlassCard title="How to Pair" subtitle="Step-by-step instructions" accent="blue">
						<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.25rem 0' }}>
							{[
								{ step: 1, text: 'Open WhatsApp on your phone', color: '#6366f1' },
								{ step: 2, text: 'Go to Settings > Linked Devices', color: '#818cf8' },
								{ step: 3, text: 'Tap "Link a Device"', color: '#a78bfa' },
								{ step: 4, text: 'Point your camera at the QR code', color: '#c084fc' },
								{ step: 5, text: 'Confirm the pairing on your phone', color: '#8b5cf6' },
							].map(({ step, text, color }) => (
								<div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
									<div
										style={{
											width: 24,
											height: 24,
											borderRadius: '50%',
											background: `${color}20`,
											border: `1px solid ${color}40`,
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											fontSize: '0.65rem',
											fontWeight: 700,
											color,
											flexShrink: 0,
											marginTop: '1px',
										}}
									>
										{step}
									</div>
									<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5', paddingTop: '2px' }}>{text}</span>
								</div>
							))}
						</div>
					</GlassCard>

					<GlassCard title="Status" subtitle="Pairing health" accent="emerald">
						<div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>WebSocket</span>
								<span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Connected</span>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>QR Status</span>
								<span className={`badge ${connected ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.65rem' }}>
									{connected ? 'Linked' : 'Waiting'}
								</span>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Auto-refresh</span>
								<span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>Every 15s</span>
							</div>
						</div>
					</GlassCard>
				</div>
			</div>
		</div>
	)
}
