import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
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
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 stagger">
        {/* Hero gradient header */}
        <div style={{ background: 'var(--hero-gradient)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '54px 18px 24px', textAlign: 'center' }}>
          <div className="inline-grid place-items-center w-16 h-16 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--orange)' }}>
            <span className="w-6 h-6">{Icons.trophy}</span>
          </div>
          <div className="font-display text-[26px] uppercase">Match Complete</div>
          <p className="text-[var(--dim)] text-[13px] mt-1">{format} · {completedGames.length} games · {totalMin}m</p>
        </div>

        {/* Callouts */}
        <div className="px-[18px] pt-4">
          {CALLOUTS.map(c => (
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
