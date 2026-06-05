import { create } from 'zustand'
import type { ShotType, ShotSpot, Player } from '../types'

interface HeatRecord {
  playerId: string
  spot?: ShotSpot
  makes: number
  attempts: number
  heatNumber: number
}

interface DrillStore {
  shotType: ShotType
  selectedSpots: ShotSpot[]
  heatSize: number
  makesTargetPerSpot: number | undefined
  players: Player[]
  currentSpotIndex: number
  currentPlayerIndex: number
  currentMakes: number
  completedHeats: HeatRecord[]

  setShotType: (t: ShotType) => void
  toggleSpot: (s: ShotSpot) => void
  setHeatSize: (n: number) => void
  setMakesTarget: (n: number | undefined) => void
  setPlayers: (p: Player[]) => void
  setMakes: (n: number) => void
  commitHeat: () => { spotComplete: boolean; drillComplete: boolean }
  reset: () => void
}

export const useDrillStore = create<DrillStore>((set, get) => ({
  shotType: 'threePoint',
  selectedSpots: ['center'],
  heatSize: 10,
  makesTargetPerSpot: 10,
  players: [],
  currentSpotIndex: 0,
  currentPlayerIndex: 0,
  currentMakes: 0,
  completedHeats: [],

  setShotType: (t) => set({ shotType: t }),
  toggleSpot: (s) => set(state => ({
    selectedSpots: state.selectedSpots.includes(s)
      ? state.selectedSpots.filter(x => x !== s)
      : [...state.selectedSpots, s],
  })),
  setHeatSize: (n) => set({ heatSize: n }),
  setMakesTarget: (n) => set({ makesTargetPerSpot: n }),
  setPlayers: (p) => set({ players: p }),
  setMakes: (n) => set({ currentMakes: Math.max(0, Math.min(get().heatSize, n)) }),

  commitHeat: () => {
    const { currentMakes, heatSize, currentSpotIndex, currentPlayerIndex, selectedSpots, players, completedHeats, makesTargetPerSpot } = get()
    const spot = selectedSpots[currentSpotIndex]
    const heat: HeatRecord = {
      playerId: players[currentPlayerIndex]?.id ?? '',
      spot,
      makes: currentMakes,
      attempts: heatSize,
      heatNumber: completedHeats.filter(h => h.spot === spot && h.playerId === (players[currentPlayerIndex]?.id ?? '')).length + 1,
    }
    const newHeats = [...completedHeats, heat]

    // Check if makes target reached for this spot (solo only)
    const spotMakes = newHeats.filter(h => h.spot === spot && h.playerId === (players[currentPlayerIndex]?.id ?? '')).reduce((s, h) => s + h.makes, 0)
    const spotComplete = makesTargetPerSpot !== undefined && spotMakes >= makesTargetPerSpot

    let nextSpotIndex = currentSpotIndex
    let nextPlayerIndex = currentPlayerIndex

    if (spotComplete) {
      nextSpotIndex = currentSpotIndex + 1
      nextPlayerIndex = 0
    } else if (players.length > 1) {
      // Group drill: rotate players
      nextPlayerIndex = (currentPlayerIndex + 1) % players.length
    }

    const drillComplete = nextSpotIndex >= selectedSpots.length

    set({
      completedHeats: newHeats,
      currentMakes: 0,
      currentSpotIndex: drillComplete ? currentSpotIndex : nextSpotIndex,
      currentPlayerIndex: nextPlayerIndex,
    })

    return { spotComplete, drillComplete }
  },

  reset: () => set({
    shotType: 'threePoint', selectedSpots: ['center'], heatSize: 10,
    makesTargetPerSpot: 10, players: [], currentSpotIndex: 0,
    currentPlayerIndex: 0, currentMakes: 0, completedHeats: [],
  }),
}))
