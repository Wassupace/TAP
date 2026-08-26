import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Session, SessionAttendance } from '../types'
import { buildRecurringSessionDates } from '../utils/recurringSessions'
import { todayISODate } from '../utils/todayISODate'

export function useSessions(year: number, month: number) {
  return useQuery({
    queryKey: ['sessions', year, month],
    queryFn: async () => {
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .gte('date', start)
        .lte('date', end)
        .order('date')
      if (error) throw error
      return data as Session[]
    },
  })
}

// Task 4 (PRD §3.3): looks up whether a `state: 'planned'` session already
// exists for today, so both ad-hoc-creation flows (DashboardPage's
// handleConfirm and CalendarPage's handleCreateAndOpen) can offer a
// Yes/No disambiguation instead of silently creating a second, unrelated
// session on top of one already on the calendar. "Today" is computed via
// the shared `todayISODate()` util (final-review Fix 3) — the same LOCAL-
// date convention CalendarPage.tsx's grid already uses — so this hook, the
// Calendar, and the Dashboard can never disagree about what day "today" is.
//
// Final-review Fix 1: `.order('created_at')` before `.limit(1)` makes the
// row this resolves to deterministic (earliest-created wins) when two
// `state: 'planned'` sessions land on the same date — a collision Task 6's
// weekly-recurrence feature makes newly easy (two overlapping recurring
// series). This intentionally does not attempt to surface/disambiguate
// between multiple same-day planned sessions to the coach — that's a larger
// UI change, out of scope here.
export function useTodaysPlannedSession() {
  const today = todayISODate()
  return useQuery({
    queryKey: ['todays-planned-session', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('date', today)
        .eq('state', 'planned')
        .order('created_at')
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as Session | null
    },
  })
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ['session', id],
    enabled: !!id && id !== 'morning',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Session
    },
  })
}

export function useSessionAttendances(sessionId: string) {
  return useQuery({
    queryKey: ['session-attendances', sessionId],
    enabled: !!sessionId && sessionId !== 'morning',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_attendances')
        .select('*')
        .eq('session_id', sessionId)
      if (error) throw error
      return data as SessionAttendance[]
    },
  })
}

export function useOpenSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      location,
      date,
      expectedPlayerIds = [],
    }: {
      location: string
      date: string
      expectedPlayerIds?: string[]
    }) => {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          location,
          date,
          state: 'active',
          started_at: new Date().toISOString(),
          is_recurring: false,
          expected_player_ids: expectedPlayerIds,
        })
        .select()
        .single()
      if (error) throw error
      return data as Session
    },
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.setQueryData(['session', s.id], s)
    },
  })
}

export function useCreatePlannedSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      location,
      date,
      expectedPlayerIds = [],
    }: {
      location: string
      date: string
      expectedPlayerIds?: string[]
    }) => {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          location,
          date,
          state: 'planned',
          is_recurring: false,
          expected_player_ids: expectedPlayerIds,
        })
        .select()
        .single()
      if (error) throw error
      return data as Session
    },
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.setQueryData(['session', s.id], s)
    },
  })
}

// Task 6 (PRD §3.2): the "Repeat weekly" toggle on PlanSessionSheet. Creates
// the fixed 8-session horizon in one batched `.insert([...])` (an array of
// row objects), not 8 separate requests — a deliberate separate hook rather
// than an added param on `useCreatePlannedSession()` above, since the two
// return shapes differ (one row vs. an array) and this keeps that hook's
// existing single-session callers/signature untouched. Every row shares
// `is_recurring: true` and the same `recurrence_weekday` (the selected
// date's JS day-of-week) — see `buildRecurringSessionDates()` for the date
// math itself.
export function useCreateRecurringSessions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      location,
      date,
      expectedPlayerIds = [],
    }: {
      location: string
      date: string
      expectedPlayerIds?: string[]
    }) => {
      const rows = buildRecurringSessionDates(date).map(({ date: rowDate, weekday }) => ({
        location,
        date: rowDate,
        state: 'planned' as const,
        is_recurring: true,
        recurrence_weekday: weekday,
        expected_player_ids: expectedPlayerIds,
      }))
      const { data, error } = await supabase
        .from('sessions')
        .insert(rows)
        .select()
      if (error) throw error
      return data as Session[]
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}

export function useEndSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const patch: Record<string, unknown> = {
        state: 'completed',
        ended_at: new Date().toISOString(),
      }
      if (notes !== undefined) patch.notes = notes
      const { error } = await supabase.from('sessions').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

export function useActivateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      sessionId,
      presentPlayerIds,
    }: {
      sessionId: string
      presentPlayerIds: string[]
    }) => {
      // Update session state
      const { error: sessErr } = await supabase
        .from('sessions')
        .update({ state: 'active', started_at: new Date().toISOString() })
        .eq('id', sessionId)
      if (sessErr) throw sessErr

      // Upsert attendance records
      if (presentPlayerIds.length > 0) {
        const records = presentPlayerIds.map((playerId) => ({
          session_id: sessionId,
          player_id: playerId,
          is_expected: true,
          arrived_at: new Date().toISOString(),
        }))
        const { error: attErr } = await supabase
          .from('session_attendances')
          .upsert(records, { onConflict: 'session_id,player_id' })
        if (attErr) throw attErr
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['session', vars.sessionId] })
      qc.invalidateQueries({ queryKey: ['session-attendances', vars.sessionId] })
      qc.invalidateQueries({ queryKey: ['sessions'] })
      // Final-review Fix 4: none of the keys above prefix-match
      // ['todays-planned-session', <date>], so activating a session never
      // invalidated that cache entry. Currently masked by a 30s staleTime
      // and normal navigation patterns, but defensively correct — a
      // partial key match invalidates every ['todays-planned-session', *]
      // entry (TanStack Query prefix-matches by default).
      qc.invalidateQueries({ queryKey: ['todays-planned-session'] })
    },
  })
}

// Task 5 (PRD §3.2): dedupes locations client-side, preserving most-recent-first order
export function dedupeLocationsByRecency(
  locations: (string | null | undefined)[]
): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const loc of locations) {
    const trimmed = loc?.trim()
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed)
      result.push(trimmed)
    }
  }
  return result
}

export function useLocationHistory() {
  return useQuery({
    queryKey: ['location-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('location')
        .order('date', { ascending: false })
        .limit(50)
      if (error) throw error
      const dedupedLocations = dedupeLocationsByRecency(
        data.map((row) => (row as Record<string, unknown>).location as string | null | undefined)
      )
      return dedupedLocations.slice(0, 15)
    },
  })
}
