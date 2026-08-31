import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton, Button } from '../components/ui/Button'
import { Icons } from '../components/ui/icons'
import { useSessions, useOpenSession, useCreatePlannedSession, useCreateRecurringSessions, useTodaysPlannedSession, useLocationHistory } from '../hooks/useSessions'
import { useStartPlannedSession } from '../hooks/useStartPlannedSession'
import { PlayerPickerModal } from '../components/ui/PlayerPickerModal'
import { useSessionStore } from '../stores/sessionStore'
import type { Session } from '../types'
import { isMissed, pillState, selectDayPills, pillLabel, type PillState } from '../utils/calendarPills'
import { fmtDuration } from '../utils/formatDuration'
import { todayISODate } from '../utils/todayISODate'

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
  // Task 4 (PRD §3.3): quick-start "Open Session" location, held here while
  // the Yes/No disambiguation prompt below is open (only set when today
  // already has a `state: 'planned'` session) — null means no prompt, and
  // clearing it never navigates on its own (only Yes/No's own handlers do).
  const [pendingAdHocLocation, setPendingAdHocLocation] = useState<string | null>(null)
  const { setActiveSession } = useSessionStore()
  const openSession = useOpenSession()
  const { data: todaysPlannedSession } = useTodaysPlannedSession()
  const { start: startPlannedSession, isPending: startPending, playersLoading } = useStartPlannedSession()

  const { data: sessions = [] } = useSessions(year, month)
  const { data: locationHistory = [] } = useLocationHistory()

  const days = buildCalendarDays(year, month)
  const today = now.getDate()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  // Future-date detection (Phase 2 §3.2): a day strictly after today's ISO
  // date gets the "plan for later" path instead of "start now". Later tasks
  // in this phase read/extend this same string comparison — keep it as the
  // single source of truth rather than duplicating the format elsewhere.
  // Final-review Fix 3: now sourced from the shared `todayISODate()` util
  // (this page's own original LOCAL-date convention) so this can never
  // drift from useSessions.ts's/DashboardPage.tsx's "today".
  const todayISODateString = todayISODate(now)

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
    // Task 4 (PRD §3.3): the quick-start sheet only ever targets today or a
    // past date (future dates use PlanSessionSheet instead — see
    // isFutureDate above), so a planned-session conflict is only possible
    // when the selected day actually is today. Comparing the fetched row's
    // own `.date` (rather than trusting the hook's internal "today" is in
    // sync with this component's local-date `todayISODateString`) keeps
    // this correct even if the two ever drift.
    if (todaysPlannedSession && todaysPlannedSession.date === selectedDate) {
      setShowNewSession(false)
      setPendingAdHocLocation(newLocation.trim())
      return
    }
    await createAdHocSession(newLocation.trim())
  }

  async function createAdHocSession(location: string) {
    const date = selectedDate
    // useOpenSession is routed through dbInsert (Task 5, PRD §1.3) — it
    // always resolves with a real, durably-queued session id, online or
    // off, so no separate offline fallback is needed here anymore.
    const session = await openSession.mutateAsync({ location, date })
    setActiveSession(session.id, session.location, [])
    nav('/')
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
                      title={s.location}
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
                          : s.state === 'completed'
                          ? (e) => {
                              // Final-review Fix 5 (PRD §3.9): tapping ANY
                              // past session's pill should open its Session
                              // Recap, not just reach it via the "Selected
                              // day sessions" list below. Same route/nav
                              // that list's completed-session "Open →"
                              // button already uses (added in Task 2's fix
                              // round) — this just makes the grid pill
                              // itself tappable too.
                              e.stopPropagation()
                              setSelected(day.d)
                              nav(`/session-recap/${s.id}`)
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
                <input id="quickStartLocationInput" list="quickStartLocationList" autoFocus type="text" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="e.g. Levallois Gym" style={{ width: '100%', background: 'var(--panel-2)', border: `1px solid ${newLocation.trim() ? 'var(--orange)' : 'var(--line-2)'}`, borderRadius: 'var(--r-sm)', color: 'var(--chalk)', fontSize: 16, padding: '12px 14px', outline: 'none', fontFamily: 'Archivo, sans-serif', boxSizing: 'border-box' }} />
                <datalist id="quickStartLocationList">
                  {locationHistory.map((loc) => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
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

      {pendingAdHocLocation && todaysPlannedSession && (
        <PlannedSessionPrompt
          location={todaysPlannedSession.location}
          isPending={startPending || playersLoading}
          onYes={async () => {
            await startPlannedSession(todaysPlannedSession)
            setPendingAdHocLocation(null)
          }}
          onNo={async () => {
            const location = pendingAdHocLocation
            setPendingAdHocLocation(null)
            await createAdHocSession(location)
          }}
          onClose={() => setPendingAdHocLocation(null)}
        />
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
  // Task 6 (PRD §3.2): "Repeat weekly" — when on, confirming this sheet
  // creates a fixed 8-session horizon (this date + 7 more, 7 days apart)
  // via useCreateRecurringSessions() instead of the single session below.
  // No server-side job backs this — see task-6-report.md's "known
  // limitation" for why a further-out ask means planning again later.
  const [repeatWeekly, setRepeatWeekly] = useState(false)
  const createPlannedSession = useCreatePlannedSession()
  const createRecurringSessions = useCreateRecurringSessions()
  const { data: locationHistory = [] } = useLocationHistory()

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const weekdayLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long' })
  const isPending = createPlannedSession.isPending || createRecurringSessions.isPending

  async function handlePlanSession() {
    if (!location.trim()) return
    // useCreatePlannedSession/useCreateRecurringSessions are routed through
    // dbInsert (Task 5, PRD §1.3) — they always resolve (queued offline
    // rather than rejecting), so there's no failure path left to retry here.
    if (repeatWeekly) {
      await createRecurringSessions.mutateAsync({ location: location.trim(), date, expectedPlayerIds })
    } else {
      await createPlannedSession.mutateAsync({ location: location.trim(), date, expectedPlayerIds })
    }
    onClose()
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
            <input id="planSessionLocationInput" list="planSessionLocationList" autoFocus type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Levallois Gym" style={{ width: '100%', background: 'var(--panel-2)', border: `1px solid ${location.trim() ? 'var(--orange)' : 'var(--line-2)'}`, borderRadius: 'var(--r-sm)', color: 'var(--chalk)', fontSize: 16, padding: '12px 14px', outline: 'none', fontFamily: 'Archivo, sans-serif', boxSizing: 'border-box' }} />
            <datalist id="planSessionLocationList">
              {locationHistory.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
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

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '12px 14px', borderRadius: 'var(--r-md)', marginBottom: 24,
            background: 'var(--panel-2)', border: '1px solid var(--line-2)',
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--chalk)', margin: 0 }}>Repeat weekly</p>
              <p style={{ fontSize: 11, color: 'var(--faint)', margin: '2px 0 0' }}>
                Plans 8 sessions, every {weekdayLabel} starting {dateLabel}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={repeatWeekly}
              onClick={() => setRepeatWeekly((v) => !v)}
              style={{
                flex: 'none', padding: '8px 16px', borderRadius: 'var(--r-sm)',
                fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em',
                border: repeatWeekly ? '1px solid var(--orange)' : '1px solid var(--line-2)',
                background: repeatWeekly ? 'var(--orange)' : 'var(--panel)',
                color: repeatWeekly ? '#fff' : 'var(--dim)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {repeatWeekly ? 'On' : 'Off'}
            </button>
          </div>

          <Button variant="primary" onClick={handlePlanSession} disabled={!location.trim() || isPending}>
            {isPending ? 'Planning…' : repeatWeekly ? 'Plan 8 Sessions' : 'Plan Session'}
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
// location and attendee list"). The activate-mutation + nickname-resolution
// + setActiveSession + navigate sequence lives in `useStartPlannedSession`
// (shared with Task 4's ad-hoc-on-a-planned-day "Yes" confirm below) rather
// than duplicated here.
interface StartOrReviewModalProps {
  session: Session
  onClose: () => void
}

function StartOrReviewModal({ session, onClose }: StartOrReviewModalProps) {
  const nav = useNavigate()
  const { start, isPending, playersLoading } = useStartPlannedSession()

  const expectedCount = session.expected_player_ids.length

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
          <Button variant="primary" onClick={() => start(session)} disabled={isPending || playersLoading}>
            {isPending ? 'Starting…' : playersLoading ? 'Loading roster…' : 'Start Now'}
          </Button>
          <Button variant="secondary" onClick={handleReviewDetails} disabled={isPending}>
            Review Details
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Ad-hoc-on-a-planned-day disambiguation (PRD §3.3, Task 4) ───────────────
// Shown instead of immediately creating a brand-new ad-hoc session when the
// quick-start sheet's "Open Session" is tapped and a `state: 'planned'`
// session already exists for today (see handleCreateAndOpen above) — so a
// coach who meant to start the session already on the calendar doesn't
// accidentally spin up a second, independent one. "Yes" reuses the same
// `useStartPlannedSession` activation path as StartOrReviewModal's "Start
// Now" above; "No" proceeds with the original ad-hoc creation unchanged
// (PRD 3.7's two-session pattern — both end up active at once).
interface PlannedSessionPromptProps {
  location: string
  isPending: boolean
  onYes: () => void
  onNo: () => void
  onClose: () => void
}

function PlannedSessionPrompt({ location, isPending, onYes, onNo, onClose }: PlannedSessionPromptProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: 'var(--panel)', borderRadius: 'var(--r-lg) var(--r-lg) 0 0', padding: '24px 18px 40px' }}>
        <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
          Planned Session Today
        </div>
        <p style={{ fontSize: 13, color: 'var(--dim)', margin: '0 0 20px' }}>
          You have a planned session at {location} today — is this it?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button variant="primary" onClick={onYes} disabled={isPending}>
            {isPending ? 'Starting…' : 'Yes, start it'}
          </Button>
          <Button variant="secondary" onClick={onNo} disabled={isPending}>
            No, start a new one
          </Button>
        </div>
      </div>
    </div>
  )
}

