import { describe, it, expect, beforeEach, vi } from 'vitest'

// ── In-memory IndexedDB store (same convention as src/lib/db.test.ts) ────────
const store = new Map<string, unknown>()

vi.mock('idb', () => ({
  openDB: async () => ({
    put: async (_: string, val: unknown, key: string) => { store.set(key, val) },
    get: async (_: string, key: string) => store.get(key),
  }),
}))

import { saveCache, loadCache, cachedQuery } from './readCache'

beforeEach(() => {
  store.clear()
})

describe('saveCache / loadCache', () => {
  it('round-trips a value through the cache', async () => {
    await saveCache('players', [{ id: 'p1' }])
    expect(await loadCache('players')).toEqual([{ id: 'p1' }])
  })

  it('returns undefined for a key that was never cached', async () => {
    expect(await loadCache('nothing-here')).toBeUndefined()
  })
})

describe('cachedQuery', () => {
  it('returns the live fetch result and mirrors it to the cache on success', async () => {
    const fetchFn = vi.fn().mockResolvedValue([{ id: 'p1', name: 'JC' }])
    const result = await cachedQuery('players', fetchFn)
    expect(result).toEqual([{ id: 'p1', name: 'JC' }])
    expect(await loadCache('players')).toEqual([{ id: 'p1', name: 'JC' }])
  })

  it('falls back to the cached value when the fetch fails (offline)', async () => {
    await saveCache('players', [{ id: 'p1', name: 'Stale' }])
    const fetchFn = vi.fn().mockRejectedValue(new Error('offline'))
    const result = await cachedQuery('players', fetchFn)
    expect(result).toEqual([{ id: 'p1', name: 'Stale' }])
  })

  it('re-throws the original error when the fetch fails and there is no cache yet', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('offline, no cache'))
    await expect(cachedQuery('players', fetchFn)).rejects.toThrow('offline, no cache')
  })

  it('uses distinct cache entries for distinct keys', async () => {
    await cachedQuery('players', async () => [{ id: 'p1' }])
    await cachedQuery('sessions:2026-9', async () => [{ id: 's1' }])
    expect(await loadCache('players')).toEqual([{ id: 'p1' }])
    expect(await loadCache('sessions:2026-9')).toEqual([{ id: 's1' }])
  })
})
