import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Icons } from '../components/ui/icons'
import { useSessionStore } from '../stores/sessionStore'

const CALLOUTS = [
  { icon: Icons.ball,   label: 'Activities',  value: '5 pickup games · 1 Banks · 100 free throws' },
  { icon: Icons.trophy, label: 'Your day',    value: 'On winning side in 4 of 5 games · FT 82%' },
  { icon: Icons.flame,  label: 'Highlight',   value: 'Closest game: 11–10 in game 3, 19 min' },
  { icon: Icons.target, label: 'To work on',  value: 'Left 0° three: 28% — 12 pts below goal' },
]

export default function SessionRecapPage() {
  const nav = useNavigate()
  const { notes } = useSessionStore()

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="flex-1 overflow-y-auto no-scrollbar px-[18px] pt-[54px] pb-24 stagger">
        <div className="text-center mt-2 mb-5">
          <div className="font-display text-[14px] tracking-[.1em] mb-1.5" style={{ color: 'var(--orange-2)' }}>SESSION COMPLETE</div>
          <div className="font-display text-[30px] uppercase">2h 15m · Levallois</div>
          <p className="text-[var(--dim)] text-[13px] mt-1">Sat 13 June · the daily story</p>
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
        {notes && (
          <div style={{
            background: 'var(--panel)',
            borderLeft: '3px solid var(--orange)',
            borderRadius: 'var(--r-sm)',
            padding: '12px 16px',
            marginBottom: 12,
          }}>
            <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 6px' }}>
              Notes
            </p>
            <p style={{ fontSize: 14, color: 'var(--dim)', fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>
              "{notes}"
            </p>
          </div>
        )}
        <Button variant="primary" onClick={() => nav('/')}>Done</Button>
      </div>
    </div>
  )
}
