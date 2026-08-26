import { create } from 'zustand'
import type { MatchFormat, ScoringStyle, Player } from '../types'
import { FORMAT_TEAM_SIZE, FORMAT_DEFAULT_TARGET } from '../types'
import { dbInsert } from '../lib/db'

interface CompletedGame {
  gameNumber: number
  teamAScore: number
  teamBScore: number
  durationSeconds: number
  teamAPlayerIds: string[]
  teamBPlayerIds: string[]
}

interface MatchStore {
  matchId: string | null
  format: MatchFormat
  targetScore: number
  scoringStyle: ScoringStyle
  durationMinutes: number
  teamA: Player[]
  teamB: Player[]
  subQueue: Player[]
  currentAScore: number
  currentBScore: number
  gameTimerStart: number | null
  isTimerRunning: boolean
  timerSeconds: number
  completedGames: CompletedGame[]

  setMatchId: (id: string) => void
  setFormat: (f: MatchFormat) => void
  setTargetScore: (n: number) => void
  setScoringStyle: (s: ScoringStyle) => void
  setDurationMinutes: (n: number) => void
  randomize: (pool: Player[]) => void
  movePlayer: (playerId: string, to: 'A' | 'B' | 'sub') => void
  syncRoster: (selectedIds: string[], allPlayers: Player[]) => void
  incrementScore: (team: 'A' | 'B', pts: number) => void
  setScore: (team: 'A' | 'B', value: number) => void
  startTimer: () => void
  stopTimer: () => number
  pauseTimer: () => void
  resumeTimer: () => void
  tickTimer: () => void
  endGame: () => CompletedGame
  undoLastGame: () => void
  reset: () => void
  resetForRematch: () => void
}

