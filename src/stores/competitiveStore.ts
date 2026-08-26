import { create } from 'zustand'
import type { CompetitiveGameType, ShotSpot, Player } from '../types'

// Ephemeral store carrying a Competitive Game's setup choices from
// `CompetitiveSetupPage.tsx` into whichever activity screen handles that
// `gameType` (Banks/Middies/Next/Generic) — same one-store-per-activity
// pattern as `matchStore.ts`/`drillStore.ts`. `gameId` is set once the
// `competitive_games` row is created (mirrors `matchStore`'s `matchId`/
// `drillStore`'s `drillId`), gating whether a result-save persists.
interface CompetitiveStore {
  gameId: string | null
  gameType: CompetitiveGameType
  spot: ShotSpot | undefined
  quotaPerPlayer: number | undefined
  customName: string | undefined
  players: Player[]

  setGameId: (id: string) => void
  setGameType: (t: CompetitiveGameType) => void
  setSpot: (s: ShotSpot | undefined) => void
  setQuotaPerPlayer: (n: number | undefined) => void
  setCustomName: (name: string | undefined) => void
  setPlayers: (p: Player[]) => void
  reset: () => void
}

export const useCompetitiveStore = create<CompetitiveStore>((set) => ({
  gameId: null,
  gameType: 'banks',
  spot: undefined,
  quotaPerPlayer: undefined,
  customName: undefined,
  players: [],

  setGameId: (id) => set({ gameId: id }),
  setGameType: (t) => set({ gameType: t }),
  setSpot: (s) => set({ spot: s }),
  setQuotaPerPlayer: (n) => set({ quotaPerPlayer: n }),
  setCustomName: (name) => set({ customName: name }),
  setPlayers: (p) => set({ players: p }),

  reset: () => set({
    gameId: null,
    gameType: 'banks',
    spot: undefined,
    quotaPerPlayer: undefined,
    customName: undefined,
    players: [],
  }),
}))
