import { flush, getPendingCount } from './syncQueue'
import { useSyncStore } from '../stores/syncStore'

const POLL_INTERVAL_MS = 30_000

let pollTimer: ReturnType<typeof setInterval> | null = null
let flushing = false

async function runFlush() {
  if (flushing) return
  flushing = true
  const store = useSyncStore.getState()
  store.setStatus('syncing')
  try {
    const { failed } = await flush()
    const pending = await getPendingCount()
    store.setPendingCount(pending)
    if (failed === 0) {
      store.markSynced()
    } else {
      store.setStatus('online')
    }
  } catch {
    store.setStatus(navigator.onLine ? 'online' : 'offline')
  } finally {
    flushing = false
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
  const handleOnline = () => {
    useSyncStore.getState().setStatus('syncing')
    runFlush()
    startPoll()
  }

  const handleOffline = () => {
    useSyncStore.getState().setStatus('offline')
    stopPoll()
  }

  window.addEventListener('online',  handleOnline)
  window.addEventListener('offline', handleOffline)

  if (navigator.onLine) {
    startPoll()
    getPendingCount().then(n => useSyncStore.getState().setPendingCount(n))
  }

  return () => {
    window.removeEventListener('online',  handleOnline)
    window.removeEventListener('offline', handleOffline)
    stopPoll()
  }
}
