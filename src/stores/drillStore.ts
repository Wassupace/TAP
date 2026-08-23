import { create } from 'zustand'
import type { ShotType, ShotSpot, Player, Hand } from '../types'
import { dbInsert } from '../lib/db'

interface HeatRecord {
  playerId: string
  spot?: ShotSpot
  hand: Hand
  makes: number
  attempts: number
  heatNumber: number
}

interface DrillStore {
  drillId: string | null
  shotType: ShotType
  hand: Hand
  selectedSpots: ShotSpot[]
  heatSize: number
  makesTargetPerSpot: number | undefined
  players: Player[]
  currentSpotIndex: number
  currentPlayerIndex: number
  currentMakes: number
  completedHeats: HeatRecord[]

  setDrillId:     (id: string) => void
  setShotType:    (t: ShotType) => void
  setHand:        (h: Hand) => void
  toggleSpot:     (s: ShotSpot) => void
  setHeatSize:    (n: number) => void
  setMakesTarget: (n: number | undefined) => void
  setPlayers:     (p: Player[]) => void
  setCurrentPlayerIndex: (i: number) => void
  setMakes:       (n: number) => void
  commitHeat:     () => { spotComplete: boolean; drillComplete: boolean }
  undoLastHeat:   () => void
  reset:          () => void
}

export const useDrillStore = create<DrillStore>((set, get) => ({
  drillId:            null,
  shotType:           'threePoint',
  hand:               'right',
  selectedSpots:      ['center'],
  heatSize:           10,
  makesTargetPerSpot: 10,
  players:            [],
  currentSpotIndex:   0,
  currentPlayerIndex: 0,
  currentMakes:       0,
  completedHeats:     [],

  setDrillId:     (id) => set({ drillId: id }),
  setShotType:    (t) => set({ shotType: t }),
  setHand:        (h) => set({ hand: h }),
  toggleSpot:     (s) => set(state => ({
    selectedSpots: state.selectedSpots.includes(s)
      ? state.selectedSpots.filter(x => x !== s)
      : [...state.selectedSpots, s],
  })),
  setHeatSize:    (n) => set({ heatSize: n }),
  setMakesTarget: (n) => set({ makesTargetPerSpot: n }),
  setPlayers:     (p) => set({ players: p }),
  setCurrentPlayerIndex: (i) => set({ currentPlayerIndex: i }),
  setMakes:       (n) => set({ currentMakes: Math.max(0, Math.min(get().heatSize, n)) }),

  commitHeat: () => {
    const {
      currentMakes, heatSize, hand, currentSpotIndex, currentPlayerIndex,
      selectedSpots, players, completedHeats, makesTargetPerSpot,
    } = get()
    const spot = selectedSpots[currentSpotIndex]
    const heat: HeatRecord = {
      playerId: players[currentPlayerIndex]?.id ?? '',
      spot, hand,
      makes:      currentMakes,
      attempts:   heatSize,
      heatNumber: completedHeats.filter(
        h => h.spot === spot && h.playerId === (players[currentPlayerIndex]?.id ?? '')
      ).length + 1,
    }
    const newHeats = [...completedHeats, heat]

    const spotMakes = newHeats
      .filter(h => h.spot === spot && h.playerId === (players[currentPlayerIndex]?.id ?? ''))
      .reduce((s, h) => s + h.makes, 0)
    const spotComplete = makesTargetPerSpot !== undefined && spotMakes >= makesTargetPerSpot

    let nextSpotIndex   = currentSpotIndex
    let nextPlayerIndex = currentPlayerIndex

    if (spotComplete) {
      nextSpotIndex   = currentSpotIndex + 1
      nextPlayerIndex = 0
    } else if (players.length > 1) {
      nextPlayerIndex = (currentPlayerIndex + 1) % players.length
    }

    const drillComplete = nextSpotIndex >= selectedSpots.length

    set({
      completedHeats:     newHeats,
      currentMakes:       0,
      currentSpotIndex:   drillComplete ? currentSpotIndex : nextSpotIndex,
      currentPlayerIndex: nextPlayerIndex,
    })

    const { drillId } = get()
    if (drillId) {
      dbInsert('heat_entries', {
        drill_id:    drillId,
        player_id:   heat.playerId,
        hand:        heat.hand,
        spot:        heat.spot ?? null,
        makes:       heat.makes,
        attempts:    heat.attempts,
        heat_number: heat.heatNumber,
      }).catch(() => {})
    }

    return { spotComplete, drillComplete }
  },

  undoLastHeat: () => {
    const { completedHeats, selectedSpots, players } = get()
    if (completedHeats.length === 0) return
    const newHeats = completedHeats.slice(0, -1)
    const last = completedHeats[completedHeats.length - 1]
    const spotIndex   = last.spot ? selectedSpots.indexOf(last.spot) : 0
    const playerIndex = last.playerId ? players.findIndex(p => p.id === last.playerId) : 0
    set({
      completedHeats:     newHeats,
      currentMakes:       0,
      currentSpotIndex:   Math.max(0, spotIndex),
      currentPlayerIndex: Math.max(0, playerIndex),
    })
  },

  reset: () => set({
    drillId: null,
    shotType: 'threePoint', hand: 'right', selectedSpots: ['center'],
    heatSize: 10, makesTargetPerSpot: 10, players: [],
    currentSpotIndex: 0, currentPlayerIndex: 0, currentMakes: 0, completedHeats: [],
  }),
}))
