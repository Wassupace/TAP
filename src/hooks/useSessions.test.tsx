import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mock Supabase chain (same convention as src/lib/db.test.ts) ──────────────
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('../lib/supabase', () => ({ supabase: { from: mockFrom } }))

import { useCreatePlannedSession, useCreateRecurringSessions, useTodaysPlannedSession, useLocationHistory, dedupeLocationsByRecency } from './useSessions'

function buildInsertChain(result: { data?: unknown; error?: unknown }) {
  const chain = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  }
  chain.insert.mockReturnValue(chain)
  chain.select.mockReturnValue(chain)
  chain.single.mockResolvedValue(result)
  ;(mockFrom as MockedFunction<typeof mockFrom>).mockReturnValue(chain)
  return chain
}

// Task 6: the batch-insert path (`useCreateRecurringSessions`) never calls
// `.single()` — it inserts an array and keeps the array back — so this
// chain's `.select()` itself resolves, unlike `buildInsertChain` above.
function buildBatchInsertChain(result: { data?: unknown; error?: unknown }) {
  const chain = {
    insert: vi.fn(),
    select: vi.fn(),
  }
  chain.insert.mockReturnValue(chain)
  chain.select.mockResolvedValue(result)
  ;(mockFrom as MockedFunction<typeof mockFrom>).mockReturnValue(chain)
  return chain
}

function buildTodaysPlannedChain(result: { data?: unknown; error?: unknown }) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
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
  it('inserts state: planned with no started_at key, and forwards expectedPlayerIds', async () => {
    const chain = buildInsertChain({
      data: { id: 's1', location: 'Levallois Gym', date: '2026-09-01', state: 'planned' },
      error: null,
    })
    const getHook = mountHook()

    await act(async () => {
      await getHook().mutateAsync({
        location: 'Levallois Gym',
        date: '2026-09-01',
        expectedPlayerIds: ['p1', 'p2'],
      })
    })

    expect(mockFrom).toHaveBeenCalledWith('sessions')
    expect(chain.insert).toHaveBeenCalledTimes(1)
    const payload = chain.insert.mock.calls[0][0]
    expect(payload).toEqual({
      location: 'Levallois Gym',
      date: '2026-09-01',
      state: 'planned',
      is_recurring: false,
      expected_player_ids: ['p1', 'p2'],
    })
    expect(payload).not.toHaveProperty('started_at')
  })

  it('defaults expectedPlayerIds to an empty array when omitted', async () => {
    const chain = buildInsertChain({
      data: { id: 's2', location: 'Gym B', date: '2026-09-02', state: 'planned' },
      error: null,
    })
    const getHook = mountHook()

    await act(async () => {
      await getHook().mutateAsync({ location: 'Gym B', date: '2026-09-02' })
    })

    const payload = chain.insert.mock.calls[0][0]
    expect(payload.expected_player_ids).toEqual([])
    expect(payload).not.toHaveProperty('started_at')
  })

  it('rejects when Supabase returns an error', async () => {
    buildInsertChain({ data: null, error: new Error('offline') })
    const getHook = mountHook()

    await expect(
      act(async () => {
        await getHook().mutateAsync({ location: 'Gym C', date: '2026-09-03' })
      })
    ).rejects.toThrow('offline')
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
  it('inserts a single batched array of 8 rows, is_recurring with the selected date\'s weekday', async () => {
    const chain = buildBatchInsertChain({ data: [{ id: 'r1' }], error: null })
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
    // Single batched call — not one insert per session.
    expect(chain.insert).toHaveBeenCalledTimes(1)
    expect(chain.select).toHaveBeenCalledTimes(1)

    const rows = chain.insert.mock.calls[0][0]
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
    for (const row of rows) {
      expect(row).toEqual({
        location: 'Levallois Gym',
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        state: 'planned',
        is_recurring: true,
        recurrence_weekday: 2,
        expected_player_ids: ['p1'],
      })
    }
  })

  it('defaults expectedPlayerIds to an empty array on every row when omitted', async () => {
    const chain = buildBatchInsertChain({ data: [], error: null })
    const getHook = mountRecurringHook()

    await act(async () => {
      await getHook().mutateAsync({ location: 'Gym B', date: '2026-09-02' })
    })

    const rows = chain.insert.mock.calls[0][0]
    expect(rows).toHaveLength(8)
    for (const row of rows) {
      expect(row.expected_player_ids).toEqual([])
    }
  })

  it('rejects when Supabase returns an error', async () => {
    buildBatchInsertChain({ data: null, error: new Error('offline') })
    const getHook = mountRecurringHook()

    await expect(
      act(async () => {
        await getHook().mutateAsync({ location: 'Gym C', date: '2026-09-03' })
      })
    ).rejects.toThrow('offline')
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
