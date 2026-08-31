import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── In-memory IndexedDB queue store (same convention as src/lib/db.test.ts) —
// useOpenSession et al. are routed through dbInsert/dbUpdate (Task 5, PRD
// §1.3), which queues via idb before attempting Supabase. A real in-memory
// store (not a static stub) is needed so getPendingCount() below actually
// reflects queued/dequeued items.
const idbStore = new Map<string, unknown>()

vi.mock('idb', () => ({
  openDB: async () => ({
    put: async (_: string, val: { id: string }) => { idbStore.set(val.id, val) },
    delete: async (_: string, id: string) => { idbStore.delete(id) },
    count: async () => idbStore.size,
    getAll: async () => [...idbStore.values()],
    clear: async () => idbStore.clear(),
  }),
}))

// ── Mock Supabase chain (same convention as src/lib/db.test.ts) ──────────────
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('../lib/supabase', () => ({ supabase: { from: mockFrom } }))

import { useCreatePlannedSession, useCreateRecurringSessions, useTodaysPlannedSession, useLocationHistory, dedupeLocationsByRecency } from './useSessions'
import { getPendingCount } from '../lib/syncQueue'

// dbInsert() upserts (onConflict: 'id' by default) rather than plain
// .insert() (Task 5) — see src/lib/db.ts.
function buildUpsertChain(result: { error?: unknown }) {
  const chain = { upsert: vi.fn() }
  chain.upsert.mockResolvedValue(result)
  ;(mockFrom as MockedFunction<typeof mockFrom>).mockReturnValue(chain)
  return chain
}

function buildTodaysPlannedChain(result: { data?: unknown; error?: unknown }) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.order.mockReturnValue(chain)
  chain.limit.mockReturnValue(chain)
  chain.maybeSingle.mockResolvedValue(result)
  ;(mockFrom as MockedFunction<typeof mockFrom>).mockReturnValue(chain)
  return chain
}

let container: HTMLDivElement
let root: Root
let queryClient: QueryClient

beforeEach(() => {
  vi.clearAllMocks()
  idbStore.clear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  queryClient = new QueryClient()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

// Mounts a minimal host component so the hook runs under real React
// rules-of-hooks semantics (and a real QueryClientProvider, since this hook
// uses useMutation/useQueryClient) — same harness style as
// src/hooks/useResolvePickedPlayers.test.tsx.
function mountHook(): () => ReturnType<typeof useCreatePlannedSession> {
  let captured: ReturnType<typeof useCreatePlannedSession> | null = null
  function Harness() {
    captured = useCreatePlannedSession()
    return null
  }
  act(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>
    )
  })
  return () => captured!
}

describe('useCreatePlannedSession', () => {
  it('upserts state: planned with a client-generated id and no started_at key, forwarding expectedPlayerIds', async () => {
    const chain = buildUpsertChain({ error: null })
    const getHook = mountHook()

    const result = await act(async () => {
      return getHook().mutateAsync({
        location: 'Levallois Gym',
        date: '2026-09-01',
        expectedPlayerIds: ['p1', 'p2'],
      })
    })

    expect(mockFrom).toHaveBeenCalledWith('sessions')
    expect(chain.upsert).toHaveBeenCalledTimes(1)
    const [payload, opts] = chain.upsert.mock.calls[0]
    expect(opts).toEqual({ onConflict: 'id' })
    expect(payload).toMatchObject({
      location: 'Levallois Gym',
      date: '2026-09-01',
      state: 'planned',
      is_recurring: false,
      expected_player_ids: ['p1', 'p2'],
    })
    expect(typeof payload.id).toBe('string')
    expect(payload.id.length).toBeGreaterThan(0)
    expect(payload).not.toHaveProperty('started_at')
    // The mutation resolves with the same locally-built session (including
    // the id used for the write) rather than a value read back from Supabase.
    expect(result).toEqual(payload)
  })

  it('defaults expectedPlayerIds to an empty array when omitted', async () => {
    const chain = buildUpsertChain({ error: null })
    const getHook = mountHook()

    await act(async () => {
      await getHook().mutateAsync({ location: 'Gym B', date: '2026-09-02' })
    })

    const payload = chain.upsert.mock.calls[0][0]
    expect(payload.expected_player_ids).toEqual([])
    expect(payload).not.toHaveProperty('started_at')
  })

  it('resolves (rather than rejecting) when Supabase is unreachable, leaving the write queued for retry', async () => {
    buildUpsertChain({ error: new Error('offline') })
    const getHook = mountHook()

    const result = await act(async () => {
      return getHook().mutateAsync({ location: 'Gym C', date: '2026-09-03' })
    })

    expect(result.location).toBe('Gym C')
    expect(await getPendingCount()).toBe(1)
  })
})

