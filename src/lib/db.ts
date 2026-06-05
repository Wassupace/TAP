import { supabase } from './supabase'
import { enqueue, dequeue } from './syncQueue'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function trySupabase(fn: () => PromiseLike<any>): Promise<boolean> {
  try {
    const result = await fn()
    if (result?.error) throw result.error
    return true
  } catch {
    return false
  }
}

export async function dbInsert(
  table: string,
  payload: Record<string, unknown>
): Promise<void> {
  const opId = await enqueue({ table, operation: 'insert', payload })
  const ok = await trySupabase(() => supabase.from(table).insert(payload))
  if (ok) await dequeue(opId)
}

export async function dbUpdate(
  table: string,
  id: string,
  payload: Record<string, unknown>
): Promise<void> {
  const opId = await enqueue({ table, operation: 'update', rowId: id, payload })
  const ok = await trySupabase(() => supabase.from(table).update(payload).eq('id', id))
  if (ok) await dequeue(opId)
}

export async function dbDelete(
  table: string,
  id: string
): Promise<void> {
  const opId = await enqueue({ table, operation: 'delete', rowId: id, payload: {} })
  const ok = await trySupabase(() => supabase.from(table).delete().eq('id', id))
  if (ok) await dequeue(opId)
}
