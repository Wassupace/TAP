import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Icons } from '../components/ui/icons'
import { useMatchStore } from '../stores/matchStore'

const CALLOUTS = [
  { icon: Icons.trophy, label: 'Dominance',    value: 'Team A won 4 of 6 — average margin +6 pts' },
  { icon: Icons.flame,  label: 'Closest game', value: 'Game 3 — decided by 1 point, lasted 19 min' },
  { icon: Icons.clock,  label: 'Longest game', value: 'Game 2 — 23 minutes, the competitive one' },
  { icon: Icons.ball,   label: 'Best side',    value: 'JC was on the winning side in 5 of 6 games' },
]

export default function MatchRecapPage() {
  const nav = useNavigate()
  const { completedGames, format, reset } = useMatchStore()
  const totalMin = Math.round(completedGames.reduce((s, g) => s + g.durationSeconds, 0) / 60)

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="flex-1 overflow-y-auto no-scrollbar px-[18px] pt-[54px] pb-24 stagger">
        {/* Header */}
        <div className="text-center mt-2 mb-5">
          <div className="inline-grid place-items-center w-16 h-16 rounded-full mb-2" style={{ background: 'var(--orange-soft)', color: 'var(--orange)' }}>
            <span className="w-6 h-6">{Icons.trophy}</span>
          </div>
          <div className="font-display text-[26px] uppercase">Match Complete</div>
          <p className="text-[var(--dim)] text-[13px] mt-1">{format} · {completedGames.length} games · {totalMin}m</p>
        </div>

        {/* Callouts */}
        {CALLOUTS.map(c => (
          <div key={c.label} className="flex gap-3 p-[15px] rounded-[18px] mb-2.5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div className="w-[42px] h-[42px] rounded-[12px] grid place-items-center flex-none" style={{ background: 'var(--orange-soft)', color: 'var(--orange-2)' }}>
              <span className="w-[21px] h-[21px]">{c.icon}</span>
            </div>
            <div>
              <div className="text-[11px] tracking-[.12em] uppercase font-bold mb-1" style={{ color: 'var(--orange-2)' }}>{c.label}</div>
              <div className="text-[15px] font-semibold leading-[1.35]">{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-[18px] left-[14px] right-[14px] flex gap-2.5">
        <Button variant="ghost" className="flex-1 !min-h-[54px] !text-[14px]" onClick={() => { reset(); nav('/') }}>
          Done
        </Button>
        <Button variant="primary" className="flex-1 !min-h-[54px] !text-[14px]" onClick={() => { reset(); nav('/match/setup') }}>
          <span className="w-5 h-5">{Icons.bolt}</span> Quick Rematch
        </Button>
      </div>
    </div>
  )
}
