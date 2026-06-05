import { create } from 'zustand'

interface SessionStore {
  activeSessionId: string | null
  activeLocation: string
  elapsedSeconds: number
  setActiveSession: (id: string, location: string) => void
  clearActiveSession: () => void
  tick: () => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  activeSessionId: null,
  activeLocation: '',
  elapsedSeconds: 0,
  setActiveSession: (id, location) => set({ activeSessionId: id, activeLocation: location, elapsedSeconds: 0 }),
  clearActiveSession: () => set({ activeSessionId: null, activeLocation: '', elapsedSeconds: 0 }),
  tick: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),
}))
