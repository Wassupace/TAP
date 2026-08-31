import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Makes React flush passive effects synchronously inside `act()` instead of
// deferring them load-dependently (the standard fix for a bare
// react-dom/client + act() harness — same idea @testing-library/react sets
// up implicitly).
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// ── Mock Supabase chain (same convention as src/hooks/useSessions.test.tsx) ──
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('../lib/supabase', () => ({ supabase: { from: mockFrom } }))

import { useSessionHighlights } from './useSessionHighlights'

// `useActivityFeed`'s chain: .select('*').eq('session_id', id).order(...)
function buildActivityChain(result: { data?: unknown; error?: unknown }) {
  const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn() }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.order.mockResolvedValue(result)
  return chain
}

// `games`/`heat_entries`'s chain: .select('*').in(column, ids)
function buildInChain(result: { data?: unknown; error?: unknown }) {
  const chain = { select: vi.fn(), in: vi.fn() }
  chain.select.mockReturnValue(chain)
  chain.in.mockResolvedValue(result)
  return chain
}

// Dispatches `supabase.from(table)` to a per-table mock chain, so a single
// test can control the `activity_records`, `games`, `heat_entries`,
// `drills`, and `players` responses independently — this hook queries all
// five (the latter four conditionally, once earlier stages reveal which
// reference/player ids to look up).
function mockTables(opts: {
  activities: { data?: unknown; error?: unknown }
  games?: { data?: unknown; error?: unknown }
  heatEntries?: { data?: unknown; error?: unknown }
  drills?: { data?: unknown; error?: unknown }
  players?: { data?: unknown; error?: unknown }
}) {
  const activityChain = buildActivityChain(opts.activities)
  const gamesChain = opts.games ? buildInChain(opts.games) : null
  const heatChain = opts.heatEntries ? buildInChain(opts.heatEntries) : null
  const drillsChain = opts.drills ? buildInChain(opts.drills) : null
  const playersChain = opts.players ? buildInChain(opts.players) : null
  ;(mockFrom as MockedFunction<typeof mockFrom>).mockImplementation((table: string) => {
    if (table === 'activity_records') return activityChain
    if (table === 'games') {
      if (!gamesChain) throw new Error('unexpected supabase.from("games") call')
      return gamesChain
    }
    if (table === 'heat_entries') {
      if (!heatChain) throw new Error('unexpected supabase.from("heat_entries") call')
      return heatChain
    }
    if (table === 'drills') {
      if (!drillsChain) throw new Error('unexpected supabase.from("drills") call')
      return drillsChain
    }
    if (table === 'players') {
      if (!playersChain) throw new Error('unexpected supabase.from("players") call')
      return playersChain
    }
    throw new Error(`unexpected table: ${table}`)
  })
  return { activityChain, gamesChain, heatChain, drillsChain, playersChain }
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

// Captures this hook's own return value from *inside* the rendered tree.
//
// The previous version of this helper polled `useIsFetching()` — a global
// fetch counter subscription — on the theory that any subscription-backed
// value can only change as part of an actual React commit. That's true of
// the counter itself, but the counter is still a *proxy*: `notifyManager`
// (react-query v5) schedules cache→React notifications via a real
// `setTimeout(0)`, not a microtask, so a render can observe the global
// counter hit zero after one dependent stage's cache entry has settled but
// before React has been notified to re-render *this* hook with the next
// stage's result. A global counter reaching zero says nothing about
// whether *this* hook's own `games`/`heatEntries`/`highlight`/`toWorkOn`
// have been recomputed in a committed render yet.
//
// The hook itself now exposes `isPending` (see useSessionHighlights.ts),
// combining each dependent stage's *own* `useQuery` `isPending` — no global
// proxy involved. Polling that field, captured straight off the hook's
// return value in this render, gives the same guarantee
// useSessions.test.tsx's `waitForSettled` gets from a bare `useQuery`'s
// `isPending`: whatever this poll reads is always from the same render pass
// that produced the `highlight`/`toWorkOn` values under test, because both
// come out of the same call to `useSessionHighlights()` on the same commit.
function mountHook(sessionId: string): () => ReturnType<typeof useSessionHighlights> {
  let captured: ReturnType<typeof useSessionHighlights> | null = null
  function Harness() {
    captured = useSessionHighlights(sessionId)
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

// Same rationale as src/hooks/useSessions.test.tsx's `waitForSettled`: a
// single macrotask tick is usually enough, but under load a query's own
// state update can land after that one tick fires — and this hook chains
// two stages (the activity feed resolving before `games`/`heat_entries`
// even become enabled), so this polls the hook's own `isPending` (see
// above) across up to 20 ticks rather than assuming one tick suffices.
async function waitForSettled(getHook: () => { isPending: boolean }) {
  for (let i = 0; i < 20; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    if (!getHook().isPending) return
  }
}

describe('useSessionHighlights', () => {
  it('picks the closest game (by score margin) over a blowout logged in the same session', async () => {
    const { gamesChain } = mockTables({
      activities: {
        data: [
          { id: 'a1', session_id: 's1', activity_type: 'match', reference_id: 'match-1', created_at: '2026-08-20T10:00:00Z' },
        ],
        error: null,
      },
      games: {
        data: [
          { id: 'g1', match_id: 'match-1', game_number: 1, team_a_score: 21, team_b_score: 4, duration_seconds: 900, team_a_player_ids: [], team_b_player_ids: [] },
          { id: 'g2', match_id: 'match-1', game_number: 2, team_a_score: 11, team_b_score: 10, duration_seconds: 1140, team_a_player_ids: [], team_b_player_ids: [] },
        ],
        error: null,
      },
    })
    const getHook = mountHook('s1')

    await waitForSettled(getHook)

    expect(gamesChain!.in).toHaveBeenCalledWith('match_id', ['match-1'])
    expect(getHook().highlight).toEqual({
      icon: 'flame',
      label: 'Highlight',
      value: 'Closest game: 11-10, lasted 19 min',
    })
    expect(getHook().toWorkOn).toBeNull()
    expect(getHook().yourDay).toEqual({
      icon: 'trophy',
      label: 'Your day',
      value: 'Winning side in 2 of 2 games',
    })
  })

  it('picks the lowest-% drill spot with real attempts, never a spot with zero attempts', async () => {
    const { heatChain } = mockTables({
      activities: {
        data: [
          { id: 'a1', session_id: 's1', activity_type: 'drill', reference_id: 'drill-1', created_at: '2026-08-20T10:00:00Z' },
        ],
        error: null,
      },
      drills: {
        data: [{ id: 'drill-1', shot_type: 'midRange' }],
        error: null,
      },
      heatEntries: {
        data: [
          // left0: 20% — the true worst performer.
          { id: 'h1', drill_id: 'drill-1', player_id: 'p1', hand: 'right', spot: 'left0', makes: 2, attempts: 10, heat_number: 1, recorded_at: '2026-08-20T10:05:00Z' },
          // center: 80% — a strong spot, must not win.
          { id: 'h2', drill_id: 'drill-1', player_id: 'p1', hand: 'right', spot: 'center', makes: 8, attempts: 10, heat_number: 1, recorded_at: '2026-08-20T10:06:00Z' },
          // right0: 0 attempts recorded — must never win despite a 0/0 "percentage".
          { id: 'h3', drill_id: 'drill-1', player_id: 'p1', hand: 'right', spot: 'right0', makes: 0, attempts: 0, heat_number: 1, recorded_at: '2026-08-20T10:07:00Z' },
        ],
        error: null,
      },
    })
    const getHook = mountHook('s1')

    await waitForSettled(getHook)

    expect(heatChain!.in).toHaveBeenCalledWith('drill_id', ['drill-1'])
    expect(getHook().highlight).toBeNull()
    expect(getHook().toWorkOn).toEqual({
      icon: 'bolt',
      label: 'To work on',
      value: 'L 0°: 20%',
    })
    // Not a free-throw drill, so no FT clause; no games logged, so no
    // winning-side clause either — the whole callout is null.
    expect(getHook().yourDay).toBeNull()
  })

  it('computes the Your day free-throw clause vs. the average target of players who shot it', async () => {
    mockTables({
      activities: {
        data: [
          { id: 'a1', session_id: 's1', activity_type: 'drill', reference_id: 'drill-1', created_at: '2026-08-20T10:00:00Z' },
        ],
        error: null,
      },
      drills: {
        data: [{ id: 'drill-1', shot_type: 'freeThrow' }],
        error: null,
      },
      heatEntries: {
        data: [
          { id: 'h1', drill_id: 'drill-1', player_id: 'p1', hand: 'right', makes: 41, attempts: 50, heat_number: 1, recorded_at: '2026-08-20T10:05:00Z' },
        ],
        error: null,
      },
      players: {
        data: [{ id: 'p1', target_ft_percent: 75 }],
        error: null,
      },
    })
    const getHook = mountHook('s1')

    await waitForSettled(getHook)

    expect(getHook().yourDay).toEqual({
      icon: 'trophy',
      label: 'Your day',
      value: 'FT 82% (above goal)',
    })
  })

  it('returns both as null when the session logged neither match nor drill activity', async () => {
    mockTables({
      activities: {
        data: [
          { id: 'a1', session_id: 's1', activity_type: 'competitiveGame', reference_id: 'cg-1', created_at: '2026-08-20T10:00:00Z' },
        ],
        error: null,
      },
    })
    const getHook = mountHook('s1')

    await waitForSettled(getHook)

    expect(getHook().highlight).toBeNull()
    expect(getHook().toWorkOn).toBeNull()
    expect(getHook().yourDay).toBeNull()
    expect(mockFrom).not.toHaveBeenCalledWith('games')
    expect(mockFrom).not.toHaveBeenCalledWith('heat_entries')
  })

  it('returns both as null when the session logged no activity at all', async () => {
    mockTables({ activities: { data: [], error: null } })
    const getHook = mountHook('s1')

    await waitForSettled(getHook)

    expect(getHook().highlight).toBeNull()
    expect(getHook().toWorkOn).toBeNull()
    expect(getHook().yourDay).toBeNull()
  })
})