// Same harness style as mountHook above, for useCreateRecurringSessions's
// mutation instead.
function mountRecurringHook(): () => ReturnType<typeof useCreateRecurringSessions> {
  let captured: ReturnType<typeof useCreateRecurringSessions> | null = null
  function Harness() {
    captured = useCreateRecurringSessions()
    return null
  }
  act(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>
    )
  })
  return () => captured!
}

describe('useCreateRecurringSessions', () => {
  it('upserts a single batched array of 8 rows, each with its own client-generated id and is_recurring/weekday', async () => {
    const chain = buildUpsertChain({ error: null })
    const getHook = mountRecurringHook()

    await act(async () => {
      // 2026-09-01 is a Tuesday (getDay() === 2)
      await getHook().mutateAsync({
        location: 'Levallois Gym',
        date: '2026-09-01',
        expectedPlayerIds: ['p1'],
      })
    })

    expect(mockFrom).toHaveBeenCalledWith('sessions')
    // Single batched call — not one write per session.
    expect(chain.upsert).toHaveBeenCalledTimes(1)
    const [rows, opts] = chain.upsert.mock.calls[0]
    expect(opts).toEqual({ onConflict: 'id' })
    expect(Array.isArray(rows)).toBe(true)
    expect(rows).toHaveLength(8)
    expect(rows.map((r: { date: string }) => r.date)).toEqual([
      '2026-09-01',
      '2026-09-08',
      '2026-09-15',
      '2026-09-22',
      '2026-09-29',
      '2026-10-06',
      '2026-10-13',
      '2026-10-20',
    ])
    const ids = new Set<string>()
    for (const row of rows) {
      expect(row).toMatchObject({
        location: 'Levallois Gym',
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        state: 'planned',
        is_recurring: true,
        recurrence_weekday: 2,
        expected_player_ids: ['p1'],
      })
      expect(typeof row.id).toBe('string')
      ids.add(row.id)
    }
    expect(ids.size).toBe(8) // every row gets its own distinct id
  })

  it('defaults expectedPlayerIds to an empty array on every row when omitted', async () => {
    const chain = buildUpsertChain({ error: null })
    const getHook = mountRecurringHook()

    await act(async () => {
      await getHook().mutateAsync({ location: 'Gym B', date: '2026-09-02' })
    })

    const rows = chain.upsert.mock.calls[0][0]
    expect(rows).toHaveLength(8)
    for (const row of rows) {
      expect(row.expected_player_ids).toEqual([])
    }
  })

  it('resolves (rather than rejecting) when Supabase is unreachable, leaving the batch queued for retry', async () => {
    buildUpsertChain({ error: new Error('offline') })
    const getHook = mountRecurringHook()

    const result = await act(async () => {
      return getHook().mutateAsync({ location: 'Gym C', date: '2026-09-03' })
    })

    expect(result).toHaveLength(8)
    expect(await getPendingCount()).toBe(1) // one batched queue entry, not 8
  })
})

// Mounts a minimal host component for a *query* hook (as opposed to
// mountHook above, which is for useCreatePlannedSession's mutation) — same
// harness style, but flushes a macrotask tick afterward so the query's
// async queryFn has resolved and the captured result reflects it.
function mountQueryHook(): () => ReturnType<typeof useTodaysPlannedSession> {
  let captured: ReturnType<typeof useTodaysPlannedSession> | null = null
  function Harness() {
    captured = useTodaysPlannedSession()
    return null
  }
  act(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>
    )
  })
  return () => captured!
}

// A single macrotask tick is usually enough for the mocked chain to
// resolve, but under load (full-suite runs) that one tick can fire before
// the query observer's own state update reaches this render — poll the
// hook's own isPending flag (not a cache-level proxy like isFetching,
// which can flip before the component's render commits) so this can never
// read a stale `data` value out of a race.
async function waitForSettled(getHook: () => { isPending: boolean }) {
  for (let i = 0; i < 20; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    if (!getHook().isPending) return
  }
}

