import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Icons } from '../components/ui/icons'

const MOCK_PLAYERS = [
  { id: '1', nickname: 'JC',    name: 'Jordan C.',  color: '#FF5A1F', w: 47, l: 23 },
  { id: '2', nickname: 'Marcus',name: 'Marcus T.',  color: '#3B82F6', w: 31, l: 18 },
  { id: '3', nickname: 'Dre',   name: 'Andre P.',   color: '#22C55E', w: 22, l: 14 },
  { id: '4', nickname: 'Sef',   name: 'Yousef K.',  color: '#EAB308', w: 19, l: 11 },
  { id: '5', nickname: 'Tomas', name: 'Tomas R.',   color: '#A855F7', w: 38, l: 27 },
  { id: '6', nickname: 'Leo',   name: 'Leo M.',     color: '#EF4444', w: 14, l: 22 },
  { id: '7', nickname: 'Kenji', name: 'Kenji S.',   color: '#06B6D4', w: 29, l: 15 },
  { id: '8', nickname: 'Pablo', name: 'Pablo G.',   color: '#F97316', w: 41, l: 19 },
]

export default function PlayersPage() {
  const nav = useNavigate()
  const [query, setQuery] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const filtered = MOCK_PLAYERS.filter(p =>
    p.nickname.toLowerCase().includes(query.toLowerCase()) ||
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="min-h-dvh px-[18px] pt-[54px] pb-8">
      <BackButton onClick={() => nav('/')}>Dashboard</BackButton>

      {/* Hero gradient header */}
      <div style={{
        background: 'var(--hero-gradient)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--r-lg)',
        padding: '16px 18px', marginBottom: 16, marginTop: 16,
      }}>
        <p style={{ fontSize: 11, color: '#93C5FD', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>Roster</p>
        <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 20 }}>Players</div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 px-4 py-3 mb-4" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
        <span className="w-[18px] h-[18px] text-[var(--faint)]">{Icons.search}</span>
        <input
          type="text"
          placeholder="Search players…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="bg-transparent border-0 outline-none text-[14px] text-chalk placeholder:text-[var(--faint)] flex-1"
        />
      </div>

      <div className="space-y-2 stagger">
        {filtered.map(p => {
          const isHovered = hoveredId === p.id
          return (
            <button
              key={p.id}
              onClick={() => nav(`/players/${p.id}`)}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="w-full flex gap-3 items-center p-[13px_14px] cursor-pointer text-left transition-all"
              style={{
                background: isHovered ? 'var(--panel-2)' : 'var(--panel)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-md)',
                borderLeft: isHovered ? '3px solid var(--orange)' : '1px solid var(--line)',
                paddingLeft: isHovered ? 11 : 14,
              }}
            >
              <Avatar nickname={p.nickname} color={p.color} />
              <div className="flex-1">
                <div className="font-bold text-[14px]">{p.nickname}</div>
                <div className="text-[12px] text-[var(--dim)]">{p.name}</div>
              </div>
              <div className="text-[12px] text-[var(--dim)] tabular-nums font-semibold">
                <span className="font-display text-[14px] text-chalk">{p.w}</span>W–<span className="font-display text-[14px] text-chalk">{p.l}</span>L
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
