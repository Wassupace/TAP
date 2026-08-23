import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest'
import type { Player } from '../types'

// ── Mock IndexedDB queue + Supabase chain (same style as src/lib/db.test.ts) ──
vi.mock('idb', () => ({
  openDB: async () => ({
    put: async () => {},
    delete: async () => {},
    count: async () => 0,
    getAll: async () => [],
    clear: async () => {},
  }),
}))

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('../lib/supabase', () => ({ supabase: { from: mockFrom } }))

function buildChain(err: unknown = null) {
  const chain = { insert: vi.fn() }
  chain.insert.mockReturnValue(Promise.resolve({ error: err }))
  ;(mockFrom as MockedFunction<typeof mockFrom>).mockReturnValue(chain)
  return chain
}

import { useDrillStore } from './drillStore'

const PLAYER_A: Player = {
  id: 'player-a-uuid',
  name: 'Alice Anderson',
  nickname: 'Ace',
  target_ft_percent: 0.75,
  target_mid_percent: 0.5,
  target_3pt_percent: 0.4,
  created_at: '2026-01-01T00:00:00Z',
}

const PLAYER_B: Player = {
  id: 'player-b-uuid',
  name: 'Bianca Brown',
  nickname: 'Bee',
  target_ft_percent: 0.75,
  target_mid_percent: 0.5,
  target_3pt_percent: 0.4,
  created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  useDrillStore.getState().reset()
})

describe('drillStore — player assignment regression (heat_entries.player_id)', () => {
  // This is the direct regression test for the bug: DrillPage.tsx's Step 4
  // never called setPlayers(), so `players` stayed `[]` for the whole drill
  // and every commitHeat() saved playerId: '' via
  // `players[currentPlayerIndex]?.id ?? ''`. Once setPlayers() is wired up
  // (DrillPage.tsx Step 4), this must produce distinct, real player ids.
  it('assigns distinct, non-empty, real player ids across a two-player round robin', () => {
    buildChain()
    useDrillStore.getState().setPlayers([PLAYER_A, PLAYER_B])

    useDrillStore.getState().setMakes(7)
    useDrillStore.getState().commitHeat() // heat 1 — active player is index 0 (Alice)

    useDrillStore.getState().setMakes(5)
    useDrillStore.getState().commitHeat() // heat 2 — round-robin advances to index 1 (Bianca)

    const { completedHeats } = useDrillStore.getState()
    expect(completedHeats).toHaveLength(2)

    const [heat1, heat2] = completedHeats
    expect(heat1.playerId).not.toBe('')
    expect(heat2.playerId).not.toBe('')
    expect(heat1.playerId).not.toBe(heat2.playerId)
    expect(heat1.playerId).toBe(PLAYER_A.id)
    expect(heat2.playerId).toBe(PLAYER_B.id)
  })

  it('writes the real active player id to Supabase heat_entries, not an empty string', async () => {
    const chain = buildChain()
    useDrillStore.getState().setDrillId('drill-1')
    useDrillStore.getState().setPlayers([PLAYER_A, PLAYER_B])

    useDrillStore.getState().setMakes(9)
    useDrillStore.getState().commitHeat()

    await vi.waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('heat_entries')
    })
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ player_id: PLAYER_A.id })
    )
  })

  it('round-robins back to the first player once every spot/player pair is exhausted for the heat', () => {
    buildChain()
    useDrillStore.getState().setPlayers([PLAYER_A, PLAYER_B])

    useDrillStore.getState().setMakes(1)
    useDrillStore.getState().commitHeat() // Alice
    useDrillStore.getState().setMakes(1)
    useDrillStore.getState().commitHeat() // Bianca
    useDrillStore.getState().setMakes(1)
    useDrillStore.getState().commitHeat() // back to Alice

    const { completedHeats } = useDrillStore.getState()
    expect(completedHeats.map(h => h.playerId)).toEqual([
      PLAYER_A.id,
      PLAYER_B.id,
      PLAYER_A.id,
    ])
  })
})

describe('drillStore — setCurrentPlayerIndex (manual shooter override)', () => {
  it('updates currentPlayerIndex directly', () => {
    useDrillStore.getState().setPlayers([PLAYER_A, PLAYER_B])
    expect(useDrillStore.getState().currentPlayerIndex).toBe(0)

    useDrillStore.getState().setCurrentPlayerIndex(1)
    expect(useDrillStore.getState().currentPlayerIndex).toBe(1)
  })

  it('the manually-selected player is the one commitHeat tags the next heat with', () => {
    buildChain()
    useDrillStore.getState().setPlayers([PLAYER_A, PLAYER_B])
    useDrillStore.getState().setCurrentPlayerIndex(1)

    useDrillStore.getState().setMakes(3)
    useDrillStore.getState().commitHeat()

    expect(useDrillStore.getState().completedHeats[0].playerId).toBe(PLAYER_B.id)
  })
})

describe('drillStore — solo drill (no players selected)', () => {
  it('still commits heats when players is empty, without being blocked', () => {
    buildChain()
    useDrillStore.getState().setMakes(10)
    const { drillComplete } = useDrillStore.getState().commitHeat()

    const { completedHeats } = useDrillStore.getState()
    expect(completedHeats).toHaveLength(1)
    expect(completedHeats[0].playerId).toBe('')
    expect(typeof drillComplete).toBe('boolean')
  })
})
