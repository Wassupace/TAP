import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton, Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { useCompetitiveStore } from '../stores/competitiveStore'
import { useSessionStore } from '../stores/sessionStore'
import { useLogActivity } from '../hooks/useActivityFeed'
import { dbInsert } from '../lib/db'
import { playerColor } from '../utils/playerColor'

export default function GenericPage() {
  const nav = useNavigate()
  const { gameId, customName, players, reset } = useCompetitiveStore()
  const { activeSessionId } = useSessionStore()
  const logActivity = useLogActivity()

  // Same tap-in-elimination-order ranking as Banks (PRD §6.4).
  const [eliminationOrder, setEliminationOrder] = useState<string[]>([])

  const remaining = players.filter(p => !eliminationOrder.includes(p.id))
  const isComplete = players.length >= 2 && remaining.length <= 1
  const winner = isComplete ? remaining[0] : undefined

  const rankedPlayers = isComplete && winner
    ? [winner, ...[...eliminationOrder].reverse().map(id => players.find(p => p.id === id)!)]
    : []

  function eliminate(id: string) {
    setEliminationOrder(order => order.includes(id) ? order : [...order, id])
  }

  function undoLastElimination() {
    setEliminationOrder(order => order.slice(0, -1))
  }

  async function handleSave() {
    if (!isComplete || !winner || !gameId) return
    await Promise.all(
      rankedPlayers.map((p, i) =>
        dbInsert('competitive_results', {
          game_id: gameId,
          player_id: p.id,
          rank: i + 1,
        }).catch(() => {})
      )
    )
    if (activeSessionId) {
      logActivity.mutate({
        session_id: activeSessionId,
        activity_type: 'competitiveGame',
        reference_id: gameId,
        feed_summary: `${customName || 'Generic'} · ${winner.nickname} won`,
      })
    }
    reset()
    nav('/')
  }

  const rankBadgeStyle = (i: number): React.CSSProperties => {
    if (i === 0) return { background: 'var(--orange)', color: '#fff' }
    if (i === 1) return { background: 'rgba(255,255,255,0.1)', color: 'var(--dim)' }
    return { background: 'var(--panel-2)', color: 'var(--faint)' }
  }

  const rankBorderStyle = (i: number): React.CSSProperties => {
    if (i === 0) return { borderLeft: '3px solid var(--orange)' }
    return { borderLeft: '1px solid var(--line)' }
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
          {customName || 'Generic'}
        </p>
        <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 20 }}>Result</div>
      </div>

      <p className="text-[var(--dim)] text-[13px] mb-4">
        {players.length < 2 ? 'Need at least 2 players.' : "Tap a player as they're eliminated — last standing wins."}
      </p>

      {!isComplete && remaining.length > 0 && (
        <>
          <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">Still Playing</p>
          <div className="flex gap-2 flex-wrap mb-4">
            {remaining.map(p => (
              <button
                key={p.id}
                onClick={() => eliminate(p.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border cursor-pointer transition-all"
                style={{ borderRadius: 'var(--r-pill)', background: 'var(--panel-2)', borderColor: 'var(--line)' }}
              >
                <Avatar nickname={p.nickname} color={playerColor(p.id)} />
                <span className="text-[13px] font-bold">{p.nickname}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {(isComplete || eliminationOrder.length > 0) && (
        <>
          <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">Elimination Order</p>
          <div className="space-y-2 stagger mb-3">
            {(isComplete ? rankedPlayers : [...eliminationOrder].reverse().map(id => players.find(p => p.id === id)!)).map((p, i) => {
              const isWinner = isComplete && i === 0
              const isLast = isComplete && i === rankedPlayers.length - 1
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-[13px_14px]"
                  style={{ borderRadius: 'var(--r-md)', background: 'var(--panel-2)', border: '1px solid var(--line)', ...rankBorderStyle(i) }}
                >
                  <span
                    className="font-display text-[13px] w-[26px] h-[26px] flex items-center justify-center flex-shrink-0"
                    style={{ borderRadius: 'var(--r-sm)', fontWeight: 800, ...rankBadgeStyle(i) }}
                  >
                    {i + 1}
                  </span>
                  <Avatar nickname={p.nickname} color={playerColor(p.id)} />
                  <div>
                    <div className="font-bold text-[14px]">{p.nickname}</div>
                    {(isWinner || isLast) && (
                      <div className="text-[12px] mt-0.5" style={{ color: isWinner ? 'var(--orange)' : 'var(--red)' }}>
                        {isWinner ? 'Winner' : 'Out first'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {eliminationOrder.length > 0 && (
            <button
              type="button"
              onClick={undoLastElimination}
              className="text-[12px] font-bold mb-3"
              style={{ background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer' }}
            >
              ↩ Undo last elimination
            </button>
          )}
        </>
      )}

      <div className="fixed bottom-[18px] left-[14px] right-[14px]">
        <Button variant="primary" onClick={handleSave} disabled={!isComplete}>Save Result</Button>
      </div>
    </div>
  )
}
