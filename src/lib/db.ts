import { supabase } from './supabase'
import { enqueue } from './syncQueue'

async function trySupabase(fn: () => unknown): Promise<void> {
  try {
    const { error } = await (fn() as Promise<{ error: unknown }>)
    if (error) throw error
  } catch {
    // Supabase call failed — operation already enqueued; swallow
  }
}

export async function dbInsert(
  table: string,
  payload: Record<string, unknown>
): Promise<void> {
  await enqueue({ table, operation: 'insert', payload })
  await trySupabase(() => supabase.from(table).insert(payload))
}

export async function dbUpdate(
  table: string,
  id: string,
  payload: Record<string, unknown>
): Promise<void> {
  await enqueue({ table, operation: 'update', rowId: id, payload })
  await trySupabase(() => supabase.from(table).update(payload).eq('id', id))
}

export async function dbDelete(
  table: string,
  id: string
): Promise<void> {
  await enqueue({ table, operation: 'delete', rowId: id, payload: {} })
  await trySupabase(() => supabase.from(table).delete().eq('id', id))
}
