import { type ReactNode, type CSSProperties } from 'react'

type CardVariant = 'hero' | 'surface' | 'accent'

interface CardProps {
  variant?: CardVariant
  children: ReactNode
  style?: CSSProperties
  className?: string
  onClick?: () => void
}

const variantStyles: Record<CardVariant, CSSProperties> = {
  hero: {
    background: 'var(--hero-gradient)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 'var(--r-lg)',
    padding: '16px 18px',
  },
  surface: {
    background: 'var(--panel)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--r-md)',
    padding: '14px 16px',
  },
  accent: {
    background: 'var(--panel)',
    border: '1px solid var(--line)',
    borderLeft: '3px solid var(--orange)',
    borderRadius: 'var(--r-md)',
    padding: '14px 16px',
  },
}

export function Card({ variant = 'surface', children, style, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{ ...variantStyles[variant], ...style, ...(onClick ? { cursor: 'pointer' } : {}) }}
    >
      {children}
    </div>
  )
}
