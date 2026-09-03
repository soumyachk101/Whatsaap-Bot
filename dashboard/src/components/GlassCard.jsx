import React from 'react'

// ── Glassmorphism Card ──────────────────────────────────────────────────────
// Reusable glass card with optional accent border and animations

const glassBase = {
 background: 'rgba(255, 255, 255, 0.025)',
 backdropFilter: 'blur(20px) saturate(1.2)',
 WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
 border: '1px solid rgba(255, 255, 255, 0.06)',
 borderRadius: '20px',
 position: 'relative',
 overflow: 'hidden',
}

export default function GlassCard({
 children,
 title,
 subtitle,
 accent = 'indigo',
 padding = '1.5rem',
 className = '',
 style = {},
}) {
 const accentMap = {
 violet: 'rgba(139,92,246,0.3)',
 indigo: 'rgba(99,102,241,0.3)',
 emerald: 'rgba(16,185,129,0.3)',
 blue: 'rgba(59,130,246,0.3)',
 amber: 'rgba(245,158,11,0.3)',
 rose: 'rgba(244,63,94,0.3)',
 cyan: 'rgba(6,182,212,0.3)',
 }
 const borderColor = accentMap[accent] || accentMap.indigo

 return (
 <div
 className={`glass-card ${className}`}
 style={{
 ...glassBase,
 padding,
 ...style,
 }}
 onMouseEnter={(e) => {
 e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.3), inset 0 0 0 1px ${borderColor}`
 e.currentTarget.style.borderColor = borderColor
 }}
 onMouseLeave={(e) => {
 e.currentTarget.style.boxShadow = 'none'
 e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
 }}
 >
 {/* Animated top accent */}
 <div style={{
 position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
 background: `linear-gradient(90deg, transparent, ${borderColor}, transparent)`,
 opacity: 0.6,
 }} />

 {/* Corner glow */}
 <div style={{
 position: 'absolute', top: -40, right: -40, width: 120, height: 120,
 background: `radial-gradient(circle, ${borderColor.replace('0.3', '0.06')}, transparent 70%)`,
 pointerEvents: 'none',
 }} />

 {(title || subtitle) && (
 <div style={{ marginBottom: '1rem' }}>
 {title && (
 <h3 style={{
 margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9',
 letterSpacing: '-0.01em',
 }}>
 {title}
 </h3>
 )}
 {subtitle && (
 <p style={{
 margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 400,
 }}>
 {subtitle}
 </p>
 )}
 </div>
 )}
 {children}
 </div>
 )
}
