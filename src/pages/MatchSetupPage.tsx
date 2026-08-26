import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { BackButton, Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Icons } from '../components/ui/icons'
import { NumberPad } from '../components/ui/NumberPad'
import { useMatchStore } from '../stores/matchStore'
import { usePlayers } from '../hooks/usePlayers'
import { useSessionStore } from '../stores/sessionStore'
import { supabase } from '../lib/supabase'
import { ALL_FORMATS, type MatchFormat } from '../types'

const TARGET_PRESETS = [7, 11, 21]
const DURATION_PRESETS = [10, 20]
// Manual reassignment cycle order (PRD §5.2): A → B → Sub → A
const NEXT_SIDE: Record<'A' | 'B' | 'sub', 'A' | 'B' | 'sub'> = { A: 'B', B: 'sub', sub: 'A' }

export default function MatchSetupPage() {
  const nav = useNavigate()
  const {
    format, targetScore, scoringStyle, durationMinutes, teamA, teamB, subQueue,
    setFormat, setTargetScore, setScoringStyle, setDurationMinutes, randomize, movePlayer, setMatchId,
  } = useMatchStore()
  const { activeSessionId } = useSessionStore()
  const { data: players = [] } = usePlayers()
  const [numberPadOpen, setNumberPadOpen] = useState(false)

  const handleRandomize = () => randomize(players)

  const handleStart = async () => {
    if (teamA.length === 0) return
    try {
      const { data, error } = await supabase
        .from('matches')
        .insert({
          session_id: activeSessionId,
          format,
          target_score: scoringStyle === 'targetScore' ? targetScore : null,
          duration_minutes: scoringStyle === 'durationWave' ? durationMinutes : null,
          scoring_style: scoringStyle,
          started_at: new Date().toISOString(),
          team_a_player_ids: teamA.map((p) => p.id),
          team_b_player_ids: teamB.map((p) => p.id),
          sub_queue_player_ids: subQueue.map((p) => p.id),
        })
        .select('id')
        .single()
      if (!error && data) setMatchId(data.id)
    } catch {
      // Offline — matchId stays null. endGame()'s `if (matchId)` gate means
      // any games logged during this match are never persisted (not
      // queued for later) until a match row exists.
    }
    nav('/match/active')
  }

  return (
    <div className="min-h-dvh pb-28">
      {/* Hero gradient header */}
      <div style={{ background: 'var(--hero-gradient)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '54px 18px 20px' }}>
        <BackButton onClick={() => nav('/')}>Session</BackButton>
        <div className="flex items-center justify-between mt-4">
          <span className="font-display text-[22px] uppercase tracking-[.02em]">New Match</span>
        </div>
      </div>
      <div className="px-[18px] pt-4">

      {/* Format */}
      <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">Format</p>
      <div className="grid grid-cols-5 gap-[7px] mb-4">
        {ALL_FORMATS.map(f => (
          <button
            key={f}
            onClick={() => setFormat(f as MatchFormat)}
            className="flex justify-center items-center py-[11px] rounded-full text-[12px] font-bold border cursor-pointer transition-all"
            style={{
              background: format === f ? 'var(--orange)' : 'var(--panel-2)',
              color: format === f ? '#0c0c0c' : 'var(--dim)',
              borderColor: format === f ? 'var(--orange)' : 'var(--line)',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Scoring style — set first per PRD §5.1, mutually exclusive with the
          Target/Duration input shown below it */}
      <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">Scoring</p>
      <div className="flex overflow-hidden mb-4" style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
        <button
          onClick={() => setScoringStyle('targetScore')}
          className="flex-1 py-3 text-[12px] font-bold border-0 cursor-pointer"
          style={{ background: scoringStyle === 'targetScore' ? 'var(--orange)' : 'var(--panel-2)', color: scoringStyle === 'targetScore' ? '#0c0c0c' : 'var(--dim)' }}
        >
          Target
        </button>
        <button
          onClick={() => setScoringStyle('durationWave')}
          className="flex-1 py-3 text-[12px] font-bold border-0 cursor-pointer"
          style={{ background: scoringStyle === 'durationWave' ? 'var(--orange)' : 'var(--panel-2)', color: scoringStyle === 'durationWave' ? '#0c0c0c' : 'var(--dim)' }}
        >
          Wave
        </button>
      </div>

      {scoringStyle === 'targetScore' ? (
        <div className="mb-4">
          <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">Target Points</p>
          <div className="grid grid-cols-4 gap-2">
            {TARGET_PRESETS.map(v => (
              <button
                key={v}
                onClick={() => setTargetScore(v)}
                className="flex justify-center items-center py-[13px] rounded-full text-[13px] font-bold border cursor-pointer transition-all"
                style={{
                  background: targetScore === v ? 'var(--orange)' : 'var(--panel-2)',
                  color: targetScore === v ? '#0c0c0c' : 'var(--dim)',
                  borderColor: targetScore === v ? 'var(--orange)' : 'var(--line)',
                }}
              >
                {v}
              </button>
            ))}
            <button
              onClick={() => setNumberPadOpen(true)}
              className="flex justify-center items-center py-[13px] rounded-full text-[13px] font-bold border cursor-pointer transition-all"
              style={{
                background: !TARGET_PRESETS.includes(targetScore) ? 'var(--orange)' : 'var(--panel-2)',
                color: !TARGET_PRESETS.includes(targetScore) ? '#0c0c0c' : 'var(--dim)',
                borderColor: !TARGET_PRESETS.includes(targetScore) ? 'var(--orange)' : 'var(--line)',
              }}
            >
              {!TARGET_PRESETS.includes(targetScore) ? targetScore : 'Other'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">Duration (min)</p>
          <div className="grid grid-cols-3 gap-2">
            {DURATION_PRESETS.map(v => (
              <button
                key={v}
                onClick={() => setDurationMinutes(v)}
                className="flex justify-center items-center py-[13px] rounded-full text-[13px] font-bold border cursor-pointer transition-all"
                style={{
                  background: durationMinutes === v ? 'var(--orange)' : 'var(--panel-2)',
                  color: durationMinutes === v ? '#0c0c0c' : 'var(--dim)',
                  borderColor: durationMinutes === v ? 'var(--orange)' : 'var(--line)',
                }}
              >
                {v}
              </button>
            ))}
            <button
              onClick={() => setNumberPadOpen(true)}
              className="flex justify-center items-center py-[13px] rounded-full text-[13px] font-bold border cursor-pointer transition-all"
              style={{
                background: !DURATION_PRESETS.includes(durationMinutes) ? 'var(--orange)' : 'var(--panel-2)',
                color: !DURATION_PRESETS.includes(durationMinutes) ? '#0c0c0c' : 'var(--dim)',
                borderColor: !DURATION_PRESETS.includes(durationMinutes) ? 'var(--orange)' : 'var(--line)',
              }}
            >
              {!DURATION_PRESETS.includes(durationMinutes) ? durationMinutes : 'Other'}
            </button>
          </div>
        </div>
      )}

      {/* Teams */}
      <div className="flex justify-between items-center mb-2">
        <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold">Teams</p>
        <button onClick={handleRandomize} className="flex items-center gap-1.5 bg-transparent border-0 cursor-pointer font-bold text-[13px]" style={{ color: 'var(--orange-2)' }}>
          <span className="w-4 h-4">{Icons.shuffle}</span> Re-shuffle
        </button>
      </div>

      {teamA.length === 0 && teamB.length === 0 ? (
        <button onClick={handleRandomize} className="w-full py-4 border-dashed border text-[14px] text-[var(--dim)] mb-3" style={{ background: 'var(--panel)', borderColor: 'var(--line-2)', borderRadius: 'var(--r-md)' }}>
          Tap Re-shuffle to assign teams
        </button>
      ) : (
        <>
          <p className="text-[11px] text-[var(--faint)] mb-2">Tap a player to move them A → B → Sub → A</p>
          {[{ label: 'Team A', col: '#3B82F6', soft: 'var(--blue-soft)', bg: 'rgba(59,130,246,0.06)', players: teamA, side: 'A' as const },
            { label: 'Team B', col: '#EF4444', soft: 'var(--red-soft)',  bg: 'rgba(239,68,68,0.06)',  players: teamB, side: 'B' as const }].map(team => (
            <div key={team.label} className="rounded-[var(--r-lg)] p-4 mb-2.5" style={{ background: team.bg, border: '1px solid var(--line)', borderLeft: `3px solid ${team.col}` }}>
              <p className="text-[11px] tracking-[.2em] uppercase font-bold mb-2" style={{ color: team.col }}>{team.label}</p>
              <div className="flex gap-2 flex-wrap">
                {team.players.map(p => (
                  <button
                    key={p.id}
                    onClick={() => movePlayer(p.id, NEXT_SIDE[team.side])}
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 border-0 cursor-pointer"
                    style={{ background: team.soft }}
                  >
                    <Avatar nickname={p.nickname} />
                    <span className="text-[13px] font-bold">{p.nickname}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {subQueue.length > 0 && (
            <div className="p-4" style={{ background: 'var(--panel)', border: '1px dashed var(--line-2)', borderRadius: 'var(--r-lg)' }}>
              <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">Sub queue</p>
              <div className="flex gap-2 flex-wrap">
                {subQueue.map(p => (
                  <button
                    key={p.id}
                    onClick={() => movePlayer(p.id, NEXT_SIDE['sub'])}
                    className="border-0 bg-transparent cursor-pointer p-0"
                  >
                    <Avatar nickname={p.nickname} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="fixed bottom-[18px] left-[14px] right-[14px]">
        <Button variant="primary" onClick={handleStart} disabled={teamA.length === 0}>
          <span className="w-5 h-5">{Icons.bolt}</span>
          Start Match
        </Button>
      </div>
      </div>{/* end px wrapper */}

      <NumberPad
        isOpen={numberPadOpen}
        value={scoringStyle === 'targetScore' ? targetScore : durationMinutes}
        label={scoringStyle === 'targetScore' ? 'Target points' : 'Duration (minutes)'}
        onConfirm={(v) => {
          if (v <= 0) return
          if (scoringStyle === 'targetScore') setTargetScore(v)
          else setDurationMinutes(v)
        }}
        onClose={() => setNumberPadOpen(false)}
      />
    </div>
  )
}
