import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Player } from '../types'

// ── Mock usePlayers so this hook's tests don't need a real react-query
// provider (same convention as src/pages/DrillPage.test.tsx). ────────────────
let mockData: Player[] = []
const mockRefetch = vi.fn()
vi.mock('./usePlayers', () => ({
  usePlayers: () => ({ data: mockData, refetch: mockRefetch }),
}))

import { useResolvePickedPlayers } from './useResolvePickedPlayers'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Jordan Carter',
    nickname: 'JC',
    target_ft_percent: 0.75,
    target_mid_percent: 0.5,
    target_3pt_percent: 0.4,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const PLAYER_A = makePlayer({ id: 'player-a', nickname: 'Ace' })
const PLAYER_B = makePlayer({ id: 'player-b', nickname: 'Bee' })

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.clearAllMocks()
  mockData = []
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

// Mounts a minimal host component so the hook runs under real React
// rules-of-hooks semantics, and hands back its `resolveIds`.
function mountHook(): { resolveIds: (ids: string[]) => Promise<Player[]> } {
  let captured: ((ids: string[]) => Promise<Player[]>) | null = null
  function Harness() {
    const { resolveIds } = useResolvePickedPlayers()
    captured = resolveIds
    return null
  }
  act(() => {
    root.render(<Harness />)
  })
  return { resolveIds: (ids) => captured!(ids) }
}

describe('useResolvePickedPlayers', () => {
  it('resolves synchronously from the cached list when every id is already present', async () => {
    mockData = [PLAYER_A, PLAYER_B]
    const { resolveIds } = mountHook()

    const result = await resolveIds([PLAYER_A.id, PLAYER_B.id])

    expect(result).toEqual([PLAYER_A, PLAYER_B])
    expect(mockRefetch).not.toHaveBeenCalled()
  })

  it('refetches and resolves against the fresh result when an id is missing (new-player-creation race)', async () => {
    mockData = [PLAYER_A] // PLAYER_B just got created — not in the cache yet
    mockRefetch.mockResolvedValue({ data: [PLAYER_A, PLAYER_B] })
    const { resolveIds } = mountHook()

    const result = await resolveIds([PLAYER_A.id, PLAYER_B.id])

    expect(result).toEqual([PLAYER_A, PLAYER_B])
    expect(mockRefetch).toHaveBeenCalledTimes(1)
  })

  it('falls back to the best-effort cached match when the refetch itself fails', async () => {
    mockData = [PLAYER_A]
    mockRefetch.mockRejectedValue(new Error('offline'))
    const { resolveIds } = mountHook()

    const result = await resolveIds([PLAYER_A.id, PLAYER_B.id])

    expect(result).toEqual([PLAYER_A])
  })

  it('returns an empty array when nothing resolves and the refetch also comes back empty', async () => {
    mockData = []
    mockRefetch.mockResolvedValue({ data: [] })
    const { resolveIds } = mountHook()

    const result = await resolveIds(['unknown-id'])

    expect(result).toEqual([])
  })
})
