import { create } from 'zustand'

interface SessionStore {
  activeSessionId: string | null
  activeLocation: string
  elapsedSeconds: number
  notes: string
  setActiveSession: (id: string, location: string) => void
  clearActiveSession: () => void
  setNotes: (notes: string) => void
  tick: () => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  activeSessionId: null,
  activeLocation:  '',
  elapsedSeconds:  0,
  notes:           '',
  setActiveSession: (id, location) =>
    set({ activeSessionId: id, activeLocation: location, elapsedSeconds: 0, notes: '' }),
  clearActiveSession: () =>
    set({ activeSessionId: null, activeLocation: '', elapsedSeconds: 0 }),
  setNotes: (notes) => set({ notes }),
  tick: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),
}))