describe('useTodaysPlannedSession', () => {
  it('queries for a planned session on today\'s date and returns the match', async () => {
    const todaySession = { id: 's9', location: 'Levallois Gym', date: '2099-01-01', state: 'planned' }
    const chain = buildTodaysPlannedChain({ data: todaySession, error: null })
    const getHook = mountQueryHook()

    await waitForSettled(getHook)

    expect(mockFrom).toHaveBeenCalledWith('sessions')
    expect(chain.eq).toHaveBeenNthCalledWith(1, 'date', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    expect(chain.eq).toHaveBeenNthCalledWith(2, 'state', 'planned')
    expect(chain.limit).toHaveBeenCalledWith(1)
    expect(chain.maybeSingle).toHaveBeenCalledTimes(1)
    expect(getHook().data).toEqual(todaySession)
  })

  it('returns null when no planned session exists for today', async () => {
    buildTodaysPlannedChain({ data: null, error: null })
    const getHook = mountQueryHook()

    await waitForSettled(getHook)

    expect(getHook().data).toBeNull()
  })
})

describe('dedupeLocationsByRecency', () => {
  it('dedupes locations while preserving most-recent-first order', () => {
    const locations = ['Gym A', 'Gym B', 'Gym A', 'Gym C', 'Gym B']
    const result = dedupeLocationsByRecency(locations)
    expect(result).toEqual(['Gym A', 'Gym B', 'Gym C'])
  })

  it('filters out null, undefined, and empty strings', () => {
    const locations = ['Gym A', null, 'Gym B', undefined, '', '  ', 'Gym C']
    const result = dedupeLocationsByRecency(locations)
    expect(result).toEqual(['Gym A', 'Gym B', 'Gym C'])
  })

  it('trims whitespace before deduping', () => {
    const locations = ['Gym A', '  Gym A  ', 'Gym B']
    const result = dedupeLocationsByRecency(locations)
    expect(result).toEqual(['Gym A', 'Gym B'])
  })

  it('returns empty array for empty input', () => {
    expect(dedupeLocationsByRecency([])).toEqual([])
  })
})

function buildLocationHistoryChain(result: { data?: unknown; error?: unknown }) {
  const chain = {
    select: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  }
  chain.select.mockReturnValue(chain)
  chain.order.mockReturnValue(chain)
  chain.limit.mockResolvedValue(result)
  ;(mockFrom as MockedFunction<typeof mockFrom>).mockReturnValue(chain)
  return chain
}

function mountLocationHistoryHook(): () => ReturnType<typeof useLocationHistory> {
  let captured: ReturnType<typeof useLocationHistory> | null = null
  function Harness() {
    captured = useLocationHistory()
    return null
  }
  act(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>
    )
  })
  return () => captured!
}

describe('useLocationHistory', () => {
  it('fetches up to 50 sessions, dedupes client-side, and returns up to 15 locations', async () => {
    const locations = Array.from({ length: 50 }, (_, i) => ({
      location: i % 3 === 0 ? 'Gym A' : i % 3 === 1 ? 'Gym B' : 'Gym C',
    }))
    const chain = buildLocationHistoryChain({ data: locations, error: null })
    const getHook = mountLocationHistoryHook()

    await waitForSettled(getHook)

    expect(mockFrom).toHaveBeenCalledWith('sessions')
    expect(chain.select).toHaveBeenCalledWith('location')
    expect(chain.order).toHaveBeenCalledWith('date', { ascending: false })
    expect(chain.limit).toHaveBeenCalledWith(50)
    expect(getHook().data).toEqual(['Gym A', 'Gym B', 'Gym C'])
  })

  it('handles responses with nulls and empty strings', async () => {
    const locations = [
      { location: 'Gym A' },
      { location: null },
      { location: 'Gym B' },
      { location: '' },
      { location: 'Gym A' },
    ]
    buildLocationHistoryChain({ data: locations, error: null })
    const getHook = mountLocationHistoryHook()

    await waitForSettled(getHook)

    expect(getHook().data).toEqual(['Gym A', 'Gym B'])
  })

  it('returns empty array when no locations are found', async () => {
    buildLocationHistoryChain({ data: [], error: null })
    const getHook = mountLocationHistoryHook()

    await waitForSettled(getHook)

    expect(getHook().data).toEqual([])
  })
})