export const useMatchStore = create<MatchStore>((set, get) => ({
  matchId: null,
  format: '3v3',
  targetScore: 11,
  scoringStyle: 'targetScore',
  durationMinutes: 10,
  teamA: [],
  teamB: [],
  subQueue: [],
  currentAScore: 0,
  currentBScore: 0,
  gameTimerStart: null,
  isTimerRunning: false,
  timerSeconds: 0,
  completedGames: [],

  setMatchId: (id) => set({ matchId: id }),
  setFormat: (f) => set({ format: f, targetScore: FORMAT_DEFAULT_TARGET[f] }),
  setTargetScore: (n) => set({ targetScore: n }),
  setScoringStyle: (s) => set({ scoringStyle: s }),
  setDurationMinutes: (n) => set({ durationMinutes: Math.max(1, n) }),

  randomize: (pool) => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const size = FORMAT_TEAM_SIZE[get().format]
    set({
      teamA: shuffled.slice(0, size),
      teamB: shuffled.slice(size, size * 2),
      subQueue: shuffled.slice(size * 2),
    })
  },

  movePlayer: (playerId, to) => {
    const { teamA, teamB, subQueue } = get()
    const all = [...teamA, ...teamB, ...subQueue]
    const player = all.find(p => p.id === playerId)
    if (!player) return
    const remove = (arr: Player[]) => arr.filter(p => p.id !== playerId)
    set({
      teamA: to === 'A' ? [...remove(teamA), player] : remove(teamA),
      teamB: to === 'B' ? [...remove(teamB), player] : remove(teamB),
      subQueue: to === 'sub' ? [...remove(subQueue), player] : remove(subQueue),
    })
  },

  // Mid-game roster edit (PRD §5.5): reconciles the full-roster selection
  // from PlayerPickerModal against the current teamA/teamB/subQueue split.
  // Players kept keep their current side; a dropped player is removed
  // outright (injury); a newly-added player (late arrival) lands in
  // subQueue, same as a fresh randomize() would place an unused player.
  syncRoster: (selectedIds, allPlayers) => {
    const { teamA, teamB, subQueue } = get()
    const currentIds = new Set([...teamA, ...teamB, ...subQueue].map(p => p.id))
    const keep = (arr: Player[]) => arr.filter(p => selectedIds.includes(p.id))
    const newPlayers = selectedIds
      .filter(id => !currentIds.has(id))
      .map(id => allPlayers.find(p => p.id === id))
      .filter((p): p is Player => !!p)
    set({
      teamA: keep(teamA),
      teamB: keep(teamB),
      subQueue: [...keep(subQueue), ...newPlayers],
    })
  },

  incrementScore: (team, pts) => {
    if (team === 'A') set(s => ({ currentAScore: s.currentAScore + pts }))
    else set(s => ({ currentBScore: s.currentBScore + pts }))
  },

  setScore: (team, value) => {
    const clamped = Math.max(0, value)
    if (team === 'A') set({ currentAScore: clamped })
    else set({ currentBScore: clamped })
  },

  startTimer: () => set({ gameTimerStart: Date.now(), isTimerRunning: true }),
  stopTimer: () => {
    const start = get().gameTimerStart
    const elapsed = start ? Math.floor((Date.now() - start) / 1000) : 0
    set({ isTimerRunning: false, gameTimerStart: null })
    return elapsed
  },
  // Pause/resume for the mid-game roster-edit sheet (PRD §5.5) — unlike
  // startTimer/stopTimer (used by the main Start/Stop Game button, which
  // intentionally restarts the count from zero), these preserve the
  // already-elapsed `timerSeconds` across the pause by shifting
  // `gameTimerStart` back on resume instead of resetting it to now.
  pauseTimer: () => {
    const { isTimerRunning, timerSeconds } = get()
    if (!isTimerRunning) return
    set({ isTimerRunning: false, gameTimerStart: null, timerSeconds })
  },
  resumeTimer: () => {
    const { timerSeconds } = get()
    set({ gameTimerStart: Date.now() - timerSeconds * 1000, isTimerRunning: true })
  },
  tickTimer: () => {
    const start = get().gameTimerStart
    if (start && get().isTimerRunning) {
      set({ timerSeconds: Math.floor((Date.now() - start) / 1000) })
    }
  },

  endGame: () => {
    const { currentAScore, currentBScore, gameTimerStart, completedGames, teamA, teamB } = get()
    const duration = gameTimerStart ? Math.floor((Date.now() - gameTimerStart) / 1000) : 0
    const game: CompletedGame = {
      gameNumber: completedGames.length + 1,
      teamAScore: currentAScore,
      teamBScore: currentBScore,
      durationSeconds: duration,
      teamAPlayerIds: teamA.map(p => p.id),
      teamBPlayerIds: teamB.map(p => p.id),
    }
    set(s => ({
      completedGames: [...s.completedGames, game],
      currentAScore: 0,
      currentBScore: 0,
      gameTimerStart: null,
      isTimerRunning: false,
      timerSeconds: 0,
    }))

    const { matchId } = get()
    if (matchId) {
      dbInsert('games', {
        match_id:          matchId,
        game_number:       game.gameNumber,
        team_a_score:      game.teamAScore,
        team_b_score:      game.teamBScore,
        duration_seconds:  game.durationSeconds,
        team_a_player_ids: game.teamAPlayerIds,
        team_b_player_ids: game.teamBPlayerIds,
      }).catch(() => {})
    }

    return game
  },

  undoLastGame: () => {
    const { completedGames } = get()
    if (completedGames.length === 0) return
    set({ completedGames: completedGames.slice(0, -1) })
  },

  reset: () => set({
    matchId: null,
    teamA: [], teamB: [], subQueue: [],
    currentAScore: 0, currentBScore: 0,
    gameTimerStart: null, isTimerRunning: false, timerSeconds: 0,
    completedGames: [],
  }),

  resetForRematch: () => set({
    matchId: null,
    currentAScore: 0, currentBScore: 0,
    gameTimerStart: null, isTimerRunning: false, timerSeconds: 0,
    completedGames: [],
  }),
}))
