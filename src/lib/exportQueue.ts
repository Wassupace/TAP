import { openDB } from 'idb'

const DB_NAME = 'tap-export-queue'
const STORE_NAME = 'jobs'
const JOB_KEY = 'pending-export'

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    },
  })
}

// A durable "export requested" flag (PRD §9.3) — surviving navigation and
// reloads, unlike the old awaited-in-the-click-handler `doExport()`. Only
// ever one job at a time; a second request just re-stamps it.
export async function scheduleExport(): Promise<void> {
  const db = await getDB()
  await db.put(STORE_NAME, { requestedAt: Date.now() }, JOB_KEY)
}

export async function clearExportJob(): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, JOB_KEY)
}

export async function hasPendingExport(): Promise<boolean> {
  const db = await getDB()
  const job = await db.get(STORE_NAME, JOB_KEY)
  return !!job
}
