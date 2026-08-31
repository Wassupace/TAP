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
  // Task 3 (PRD §7.1b): "Manual" heat-size mode — no fixed shots-per-heat,
  // the scribe decides the wave boundary himself. `heatSize` is ignored
  // while this is true; `currentAttempts` tracks the in-progress heat's
  // attempt count instead.
  manualMode: boolean
  makesTargetPerSpot: number | undefined
  players: Player[]
  currentSpotIndex: number
  currentPlayerIndex: number
  currentMakes: number
  currentAttempts: number
  completedHeats: HeatRecord[]

  setDrillId:     (id: string) => void
  setShotType:    (t: ShotType) => void
  setHand:        (h: Hand) => void
  toggleSpot:     (s: ShotSpot) => void
  setHeatSize:    (n: number) => void
  setManualMode:  (b: boolean) => void
  setMakesTarget: (n: number | undefined) => void
  setPlayers:     (p: Player[]) => void
  setCurrentPlayerIndex: (i: number) => void
  setMakes:       (n: number) => void
  setAttempts:    (n: number) => void
  commitHeat:     () => { spotComplete: boolean; drillComplete: boolean }
  // Task 4 (PRD §7.2): the dedicated "Next Spot" action — always available
  // once >=1 heat has been logged on the current spot, bypassing whatever
  // makesTargetPerSpot completion check commitHeat() applies. In Manual
  // mode, auto-saves whatever's currently tallied as one last heat first.
  advanceSpot:    () => { drillComplete: boolean }
  undoLastHeat:   () => void
  reset:          () => void
}

export const useDrillStore = create<DrillStore>((set, get) => {
  // Shared by commitHeat() and advanceSpot() — records one heat for the
  // current spot/shooter (or manual attempts) into completedHeats +
  // queues the Supabase write. Returns the new heats array and the heat
  // just recorded so callers can run their own spot-advance logic on top.
  function appendHeat(attempts: number) {
    const { currentMakes, hand, currentSpotIndex, currentPlayerIndex, selectedSpots, players, completedHeats } = get()
    const spot = selectedSpots[currentSpotIndex]
    const playerId = players[currentPlayerIndex]?.id ?? ''
    const heat: HeatRecord = {
      playerId, spot, hand,
      makes:      currentMakes,
      attempts,
      heatNumber: completedHeats.filter(h => h.spot === spot && h.playerId === playerId).length + 1,
    }
    const newHeats = [...completedHeats, heat]
    set({ completedHeats: newHeats, currentMakes: 0, currentAttempts: 0 })

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
    return { heats: newHeats, heat }
  }

  return {
  drillId:            null,
  shotType:           'threePoint',
  hand:               'right',
  selectedSpots:      ['center'],
  heatSize:           10,
  manualMode:         false,
  makesTargetPerSpot: 10,
  players:            [],
  currentSpotIndex:   0,
  currentPlayerIndex: 0,
  currentMakes:       0,
  currentAttempts:    0,
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
  setManualMode:  (b) => set({ manualMode: b }),
  setMakesTarget: (n) => set({ makesTargetPerSpot: n }),
  // Group drills never carry a per-spot makes target (PRD §7.3 — "make-
  // targets create unacceptable wait times" once 2+ players rotate) —
  // enforced here so the invariant holds regardless of setup-wizard step
  // order, not just via the UI hiding the target step for 2+ players.
  setPlayers:     (p) => set(state => ({
    players: p,
    makesTargetPerSpot: p.length > 1 ? undefined : state.makesTargetPerSpot,
  })),
  setCurrentPlayerIndex: (i) => set({ currentPlayerIndex: i }),
  setMakes:       (n) => {
    const { manualMode, heatSize } = get()
    set({ currentMakes: manualMode ? Math.max(0, n) : Math.max(0, Math.min(heatSize, n)) })
  },
  setAttempts:    (n) => set({ currentAttempts: Math.max(0, n) }),

  commitHeat: () => {
    const { manualMode, heatSize, currentAttempts, currentSpotIndex, currentPlayerIndex, selectedSpots, players, makesTargetPerSpot } = get()
    const attempts = manualMode ? currentAttempts : heatSize
    const { heats: newHeats } = appendHeat(attempts)
    const spot = selectedSpots[currentSpotIndex]

    const totalMakesFor = (playerId: string) =>
      newHeats.filter(h => h.spot === spot && h.playerId === playerId).reduce((s, h) => s + h.makes, 0)
    const reachedTarget = (playerId: string) =>
      makesTargetPerSpot !== undefined && totalMakesFor(playerId) >= makesTargetPerSpot

    let nextSpotIndex   = currentSpotIndex
    let nextPlayerIndex = currentPlayerIndex
    let spotComplete    = false

    if (makesTargetPerSpot !== undefined) {
      // Per-player wait-for-everyone (project decision, 2026-08-26): the
      // spot only completes once EVERY player has individually reached
      // the target — a player who gets there early is skipped in the
      // rotation (not given further turns) until the rest catch up.
      spotComplete = players.every(p => reachedTarget(p.id))
      if (spotComplete) {
        nextSpotIndex   = currentSpotIndex + 1
        nextPlayerIndex = 0
      } else if (players.length > 1) {
        for (let step = 1; step <= players.length; step++) {
          const candidate = (currentPlayerIndex + step) % players.length
          if (!reachedTarget(players[candidate].id)) { nextPlayerIndex = candidate; break }
        }
      }
    } else if (players.length > 1) {
      nextPlayerIndex = (currentPlayerIndex + 1) % players.length
    }

    const drillComplete = nextSpotIndex >= selectedSpots.length
    set({
      currentSpotIndex:   drillComplete ? currentSpotIndex : nextSpotIndex,
      currentPlayerIndex: nextPlayerIndex,
    })

    return { spotComplete, drillComplete }
  },

  advanceSpot: () => {
    const { manualMode, currentMakes, currentAttempts, currentSpotIndex, selectedSpots } = get()
    if (manualMode && (currentMakes > 0 || currentAttempts > 0)) {
      appendHeat(currentAttempts)
    }
    const nextSpotIndex = currentSpotIndex + 1
    const drillComplete = nextSpotIndex >= selectedSpots.length
    set({
      currentSpotIndex:   drillComplete ? currentSpotIndex : nextSpotIndex,
      currentPlayerIndex: 0,
      currentMakes:       0,
      currentAttempts:    0,
    })
    return { drillComplete }
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
    heatSize: 10, manualMode: false, makesTargetPerSpot: 10, players: [],
    currentSpotIndex: 0, currentPlayerIndex: 0, currentMakes: 0, currentAttempts: 0, completedHeats: [],
  }),
  }
})
