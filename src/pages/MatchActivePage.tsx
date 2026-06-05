import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Icons } from '../components/ui/icons'
import { useMatchStore } from '../stores/matchStore'

function fmtSec(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`
}

export default function MatchActivePage() {
  const nav = useNavigate()
  const { targetScore, currentAScore, currentBScore, isTimerRunning, timerSeconds, completedGames, incrementScore, startTimer, stopTimer, tickTimer, endGame, undoLastGame } = useMatchStore()

  const canUndo = completedGames.length > 0 && !isTimerRunning

  useEffect(() => {
    if (!isTimerRunning) return
    const id = setInterval(tickTimer, 500)
    return () => clearInterval(id)
  }, [isTimerRunning, tickTimer])

  const handleEndGame = () => endGame()

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="flex-1 overflow-y-auto no-scrollbar px-[18px] pt-[54px] pb-24">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => nav('/match/setup')} className="flex items-center gap-1.5 text-[var(--dim)] font-bold text-[13px] bg-transparent border-0 cursor-pointer">
            <span className="w-[18px] h-[18px]">{Icons.back}</span> Setup
          </button>
          <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-bold" style={{ background: 'var(--orange-soft)', color: 'var(--orange-2)' }}>
            Game {completedGames.length + 1} · to {targetScore}
          </div>
        </div>

        {/* Score panels */}
        <div className="flex gap-2.5 mb-3.5">
          {/* Team A */}
          <div className="flex-1 rounded-[20px] p-3.5 text-center" style={{ background: 'var(--blue-soft)', border: '1px solid rgba(59,130,246,.33)' }}>
            <div className="text-[12px] font-bold tracking-[.06em] uppercase mb-1" style={{ color: 'var(--blue)' }}>Team A</div>
            <div className="font-display text-[62px] leading-none mb-1.5 text-chalk" id="scoreA">{currentAScore}</div>
            <div className="flex gap-1.5">
              <button onClick={() => incrementScore('A', 1)} className="flex-1 border-0 font-bold py-[11px] rounded-[11px] cursor-pointer text-[15px] text-white" style={{ background: 'var(--blue)' }}>+1</button>
              <button onClick={() => incrementScore('A', 2)} className="flex-1 border-0 font-bold py-[11px] rounded-[11px] cursor-pointer text-[15px] text-chalk" style={{ background: 'rgba(255,255,255,.1)' }}>+2</button>
            </div>
          </div>
          {/* Team B */}
          <div className="flex-1 rounded-[20px] p-3.5 text-center" style={{ background: 'var(--red-soft)', border: '1px solid rgba(239,68,68,.33)' }}>
            <div className="text-[12px] font-bold tracking-[.06em] uppercase mb-1" style={{ color: 'var(--red)' }}>Team B</div>
            <div className="font-display text-[62px] leading-none mb-1.5 text-chalk" id="scoreB">{currentBScore}</div>
            <div className="flex gap-1.5">
              <button onClick={() => incrementScore('B', 1)} className="flex-1 border-0 font-bold py-[11px] rounded-[11px] cursor-pointer text-[15px] text-white" style={{ background: 'var(--red)' }}>+1</button>
              <button onClick={() => incrementScore('B', 2)} className="flex-1 border-0 font-bold py-[11px] rounded-[11px] cursor-pointer text-[15px] text-chalk" style={{ background: 'rgba(255,255,255,.1)' }}>+2</button>
            </div>
          </div>
        </div>

        {/* Timer */}
        <button
          onClick={() => isTimerRunning ? stopTimer() : startTimer()}
          className="w-full flex items-center justify-center gap-2 min-h-[54px] rounded-[18px] font-heading text-[15px] font-bold tracking-wide uppercase mb-2 border-0 cursor-pointer transition-all"
          style={{ background: 'linear-gradient(180deg, var(--orange-2), var(--orange))', color: '#0c0c0c' }}
        >
          <span className="w-5 h-5">{Icons.clock}</span>
          <span>{isTimerRunning ? 'Stop Game' : 'Start Game'}</span>
          <span className="font-display text-[16px] tabular-nums ml-1">{fmtSec(timerSeconds)}</span>
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
                  <div key={g.gameNumber} className="flex-none rounded-[12px] p-[9px_12px] text-center" style={{ background: 'var(--panel)', border: `1px solid var(--line)`, borderLeft: `2px solid ${aWon ? 'var(--blue)' : 'var(--red)'}` }}>
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
        <Button variant="ghost" className="!flex-none !w-[54px] !min-h-[54px]">
          <span className="w-5 h-5">{Icons.roster}</span>
        </Button>
        <Button variant="primary" className="flex-1 !min-h-[54px] !text-[14px]" onClick={() => nav('/match/recap')}>
          End Match
        </Button>
      </div>
    </div>
  )
}
