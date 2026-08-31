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
  const chain = { upsert: vi.fn() }
  chain.upsert.mockReturnValue(Promise.resolve({ error: err }))
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
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ player_id: PLAYER_A.id }),
      { onConflict: 'id' }
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

describe('drillStore — stale currentPlayerIndex after re-selecting a smaller roster (task-3 review Finding 1)', () => {
  // Repro from the review: start a 3-player drill, commit a heat so
  // currentPlayerIndex advances off 0, then go back through setup and select
  // a smaller roster. setPlayers() alone does not reset currentPlayerIndex —
  // that's by design (see brief: "no store change needed"), so the fix lives
  // in DrillPage.tsx's onConfirm handler, which must call
  // setCurrentPlayerIndex(0) right after setPlayers(). These tests pin down
  // both halves: that the stale index really does reproduce the historical
  // playerId: '' bug, and that setCurrentPlayerIndex(0) is what fixes it.
  const PLAYER_C: Player = {
    id: 'player-c-uuid',
    name: 'Carlos Cruz',
    nickname: 'CC',
    target_ft_percent: 0.75,
    target_mid_percent: 0.5,
    target_3pt_percent: 0.4,
    created_at: '2026-01-01T00:00:00Z',
  }

  it('reproduces the bug: setPlayers() alone leaves a stale index pointing past the new roster', () => {
    buildChain()
    useDrillStore.getState().setPlayers([PLAYER_A, PLAYER_B, PLAYER_C])

    useDrillStore.getState().setMakes(1)
    useDrillStore.getState().commitHeat() // index 0 -> 1 (round robin, 3 players)
    expect(useDrillStore.getState().currentPlayerIndex).toBe(1)

    // Simulate re-entering setup and selecting only one player, without
    // resetting currentPlayerIndex — this is what a caller that forgets
    // setCurrentPlayerIndex(0) looks like.
    useDrillStore.getState().setPlayers([PLAYER_A])

    const { players, currentPlayerIndex } = useDrillStore.getState()
    expect(players[currentPlayerIndex]).toBeUndefined() // stale index, exactly the review's repro

    useDrillStore.getState().setMakes(1)
    useDrillStore.getState().commitHeat()
    const last = useDrillStore.getState().completedHeats.at(-1)
    expect(last?.playerId).toBe('') // the exact bug Task 3 was supposed to eliminate
  })

  it('fix: calling setCurrentPlayerIndex(0) right after setPlayers() (as DrillPage.tsx onConfirm now does) avoids it', () => {
    buildChain()
    useDrillStore.getState().setPlayers([PLAYER_A, PLAYER_B, PLAYER_C])

    useDrillStore.getState().setMakes(1)
    useDrillStore.getState().commitHeat()
    expect(useDrillStore.getState().currentPlayerIndex).toBe(1)

    useDrillStore.getState().setPlayers([PLAYER_A])
    useDrillStore.getState().setCurrentPlayerIndex(0)

    const { players, currentPlayerIndex } = useDrillStore.getState()
    expect(players[currentPlayerIndex]).toEqual(PLAYER_A)

    useDrillStore.getState().setMakes(1)
    useDrillStore.getState().commitHeat()
    const last = useDrillStore.getState().completedHeats.at(-1)
    expect(last?.playerId).toBe(PLAYER_A.id)
  })
})

describe('drillStore — solo drill (no players selected)', () => {
  // This pins a store-level fallback, not desired product behavior: the
  // store itself doesn't guard against an empty `players` array, so
  // commitHeat() happily records a heat with playerId ''. Task 9's review
  // found that exact case ('' as a real playerId reaching heat_entries) to
  // be a data-integrity bug, and closed the UI path to it — DrillPage's
  // Step 4 now requires players.length > 0 before "Next →" advances (see
  // DrillPage.test.tsx, "Step 4 requires at least one player"), so this
  // state is unreachable through the app today. Kept here anyway because
  // the store's own fallback behavior is unchanged and still worth pinning
  // — if this test's expectations ever need to change, the assumption
  // that Step 4 fully guards this should be re-verified first.
  it('store-level fallback: commits a heat with playerId \'\' when players is empty (unreachable via the UI since Task 9)', () => {
    buildChain()
    useDrillStore.getState().setMakes(10)
    const { drillComplete } = useDrillStore.getState().commitHeat()

    const { completedHeats } = useDrillStore.getState()
    expect(completedHeats).toHaveLength(1)
    expect(completedHeats[0].playerId).toBe('')
    expect(typeof drillComplete).toBe('boolean')
  })
})

