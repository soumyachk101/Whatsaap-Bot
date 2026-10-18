import React from 'react'

// ── Organic Card (Wabi-Sabi tactile container) ──────────────────────────────
export default function GlassCard({
  children,
  title,
  subtitle,
  accent = 'moss',
  padding = '1.75rem',
  className = '',
  style = {},
}) {
  const accentBorders = {
    moss: 'rgba(93, 112, 82, 0.3)',
    terracotta: 'rgba(193, 140, 93, 0.3)',
    clay: 'rgba(193, 140, 93, 0.3)',
    sand: 'rgba(230, 220, 205, 0.6)',
    sienna: 'rgba(168, 84, 72, 0.3)',
    river: 'rgba(82, 110, 112, 0.3)',
    indigo: 'rgba(93, 112, 82, 0.3)',
    violet: 'rgba(93, 112, 82, 0.3)',
    emerald: 'rgba(77, 109, 71, 0.3)',
  }
  const highlightBorder = accentBorders[accent] || accentBorders.moss

  return (
    <div
      className={`glass-card ${className}`}
      style={{
        background: '#FEFEFA',
        border: '1px solid rgba(222, 216, 207, 0.7)',
        borderRadius: '2rem',
        boxShadow: '0 4px 20px -2px rgba(93, 112, 82, 0.12)',
        padding,
        position: 'relative',
        transition: 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.35s ease, border-color 0.35s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = '0 16px 36px -6px rgba(93, 112, 82, 0.16)'
        e.currentTarget.style.borderColor = highlightBorder
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 4px 20px -2px rgba(93, 112, 82, 0.12)'
        e.currentTarget.style.borderColor = 'rgba(222, 216, 207, 0.7)'
      }}
    >
      {(title || subtitle) && (
        <div style={{ marginBottom: '1.25rem' }}>
          {title && (
            <h3 style={{
              margin: 0,
              fontSize: '1.2rem',
              fontWeight: 700,
              color: '#2C2C24',
              fontFamily: "'Fraunces', Georgia, serif",
              letterSpacing: '-0.02em',
            }}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p style={{
              margin: '0.3rem 0 0',
              fontSize: '0.8rem',
              color: '#78786C',
              fontWeight: 500,
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
