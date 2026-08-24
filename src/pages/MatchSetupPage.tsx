import { useNavigate } from 'react-router-dom'
import { BackButton, Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Icons } from '../components/ui/icons'
import { useMatchStore } from '../stores/matchStore'
import { usePlayers } from '../hooks/usePlayers'
import { useSessionStore } from '../stores/sessionStore'
import { supabase } from '../lib/supabase'
import { ALL_FORMATS, type MatchFormat } from '../types'

export default function MatchSetupPage() {
  const nav = useNavigate()
  const { format, targetScore, teamA, teamB, subQueue, setFormat, setTargetScore, randomize, setMatchId } = useMatchStore()
  const { activeSessionId } = useSessionStore()
  const { data: players = [] } = usePlayers()

  const handleRandomize = () => randomize(players)

  const handleStart = async () => {
    if (teamA.length === 0) return
    try {
      const { data, error } = await supabase
        .from('matches')
        .insert({
          session_id: activeSessionId,
          format,
          target_score: targetScore,
          scoring_style: 'targetScore',
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

      {/* Target + Scoring */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div>
          <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">Target</p>
          <div className="flex items-center justify-between p-1.5" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
            <button onClick={() => setTargetScore(Math.max(1, targetScore - 1))} className="w-[44px] h-[44px] border-0 text-chalk text-[22px] font-bold cursor-pointer active:bg-[var(--orange)] active:text-[#0c0c0c]" style={{ background: 'var(--panel-3)', borderRadius: 'var(--r-sm)' }}>−</button>
            <span className="font-display text-[24px]">{targetScore}</span>
            <button onClick={() => setTargetScore(targetScore + 1)} className="w-[44px] h-[44px] border-0 text-chalk text-[22px] font-bold cursor-pointer active:bg-[var(--orange)] active:text-[#0c0c0c]" style={{ background: 'var(--panel-3)', borderRadius: 'var(--r-sm)' }}>+</button>
          </div>
        </div>
        <div>
          <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">Scoring</p>
          <div className="flex overflow-hidden" style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
            <button className="flex-1 py-3 text-[12px] font-bold border-0 cursor-pointer" style={{ background: 'var(--orange)', color: '#0c0c0c' }}>Target</button>
            <button className="flex-1 py-3 text-[12px] font-bold border-0 cursor-pointer" style={{ background: 'var(--panel-2)', color: 'var(--dim)' }}>Wave</button>
          </div>
        </div>
      </div>

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
          {[{ label: 'Team A', col: '#3B82F6', soft: 'var(--blue-soft)', bg: 'rgba(59,130,246,0.06)', players: teamA, side: 'A' as const },
            { label: 'Team B', col: '#EF4444', soft: 'var(--red-soft)',  bg: 'rgba(239,68,68,0.06)',  players: teamB, side: 'B' as const }].map(team => (
            <div key={team.label} className="rounded-[var(--r-lg)] p-4 mb-2.5" style={{ background: team.bg, border: '1px solid var(--line)', borderLeft: `3px solid ${team.col}` }}>
              <p className="text-[11px] tracking-[.2em] uppercase font-bold mb-2" style={{ color: team.col }}>{team.label}</p>
              <div className="flex gap-2 flex-wrap">
                {team.players.map(p => (
                  <div key={p.id} className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5" style={{ background: team.soft }}>
                    <Avatar nickname={p.nickname} />
                    <span className="text-[13px] font-bold">{p.nickname}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {subQueue.length > 0 && (
            <div className="p-4" style={{ background: 'var(--panel)', border: '1px dashed var(--line-2)', borderRadius: 'var(--r-lg)' }}>
              <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">Sub queue</p>
              <div className="flex gap-2 flex-wrap">
                {subQueue.map(p => <Avatar key={p.id} nickname={p.nickname} />)}
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
    </div>
  )
}
