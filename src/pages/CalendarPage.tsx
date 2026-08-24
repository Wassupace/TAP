import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton, Button } from '../components/ui/Button'
import { Icons } from '../components/ui/icons'
import { useSessions, useOpenSession } from '../hooks/useSessions'
import { useSessionStore } from '../stores/sessionStore'
import type { Session } from '../types'

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay()
  // Shift so week starts Monday (0=Mon..6=Sun)
  const offset = (firstDay + 6) % 7
  const daysInMonth = new Date(year, month, 0).getDate()
  const prevMonthDays = new Date(year, month - 1, 0).getDate()
  const days: { d: number; out?: boolean }[] = []
  for (let i = offset - 1; i >= 0; i--) days.push({ d: prevMonthDays - i, out: true })
  for (let d = 1; d <= daysInMonth; d++) days.push({ d })
  return days
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function CalendarPage() {
  const nav = useNavigate()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selected, setSelected] = useState(now.getDate())
  const [showNewSession, setShowNewSession] = useState(false)
  const [newLocation, setNewLocation] = useState('')
  const { setActiveSession } = useSessionStore()
  const openSession = useOpenSession()

  const { data: sessions = [] } = useSessions(year, month)

  const days = buildCalendarDays(year, month)
  const today = now.getDate()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  const sessionDays = new Set(
    sessions.map((s) => parseInt(s.date.split('-')[2], 10))
  )

  const selectedDate = `${year}-${String(month).padStart(2, '0')}-${String(selected).padStart(2, '0')}`
  const selectedSessions = sessions.filter((s) => s.date === selectedDate)

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  async function handleCreateAndOpen() {
    if (!newLocation.trim()) return
    const date = selectedDate
    try {
      const session = await openSession.mutateAsync({ location: newLocation.trim(), date })
      setActiveSession(session.id, session.location, [])
      nav('/')
    } catch {
      setActiveSession(crypto.randomUUID(), newLocation.trim(), [])
      nav('/')
    }
  }

  function stateColor(s: Session) {
    if (s.state === 'active') return 'var(--green)'
    if (s.state === 'completed') return 'var(--blue)'
    return 'var(--orange-2)'
  }

  return (
    <div className="min-h-dvh px-[18px] pt-[54px] pb-8">
      <BackButton onClick={() => nav('/')}>Dashboard</BackButton>

      <div style={{ background: 'var(--hero-gradient)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--r-lg)', padding: '16px 18px', marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: 'var(--hero-eyebrow)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>Sessions</p>
        <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 20 }}>Calendar</div>
      </div>

      <div className="flex items-center justify-between mt-4 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--chalk)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <span style={{ width: 16, height: 16 }}>{Icons.back}</span>
          </button>
          <span className="font-display text-[22px] uppercase tracking-[.02em]">{MONTH_NAMES[month - 1]} {year}</span>
          <button onClick={nextMonth} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--chalk)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <span style={{ width: 16, height: 16, transform: 'rotate(180deg)' }}>{Icons.back}</span>
          </button>
        </div>
        <button onClick={() => setShowNewSession(true)} className="w-[42px] h-[42px] rounded-[14px] grid place-items-center bg-[var(--panel)] border border-[var(--line)] text-chalk cursor-pointer hover:bg-[var(--panel-2)] transition-colors">
          <span className="w-5 h-5">{Icons.plus}</span>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 mb-5 stagger">
        {DOW.map((d, i) => (
          <div key={i} className="text-center text-[10px] text-[var(--faint)] font-bold pb-1.5 tracking-[.06em]">{d}</div>
        ))}
        {days.map((day, i) => {
          const hasSess = sessionDays.has(day.d) && !day.out
          const isSel = selected === day.d && !day.out
          const isTdy = isCurrentMonth && day.d === today && !day.out
          return (
            <div
              key={i}
              onClick={() => !day.out && setSelected(day.d)}
              className={`cal-day ${day.out ? 'out' : ''} ${isTdy && !isSel ? 'today' : ''} ${isSel ? 'selected' : ''}`}
            >
              {day.d}
              {hasSess && <span className="cal-dot" />}
            </div>
          )
        })}
      </div>

      {/* Selected day sessions */}
      {selectedSessions.length > 0 ? (
        <div className="stagger">
          <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-3">
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })} · {selectedSessions.length} session{selectedSessions.length > 1 ? 's' : ''}
          </p>
          {selectedSessions.map((s) => (
            <div key={s.id} className="p-4 mb-2.5 flex items-center gap-3" style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)' }}>
              <div className="w-[38px] h-[38px] rounded-[11px] grid place-items-center flex-none" style={{ background: 'var(--orange-soft)', color: stateColor(s) }}>
                <span className="w-5 h-5">{Icons.clock}</span>
              </div>
              <div className="flex-1">
                <div className="font-bold text-[14px]">{s.location}</div>
                <div className="text-[12px] mt-0.5" style={{ color: stateColor(s) }}>{s.state}</div>
              </div>
              {s.state === 'planned' && (
                <button
                  onClick={() => nav(`/calendar/attendance/${s.id}`)}
                  style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange-2)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Open →
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--faint)', fontSize: 13 }}>
          No sessions on this day.{' '}
          <button onClick={() => setShowNewSession(true)} style={{ color: 'var(--orange-2)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            Start one →
          </button>
        </div>
      )}

      {/* Quick-start session sheet */}
      {showNewSession && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowNewSession(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: 'var(--panel)', borderRadius: 'var(--r-lg) var(--r-lg) 0 0', padding: '24px 18px 40px' }}>
            <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 18, marginBottom: 20 }}>
              New Session · {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </div>
            <label style={{ display: 'block', marginBottom: 24 }}>
              <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8 }}>
                Gym / Location <span style={{ color: 'var(--orange)' }}>*</span>
              </p>
              <input autoFocus type="text" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="e.g. Levallois Gym" style={{ width: '100%', background: 'var(--panel-2)', border: `1px solid ${newLocation.trim() ? 'var(--orange)' : 'var(--line-2)'}`, borderRadius: 'var(--r-sm)', color: 'var(--chalk)', fontSize: 16, padding: '12px 14px', outline: 'none', fontFamily: 'Archivo, sans-serif', boxSizing: 'border-box' }} />
            </label>
            <Button variant="primary" onClick={handleCreateAndOpen} disabled={!newLocation.trim() || openSession.isPending}>
              {openSession.isPending ? 'Opening…' : 'Open Session'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

