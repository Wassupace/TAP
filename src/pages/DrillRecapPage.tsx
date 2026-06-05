import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Icons } from '../components/ui/icons'

const CALLOUTS = [
  { icon: Icons.target, label: 'Session total', value: '120 threes today — 41 makes (34%)' },
  { icon: Icons.flame,  label: 'Best spot',     value: 'Right 0° — 47% · above your 40% goal' },
  { icon: Icons.bolt,   label: 'Spot to watch', value: 'Left 0° — 28%, 12 pts below goal' },
  { icon: Icons.clock,  label: 'Heat trend',    value: 'Top of key: 7, 8, 9 — strong finish' },
]

export default function DrillRecapPage() {
  const nav = useNavigate()

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="flex-1 overflow-y-auto no-scrollbar px-[18px] pt-[54px] pb-24 stagger">
        <div className="text-center mt-2 mb-5">
          <div className="inline-grid place-items-center w-16 h-16 rounded-full mb-2" style={{ background: 'rgba(34,197,94,.16)', color: 'var(--green)' }}>
            <span className="w-6 h-6">{Icons.target}</span>
          </div>
          <div className="font-display text-[26px] uppercase">Drill Complete</div>
          <p className="text-[var(--dim)] text-[13px] mt-1">3PT · JC · 4 spots</p>
        </div>

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

      <div className="absolute bottom-[18px] left-[14px] right-[14px]">
        <Button variant="primary" onClick={() => nav('/')}>Back to Session</Button>
      </div>
    </div>
  )
}
