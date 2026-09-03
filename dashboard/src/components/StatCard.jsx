import { useState, useEffect, useRef } from 'react'

// ── Animated Stat Card ─────────────────────────────────────────────────────
// Props: title, value, subtext, icon (SVG component), accent, trend, delay

const ACCENTS = {
 violet: { gradient: 'linear-gradient(135deg, #8b5cf6, #6366f1)', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)', glow: 'rgba(139,92,246,0.15)', text: '#a78bfa' },
 indigo: { gradient: 'linear-gradient(135deg, #6366f1, #818cf8)', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', glow: 'rgba(99,102,241,0.15)', text: '#a5b4fc' },
 emerald: { gradient: 'linear-gradient(135deg, #10b981, #34d399)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', glow: 'rgba(16,185,129,0.15)', text: '#34d399' },
 blue: { gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', glow: 'rgba(59,130,246,0.15)', text: '#60a5fa' },
 amber: { gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', glow: 'rgba(245,158,11,0.15)', text: '#fbbf24' },
 rose: { gradient: 'linear-gradient(135deg, #f43f5e, #fb7185)', bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.2)', glow: 'rgba(244,63,94,0.15)', text: '#fb7185' },
 cyan: { gradient: 'linear-gradient(135deg, #06b6d4, #22d3ee)', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)', glow: 'rgba(6,182,212,0.15)', text: '#22d3ee' },
}

export default function StatCard({ title, value, subtext, icon: Icon, accent = 'indigo', trend, delay = 0 }) {
 const a = ACCENTS[accent] || ACCENTS.indigo
 const [display, setDisplay] = useState(0)
 const [visible, setVisible] = useState(false)
 const ref = useRef(null)
 const numVal = typeof value === 'number' ? value : null

 useEffect(() => {
 const observer = new IntersectionObserver(([entry]) => {
 if (entry.isIntersecting) {
 setVisible(true)
 observer.disconnect()
 }
 }, { threshold: 0.2 })
 if (ref.current) observer.observe(ref.current)
 return () => observer.disconnect()
 }, [])

 useEffect(() => {
 if (!visible || numVal === null) return
 let start = 0
 const duration = 1200
 const startTime = performance.now()
 const step = (now) => {
 const elapsed = now - startTime
 const progress = Math.min(elapsed / duration, 1)
 const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
 setDisplay(Math.floor(eased * numVal))
 if (progress < 1) requestAnimationFrame(step)
 }
 requestAnimationFrame(step)
 }, [visible, numVal])

 const displayValue = numVal !== null ? display.toLocaleString() : value

 return (
 <div
 ref={ref}
 className="stat-card"
 style={{
 '--delay': `${delay}ms`,
 '--accent-gradient': a.gradient,
 '--accent-bg': a.bg,
 '--accent-border': a.border,
 '--accent-glow': a.glow,
 '--accent-text': a.text,
 opacity: visible ? 1 : 0,
 transform: visible ? 'translateY(0)' : 'translateY(20px)',
 transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms,
 transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
 background: 'rgba(255,255,255,0.03)',
 border: '1px solid rgba(255,255,255,0.06)',
 borderRadius: '16px',
 padding: '1.25rem',
 position: 'relative',
 overflow: 'hidden',
 cursor: 'default',
 }}
 onMouseEnter={(e) => {
 const el = e.currentTarget
 el.style.transform = 'translateY(-4px)'
 el.style.boxShadow = `0 8px 32px ${a.glow}, 0 0 0 1px ${a.border}`
 el.style.background = 'rgba(255,255,255,0.05)'
 }}
 onMouseLeave={(e) => {
 const el = e.currentTarget
 el.style.transform = 'translateY(0)'
 el.style.boxShadow = 'none'
 el.style.background = 'rgba(255,255,255,0.03)'
 }}
 >
 {/* Top gradient line */}
 <div style={{
 position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
 background: a.gradient, opacity: 0.8,
 }} />

 {/* Icon */}
 <div style={{
 width: 40, height: 40, borderRadius: 10,
 background: a.bg, border: `1px solid ${a.border}`,
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 marginBottom: '0.85rem', boxShadow: `0 4px 12px ${a.glow}`,
 }}>
 {Icon && <Icon size={20} color={a.text} />}
 </div>

 {/* Value */}
 <div style={{
 fontSize: '1.75rem', fontWeight: 700, color: '#f1f5f9',
 fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
 letterSpacing: '-0.02em', lineHeight: 1.2,
 }}>
 {displayValue}
 </div>

 {/* Title */}
 <div style={{
 fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500,
 marginTop: '0.2rem', letterSpacing: '0.01em',
 }}>
 {title}
 </div>

 {/* Subtext + Trend */}
 {(subtext || trend) && (
 <div style={{
 display: 'flex', alignItems: 'center', gap: '0.4rem',
 marginTop: '0.5rem',
 }}>
 {trend && (
 <span style={{
 fontSize: '0.7rem', fontWeight: 600, padding: '2px 6px', borderRadius: 6,
 background: trend.startsWith('+') || trend === 'up' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
 color: trend.startsWith('+') || trend === 'up' ? '#34d399' : '#fb7185',
 }}>
 {trend.startsWith('+') || trend === 'up' ? '↑' : '↓'} {trend}
 </span>
 )}
 {subtext && (
 <span style={{
 fontSize: '0.7rem', color: '#64748b', fontWeight: 400,
 }}>
 {subtext}
 </span>
 )}
 </div>
 )}

 {/* Subtle shimmer on hover */}
 <div style={{
 position: 'absolute', inset: 0, opacity: 0,
 transition: 'opacity 0.4s',
 background: `radial-gradient(circle at 50% 0%, ${a.glow}, transparent 60%)`,
 pointerEvents: 'none',
 }} className="stat-shimmer" />
 </div>
 )
}
