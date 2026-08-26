import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton, Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { NumberPad } from '../components/ui/NumberPad'
import { useCompetitiveStore } from '../stores/competitiveStore'
import { useSessionStore } from '../stores/sessionStore'
import { useLogActivity } from '../hooks/useActivityFeed'
import { dbInsert, dbUpdate } from '../lib/db'
import { playerColor } from '../utils/playerColor'

const QUOTA_PRESETS = [10, 20]

export default function NextPage() {
  const nav = useNavigate()
  const { gameId, players, setQuotaPerPlayer: storeSetQuota, reset } = useCompetitiveStore()
  const { activeSessionId } = useSessionStore()
  const logActivity = useLogActivity()

  // Two phases: pick the target-makes quota first (PRD §6.3, default 10,
  // adjustable), then the same post-game count-entry grid pattern as
  // Middies.
  const [phase, setPhase] = useState<'quota' | 'entry'>('quota')
  const [quota, setQuota] = useState(10)
  const [quotaNumberPadOpen, setQuotaNumberPadOpen] = useState(false)
  const [makes, setMakesState] = useState<Record<string, number>>({})
  const [numberPadPlayerId, setNumberPadPlayerId] = useState<string | null>(null)

  function setMakes(id: string, value: number) {
    setMakesState(m => ({ ...m, [id]: value }))
  }

  // Unlike Middies, a Next result DOES feed Recreational W/L (rank === 1 is
  // a win) — usePlayerRecreationalRecord's RECREATIONAL_GAME_TYPES already
  // includes 'next', so persisting `game_type: 'next'` (done at
  // competitive_games creation) is all that's needed for that to apply.
  const ranked = [...players].sort((a, b) => (makes[b.id] ?? 0) - (makes[a.id] ?? 0))

  async function handleContinue() {
    storeSetQuota(quota)
    if (gameId) await dbUpdate('competitive_games', gameId, { quota_per_player: quota }).catch(() => {})
    setPhase('entry')
  }

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
        feed_summary: top ? `Next (to ${quota}) · ${top.nickname} led with ${makes[top.id] ?? 0} makes` : `Next (to ${quota})`,
      })
    }
    reset()
    nav('/')
  }

  return (
    <div className="min-h-dvh px-[18px] pt-[54px] pb-28">
      <BackButton onClick={() => phase === 'entry' ? setPhase('quota') : nav('/activity/setup')}>
        {phase === 'entry' ? 'Target' : 'Setup'}
      </BackButton>

      <div style={{
        background: 'var(--hero-gradient)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--r-lg)',
        padding: '16px 18px',
        marginBottom: 20,
        marginTop: 16,
      }}>
        <p style={{ fontSize: 11, color: 'var(--hero-eyebrow)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>Next</p>
        <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 20 }}>
          {phase === 'quota' ? 'Target Makes' : 'Result'}
        </div>
      </div>

      {phase === 'quota' ? (
        <>
          <p className="text-[var(--dim)] text-[13px] mb-4">Set the target number of makes for this game.</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {QUOTA_PRESETS.map(v => (
              <button
                key={v}
                onClick={() => setQuota(v)}
                className="flex justify-center items-center py-[13px] rounded-full text-[13px] font-bold border cursor-pointer transition-all"
                style={{
                  background: quota === v ? 'var(--orange)' : 'var(--panel-2)',
                  color: quota === v ? '#0c0c0c' : 'var(--dim)',
                  borderColor: quota === v ? 'var(--orange)' : 'var(--line)',
                }}
              >
                {v}
              </button>
            ))}
            <button
              onClick={() => setQuotaNumberPadOpen(true)}
              className="flex justify-center items-center py-[13px] rounded-full text-[13px] font-bold border cursor-pointer transition-all"
              style={{
                background: !QUOTA_PRESETS.includes(quota) ? 'var(--orange)' : 'var(--panel-2)',
                color: !QUOTA_PRESETS.includes(quota) ? '#0c0c0c' : 'var(--dim)',
                borderColor: !QUOTA_PRESETS.includes(quota) ? 'var(--orange)' : 'var(--line)',
              }}
            >
              {!QUOTA_PRESETS.includes(quota) ? quota : 'Other'}
            </button>
          </div>
          <div className="fixed bottom-[18px] left-[14px] right-[14px]">
            <Button variant="primary" onClick={handleContinue} disabled={players.length === 0}>Continue</Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[var(--dim)] text-[13px] mb-4">Tap a player's makes to enter their count (target: {quota}).</p>
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
            <Button variant="primary" onClick={handleSave}>Save Result</Button>
          </div>
        </>
      )}

      <NumberPad
        isOpen={quotaNumberPadOpen}
        value={quota}
        label="Target makes"
        onConfirm={(v) => { if (v > 0) setQuota(v) }}
        onClose={() => setQuotaNumberPadOpen(false)}
      />
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
