import { create } from 'zustand'
import { dbUpdate } from '../lib/db'

interface SessionStore {
  activeSessionId: string | null
  activeLocation: string
  elapsedSeconds: number
  notes: string
  players: string[]   // nicknames of players currently on court
  setActiveSession: (id: string, location: string, players: string[]) => void
  clearActiveSession: () => void
  setNotes: (notes: string) => void
  addPlayer: (nickname: string) => void
  removePlayer: (nickname: string) => void
  tick: () => void
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  activeSessionId: null,
  activeLocation:  '',
  elapsedSeconds:  0,
  notes:           '',
  players:         [],
  setActiveSession: (id, location, players) =>
    set({ activeSessionId: id, activeLocation: location, elapsedSeconds: 0, notes: '', players }),
  clearActiveSession: () =>
    set({ activeSessionId: null, activeLocation: '', elapsedSeconds: 0, players: [] }),
  setNotes: (notes) => {
    set({ notes })
    const { activeSessionId } = get()
    if (activeSessionId) {
      dbUpdate('sessions', activeSessionId, { notes }).catch(() => {})
    }
  },
  addPlayer: (nickname) => {
    const trimmed = nickname.trim()
    if (!trimmed) return
    set(s => ({ players: s.players.includes(trimmed) ? s.players : [...s.players, trimmed] }))
  },
  removePlayer: (nickname) =>
    set(s => ({ players: s.players.filter(p => p !== nickname) })),
  tick: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),
}))
