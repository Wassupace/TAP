import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton, Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Tag } from '../components/ui/Tag'
import { Icons } from '../components/ui/icons'
import { SHOT_SPOTS, SPOT_LABELS, type ShotSpot } from '../types'
import { usePlayers } from '../hooks/usePlayers'
import { playerColor } from '../utils/playerColor'

const GAME_TYPES = ['Banks', 'Middies', 'Next', 'Generic'] as const

const TAG_VARIANT: Record<typeof GAME_TYPES[number], 'banks' | 'drill' | 'match' | 'generic'> = {
  Banks: 'banks',
  Middies: 'drill',
  Next: 'match',
  Generic: 'generic',
}

export default function CompetitiveSetupPage() {
  const nav = useNavigate()
  const [gameType, setGameType] = useState<typeof GAME_TYPES[number]>('Banks')
  const [spot, setSpot] = useState<ShotSpot>('center')
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())

  const { data: players = [] } = usePlayers()

  const togglePlayer = (id: string) => setSelectedPlayers(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const needsSpot = gameType === 'Banks' || gameType === 'Middies'

  return (
    <div className="min-h-dvh px-[18px] pt-[54px] pb-28">
      <BackButton onClick={() => nav('/')}>Session</BackButton>

      {/* Hero gradient header */}
      <div style={{
        background: 'var(--hero-gradient)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--r-lg)',
        padding: '16px 18px',
        marginBottom: 20,
        marginTop: 16,
      }}>
        <p style={{ fontSize: 11, color: '#93C5FD', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>New Activity</p>
        <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 20 }}>Competitive Game</div>
      </div>

      {/* Type selector */}
      <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">Type</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {GAME_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setGameType(t)}
            className="flex flex-col justify-center items-center gap-1.5 py-[13px] cursor-pointer transition-all"
            style={{
              borderRadius: 'var(--r-md)',
              background: gameType === t ? 'rgba(255,90,31,0.1)' : 'var(--panel)',
              border: gameType === t ? '2px solid var(--orange)' : '1px solid var(--line)',
            }}
          >
            <Tag variant={TAG_VARIANT[t]}>{t}</Tag>
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
                className="flex justify-center items-center py-[11px] text-[11px] font-bold border cursor-pointer transition-all"
                style={{
                  borderRadius: 'var(--r-pill)',
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
        {players.map(p => {
          const color = playerColor(p.id)
          return (
            <button
              key={p.id}
              onClick={() => togglePlayer(p.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border cursor-pointer transition-all"
              style={{
                borderRadius: 'var(--r-pill)',
                background: selectedPlayers.has(p.id) ? 'var(--orange-soft)' : 'var(--panel-2)',
                borderColor: selectedPlayers.has(p.id) ? 'var(--orange)' : 'var(--line)',
              }}
            >
              <Avatar nickname={p.nickname} color={color} />
              <span className="text-[13px] font-bold">{p.nickname}</span>
            </button>
          )
        })}
        {players.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--faint)' }}>No players in roster. Add them in the Players page first.</p>
        )}
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
