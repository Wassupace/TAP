import { openDB } from 'idb'

const DB_NAME = 'tap-read-cache'
const STORE_NAME = 'queries'

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    },
  })
}

export async function saveCache<T>(key: string, data: T): Promise<void> {
  const db = await getDB()
  await db.put(STORE_NAME, data, key)
}

export async function loadCache<T>(key: string): Promise<T | undefined> {
  const db = await getDB()
  return db.get(STORE_NAME, key)
}

// Wraps a Supabase-backed queryFn with an IndexedDB read-through cache
// (PRD §1.3 — "UI always reads from local state"): on success, mirrors the
// result to IndexedDB; on failure (offline, or Supabase unreachable) falls
// back to the last cached value for that key instead of surfacing an error
// with nothing to show. Only re-throws if there's no cache yet (first-ever
// load while offline has nothing to fall back to).
export async function cachedQuery<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  try {
    const data = await fetchFn()
    saveCache(key, data).catch(() => {})
    return data
  } catch (err) {
    const cached = await loadCache<T>(key)
    if (cached !== undefined) return cached
    throw err
  }
}
