import { useShallow } from 'zustand/react/shallow'
import { useSyncStore } from '../stores/syncStore'
import type { SyncStatus } from '../types'

export function useOnlineStatus(): {
  status: SyncStatus
  pendingCount: number
  lastSyncedAt: Date | null
} {
  return useSyncStore(useShallow(s => ({
    status:       s.status,
    pendingCount: s.pendingCount,
    lastSyncedAt: s.lastSyncedAt,
  })))
}
