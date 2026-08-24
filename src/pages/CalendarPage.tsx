import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton, Button } from '../components/ui/Button'
import { Icons } from '../components/ui/icons'
import { useSessions, useOpenSession, useCreatePlannedSession } from '../hooks/useSessions'
import { PlayerPickerModal } from '../components/ui/PlayerPickerModal'
import { useSessionStore } from '../stores/sessionStore'
import type { Session } from '../types'
import { isMissed, pillState, selectDayPills, pillLabel, type PillState } from '../utils/calendarPills'

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

  // Future-date detection (Phase 2 §3.2): a day strictly after today's ISO
  // date gets the "plan for later" path instead of "start now". Later tasks
  // in this phase read/extend this same string comparison — keep it as the
  // single source of truth rather than duplicating the format elsewhere.
  const todayISODateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const sessionDays = new Map<number, Session[]>()
  for (const s of sessions) {
    const day = parseInt(s.date.split('-')[2], 10)
    const existing = sessionDays.get(day)
    if (existing) existing.push(s)
    else sessionDays.set(day, [s])
  }

  const selectedDate = `${year}-${String(month).padStart(2, '0')}-${String(selected).padStart(2, '0')}`
  const selectedSessions = sessions.filter((s) => s.date === selectedDate)
  const isFutureDate = selectedDate > todayISODateString

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
    // Missed (bug §12.3): a 'planned' session whose date has passed reads
    // as neutral grey, not the orange "Planned" treatment — the DB row is
    // untouched, this is presentation only.
    if (isMissed(s, todayISODateString)) return 'var(--grey)'
    if (s.state === 'active') return 'var(--green)'
    if (s.state === 'completed') return 'var(--blue)'
    return 'var(--orange-2)'
  }

  // Soft background tint for a grid-cell mini-pill, paired with stateColor()'s
  // solid text color — same "soft bg + solid text" pairing already used for
  // the Selected Sessions list's icon swatch below.
  function pillBg(state: PillState) {
    if (state === 'active') return 'var(--green-soft)'
    if (state === 'completed') return 'var(--blue-soft)'
    if (state === 'missed') return 'var(--grey-z)'
    return 'var(--orange-soft)'
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
          const daySessions = day.out ? [] : sessionDays.get(day.d) ?? []
          const hasSess = daySessions.length > 0 && !day.out
          const isSel = selected === day.d && !day.out
          const isTdy = isCurrentMonth && day.d === today && !day.out
          const cellDate = `${year}-${String(month).padStart(2, '0')}-${String(day.d).padStart(2, '0')}`
          // A future, session-less cell shows "+" instead of the day's mini-
          // pills (mutually exclusive — see .cal-day-pills / .cal-plus in
          // index.css) and opens the Plan Session sheet directly on tap.
          const isFutureCell = !day.out && !hasSess && cellDate > todayISODateString
          const { pills, overflow } = hasSess ? selectDayPills(daySessions, todayISODateString) : { pills: [], overflow: 0 }
          return (
            <div
              key={i}
              onClick={() => {
                if (day.out) return
                setSelected(day.d)
                if (isFutureCell) setShowNewSession(true)
              }}
              className={`cal-day ${day.out ? 'out' : ''} ${isTdy && !isSel ? 'today' : ''} ${isSel ? 'selected' : ''}`}
            >
              {day.d}
              {hasSess && (
                <div className="cal-day-pills">
                  {pills.map((s) => (
                    <span key={s.id} className="cal-pill" style={{ background: pillBg(pillState(s, todayISODateString)), color: stateColor(s) }}>
                      {pillLabel(s, todayISODateString)}
                    </span>
                  ))}
                  {overflow > 0 && <span className="cal-pill-overflow">+{overflow}</span>}
                </div>
              )}
              {isFutureCell && <span className="cal-plus">+</span>}
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

      {/* Quick-start session sheet (today/past) vs. Plan Session sheet (future) —
          which one opens is decided purely by isFutureDate for the currently
          selected day; today/past always take the unchanged quick-start path. */}
      {showNewSession && (
        isFutureDate ? (
          <PlanSessionSheet date={selectedDate} onClose={() => setShowNewSession(false)} />
        ) : (
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
        )
      )}
    </div>
  )
}

// ── Plan Session sheet (PRD §3.2) ───────────────────────────────────────────
// Distinct from the quick-start sheet above: creates a `state: 'planned'`
// session (no started_at, no navigation on success) instead of an active one.
// Self-contained (owns its own location/player-selection state) so it can be
// mounted/unmounted per open without leaking state back into CalendarPage.
// Later Phase 2 tasks extend this component with a recurrence toggle and a
// location datalist — keep additions inside this block.
interface PlanSessionSheetProps {
  date: string
  onClose: () => void
}

function PlanSessionSheet({ date, onClose }: PlanSessionSheetProps) {
  const [location, setLocation] = useState('')
  const [expectedPlayerIds, setExpectedPlayerIds] = useState<string[]>([])
  const [showPlayerPicker, setShowPlayerPicker] = useState(false)
  const createPlannedSession = useCreatePlannedSession()

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  async function handlePlanSession() {
    if (!location.trim()) return
    try {
      await createPlannedSession.mutateAsync({ location: location.trim(), date, expectedPlayerIds })
      onClose()
    } catch {
      // Leave the sheet open on failure so the coach can retry — unlike the
      // quick-start path, there's no "keep going anyway" fallback here since
      // we aren't navigating away.
    }
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: 'var(--panel)', borderRadius: 'var(--r-lg) var(--r-lg) 0 0', padding: '24px 18px 40px' }}>
          <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 18, marginBottom: 20 }}>
            Plan Session · {dateLabel}
          </div>
          <label style={{ display: 'block', marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8 }}>
              Gym / Location <span style={{ color: 'var(--orange)' }}>*</span>
            </p>
            <input autoFocus type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Levallois Gym" style={{ width: '100%', background: 'var(--panel-2)', border: `1px solid ${location.trim() ? 'var(--orange)' : 'var(--line-2)'}`, borderRadius: 'var(--r-sm)', color: 'var(--chalk)', fontSize: 16, padding: '12px 14px', outline: 'none', fontFamily: 'Archivo, sans-serif', boxSizing: 'border-box' }} />
          </label>

          <button
            type="button"
            onClick={() => setShowPlayerPicker(true)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 14px', borderRadius: 'var(--r-md)', marginBottom: 24,
              background: 'var(--panel-2)', border: '1px dashed var(--line-2)',
              color: 'var(--orange)', fontFamily: '"Archivo Expanded", Archivo, sans-serif',
              fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em',
              cursor: 'pointer',
            }}
          >
            <span style={{ width: 16, height: 16 }}>{Icons.plus}</span>
            {expectedPlayerIds.length > 0
              ? `${expectedPlayerIds.length} player${expectedPlayerIds.length > 1 ? 's' : ''} added`
              : 'Add players'}
          </button>

          <Button variant="primary" onClick={handlePlanSession} disabled={!location.trim() || createPlannedSession.isPending}>
            {createPlannedSession.isPending ? 'Planning…' : 'Plan Session'}
          </Button>
        </div>
      </div>

      <PlayerPickerModal
        isOpen={showPlayerPicker}
        selectedIds={expectedPlayerIds}
        onConfirm={setExpectedPlayerIds}
        onClose={() => setShowPlayerPicker(false)}
      />
    </>
  )
}

