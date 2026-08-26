import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Icons } from '../components/ui/icons'
import { useMatchStore } from '../stores/matchStore'
import { useSessionStore } from '../stores/sessionStore'
import { useLogActivity } from '../hooks/useActivityFeed'
import { usePlayers } from '../hooks/usePlayers'

export default function MatchRecapPage() {
  const nav = useNavigate()
  const { completedGames, format, matchId, reset, resetForRematch } = useMatchStore()
  const { activeSessionId } = useSessionStore()
  const logActivity = useLogActivity()
  const { data: players = [] } = usePlayers()
  const totalMin = Math.round(completedGames.reduce((s, g) => s + g.durationSeconds, 0) / 60)

  const aWins  = completedGames.filter(g => g.teamAScore > g.teamBScore).length
  const bWins  = completedGames.length - aWins
  const closest = completedGames.reduce<typeof completedGames[0] | null>((best, g) => {
    const margin = Math.abs(g.teamAScore - g.teamBScore)
    if (!best) return g
    return margin < Math.abs(best.teamAScore - best.teamBScore) ? g : best
  }, null)
  const longest = completedGames.reduce<typeof completedGames[0] | null>((best, g) =>
    !best || g.durationSeconds > best.durationSeconds ? g : best, null)

  // Tie-breaker (PRD §5.3 ruling): a tie in game-win count is broken by the
  // largest aggregate point differential across all games; still equal is
  // a Draw. `totalDiff` is Team A's own aggregate differential — Team B's
  // is always its exact negation, so its sign alone decides the winner.
  const totalDiff = completedGames.reduce((s, g) => s + (g.teamAScore - g.teamBScore), 0)
  const tieBreakSide: 'A' | 'B' | 'draw' | null =
    aWins !== bWins ? null : totalDiff > 0 ? 'A' : totalDiff < 0 ? 'B' : 'draw'

  // Dominance: the team with strictly more game wins (no tie-breaker
  // applied here — a tie has no dominant side), plus its average winning
  // margin across just those wins.
  const dominantSide: 'A' | 'B' | null = aWins > bWins ? 'A' : bWins > aWins ? 'B' : null
  const dominantGames = dominantSide
    ? completedGames.filter(g => dominantSide === 'A' ? g.teamAScore > g.teamBScore : g.teamBScore > g.teamAScore)
    : []
  const avgMargin = dominantGames.length > 0
    ? dominantGames.reduce((s, g) => s + Math.abs(g.teamAScore - g.teamBScore), 0) / dominantGames.length
    : 0

  // Best side: the player present on the winning team across the most
  // completed games (a draw contributes to neither side's tally).
  const winTally = new Map<string, number>()
  completedGames.forEach(g => {
    if (g.teamAScore > g.teamBScore) g.teamAPlayerIds.forEach(id => winTally.set(id, (winTally.get(id) ?? 0) + 1))
    else if (g.teamBScore > g.teamAScore) g.teamBPlayerIds.forEach(id => winTally.set(id, (winTally.get(id) ?? 0) + 1))
  })
  let bestPlayerId: string | null = null
  let bestCount = 0
  winTally.forEach((count, id) => {
    if (count > bestCount) { bestCount = count; bestPlayerId = id }
  })
  const bestPlayer = bestPlayerId ? players.find(p => p.id === bestPlayerId) : null

  const resultValue = `Team A ${aWins}–${bWins} Team B across ${completedGames.length} game${completedGames.length !== 1 ? 's' : ''} · ${totalMin}m`
    + (tieBreakSide === 'draw' ? ' · Draw on point differential'
      : tieBreakSide ? ` · Team ${tieBreakSide} wins on point differential` : '')

  const callouts = [
    { icon: Icons.trophy, label: 'Result', value: resultValue },
    closest ? { icon: Icons.flame, label: 'Closest game', value: `Game ${closest.gameNumber} — decided by ${Math.abs(closest.teamAScore - closest.teamBScore)} point${Math.abs(closest.teamAScore - closest.teamBScore) !== 1 ? 's' : ''}` } : null,
    longest && completedGames.length > 1 ? { icon: Icons.clock, label: 'Longest game', value: `Game ${longest.gameNumber} — ${Math.round(longest.durationSeconds / 60)} min` } : null,
    dominantSide && dominantGames.length > 0 ? { icon: Icons.bolt, label: 'Dominance', value: `Team ${dominantSide} — ${dominantGames.length} win${dominantGames.length !== 1 ? 's' : ''}, avg margin ${avgMargin.toFixed(1)}` } : null,
    bestPlayer && bestCount > 0 ? { icon: Icons.target, label: 'Best side', value: `${bestPlayer.nickname} — on the winning team ${bestCount} time${bestCount !== 1 ? 's' : ''}` } : null,
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string }[]

  async function handleDone(rematch = false) {
    if (activeSessionId && matchId) {
      logActivity.mutate({
        session_id: activeSessionId,
        activity_type: 'match',
        reference_id: matchId,
        feed_summary: `${format} · ${completedGames.length} game${completedGames.length !== 1 ? 's' : ''} · ${totalMin}min · Team A ${aWins}–${bWins}`,
      })
    }
    if (rematch) {
      // Quick Rematch (PRD §5.4): keep format/teamA/teamB/subQueue, only
      // clear scores/completedGames/timer — lands back on Match Setup
      // pre-filled instead of empty.
      resetForRematch()
    } else {
      reset()
    }
    nav(rematch ? '/match/setup' : '/')
  }


  return (
    <div className="min-h-dvh flex flex-col">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 stagger">
        {/* Hero gradient header */}
        <div style={{ background: 'var(--hero-gradient)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '54px 18px 24px', textAlign: 'center' }}>
          <div className="inline-grid place-items-center w-16 h-16 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--orange)' }}>
            <span className="w-6 h-6">{Icons.trophy}</span>
          </div>
          <div className="font-display text-[26px] uppercase">Match Complete</div>
          <p className="text-[var(--dim)] text-[13px] mt-1">{format} · {completedGames.length} games · {totalMin}m</p>
        </div>

        {/* Game-by-game scores */}
        {completedGames.length > 0 && (
          <div className="px-[18px] pt-4">
            <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">Games</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
              {completedGames.map(g => {
                const aWon = g.teamAScore > g.teamBScore
                return (
                  <div key={g.gameNumber} className="flex-none p-[10px_14px] text-center" style={{ background: 'var(--panel)', border: `1px solid var(--line)`, borderLeft: `3px solid ${aWon ? '#3B82F6' : '#EF4444'}`, borderRadius: 'var(--r-md)' }}>
                    <div className="text-[10px] text-[var(--faint)] font-bold">G{g.gameNumber}</div>
                    <div className="font-display text-[18px]">{g.teamAScore}–{g.teamBScore}</div>
                    <div className="text-[10px] text-[var(--dim)]">{Math.round(g.durationSeconds / 60)}m</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Callouts */}
        <div className="px-[18px]">
          {callouts.map(c => (
            <Card key={c.label} variant="accent" className="flex gap-3 mb-2.5">
              <div className="w-[42px] h-[42px] grid place-items-center flex-none" style={{ background: 'var(--orange-soft)', color: 'var(--orange-2)', borderRadius: 'var(--r-sm)' }}>
                <span className="w-[21px] h-[21px]">{c.icon}</span>
              </div>
              <div>
                <div className="text-[11px] tracking-[.12em] uppercase font-bold mb-1" style={{ color: 'var(--orange-2)' }}>{c.label}</div>
                <div className="text-[15px] font-semibold leading-[1.35]">{c.value}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="absolute bottom-[18px] left-[14px] right-[14px] flex gap-2.5">
        <Button variant="ghost" className="flex-1 !min-h-[54px] !text-[14px]" onClick={() => handleDone(false)}>
          Done
        </Button>
        <Button variant="primary" className="flex-1 !min-h-[54px] !text-[14px]" onClick={() => handleDone(true)}>
          <span className="w-5 h-5">{Icons.bolt}</span> Quick Rematch
        </Button>
      </div>
    </div>
  )
}

