interface AvatarProps {
  nickname: string
  color?: string
  size?: 'sm' | 'lg'
  photoUrl?: string
}

const COLORS = ['#FF5A1F','#3B82F6','#22C55E','#EAB308','#A855F7','#EF4444','#06B6D4','#F97316','#EC4899','#14B8A6']

export function avatarColor(nickname: string): string {
  let hash = 0
  for (let i = 0; i < nickname.length; i++) hash = nickname.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

export function Avatar({ nickname, color, size = 'sm', photoUrl }: AvatarProps) {
  const bg = color ?? avatarColor(nickname)
  const dim = size === 'lg' ? 62 : 38
  const fontSize = size === 'lg' ? 22 : 14

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={nickname}
        style={{ width: dim, height: dim, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }

  return (
    <div
      style={{
        width: dim,
        height: dim,
        minWidth: dim,
        borderRadius: '50%',
        background: bg,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        fontSize,
        fontFamily: 'Anton, sans-serif',
        fontWeight: 400,
        color: '#0c0c0c',
        letterSpacing: '.02em',
      }}
    >
      {nickname.slice(0, 2).toUpperCase()}
    </div>
  )
}
