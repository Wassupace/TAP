import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton, Button } from '../components/ui/Button'
import { Icons } from '../components/ui/icons'

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const SESSION_DAYS = [4, 6, 11, 13, 18, 20, 25, 27, 30]
const TODAY = 13

export default function CalendarPage() {
  const nav = useNavigate()
  const [selected, setSelected] = useState(TODAY)

  const days: { d: number; out?: boolean }[] = [
    { d: 28, out: true }, { d: 29, out: true }, { d: 30, out: true },
    ...Array.from({ length: 31 }, (_, i) => ({ d: i + 1 })),
  ]

  return (
    <div className="min-h-dvh px-[18px] pt-[54px] pb-8">
      <BackButton onClick={() => nav('/')}>Dashboard</BackButton>

      <div className="flex items-center justify-between mt-4 mb-4">
        <span className="font-display text-[22px] uppercase tracking-[.02em]">June 2026</span>
        <button className="w-[42px] h-[42px] rounded-[14px] grid place-items-center bg-[var(--panel)] border border-[var(--line)] text-chalk cursor-pointer hover:bg-[var(--panel-2)] transition-colors">
          <span className="w-5 h-5">{Icons.plus}</span>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 mb-5 stagger">
        {DOW.map((d, i) => (
          <div key={i} className="text-center text-[10px] text-[var(--faint)] font-bold pb-1.5 tracking-[.06em]">{d}</div>
        ))}
        {days.map((day, i) => {
          const hasSess = SESSION_DAYS.includes(day.d) && !day.out
          const isSel = selected === day.d && !day.out
          const isToday = day.d === TODAY && !day.out
          return (
            <div
              key={i}
              onClick={() => !day.out && setSelected(day.d)}
              className={`cal-day ${day.out ? 'out' : ''} ${isToday && !isSel ? 'today' : ''} ${isSel ? 'selected' : ''}`}
            >
              {day.d}
              {hasSess && <span className="cal-dot" />}
            </div>
          )
        })}
      </div>

      {/* Selected day sessions */}
      {selected === TODAY && (
        <div className="stagger">
          <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-3">Sat 13 June · 2 sessions</p>

          <div className="rounded-[18px] p-4 mb-2.5 flex items-center gap-3" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div className="w-[38px] h-[38px] rounded-[11px] grid place-items-center flex-none" style={{ background: 'var(--orange-soft)', color: 'var(--orange-2)' }}>
              <span className="w-5 h-5">{Icons.clock}</span>
            </div>
            <div>
              <div className="font-bold text-[14px]">Morning · Levallois Gym</div>
              <div className="text-[12px] text-[var(--dim)] mt-0.5">9:00 · 6 expected</div>
            </div>
          </div>

          <div className="rounded-[18px] p-4 mb-4 flex items-center gap-3" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div className="w-[38px] h-[38px] rounded-[11px] grid place-items-center flex-none" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}>
              <span className="w-5 h-5">{Icons.clock}</span>
            </div>
            <div>
              <div className="font-bold text-[14px]">Afternoon · Courbevoie</div>
              <div className="text-[12px] text-[var(--dim)] mt-0.5">15:00 · 8 expected</div>
            </div>
          </div>

          <Button variant="primary" onClick={() => nav('/calendar/attendance/morning')}>
            Open Morning Session
          </Button>
          <p className="text-[11px] text-[var(--faint)] text-center mt-3">Recurring every Saturday · dots mark planned sessions</p>
        </div>
      )}
    </div>
  )
}
