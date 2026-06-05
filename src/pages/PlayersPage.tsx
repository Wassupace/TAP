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

  const filtered = MOCK_PLAYERS.filter(p =>
    p.nickname.toLowerCase().includes(query.toLowerCase()) ||
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="min-h-dvh px-[18px] pt-[54px] pb-8">
      <BackButton onClick={() => nav('/')}>Dashboard</BackButton>

      <div className="flex items-center justify-between mt-4 mb-4">
        <span className="font-display text-[22px] uppercase tracking-[.02em]">Players</span>
        <button className="w-[42px] h-[42px] rounded-[14px] grid place-items-center bg-[var(--panel)] border border-[var(--line)] text-chalk cursor-pointer hover:bg-[var(--panel-2)] transition-colors">
          <span className="w-5 h-5">{Icons.plus}</span>
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 rounded-[14px] px-4 py-3 mb-4" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}>
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
        {filtered.map(p => (
          <button
            key={p.id}
            onClick={() => nav(`/players/${p.id}`)}
            className="w-full flex gap-3 items-center p-[13px_14px] rounded-[12px] cursor-pointer text-left transition-all hover:bg-[var(--panel-2)]"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
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
        ))}
      </div>
    </div>
  )
}
