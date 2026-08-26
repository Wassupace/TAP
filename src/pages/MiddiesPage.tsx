import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton, Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { NumberPad } from '../components/ui/NumberPad'
import { useCompetitiveStore } from '../stores/competitiveStore'
import { useSessionStore } from '../stores/sessionStore'
import { useLogActivity } from '../hooks/useActivityFeed'
import { dbInsert } from '../lib/db'
import { playerColor } from '../utils/playerColor'
import { SPOT_LABELS } from '../types'

export default function MiddiesPage() {
  const nav = useNavigate()
  const { gameId, spot, players, reset } = useCompetitiveStore()
  const { activeSessionId } = useSessionStore()
  const logActivity = useLogActivity()

  const [makes, setMakesState] = useState<Record<string, number>>({})
  const [numberPadPlayerId, setNumberPadPlayerId] = useState<string | null>(null)

  function setMakes(id: string, value: number) {
    setMakesState(m => ({ ...m, [id]: value }))
  }

  // Ranked by makes descending. PRD §6.2: Middies' career stat is Mid-Range
  // %, never Recreational W/L — usePlayerRecreationalRecord's
  // RECREATIONAL_GAME_TYPES already excludes 'middies', so no special
  // handling is needed here beyond persisting `game_type: 'middies'`
  // (done at competitive_games creation, in CompetitiveSetupPage).
  const ranked = [...players].sort((a, b) => (makes[b.id] ?? 0) - (makes[a.id] ?? 0))

  async function handleSave() {
    if (!gameId || players.length === 0) return
    await Promise.all(
      ranked.map((p, i) =>
        dbInsert('competitive_results', {
          game_id: gameId,
          player_id: p.id,
          rank: i + 1,
          makes: makes[p.id] ?? 0,
        }).catch(() => {})
      )
    )
    if (activeSessionId) {
      const top = ranked[0]
      logActivity.mutate({
        session_id: activeSessionId,
        activity_type: 'competitiveGame',
        reference_id: gameId,
        feed_summary: top ? `Middies · ${top.nickname} led with ${makes[top.id] ?? 0} makes` : 'Middies',
      })
    }
    reset()
    nav('/')
  }

  return (
    <div className="min-h-dvh px-[18px] pt-[54px] pb-28">
      <BackButton onClick={() => nav('/activity/setup')}>Setup</BackButton>

      <div style={{
        background: 'var(--hero-gradient)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--r-lg)',
        padding: '16px 18px',
        marginBottom: 20,
        marginTop: 16,
      }}>
        <p style={{ fontSize: 11, color: 'var(--hero-eyebrow)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>
          Middies{spot ? ` · ${SPOT_LABELS[spot]}` : ''}
        </p>
        <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 20 }}>Result</div>
      </div>

      {players.length === 0 ? (
        <p className="text-[var(--dim)] text-[13px] mb-4">No players selected for this game.</p>
      ) : (
        <p className="text-[var(--dim)] text-[13px] mb-4">Tap a player's makes to enter their count.</p>
      )}

      <div className="space-y-2 stagger">
        {players.map(p => (
          <button
            key={p.id}
            onClick={() => setNumberPadPlayerId(p.id)}
            className="w-full flex items-center gap-3 p-[13px_14px] border cursor-pointer transition-all"
            style={{ borderRadius: 'var(--r-md)', background: 'var(--panel-2)', borderColor: 'var(--line)' }}
          >
            <Avatar nickname={p.nickname} color={playerColor(p.id)} />
            <span className="font-bold text-[14px]">{p.nickname}</span>
            <span className="ml-auto font-display text-[20px]">{makes[p.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="fixed bottom-[18px] left-[14px] right-[14px]">
        <Button variant="primary" onClick={handleSave} disabled={players.length === 0}>Save Result</Button>
      </div>

      <NumberPad
        isOpen={numberPadPlayerId !== null}
        value={numberPadPlayerId ? makes[numberPadPlayerId] ?? 0 : 0}
        label="Makes"
        onConfirm={(v) => { if (numberPadPlayerId) setMakes(numberPadPlayerId, v) }}
        onClose={() => setNumberPadPlayerId(null)}
      />
    </div>
  )
}
