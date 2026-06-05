import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
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

        {/* Hero summary card */}
        <Card variant="hero" style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: '#93C5FD', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 6px' }}>
            Session Complete
          </p>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 28, letterSpacing: '-0.02em' }}>
            2h 15min
          </div>
          <p style={{ fontSize: 13, color: 'var(--dim)', margin: '4px 0 0' }}>
            Levallois · Sat 13 June · the daily story
          </p>
        </Card>

        {CALLOUTS.map(c => (
          <Card key={c.label} variant="accent" style={{ marginBottom: 8 }}>
            <div className="flex gap-3">
              <div className="w-[42px] h-[42px] grid place-items-center flex-none" style={{ borderRadius: 'var(--r-sm)', background: 'var(--orange-soft)', color: 'var(--orange-2)' }}>
                <span className="w-[21px] h-[21px]">{c.icon}</span>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--chalk)', lineHeight: 1.35 }}>
                  {c.value}
                </div>
              </div>
            </div>
          </Card>
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
