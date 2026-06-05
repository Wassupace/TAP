import { flush, getPendingCount } from './syncQueue'
import { useSyncStore } from '../stores/syncStore'

const POLL_INTERVAL_MS = 30_000

let pollTimer: ReturnType<typeof setInterval> | null = null

async function runFlush() {
  const store = useSyncStore.getState()
  store.setStatus('syncing')
  try {
    await flush()
    const pending = await getPendingCount()
    store.setPendingCount(pending)
    store.markSynced()
  } catch {
    store.setStatus(navigator.onLine ? 'online' : 'offline')
  }
}

function startPoll() {
  if (pollTimer) return
  pollTimer = setInterval(runFlush, POLL_INTERVAL_MS)
}

function stopPoll() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

export function initSyncWorker(): () => void {
  const store = useSyncStore.getState()

  const handleOnline = () => {
    store.setStatus('syncing')
    runFlush()
    startPoll()
  }

  const handleOffline = () => {
    store.setStatus('offline')
    stopPoll()
  }

  window.addEventListener('online',  handleOnline)
  window.addEventListener('offline', handleOffline)

  if (navigator.onLine) {
    startPoll()
    getPendingCount().then(n => store.setPendingCount(n))
  }

  return () => {
    window.removeEventListener('online',  handleOnline)
    window.removeEventListener('offline', handleOffline)
    stopPoll()
  }
}
