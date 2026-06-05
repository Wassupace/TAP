import { type CSSProperties } from 'react'

type TagVariant = 'match' | 'drill' | 'banks' | 'generic' | 'neutral'

interface TagProps {
  variant?: TagVariant
  children: string
}

const styles: Record<TagVariant, CSSProperties> = {
  match:   { background: 'rgba(59,130,246,0.15)',  color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)' },
  drill:   { background: 'rgba(16,185,129,0.15)',  color: '#34D399', border: '1px solid rgba(16,185,129,0.3)' },
  banks:   { background: 'rgba(245,158,11,0.15)',  color: '#FCD34D', border: '1px solid rgba(245,158,11,0.3)' },
  generic: { background: 'rgba(168,85,247,0.15)',  color: '#C084FC', border: '1px solid rgba(168,85,247,0.3)' },
  neutral: { background: 'var(--panel-2)',          color: 'var(--dim)', border: '1px solid var(--line)' },
}

export function Tag({ variant = 'neutral', children }: TagProps) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      ...styles[variant],
    }}>
      {children}
    </span>
  )
}
