import { useNavigate } from 'react-router-dom'
import { useActivateSession } from './useSessions'
import { usePlayers } from './usePlayers'
import { useSessionStore } from '../stores/sessionStore'
import type { Session } from '../types'

/**
 * Activates a `state: 'planned'` session in place — the "Start Now" path
 * shared by CalendarPage's `StartOrReviewModal` (Task 3, PRD §3.3) and the
 * ad-hoc-on-a-planned-day "Yes" confirm (Task 4, PRD §3.3), so both call
 * sites share one copy of: `useActivateSession`'s write, resolving the
 * session's saved `expected_player_ids` to nicknames via `usePlayers()`,
 * `setActiveSession`, and navigating home. Mirrors AttendancePage.tsx's own
 * `open()` — same "still land on the local session even if the write
 * fails" fallback — but treats every expected player as present instead of
 * a checklist selection.
 *
 * `isPending`/`playersLoading` mirror Task 3's loading-state guard so every
 * caller disables its own "Start Now"/"Yes" button the same way: while
 * `isPending` the activate write is in flight, and while `playersLoading`
 * the local nickname resolution used for the on-screen roster is still
 * incomplete (the persisted write itself uses `expected_player_ids`
 * directly and is unaffected either way).
 *
 * Extracted rather than duplicated a second time for Task 4 — see
 * CalendarPage.tsx's `StartOrReviewModal` and DashboardPage.tsx's
 * planned-session disambiguation prompt for the two call sites.
 */
export function useStartPlannedSession() {
  const nav = useNavigate()
  const { setActiveSession } = useSessionStore()
  const activateSession = useActivateSession()
  const { data: allPlayers = [], isLoading: playersLoading } = usePlayers()

  async function start(session: Session) {
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

  return { start, isPending: activateSession.isPending, playersLoading }
}