describe('drillStore — group-drill spot completion is per-player, wait-for-everyone (2026-08-26 decision)', () => {
  // Decision: a group drill's spot only advances once EVERY player has
  // individually reached the makes target — a player who gets there early
  // is skipped in the rotation (not given further turns) until the rest
  // catch up. This directly replaces the old per-shooter-only check, which
  // would advance the whole group as soon as whichever player was
  // currently shooting hit their own target, regardless of anyone else.
  const PLAYER_C: Player = {
    id: 'player-c-uuid',
    name: 'Carlos Cruz',
    nickname: 'CC',
    target_ft_percent: 0.75,
    target_mid_percent: 0.5,
    target_3pt_percent: 0.4,
    created_at: '2026-01-01T00:00:00Z',
  }

  it('skips a player who already hit the target and only completes the spot once everyone has', () => {
    buildChain()
    useDrillStore.getState().setPlayers([PLAYER_A, PLAYER_B, PLAYER_C])
    // setPlayers() clears makesTargetPerSpot for 2+ players (group invariant)
    // — set it back explicitly to exercise this scenario directly.
    useDrillStore.getState().setMakesTarget(5)

    // Turn 1 — Alice (index 0) hits the target immediately.
    useDrillStore.getState().setMakes(5)
    let result = useDrillStore.getState().commitHeat()
    expect(result.spotComplete).toBe(false)
    expect(useDrillStore.getState().currentPlayerIndex).toBe(1) // Bianca — plain round robin still holds here

    // Turn 2 — Bianca, partial.
    useDrillStore.getState().setMakes(2)
    result = useDrillStore.getState().commitHeat()
    expect(result.spotComplete).toBe(false)
    expect(useDrillStore.getState().currentPlayerIndex).toBe(2) // Carlos — still matches plain round robin

    // Turn 3 — Carlos, partial. Plain round robin would go back to Alice
    // (index 0) next, but Alice already hit the target — she must be
    // skipped in favor of Bianca (index 1), who hasn't.
    useDrillStore.getState().setMakes(1)
    result = useDrillStore.getState().commitHeat()
    expect(result.spotComplete).toBe(false)
    expect(useDrillStore.getState().currentPlayerIndex).toBe(1) // Bianca, not Alice

    // Turn 4 — Bianca gets the extra turn Alice would otherwise have taken,
    // and now reaches the target too (2 + 3 = 5).
    useDrillStore.getState().setMakes(3)
    result = useDrillStore.getState().commitHeat()
    expect(result.spotComplete).toBe(false)
    expect(useDrillStore.getState().currentPlayerIndex).toBe(2) // Carlos — only one left short

    // Turn 5 — Carlos finally reaches the target too (1 + 4 = 5). Every
    // player has now individually hit it — the spot completes.
    useDrillStore.getState().setMakes(4)
    result = useDrillStore.getState().commitHeat()
    expect(result.spotComplete).toBe(true)
    expect(result.drillComplete).toBe(true) // only one spot ('center') was selected
  })
})

describe('drillStore — advanceSpot (Task 4: dedicated Next Spot action)', () => {
  it('advances to the next spot without requiring the makes target to be reached', () => {
    buildChain()
    useDrillStore.getState().toggleSpot('left0') // now 2 spots: center, left0
    useDrillStore.getState().setPlayers([PLAYER_A])
    useDrillStore.getState().setMakesTarget(50) // unreachable in one heat

    useDrillStore.getState().setMakes(3)
    useDrillStore.getState().commitHeat() // logs a heat, target nowhere near met
    expect(useDrillStore.getState().currentSpotIndex).toBe(0)

    const { drillComplete } = useDrillStore.getState().advanceSpot()
    expect(drillComplete).toBe(false)
    expect(useDrillStore.getState().currentSpotIndex).toBe(1)
    expect(useDrillStore.getState().currentPlayerIndex).toBe(0)
    // advanceSpot() itself must not log an extra heat in non-manual mode.
    expect(useDrillStore.getState().completedHeats).toHaveLength(1)
  })

  it('in Manual mode, auto-saves the in-progress tally as one heat before advancing', () => {
    buildChain()
    useDrillStore.getState().toggleSpot('left0')
    useDrillStore.getState().setPlayers([PLAYER_A])
    useDrillStore.getState().setManualMode(true)

    useDrillStore.getState().setMakes(6)
    useDrillStore.getState().setAttempts(9)

    const { drillComplete } = useDrillStore.getState().advanceSpot()
    expect(drillComplete).toBe(false)
    expect(useDrillStore.getState().currentSpotIndex).toBe(1)

    const { completedHeats } = useDrillStore.getState()
    expect(completedHeats).toHaveLength(1)
    expect(completedHeats[0]).toMatchObject({ makes: 6, attempts: 9, playerId: PLAYER_A.id })
    expect(useDrillStore.getState().currentMakes).toBe(0)
    expect(useDrillStore.getState().currentAttempts).toBe(0)
  })

  it('in Manual mode, does not log a phantom heat when nothing was tallied', () => {
    buildChain()
    useDrillStore.getState().toggleSpot('left0')
    useDrillStore.getState().setPlayers([PLAYER_A])
    useDrillStore.getState().setManualMode(true)

    useDrillStore.getState().advanceSpot()
    expect(useDrillStore.getState().completedHeats).toHaveLength(0)
    expect(useDrillStore.getState().currentSpotIndex).toBe(1)
  })
})
