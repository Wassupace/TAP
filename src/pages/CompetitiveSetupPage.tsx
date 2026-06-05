import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton, Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Icons } from '../components/ui/icons'
import { SHOT_SPOTS, SPOT_LABELS, type ShotSpot } from '../types'

const GAME_TYPES = ['Banks', 'Middies', 'Next', 'Generic'] as const
const MOCK_PLAYERS = [
  { id: '1', nickname: 'JC', color: '#FF5A1F' }, { id: '2', nickname: 'Marcus', color: '#3B82F6' },
  { id: '3', nickname: 'Dre', color: '#22C55E' }, { id: '4', nickname: 'Sef', color: '#EAB308' },
  { id: '5', nickname: 'Tomas', color: '#A855F7' },
]

export default function CompetitiveSetupPage() {
  const nav = useNavigate()
  const [gameType, setGameType] = useState<typeof GAME_TYPES[number]>('Banks')
  const [spot, setSpot] = useState<ShotSpot>('center')
  const [selectedPlayers, setSelectedPlayers] = useState(new Set(['1','2','3','4','5']))

  const togglePlayer = (id: string) => setSelectedPlayers(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const needsSpot = gameType === 'Banks' || gameType === 'Middies'

  return (
    <div className="min-h-dvh px-[18px] pt-[54px] pb-28">
      <BackButton onClick={() => nav('/')}>Session</BackButton>
      <div className="flex items-center justify-between mt-4 mb-4">
        <span className="font-display text-[22px] uppercase tracking-[.02em]">New Activity</span>
      </div>

      {/* Type selector */}
      <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">Type</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {GAME_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setGameType(t)}
            className="flex justify-center items-center py-[13px] rounded-full text-[13px] font-bold border cursor-pointer transition-all"
            style={{
              background: gameType === t ? 'var(--orange)' : 'var(--panel-2)',
              color: gameType === t ? '#0c0c0c' : 'var(--dim)',
              borderColor: gameType === t ? 'var(--orange)' : 'var(--line)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Spot selector */}
      {needsSpot && (
        <>
          <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">3PT Spot</p>
          <div className="grid grid-cols-5 gap-[7px] mb-4">
            {SHOT_SPOTS.map(s => (
              <button
                key={s}
                onClick={() => setSpot(s)}
                className="flex justify-center items-center py-[11px] rounded-full text-[11px] font-bold border cursor-pointer transition-all"
                style={{
                  background: spot === s ? 'var(--orange)' : 'var(--panel-2)',
                  color: spot === s ? '#0c0c0c' : 'var(--dim)',
                  borderColor: spot === s ? 'var(--orange)' : 'var(--line)',
                }}
              >
                {SPOT_LABELS[s]}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Players */}
      <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">Players · {selectedPlayers.size}</p>
      <div className="flex gap-2 flex-wrap mb-4">
        {MOCK_PLAYERS.map(p => (
          <button
            key={p.id}
            onClick={() => togglePlayer(p.id)}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 border cursor-pointer transition-all"
            style={{
              background: selectedPlayers.has(p.id) ? 'var(--orange-soft)' : 'var(--panel-2)',
              borderColor: selectedPlayers.has(p.id) ? 'var(--orange)' : 'var(--line)',
            }}
          >
            <Avatar nickname={p.nickname} color={p.color} />
            <span className="text-[13px] font-bold">{p.nickname}</span>
          </button>
        ))}
      </div>

      <div className="fixed bottom-[18px] left-[14px] right-[14px]">
        <Button variant="primary" onClick={() => gameType === 'Banks' ? nav('/activity/banks') : nav('/')}>
          <span className="w-5 h-5">{Icons.bolt}</span>
          Start {gameType}
        </Button>
      </div>
    </div>
  )
}
