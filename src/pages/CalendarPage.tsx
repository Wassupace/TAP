import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton, Button } from '../components/ui/Button'
import { Icons } from '../components/ui/icons'
import { useSessions, useOpenSession, useCreatePlannedSession, useActivateSession } from '../hooks/useSessions'
import { PlayerPickerModal } from '../components/ui/PlayerPickerModal'
import { usePlayers } from '../hooks/usePlayers'
import { useSessionStore } from '../stores/sessionStore'
import type { Session } from '../types'
import { isMissed, pillState, selectDayPills, pillLabel, type PillState } from '../utils/calendarPills'
import { fmtDuration } from '../utils/formatDuration'

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
  // Session a "Start Now / Review Details" choice modal (PRD §3.3) is
  // currently open for — shared trigger point for both the grid pill and
  // the "Selected day sessions" list's "Open →" button below, so a planned
  // session never navigates straight into AttendancePage.tsx anymore.
  const [choiceSession, setChoiceSession] = useState<Session | null>(null)
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
                    <span
                      key={s.id}
                      className="cal-pill"
                      onClick={
                        s.state === 'planned'
                          ? (e) => {
                              // Task 3 (PRD §3.3): tapping a planned session's
                              // pill opens the Start Now / Review Details
                              // choice modal directly, same trigger as the
                              // list's "Open →" button below — stop the event
                              // from also bubbling to the cell's onClick
                              // (which only reselects the day, already
                              // redundant here).
                              e.stopPropagation()
                              setSelected(day.d)
                              setChoiceSession(s)
                            }
                          : undefined
                      }
                      style={
                        isSel
                          // Contrast fix (review round 1): `.cal-day.selected` paints a
                          // solid `var(--orange)` background, and the state-tinted
                          // pill colors below (esp. planned's orange-2-on-orange-soft)
                          // computed to ~1.3:1 against it — effectively invisible. A
                          // plain CSS override can't win here because the colors are
                          // set via inline `style`, which always beats a stylesheet
                          // selector short of `!important`; picking the override in
                          // JS keeps one source of truth and avoids `!important`.
                          // rgba(0,0,0,.35) composited over var(--orange) (#E8500A)
                          // = ~(151,52,7); white text against that computes to
                          // ~7.48:1 (WCAG relative-luminance formula) — past AA (4.5:1)
                          // and AAA (7:1) for this small bold text, see report.
                          ? { background: 'var(--pill-selected-bg)', color: '#fff' }
                          : { background: pillBg(pillState(s, todayISODateString)), color: stateColor(s) }
                      }
                    >
                      {pillLabel(s.location)}
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
                <div className="text-[12px] mt-0.5" style={{ color: stateColor(s) }}>
                  {s.state === 'completed' ? `${s.state} · ${fmtDuration(s.started_at, s.ended_at)}` : s.state}
                </div>
              </div>
              {s.state === 'planned' && (
                <button
                  onClick={() => setChoiceSession(s)}
                  style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange-2)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Open →
                </button>
              )}
              {s.state === 'completed' && (
                // Review fix (round 2): completed sessions had no tap-through and
                // no duration anywhere in the Calendar view — the grid mini-pill
                // can't fit "location + duration" text (see calendarPills.ts's
                // budget derivation), so this list is the only place left that
                // can carry it. Mirrors the planned-session "Open →" button above
                // (same styling/position), routing to the recap page instead of
                // attendance since the session is already finished.
                <button
                  onClick={() => nav(`/session-recap/${s.id}`)}
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

      {choiceSession && (
        <StartOrReviewModal session={choiceSession} onClose={() => setChoiceSession(null)} />
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

// ── Start Now / Review Details modal (PRD §3.3) ─────────────────────────────
// Interposed between tapping a planned session (grid pill or the "Selected
// day sessions" list's "Open →" button) and where that tap used to go
// straight to `/calendar/attendance/:id`. "Review Details" is that exact
// unchanged path. "Start Now" is the new fast path: it skips
// AttendancePage.tsx's checklist entirely and activates the session with its
// full saved expected roster as-is (PRD 3.3 — "pre-populated with the saved
// location and attendee list"), mirroring AttendancePage.tsx's own `open()`
// (same `useActivateSession` call, same `setActiveSession` + nav('/'), same
// "still land on the local session even if the write fails" fallback) but
// with every expected player treated as present instead of a checklist
// selection.
interface StartOrReviewModalProps {
  session: Session
  onClose: () => void
}

function StartOrReviewModal({ session, onClose }: StartOrReviewModalProps) {
  const nav = useNavigate()
  const { setActiveSession } = useSessionStore()
  const activateSession = useActivateSession()
  const { data: allPlayers = [] } = usePlayers()

  const expectedCount = session.expected_player_ids.length

  async function handleStartNow() {
    const expectedPlayers = allPlayers.filter((p) => session.expected_player_ids.includes(p.id))
    try {
      await activateSession.mutateAsync({
        sessionId: session.id,
        presentPlayerIds: session.expected_player_ids,
      })
    } catch {
      // Same "keep going anyway" fallback as AttendancePage.tsx's open() —
      // the local session store still flips active so the scribe isn't
      // stuck offline.
    }
    setActiveSession(session.id, session.location, expectedPlayers.map((p) => p.nickname))
    nav('/')
  }

  function handleReviewDetails() {
    nav(`/calendar/attendance/${session.id}`)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: 'var(--panel)', borderRadius: 'var(--r-lg) var(--r-lg) 0 0', padding: '24px 18px 40px' }}>
        <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
          {session.location}
        </div>
        <p style={{ fontSize: 13, color: 'var(--dim)', margin: '0 0 20px' }}>
          {expectedCount > 0
            ? `${expectedCount} expected player${expectedCount > 1 ? 's' : ''} saved for this session.`
            : 'No expected players were saved for this session.'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button variant="primary" onClick={handleStartNow} disabled={activateSession.isPending}>
            {activateSession.isPending ? 'Starting…' : 'Start Now'}
          </Button>
          <Button variant="secondary" onClick={handleReviewDetails} disabled={activateSession.isPending}>
            Review Details
          </Button>
        </div>
      </div>
    </div>
  )
}

