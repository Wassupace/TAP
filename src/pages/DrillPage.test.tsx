import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import type { Player } from '../types'

// ── Mock IndexedDB queue (same style as src/lib/db.test.ts) — belt and
// suspenders, since this test's flow never actually reaches dbInsert.
vi.mock('idb', () => ({
  openDB: async () => ({
    put: async () => {},
    delete: async () => {},
    count: async () => 0,
    getAll: async () => [],
    clear: async () => {},
  }),
}))

// ── Mock Supabase chain (same style as src/lib/db.test.ts) ───────────────────
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('../lib/supabase', () => ({ supabase: { from: mockFrom } }))

// ── Mock usePlayers/useAddPlayer so PlayerPickerModal (always mounted, even
// when closed) doesn't need a real react-query provider. Step 4's own
// picker-wiring behavior is Task 3's territory, not this task's — this test
// only needs the setup-wizard's collected fields to reach the drills insert.
vi.mock('../hooks/usePlayers', () => ({
  usePlayers: () => ({ data: [], refetch: vi.fn().mockResolvedValue({ data: [] }) }),
  useAddPlayer: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

import DrillPage from './DrillPage'
import { useDrillStore } from '../stores/drillStore'
import { useSessionStore } from '../stores/sessionStore'

const PLAYER_A: Player = {
  id: 'player-a-uuid',
  name: 'Alice Anderson',
  nickname: 'Ace',
  target_ft_percent: 0.75,
  target_mid_percent: 0.5,
  target_3pt_percent: 0.4,
  created_at: '2026-01-01T00:00:00Z',
}

function buildInsertChain(data: { id: string } | null, err: unknown = null) {
  const chain = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  }
  chain.insert.mockReturnValue(chain)
  chain.select.mockReturnValue(chain)
  chain.single.mockReturnValue(Promise.resolve({ data, error: err }))
  ;(mockFrom as MockedFunction<typeof mockFrom>).mockReturnValue(chain)
  return chain
}

function findButton(container: HTMLElement, predicate: (text: string) => boolean): HTMLButtonElement {
  const buttons = Array.from(container.querySelectorAll('button'))
  const match = buttons.find(b => predicate((b.textContent ?? '').trim()))
  if (!match) {
    throw new Error(
      `No matching button found. Buttons on screen: ${buttons.map(b => JSON.stringify(b.textContent)).join(', ')}`
    )
  }
  return match
}

const flush = () => act(() => new Promise(resolve => setTimeout(resolve, 0)))

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.clearAllMocks()
  useDrillStore.getState().reset()
  useSessionStore.getState().clearActiveSession()
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

// Drives the setup wizard from Step 0 through to Step 4 ("Players"), leaving
// the store's shotType/hand/selectedSpots/heatSize at their defaults
// (threePoint / right / ['center'] / 10) except where a step's click
// intentionally sets a specific value.
async function advanceToPlayersStep() {
  await act(async () => {
    root.render(
      <MemoryRouter>
        <DrillPage />
      </MemoryRouter>
    )
  })

  // Step 0 — shot type
  findButton(container, t => t === 'Three-Point').click()
  await flush()

  // Step 1 — spots (default selectedSpots already has 'center' — just advance)
  findButton(container, t => t.includes('Next')).click()
  await flush()

  // Step 2 — hand
  findButton(container, t => t.toLowerCase().includes('right')).click()
  await flush()

  // Step 3 — heat size
  findButton(container, t => t === '10').click()
  await flush()

  // Now on Step 4 — players
}

// Continues from Step 4 through to Step 5 ("Start Drill"). Step 4's "Next →"
// is guarded (Task 9): the caller must already have set at least one player
// via useDrillStore.getState().setPlayers(...) before calling this, or the
// click below will be a no-op and the assertions that follow will fail
// against Step 4's own content instead of Step 5's.
async function advanceToStartDrillStep() {
  await advanceToPlayersStep()

  // Step 4 — players (guarded; requires players.length > 0, see above)
  findButton(container, t => t.includes('Next')).click()
  await flush()

  // Now on Step 5 — makes target (default makesTargetPerSpot is already 10)
}

describe('DrillPage — Start Drill wiring (Task 7)', () => {
  it('inserts every setup-wizard field into `drills` and sets drillId on success', async () => {
    const chain = buildInsertChain({ id: 'drill-1' })
    useSessionStore.getState().setActiveSession('session-1', 'Gym A', [])
    useDrillStore.getState().setPlayers([PLAYER_A])

    await advanceToStartDrillStep()

    findButton(container, t => t.includes('Start Drill')).click()
    await flush()

    expect(mockFrom).toHaveBeenCalledWith('drills')
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: 'session-1',
        shot_type: 'threePoint',
        hand: 'right',
        selected_spots: ['center'],
        heat_size: 10,
        makes_target_per_spot: 10,
        player_ids: [PLAYER_A.id],
        started_at: expect.any(String),
      })
    )
    expect(useDrillStore.getState().drillId).toBe('drill-1')

    // Wizard should have advanced to the active drill view.
    expect(container.textContent).toContain('MAKES THIS HEAT')
  })

  it('leaves drillId null (without blocking the drill) when the insert fails', async () => {
    buildInsertChain(null, new Error('offline'))
    useDrillStore.getState().setPlayers([PLAYER_A])

    await advanceToStartDrillStep()
    findButton(container, t => t.includes('Start Drill')).click()
    await flush()

    expect(useDrillStore.getState().drillId).toBeNull()
    expect(container.textContent).toContain('MAKES THIS HEAT')
  })

  it('leaves drillId null when the request throws (offline) rather than resolving with an error', async () => {
    const chain = { insert: vi.fn(), select: vi.fn(), single: vi.fn() }
    chain.insert.mockReturnValue(chain)
    chain.select.mockReturnValue(chain)
    // mockImplementation (not mockReturnValue) so the rejected promise is
    // created lazily at call time and immediately awaited by handleStart —
    // avoids a spurious "unhandled rejection" warning from the gap between
    // eager creation and the click that consumes it.
    chain.single.mockImplementation(() => Promise.reject(new Error('network down')))
    ;(mockFrom as MockedFunction<typeof mockFrom>).mockReturnValue(chain)
    useDrillStore.getState().setPlayers([PLAYER_A])

    await advanceToStartDrillStep()
    findButton(container, t => t.includes('Start Drill')).click()
    await flush()

    expect(useDrillStore.getState().drillId).toBeNull()
    expect(container.textContent).toContain('MAKES THIS HEAT')
  })
})

describe('DrillPage — Step 4 requires at least one player (Task 9)', () => {
  it('does not advance past Step 4 when zero players are selected', async () => {
    await advanceToPlayersStep()

    // Sanity check: we're on Step 4 before clicking.
    expect(container.textContent).toContain('Select Players')

    findButton(container, t => t.includes('Next')).click()
    await flush()

    // Still on Step 4 — Step 5's heading never appears, and Step 4's own
    // content (which only renders while setupStep === 4) is still present.
    expect(container.textContent).not.toContain('Makes target per spot')
    expect(container.textContent).toContain('Select Players')
  })

  it('advances to Step 5 when one or more players are selected', async () => {
    useDrillStore.getState().setPlayers([PLAYER_A])

    await advanceToPlayersStep()

    findButton(container, t => t.includes('Next')).click()
    await flush()

    expect(container.textContent).toContain('Makes target per spot')
  })
})
