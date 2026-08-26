import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Icons } from '../components/ui/icons'
import { NumberPad } from '../components/ui/NumberPad'
import { PlayerPickerModal } from '../components/ui/PlayerPickerModal'
import { useMatchStore } from '../stores/matchStore'
import { usePlayers } from '../hooks/usePlayers'
import { playAlarmSound } from '../utils/playAlarm'

function fmtSec(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`
}

export default function MatchActivePage() {
  const nav = useNavigate()
  const {
    scoringStyle, durationMinutes, targetScore, currentAScore, currentBScore,
    isTimerRunning, timerSeconds, completedGames, teamA, teamB, subQueue,
    incrementScore, setScore, startTimer, stopTimer, pauseTimer, resumeTimer,
    tickTimer, endGame, undoLastGame, syncRoster,
  } = useMatchStore()
  const { data: allPlayers = [] } = usePlayers()

  const [numberPadTeam, setNumberPadTeam] = useState<'A' | 'B' | null>(null)
  const [rosterEditOpen, setRosterEditOpen] = useState(false)
  // Whether the timer was actually running when the roster sheet opened —
  // only resume it on close if it was (PRD §5.5's "resume the timer" only
  // applies if a wave/game was in progress to begin with).
  const wasRunningRef = useRef(false)
  const rosterIds = [...teamA, ...teamB, ...subQueue].map(p => p.id)
  const isWave = scoringStyle === 'durationWave'
  const waveTotalSeconds = durationMinutes * 60
  const waveRemaining = Math.max(0, waveTotalSeconds - timerSeconds)
  // Guards the alarm to fire once per wave — reset whenever a new wave starts.
  const alarmFiredRef = useRef(false)

  const canUndo = completedGames.length > 0 && !isTimerRunning
  // Winners Ball (PRD §5.3): the team that won the most recently completed
  // game keeps possession into the next one — a draw carries no possession.
  const lastGame = completedGames[completedGames.length - 1]
  const possession = lastGame
    ? (lastGame.teamAScore > lastGame.teamBScore ? 'A' : lastGame.teamAScore < lastGame.teamBScore ? 'B' : null)
    : null

  useEffect(() => {
    if (!isTimerRunning) return
    const id = setInterval(tickTimer, 500)
    return () => clearInterval(id)
  }, [isTimerRunning, tickTimer])

  useEffect(() => {
    if (!isWave || !isTimerRunning) return
    if (waveRemaining <= 0 && !alarmFiredRef.current) {
      alarmFiredRef.current = true
      playAlarmSound()
      stopTimer()
    }
  }, [isWave, isTimerRunning, waveRemaining, stopTimer])

  const handleEndGame = () => endGame()
  const handleStartTimer = () => {
    alarmFiredRef.current = false
    startTimer()
  }

  // Mid-game roster edit (PRD §5.5): pause without losing elapsed time,
  // open the shared PlayerPickerModal pre-filled with the full current
  // roster, resume on close only if a wave/game was actually running.
  const handleOpenRoster = () => {
    wasRunningRef.current = isTimerRunning
    if (isTimerRunning) pauseTimer()
    setRosterEditOpen(true)
  }
  const handleCloseRoster = () => {
    setRosterEditOpen(false)
    if (wasRunningRef.current) resumeTimer()
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="flex-1 overflow-y-auto no-scrollbar px-[18px] pt-[54px] pb-24">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => nav('/match/setup')} className="flex items-center gap-1.5 text-[var(--dim)] font-bold text-[13px] bg-transparent border-0 cursor-pointer">
            <span className="w-[18px] h-[18px]">{Icons.back}</span> Setup
          </button>
          <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-bold" style={{ background: 'var(--orange-soft)', color: 'var(--orange-2)' }}>
            {isWave ? `Wave ${completedGames.length + 1} · ${durationMinutes}min` : `Game ${completedGames.length + 1} · to ${targetScore}`}
          </div>
        </div>

        {/* Score panels */}
        <div className="flex gap-2.5 mb-3.5">
          {/* Team A */}
          <div className="flex-1 p-3.5 text-center" style={{ background: 'rgba(59,130,246,0.08)', border: possession === 'A' ? '2px solid var(--blue)' : '1px solid rgba(59,130,246,.33)', borderRadius: 'var(--r-lg)' }}>
            <div className="flex items-center justify-center gap-1.5 text-[12px] font-bold tracking-[.06em] uppercase mb-1" style={{ color: 'var(--blue)' }}>
              {possession === 'A' && <span className="w-3.5 h-3.5">{Icons.trophy}</span>}
              Team A
            </div>
            <button
              type="button"
              onClick={() => setNumberPadTeam('A')}
              className="font-display text-[62px] leading-none mb-1.5 text-chalk bg-transparent border-0 p-0 w-full cursor-pointer"
              id="scoreA"
            >
              {currentAScore}
            </button>
            <div className="flex gap-1.5">
              <button onClick={() => incrementScore('A', 1)} className="flex-1 border-0 font-bold py-[11px] cursor-pointer text-[15px] text-white" style={{ background: 'var(--blue)', borderRadius: 'var(--r-sm)' }}>+1</button>
              <button onClick={() => incrementScore('A', 2)} className="flex-1 border-0 font-bold py-[11px] cursor-pointer text-[15px] text-chalk" style={{ background: 'rgba(255,255,255,.1)', borderRadius: 'var(--r-sm)' }}>+2</button>
            </div>
          </div>
          {/* Team B */}
          <div className="flex-1 p-3.5 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: possession === 'B' ? '2px solid var(--red)' : '1px solid rgba(239,68,68,.33)', borderRadius: 'var(--r-lg)' }}>
            <div className="flex items-center justify-center gap-1.5 text-[12px] font-bold tracking-[.06em] uppercase mb-1" style={{ color: 'var(--red)' }}>
              {possession === 'B' && <span className="w-3.5 h-3.5">{Icons.trophy}</span>}
              Team B
            </div>
            <button
              type="button"
              onClick={() => setNumberPadTeam('B')}
              className="font-display text-[62px] leading-none mb-1.5 text-chalk bg-transparent border-0 p-0 w-full cursor-pointer"
              id="scoreB"
            >
              {currentBScore}
            </button>
            <div className="flex gap-1.5">
              <button onClick={() => incrementScore('B', 1)} className="flex-1 border-0 font-bold py-[11px] cursor-pointer text-[15px] text-white" style={{ background: 'var(--red)', borderRadius: 'var(--r-sm)' }}>+1</button>
              <button onClick={() => incrementScore('B', 2)} className="flex-1 border-0 font-bold py-[11px] cursor-pointer text-[15px] text-chalk" style={{ background: 'rgba(255,255,255,.1)', borderRadius: 'var(--r-sm)' }}>+2</button>
            </div>
          </div>
        </div>

        {/* Timer — count-up for Target Score, countdown-to-zero-with-alarm for
            Duration Wave (PRD §5.1) */}
        <button
          onClick={() => isTimerRunning ? stopTimer() : handleStartTimer()}
          className="w-full flex items-center justify-center gap-2 min-h-[54px] font-heading text-[15px] font-bold tracking-wide uppercase mb-2 border-0 cursor-pointer transition-all"
          style={{ background: 'linear-gradient(180deg, var(--orange-2), var(--orange))', color: '#0c0c0c', borderRadius: 'var(--r-lg)' }}
        >
          <span className="w-5 h-5">{Icons.clock}</span>
          <span>{isTimerRunning ? (isWave ? 'Stop Wave' : 'Stop Game') : (isWave ? 'Start Wave' : 'Start Game')}</span>
          <span className="font-display text-[16px] tabular-nums ml-1">{fmtSec(isWave ? waveRemaining : timerSeconds)}</span>
        </button>

        <Button variant="ghost" className="!min-h-[54px] !text-[14px] mb-5" onClick={handleEndGame}>
          End Game
        </Button>

        {/* Game history */}
        {completedGames.length > 0 && (
          <>
            <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">Games</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {completedGames.map(g => {
                const aWon = g.teamAScore > g.teamBScore
                return (
                  <div key={g.gameNumber} className="flex-none p-[9px_12px] text-center" style={{ background: 'var(--panel)', border: `1px solid var(--line)`, borderLeft: `3px solid ${aWon ? '#3B82F6' : '#EF4444'}`, borderRadius: 'var(--r-md)' }}>
                    <div className="text-[10px] text-[var(--faint)] font-bold">G{g.gameNumber}</div>
                    <div className="font-display text-[16px]">{g.teamAScore}–{g.teamBScore}</div>
                    <div className="text-[10px] text-[var(--dim)]">{Math.round(g.durationSeconds / 60)}m</div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {canUndo && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6, marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => undoLastGame()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent',
                border: '1.5px solid var(--panel-3)',
                borderRadius: 'var(--r-sm)',
                padding: '7px 14px',
                color: 'var(--dim)',
                fontSize: 12, fontWeight: 700,
                cursor: 'pointer',
                fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                letterSpacing: '0.04em',
                textTransform: 'uppercase' as const,
              }}
            >
              ↩ Undo Game {completedGames.length}
            </button>
          </div>
        )}
      </div>

      {/* Floating bar */}
      <div className="absolute bottom-[18px] left-[14px] right-[14px] flex gap-2.5">
        <Button variant="ghost" className="!flex-none !w-[54px] !min-h-[54px]" onClick={handleOpenRoster}>
          <span className="w-5 h-5">{Icons.roster}</span>
        </Button>
        <Button variant="primary" className="flex-1 !min-h-[54px] !text-[14px]" onClick={() => nav('/match/recap')}>
          End Match
        </Button>
      </div>

      <NumberPad
        isOpen={numberPadTeam !== null}
        value={numberPadTeam === 'B' ? currentBScore : currentAScore}
        label={numberPadTeam === 'B' ? 'Team B score' : 'Team A score'}
        onConfirm={(v) => { if (numberPadTeam) setScore(numberPadTeam, v) }}
        onClose={() => setNumberPadTeam(null)}
      />

      <PlayerPickerModal
        isOpen={rosterEditOpen}
        selectedIds={rosterIds}
        onConfirm={(ids) => { syncRoster(ids, allPlayers) }}
        onClose={handleCloseRoster}
      />
    </div>
  )
}
