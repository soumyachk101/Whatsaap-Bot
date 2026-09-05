import { useState, useEffect } from 'react'
import { useToast } from '../App.jsx'
import { IconQrCode, IconAlert, RefreshIcon } from '../components/Icons.jsx'

export default function QRPage() {
 const toast = useToast()
 const [qrData, setQrData] = useState(null)
 const [connected, setConnected] = useState(false)
 const [wsStatus, setWsStatus] = useState('connecting')
 const wsRef = null

 useEffect(() => {
 let ws = null
 let heartbeatTimer = null
 let reconnectTimer = null
 let isMounted = true

 const connect = () => {
 if (!isMounted) return

 const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
 const wsUrl = `${protocol}//${window.location.host}`

 try {
 ws = new WebSocket(wsUrl)
 } catch {
 if (isMounted) setWsStatus('error')
 return
 }

 ws.onopen = () => {
 if (!isMounted) return
 setWsStatus('connected')
 }

 ws.onmessage = (event) => {
 if (!isMounted) return
 try {
 const msg = JSON.parse(event.data)
 if (msg.type === 'qr' && msg.qr) {
 setQrData(msg.qr)
 setConnected(false)
 } else if (msg.type === 'status' && msg.status === 'connected') {
 setConnected(true)
 setQrData(null)
 } else if (msg.type === 'error') {
 console.error('WS error:', msg.error)
 }
 } catch {
 // ignore non-JSON messages
 }
 }

 ws.onclose = () => {
 if (!isMounted) return
 setWsStatus('disconnected')
 reconnectTimer = setTimeout(connect, 3000)
 }

 ws.onerror = () => {
 if (!isMounted) return
 setWsStatus('error')
 }

 heartbeatTimer = setInterval(() => {
 if (ws && ws.readyState === WebSocket.OPEN) {
 ws.send(JSON.stringify({ type: 'ping' }))
 }
 }, 30000)
 }

 connect()

 return () => {
 isMounted = false
 clearInterval(heartbeatTimer)
 clearTimeout(reconnectTimer)
 if (ws) {
 try { ws.close() } catch {}
 }
 }
 }, [])

 const handleRefresh = () => {
 setQrData(null)
 setConnected(false)
 toast('Refreshing... — open WhatsApp > Linked Devices > Link a Device', true)
 // Auto-poll via API to get fresh QR
 pollForQR()
 }

 const pollForQR = async () => {
 try {
 const res = await fetch('/api/admin/pair', { credentials: 'include' })
 if (res.ok) {
 const data = await res.json()
 if (data.qr) setQrData(data.qr)
 if (data.connected) setConnected(true)
 }
 } catch {
 // Silently retry
 setTimeout(pollForQR, 3000)
 }
 }

 return (
 <div style={{
 minHeight: '100vh',
 display: 'flex',
 flexDirection: 'column',
 alignItems: 'center',
 justifyContent: 'center',
 background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
 padding: '2rem',
 fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
 }}>
 <div style={{
 textAlign: 'center',
 marginBottom: '2rem',
 }}>
 <div style={{
 width: 64,
 height: 64,
 borderRadius: 16,
 background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 margin: '0 auto 1rem',
 boxShadow: '0 0 40px rgba(99,102,241,0.3)',
 }}>
 <IconQrCode size={32} color="#ffffff" />
 </div>
 <h1 style={{
 fontSize: '1.75rem',
 fontWeight: 800,
 color: '#ffffff',
 margin: '0 0 0.5rem',
 letterSpacing: '-0.02em',
 }}>
 WhatsApp Bot Pairing
 </h1>
 <p style={{
 fontSize: '0.9rem',
 color: '#94a3b8',
 margin: 0,
 maxWidth: 420,
 lineHeight: 1.5,
 }}>
 Scan the QR code below with WhatsApp to link your device.
 Open WhatsApp on your phone, go to Settings {'>'} Linked Devices.
 </p>
 </div>

 <div style={{
 width: 280,
 height: 280,
 borderRadius: 20,
 background: '#ffffff',
 padding: 16,
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 boxShadow: '0 0 60px rgba(99,102,241,0.2), 0 25px 50px -12px rgba(0,0,0,0.5)',
 position: 'relative',
 overflow: 'hidden',
 }}>
 {wsStatus === 'connecting' && !qrData && (
 <div style={{
 display: 'flex',
 flexDirection: 'column',
 alignItems: 'center',
 gap: '1rem',
 color: '#64748b',
 }}>
 <div className="spinner" />
 <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Connecting...</span>
 </div>
 )}

 {wsStatus === 'error' && !qrData && (
 <div style={{
 display: 'flex',
 flexDirection: 'column',
 alignItems: 'center',
 gap: '0.75rem',
 color: '#ef4444',
 padding: '1rem',
 }}>
 <IconAlert size={36} color="#ef4444" />
 <span style={{ fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
 Connection failed<br />
 <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.78rem' }}>
 Make sure the bot is running
 </span>
 </span>
 </div>
 )}

 {qrData && (
 <>
 {/* eslint-disable-next-line react/no-danger */}
 <div
 dangerouslySetInnerHTML={{ __html: qrData }}
 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
 />
 <div style={{
 position: 'absolute',
 top: 8,
 right: 8,
 display: 'flex',
 alignItems: 'center',
 gap: 6,
 background: 'rgba(0,0,0,0.6)',
 padding: '4px 10px',
 borderRadius: 20,
 }}>
 <span style={{
 width: 6,
 height: 6,
 borderRadius: '50%',
 background: connected ? '#10b981' : '#f59e0b',
 boxShadow: connected ? '0 0 8px rgba(16,185,129,0.6)' : '0 0 8px rgba(245,158,11,0.6)',
 }} />
 <span style={{
 fontSize: '0.65rem',
 fontWeight: 600,
 color: connected ? '#34d399' : '#fbbf24',
 textTransform: 'uppercase',
 letterSpacing: '0.05em',
 }}>
 {connected ? 'Linked' : 'Live'}
 </span>
 </div>
 </>
 )}

 {!qrData && wsStatus === 'connected' && (
 <div style={{
 display: 'flex',
 flexDirection: 'column',
 alignItems: 'center',
 gap: '0.75rem',
 color: '#94a3b8',
 }}>
 <IconQrCode size={48} color="#e2e8f0" />
 <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>
 Waiting for QR code...
 </span>
 </div>
 )}
 </div>

 <div style={{
 marginTop: '1.5rem',
 display: 'flex',
 gap: '0.75rem',
 flexWrap: 'wrap',
 justifyContent: 'center',
 }}>
 <button
 onClick={handleRefresh}
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: 8,
 padding: '0.6rem 1.25rem',
 borderRadius: 10,
 border: '1px solid rgba(99,102,241,0.3)',
 background: 'rgba(99,102,241,0.1)',
 color: '#a5b4fc',
 fontSize: '0.82rem',
 fontWeight: 600,
 cursor: 'pointer',
 transition: 'all 0.2s',
 }}
 onMouseEnter={(e) => {
 e.target.style.background = 'rgba(99,102,241,0.2)'
 e.target.style.borderColor = 'rgba(99,102,241,0.5)'
 }}
 onMouseLeave={(e) => {
 e.target.style.background = 'rgba(99,102,241,0.1)'
 e.target.style.borderColor = 'rgba(99,102,241,0.3)'
 }}
 >
 <RefreshIcon size={15} />
 Refresh QR
 </button>
 </div>

 <div style={{
 marginTop: '2rem',
 display: 'flex',
 gap: '2rem',
 flexWrap: 'wrap',
 justifyContent: 'center',
 }}>
 {[
 { step: 1, text: 'Open WhatsApp on your phone', color: '#6366f1' },
 { step: 2, text: 'Go to Settings > Linked Devices', color: '#818cf8' },
 { step: 3, text: 'Tap "Link a Device"', color: '#a78bfa' },
 { step: 4, text: 'Scan the QR code above', color: '#c084fc' },
 { step: 5, text: 'Confirm pairing on your phone', color: '#8b5cf6' },
 ].map(({ step, text, color }) => (
 <div key={step} style={{
 display: 'flex',
 alignItems: 'center',
 gap: '0.6rem',
 }}>
 <div style={{
 width: 22,
 height: 22,
 borderRadius: '50%',
 background: `${color}20`,
 border: `1px solid ${color}40`,
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 fontSize: '0.6rem',
 fontWeight: 700,
 color,
 flexShrink: 0,
 }}>
 {step}
 </div>
 <span style={{
 fontSize: '0.78rem',
 color: '#94a3b8',
 lineHeight: 1.4,
 }}>{text}</span>
 </div>
 ))}
 </div>

 <footer style={{
 marginTop: '3rem',
 fontSize: '0.7rem',
 color: '#475569',
 }}>
 WhatsApp Bot Admin Engine &middot; Public Pairing Page
 </footer>
 </div>
 )
}
