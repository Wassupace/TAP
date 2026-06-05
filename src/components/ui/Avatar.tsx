import type { CSSProperties } from 'react'

interface AvatarProps {
  nickname: string
  color?: string
  variant?: 'default' | 'active' | 'team-a' | 'team-b'
  size?: number
}

export function Avatar({ nickname, color, variant = 'default', size = 38 }: AvatarProps) {
  const initials = nickname.slice(0, 2).toUpperCase()

  const styles: Record<string, CSSProperties> = {
    default:  { background: color ?? 'var(--panel-2)', color: color ? '#fff' : 'var(--dim)' },
    active:   { background: color ?? 'var(--orange)', color: '#fff' },
    'team-a': { background: 'rgba(59,130,246,0.2)', color: '#60A5FA', border: '1.5px solid rgba(59,130,246,0.4)' },
    'team-b': { background: 'rgba(239,68,68,0.2)',  color: '#F87171', border: '1.5px solid rgba(239,68,68,0.4)' },
  }

  return (
    <div
      style={{
        width: size, height: size, minWidth: size,
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.32), fontWeight: 800,
        flexShrink: 0,
        ...styles[variant],
      }}
    >
      {initials}
    </div>
  )
}
