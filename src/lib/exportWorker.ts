import { hasPendingExport, clearExportJob } from './exportQueue'
import { exportToSheets, isConnected } from './sheetsExport'

const POLL_INTERVAL_MS = 30_000

let pollTimer: ReturnType<typeof setInterval> | null = null
let running = false

// Shared by the poll loop, the 'online' listener, and SheetsExportPage's
// "Export Now" button (for immediate feedback instead of waiting for the
// next poll tick) — safe to call redundantly, it's a no-op unless a job is
// actually queued.
export async function attemptPendingExport(): Promise<void> {
  if (running) return
  if (!navigator.onLine) return
  if (!(await hasPendingExport())) return
  if (!isConnected()) return // no Google token yet — nothing to do until reconnected
  running = true
  try {
    await exportToSheets()
    await clearExportJob()
  } catch {
    // Leave it queued — offline, token expired, or a transient API error.
    // Retried on the next poll tick or 'online' event.
  } finally {
    running = false
  }
}

export function initExportWorker(): () => void {
  const handleOnline = () => { attemptPendingExport() }
  window.addEventListener('online', handleOnline)
  pollTimer = setInterval(attemptPendingExport, POLL_INTERVAL_MS)
  attemptPendingExport() // in case a job was queued in a previous session
  return () => {
    window.removeEventListener('online', handleOnline)
    if (pollTimer) clearInterval(pollTimer)
  }
}
