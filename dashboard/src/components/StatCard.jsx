import { useState, useEffect, useRef } from 'react'

// ── Premium Stat Card ────────────────────────────────────────────────────────
const ACCENTS = {
  blue:    { bg: '#eef4ff', border: 'rgba(79,142,247,0.3)',  text: '#4f8ef7' },
  green:   { bg: '#ecfdf3', border: 'rgba(52,199,123,0.3)',  text: '#34c77b' },
  amber:   { bg: '#fef8e8', border: 'rgba(245,166,35,0.3)',  text: '#f5a623' },
  purple:  { bg: '#f5f0ff', border: 'rgba(139,92,246,0.3)',  text: '#8b5cf6' },
  red:     { bg: '#fef2f2', border: 'rgba(240,84,79,0.3)',   text: '#f0544f' },
  // legacy keys map to new palette
  moss:    { bg: '#eef4ff', border: 'rgba(79,142,247,0.3)',  text: '#4f8ef7' },
  indigo:  { bg: '#eef4ff', border: 'rgba(79,142,247,0.3)',  text: '#4f8ef7' },
  violet:  { bg: '#f5f0ff', border: 'rgba(139,92,246,0.3)',  text: '#8b5cf6' },
  emerald: { bg: '#ecfdf3', border: 'rgba(52,199,123,0.3)',  text: '#34c77b' },
  amber2:  { bg: '#fef8e8', border: 'rgba(245,166,35,0.3)',  text: '#f5a623' },
  clay:    { bg: '#fef8e8', border: 'rgba(245,166,35,0.3)',  text: '#f5a623' },
  rose:    { bg: '#fef2f2', border: 'rgba(240,84,79,0.3)',   text: '#f0544f' },
  blue2:   { bg: '#eef4ff', border: 'rgba(79,142,247,0.3)',  text: '#4f8ef7' },
  cyan:    { bg: '#eef4ff', border: 'rgba(79,142,247,0.3)',  text: '#4f8ef7' },
}

export default function StatCard({ title, value, subtext, icon: Icon, accent = 'blue', trend, delay = 0 }) {
  const a = ACCENTS[accent] || ACCENTS.blue
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

  const isPositiveTrend = trend && (trend.startsWith('+') || trend === 'up' || trend === 'online')
  const isNegativeTrend = trend && (trend.startsWith('-') || trend === 'down' || trend === 'offline')
  const trendColor = isPositiveTrend ? '#34c77b' : isNegativeTrend ? '#f0544f' : '#f5a623'
  const trendBg = isPositiveTrend ? '#ecfdf3' : isNegativeTrend ? '#fef2f2' : '#fef8e8'

  return (
    <div
      ref={ref}
      className="stat-card"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: `opacity 0.5s var(--ease) ${delay}ms, transform 0.5s var(--ease) ${delay}ms`,
        background: '#ffffff',
        border: '1px solid #e2e5f0',
        borderRadius: '12px',
        padding: '1.25rem',
        position: 'relative',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
        el.style.borderColor = '#c8cde0'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
        el.style.borderColor = '#e2e5f0'
      }}
    >
      <div style={{
        width: 40,
        height: 40,
        borderRadius: '10px',
        background: a.bg,
        border: `1px solid ${a.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '0.85rem',
        color: a.text,
      }}>
        {Icon && <Icon size={20} color={a.text} />}
      </div>

      <div style={{
        fontSize: '1.65rem',
        fontWeight: 700,
        color: '#1a1d2b',
        fontFamily: "'Space Grotesk', sans-serif",
        letterSpacing: '-0.02em',
        lineHeight: 1.2,
      }}>
        {displayValue}
      </div>

      <div style={{
        fontSize: '0.72rem',
        color: '#9ca1b5',
        fontWeight: 600,
        marginTop: '0.2rem',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        {title}
      </div>

      {(subtext || trend) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginTop: '0.5rem',
        }}>
          {trend && (() => {
            const arrow = isPositiveTrend ? '↑' : isNegativeTrend ? '↓' : '·'
            return (
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '9999px',
                background: trendBg,
                color: trendColor,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
              }}>
                {arrow} {trend}
              </span>
            )
          })()}
          {subtext && (
            <span style={{
              fontSize: '0.75rem',
              color: '#9ca1b5',
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
