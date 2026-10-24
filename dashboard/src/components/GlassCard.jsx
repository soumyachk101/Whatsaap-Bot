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
    moss: 'rgba(79, 142, 247, 0.3)',
    terracotta: 'rgba(245, 166, 35, 0.3)',
    clay: 'rgba(245, 166, 35, 0.3)',
    sand: 'rgba(200, 205, 224, 0.6)',
    sienna: 'rgba(240, 84, 79, 0.3)',
    river: 'rgba(79, 142, 247, 0.3)',
    indigo: 'rgba(79, 142, 247, 0.3)',
    violet: 'rgba(139, 92, 246, 0.3)',
    emerald: 'rgba(52, 199, 123, 0.3)',
  }
  const highlightBorder = accentBorders[accent] || accentBorders.moss

  return (
    <div
      className={`glass-card ${className}`}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e5f0',
        borderRadius: '12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        padding,
        position: 'relative',
        transition: 'transform 0.25s var(--ease), box-shadow 0.25s var(--ease), border-color 0.25s var(--ease)',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
        e.currentTarget.style.borderColor = highlightBorder
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
        e.currentTarget.style.borderColor = '#e2e5f0'
      }}
    >
      {(title || subtitle) && (
        <div style={{ marginBottom: '1.25rem' }}>
          {title && (
            <h3 style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#1a1d2b',
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: '-0.01em',
            }}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p style={{
              margin: '0.25rem 0 0',
              fontSize: '0.8rem',
              color: '#6b7080',
              fontWeight: 400,
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
