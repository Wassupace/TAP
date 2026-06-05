import { create } from 'zustand'
import type { SyncStatus } from '../types'

interface SyncStore {
  status: SyncStatus
  pendingCount: number
  lastSyncedAt: Date | null
  setStatus: (s: SyncStatus) => void
  setPendingCount: (n: number) => void
  markSynced: () => void
}

export const useSyncStore = create<SyncStore>((set) => ({
  status: navigator.onLine ? 'online' : 'offline',
  pendingCount: 0,
  lastSyncedAt: null,
  setStatus:       (s) => set({ status: s }),
  setPendingCount: (n) => set({ pendingCount: n }),
  markSynced:      ()  => set({ lastSyncedAt: new Date(), status: 'online' }),
}))
