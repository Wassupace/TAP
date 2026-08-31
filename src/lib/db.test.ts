import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest'

// ── In-memory queue store ─────────────────────────────────────────────────────
const store = new Map<string, unknown>()

vi.mock('idb', () => ({
  openDB: async () => ({
    put: async (_: string, val: { id: string }) => { store.set(val.id, val) },
    delete: async (_: string, id: string) => { store.delete(id) },
    count: async () => store.size,
    getAll: async () => [...store.values()],
    clear: async () => store.clear(),
  }),
}))

// ── Mock Supabase chain ───────────────────────────────────────────────────────
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: { from: mockFrom } }))

import { dbInsert, dbUpdate, dbDelete } from './db'
import { getPendingCount } from './syncQueue'

function buildChain(err: unknown = null) {
  const chain = {
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq:     vi.fn(),
  }
  const result = Promise.resolve({ error: err })
  chain.upsert.mockReturnValue(result)
  chain.update.mockReturnValue(chain)
  chain.delete.mockReturnValue(chain)
  chain.eq.mockReturnValue(result)
  ;(mockFrom as MockedFunction<typeof mockFrom>).mockReturnValue(chain)
  return chain
}

beforeEach(() => {
  store.clear()
  vi.clearAllMocks()
})

describe('dbInsert', () => {
  it('removes from queue on Supabase success', async () => {
    buildChain(null)
    await dbInsert('players', { id: 'p1', name: 'JC' })
    expect(await getPendingCount()).toBe(0)
  })

  it('keeps item in queue when Supabase fails', async () => {
    buildChain(new Error('network'))
    await dbInsert('players', { id: 'p1', name: 'JC' })
    expect(await getPendingCount()).toBe(1)
  })

  it('upserts on "id" by default, so a retry with the same client-generated id is idempotent', async () => {
    const chain = buildChain(null)
    await dbInsert('players', { id: 'p1', name: 'JC' })
    expect(chain.upsert).toHaveBeenCalledWith({ id: 'p1', name: 'JC' }, { onConflict: 'id' })
  })

  it('accepts a custom onConflict target for composite-key upserts (e.g. session_attendances)', async () => {
    const chain = buildChain(null)
    const rows = [{ session_id: 's1', player_id: 'p1' }, { session_id: 's1', player_id: 'p2' }]
    await dbInsert('session_attendances', rows, 'session_id,player_id')
    expect(chain.upsert).toHaveBeenCalledWith(rows, { onConflict: 'session_id,player_id' })
  })
})

describe('dbUpdate', () => {
  it('removes from queue on success', async () => {
    buildChain(null)
    await dbUpdate('players', 'p1', { name: 'James' })
    expect(await getPendingCount()).toBe(0)
  })

  it('keeps item in queue on failure', async () => {
    buildChain(new Error('timeout'))
    await dbUpdate('players', 'p1', { name: 'James' })
    expect(await getPendingCount()).toBe(1)
  })
})

describe('dbDelete', () => {
  it('removes from queue on success', async () => {
    buildChain(null)
    await dbDelete('players', 'p1')
    expect(await getPendingCount()).toBe(0)
  })

  it('keeps item in queue on failure', async () => {
    buildChain(new Error('offline'))
    await dbDelete('players', 'p1')
    expect(await getPendingCount()).toBe(1)
  })
})
