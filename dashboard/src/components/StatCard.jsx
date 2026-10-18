import { useState, useEffect, useRef } from 'react'

// ── Organic Wabi-Sabi Stat Card ─────────────────────────────────────────────
const ACCENTS = {
  moss: { bg: 'rgba(93, 112, 82, 0.12)', border: 'rgba(93, 112, 82, 0.25)', glow: 'rgba(93, 112, 82, 0.18)', text: '#5D7052' },
  indigo: { bg: 'rgba(93, 112, 82, 0.12)', border: 'rgba(93, 112, 82, 0.25)', glow: 'rgba(93, 112, 82, 0.18)', text: '#5D7052' },
  violet: { bg: 'rgba(93, 112, 82, 0.12)', border: 'rgba(93, 112, 82, 0.25)', glow: 'rgba(93, 112, 82, 0.18)', text: '#5D7052' },
  emerald: { bg: 'rgba(77, 109, 71, 0.12)', border: 'rgba(77, 109, 71, 0.25)', glow: 'rgba(77, 109, 71, 0.18)', text: '#4D6D47' },
  amber: { bg: 'rgba(193, 140, 93, 0.12)', border: 'rgba(193, 140, 93, 0.25)', glow: 'rgba(193, 140, 93, 0.18)', text: '#C18C5D' },
  clay: { bg: 'rgba(193, 140, 93, 0.12)', border: 'rgba(193, 140, 93, 0.25)', glow: 'rgba(193, 140, 93, 0.18)', text: '#C18C5D' },
  rose: { bg: 'rgba(168, 84, 72, 0.12)', border: 'rgba(168, 84, 72, 0.25)', glow: 'rgba(168, 84, 72, 0.18)', text: '#A85448' },
  blue: { bg: 'rgba(82, 110, 112, 0.12)', border: 'rgba(82, 110, 112, 0.25)', glow: 'rgba(82, 110, 112, 0.18)', text: '#526E70' },
  cyan: { bg: 'rgba(74, 122, 120, 0.12)', border: 'rgba(74, 122, 120, 0.25)', glow: 'rgba(74, 122, 120, 0.18)', text: '#4A7A78' },
}

export default function StatCard({ title, value, subtext, icon: Icon, accent = 'moss', trend, delay = 0 }) {
  const a = ACCENTS[accent] || ACCENTS.moss
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
    const duration = 1000
    const startTime = performance.now()
    const step = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
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
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity 0.6s cubic-bezier(0.25, 1, 0.5, 1) ${delay}ms, transform 0.6s cubic-bezier(0.25, 1, 0.5, 1) ${delay}ms`,
        background: '#FEFEFA',
        border: '1px solid rgba(222, 216, 207, 0.7)',
        borderRadius: '2rem',
        padding: '1.5rem',
        position: 'relative',
        boxShadow: '0 4px 20px -2px rgba(93, 112, 82, 0.12)',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.transform = 'translateY(-3px)'
        el.style.boxShadow = '0 16px 36px -6px rgba(93, 112, 82, 0.18)'
        el.style.borderColor = 'rgba(93, 112, 82, 0.3)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = '0 4px 20px -2px rgba(93, 112, 82, 0.12)'
        el.style.borderColor = 'rgba(222, 216, 207, 0.7)'
      }}
    >
      {/* Icon Pill */}
      <div style={{
        width: 44,
        height: 44,
        borderRadius: '16px',
        background: a.bg,
        border: `1px solid ${a.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem',
        color: a.text,
      }}>
        {Icon && <Icon size={22} color={a.text} />}
      </div>

      {/* Value with Fraunces font */}
      <div style={{
        fontSize: '2rem',
        fontWeight: 700,
        color: '#2C2C24',
        fontFamily: "'Fraunces', Georgia, serif",
        letterSpacing: '-0.02em',
        lineHeight: 1.15,
      }}>
        {displayValue}
      </div>

      {/* Title */}
      <div style={{
        fontSize: '0.8rem',
        color: '#78786C',
        fontWeight: 700,
        marginTop: '0.35rem',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        {title}
      </div>

      {/* Subtext & Trend */}
      {(subtext || trend) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginTop: '0.6rem',
        }}>
          {trend && (() => {
            const isPos = trend.startsWith('+') || trend === 'up'
            const isNeg = trend.startsWith('-') || trend === 'down'
            const bg = isPos
              ? 'rgba(93, 112, 82, 0.12)'
              : isNeg
                ? 'rgba(168, 84, 72, 0.12)'
                : 'rgba(193, 140, 93, 0.12)'
            const color = isPos
              ? '#5D7052'
              : isNeg
                ? '#A85448'
                : '#C18C5D'
            const arrow = isPos ? '↑ ' : isNeg ? '↓ ' : ''
            return (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '9999px',
                background: bg,
                color: color,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                border: `1px solid ${color}33`,
              }}>
                {arrow}{trend}
              </span>
            )
          })()}
          {subtext && (
            <span style={{
              fontSize: '0.75rem',
              color: '#8E8E80',
              fontWeight: 500,
            }}>
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
