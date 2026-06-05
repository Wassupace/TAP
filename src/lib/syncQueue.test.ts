import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest'

// ── Mock idb ──────────────────────────────────────────────────────────────────
// We use an in-memory store instead of a real IndexedDB
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

// ── Mock Supabase ──────────────────────────────────────────────────────────────
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('./supabase', () => ({
  supabase: { from: mockFrom },
}))

// ── Import after mocks ─────────────────────────────────────────────────────────
import { enqueue, dequeue, getPendingCount, flush, clearAll } from './syncQueue'

// Helper: make supabase return success for the given chained call
function mockSuccess() {
  const chain = { upsert: vi.fn(), update: vi.fn(), delete: vi.fn(), eq: vi.fn() }
  chain.upsert.mockResolvedValue({ error: null })
  chain.update.mockReturnValue(chain)
  chain.delete.mockReturnValue(chain)
  chain.eq.mockResolvedValue({ error: null })
  ;(mockFrom as MockedFunction<typeof mockFrom>).mockReturnValue(chain)
  return chain
}

function mockFailure() {
  const chain = { upsert: vi.fn(), update: vi.fn(), delete: vi.fn(), eq: vi.fn() }
  const err = new Error('network error')
  chain.upsert.mockRejectedValue(err)
  chain.update.mockReturnValue(chain)
  chain.delete.mockReturnValue(chain)
  chain.eq.mockRejectedValue(err)
  ;(mockFrom as MockedFunction<typeof mockFrom>).mockReturnValue(chain)
  return chain
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  store.clear()
  vi.clearAllMocks()
})

describe('enqueue / dequeue', () => {
  it('enqueue adds an item to the store', async () => {
    const id = await enqueue({ table: 'players', operation: 'insert', payload: { name: 'JC' } })
    expect(typeof id).toBe('string')
    expect(await getPendingCount()).toBe(1)
  })

  it('dequeue removes the item from the store', async () => {
    const id = await enqueue({ table: 'players', operation: 'insert', payload: { name: 'JC' } })
    await dequeue(id)
    expect(await getPendingCount()).toBe(0)
  })

  it('multiple enqueues accumulate', async () => {
    await enqueue({ table: 'players', operation: 'insert', payload: { name: 'A' } })
    await enqueue({ table: 'sessions', operation: 'insert', payload: { date: '2026-06-01' } })
    expect(await getPendingCount()).toBe(2)
  })
})

describe('flush — success path', () => {
  it('clears the queue after successful Supabase writes', async () => {
    await enqueue({ table: 'players', operation: 'insert', payload: { id: 'p1', name: 'JC' } })
    mockSuccess()
    const result = await flush()
    expect(result.succeeded).toBe(1)
    expect(result.failed).toBe(0)
    expect(await getPendingCount()).toBe(0)
  })

  it('processes update and delete ops', async () => {
    await enqueue({ table: 'players', operation: 'update', rowId: 'p1', payload: { name: 'James' } })
    await enqueue({ table: 'sessions', operation: 'delete', rowId: 's1', payload: {} })
    mockSuccess()
    const { succeeded, failed } = await flush()
    expect(succeeded).toBe(2)
    expect(failed).toBe(0)
  })
})

describe('flush — failure path', () => {
  it('keeps failed items in the queue with incremented retries', async () => {
    await enqueue({ table: 'players', operation: 'insert', payload: { id: 'p1', name: 'JC' } })
    mockFailure()
    const result = await flush()
    expect(result.failed).toBe(1)
    expect(result.succeeded).toBe(0)
    expect(await getPendingCount()).toBe(1)
    // retries incremented
    const items = [...store.values()] as Array<{ retries: number }>
    expect(items[0].retries).toBe(1)
  })

  it('retries accumulate on repeated flush failures', async () => {
    await enqueue({ table: 'players', operation: 'insert', payload: { id: 'p1', name: 'JC' } })
    mockFailure()
    await flush()
    mockFailure()
    await flush()
    const items = [...store.values()] as Array<{ retries: number }>
    expect(items[0].retries).toBe(2)
  })

  it('partial success: some ops succeed, some fail', async () => {
    await enqueue({ table: 'players', operation: 'insert', payload: { id: 'p1', name: 'OK' } })
    await enqueue({ table: 'sessions', operation: 'insert', payload: { id: 's1', date: '2026-06-01' } })

    // First call succeeds, second fails
    let callCount = 0
    mockFrom.mockImplementation(() => ({
      upsert: vi.fn().mockImplementation(() => {
        callCount++
        return callCount === 1
          ? Promise.resolve({ error: null })
          : Promise.reject(new Error('fail'))
      }),
    }))

    const { succeeded, failed } = await flush()
    expect(succeeded).toBe(1)
    expect(failed).toBe(1)
    expect(await getPendingCount()).toBe(1)
  })
})

describe('clearAll', () => {
  it('removes all items', async () => {
    await enqueue({ table: 'players', operation: 'insert', payload: {} })
    await enqueue({ table: 'sessions', operation: 'insert', payload: {} })
    await clearAll()
    expect(await getPendingCount()).toBe(0)
  })
})
