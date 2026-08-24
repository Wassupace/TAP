import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mock Supabase chain (same convention as src/lib/db.test.ts) ──────────────
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('../lib/supabase', () => ({ supabase: { from: mockFrom } }))

import { useCreatePlannedSession } from './useSessions'

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
