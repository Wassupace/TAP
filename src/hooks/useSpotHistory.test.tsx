import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mock Supabase chain (same convention as src/hooks/useSessions.test.tsx) ──
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('../lib/supabase', () => ({ supabase: { from: mockFrom } }))

import { useSpotHistory } from './useSpotHistory'

function buildSpotHistoryChain(result: { data?: unknown; error?: unknown }) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.order.mockResolvedValue(result)
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
  // retry: false — otherwise the error-rejection test below would need to
  // wait out react-query's real (non-fake-timer) exponential-backoff retry
  // delays before `isError` ever flips true.
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

// Same harness style as src/hooks/useSessions.test.tsx's mountQueryHook.
function mountHook(
  playerId: string,
  spot: Parameters<typeof useSpotHistory>[1],
  handMode: Parameters<typeof useSpotHistory>[2]
): () => ReturnType<typeof useSpotHistory> {
  let captured: ReturnType<typeof useSpotHistory> | null = null
  function Harness() {
    captured = useSpotHistory(playerId, spot, handMode)
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

// Polls the hook's OWN captured isPending flag (never a cache-level proxy) —
// same reasoning as useSessions.test.tsx's waitForSettled.
async function waitForSettled(getHook: () => { isPending: boolean }) {
  for (let i = 0; i < 20; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    if (!getHook().isPending) return
  }
}

const drillEmbed = (startedAt: string, location: string | null) => ({
  started_at: startedAt,
  session: { location },
})

describe('useSpotHistory', () => {
  it('queries heat_entries filtered by player_id + spot, embeds drill/session, and does not filter by hand when handMode is "all"', async () => {
    const chain = buildSpotHistoryChain({
      data: [
        { id: 'h1', drill_id: 'd1', hand: 'right', spot: 'center', makes: 7, attempts: 10, heat_number: 1, recorded_at: '2026-08-01T10:00:00Z', drill: drillEmbed('2026-08-01T09:00:00Z', 'Levallois Gym') },
      ],
      error: null,
    })
    const getHook = mountHook('p1', 'center', 'all')

    await waitForSettled(getHook)

    expect(mockFrom).toHaveBeenCalledWith('heat_entries')
    expect(chain.select).toHaveBeenCalledWith('*, drill:drills(started_at, session:sessions(location))')
    expect(chain.eq).toHaveBeenNthCalledWith(1, 'player_id', 'p1')
    expect(chain.eq).toHaveBeenNthCalledWith(2, 'spot', 'center')
    expect(chain.eq).toHaveBeenCalledTimes(2)
    expect(chain.order).toHaveBeenCalledWith('recorded_at', { ascending: false })

    expect(getHook().data).toEqual([
      {
        drillId: 'd1',
        date: '2026-08-01T09:00:00Z',
        location: 'Levallois Gym',
        makes: 7,
        attempts: 10,
        heats: [{ heatNumber: 1, makes: 7, attempts: 10 }],
      },
    ])
  })

  it('adds an eq("hand", handMode) filter when handMode is not "all"', async () => {
    const chain = buildSpotHistoryChain({ data: [], error: null })
    const getHook = mountHook('p1', 'left45', 'left')

    await waitForSettled(getHook)

    expect(chain.eq).toHaveBeenCalledTimes(3)
    expect(chain.eq).toHaveBeenNthCalledWith(1, 'player_id', 'p1')
    expect(chain.eq).toHaveBeenNthCalledWith(2, 'spot', 'left45')
    expect(chain.eq).toHaveBeenNthCalledWith(3, 'hand', 'left')
  })

  it('mixes both hands (no hand filter) when handMode is "all"', async () => {
    const chain = buildSpotHistoryChain({
      data: [
        { id: 'h1', drill_id: 'd1', hand: 'left', spot: 'right0', makes: 4, attempts: 10, heat_number: 1, recorded_at: '2026-08-01T10:00:00Z', drill: drillEmbed('2026-08-01T09:00:00Z', 'Gym A') },
        { id: 'h2', drill_id: 'd1', hand: 'right', spot: 'right0', makes: 6, attempts: 10, heat_number: 2, recorded_at: '2026-08-01T10:05:00Z', drill: drillEmbed('2026-08-01T09:00:00Z', 'Gym A') },
      ],
      error: null,
    })
    const getHook = mountHook('p1', 'right0', 'all')

    await waitForSettled(getHook)

    expect(chain.eq).toHaveBeenCalledTimes(2) // player_id + spot only, no hand filter
    expect(getHook().data).toEqual([
      {
        drillId: 'd1',
        date: '2026-08-01T09:00:00Z',
        location: 'Gym A',
        makes: 10,
        attempts: 20,
        heats: [
          { heatNumber: 1, makes: 4, attempts: 10 },
          { heatNumber: 2, makes: 6, attempts: 10 },
        ],
      },
    ])
  })

  it('stays disabled (empty data, no supabase call) when spot is null', async () => {
    // `enabled: false` never runs the queryFn, so there's nothing async to
    // await here — checking right after mount avoids looping through
    // waitForSettled's full retry budget against a query that (per
    // react-query v5) never leaves isPending: true while disabled.
    const getHook = mountHook('p1', null, 'all')

    expect(mockFrom).not.toHaveBeenCalled()
    expect(getHook().data).toEqual([])
  })

  it('rejects when Supabase returns an error', async () => {
    buildSpotHistoryChain({ data: null, error: new Error('offline') })
    const getHook = mountHook('p1', 'center', 'all')

    await waitForSettled(getHook)

    expect(getHook().isError).toBe(true)
  })
})
