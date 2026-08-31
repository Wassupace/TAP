import { openDB, type IDBPDatabase } from 'idb'
import { supabase } from './supabase'

const DB_NAME    = 'tap-sync-queue'
const STORE_NAME = 'operations'
const DB_VERSION = 1

export interface QueuedOperation {
  id: string
  table: string
  operation: 'insert' | 'update' | 'delete'
  payload: Record<string, unknown> | Record<string, unknown>[]
  rowId?: string       // for update/delete
  onConflict?: string  // insert-only: upsert conflict target, defaults to 'id'
  createdAt: number
  retries: number
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    },
  })
}

function uuid(): string {
  return crypto.randomUUID()
}

export async function enqueue(op: Omit<QueuedOperation, 'id' | 'createdAt' | 'retries'>): Promise<string> {
  const db = await getDB()
  const id = uuid()
  await db.put(STORE_NAME, { ...op, id, createdAt: Date.now(), retries: 0 })
  return id
}

export async function dequeue(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, id)
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB()
  return db.count(STORE_NAME)
}

export async function flush(): Promise<{ succeeded: number; failed: number }> {
  const db = await getDB()
  const ops: QueuedOperation[] = await db.getAll(STORE_NAME)
  let succeeded = 0
  let failed = 0

  for (const op of ops) {
    try {
      if (op.operation === 'insert') {
        const { error } = await supabase.from(op.table).upsert(op.payload, { onConflict: op.onConflict ?? 'id' })
        if (error) throw error
      } else if (op.operation === 'update' && op.rowId) {
        const { error } = await supabase.from(op.table).update(op.payload).eq('id', op.rowId)
        if (error) throw error
      } else if (op.operation === 'delete' && op.rowId) {
        const { error } = await supabase.from(op.table).delete().eq('id', op.rowId)
        if (error) throw error
      }
      await db.delete(STORE_NAME, op.id)
      succeeded++
    } catch {
      await db.put(STORE_NAME, { ...op, retries: op.retries + 1 })
      failed++
    }
  }

  return { succeeded, failed }
}

export async function clearAll(): Promise<void> {
  const db = await getDB()
  await db.clear(STORE_NAME)
}
