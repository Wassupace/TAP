import { create } from 'zustand'
import type { MatchFormat, ScoringStyle, Player } from '../types'
import { FORMAT_TEAM_SIZE, FORMAT_DEFAULT_TARGET } from '../types'

interface CompletedGame {
  gameNumber: number
  teamAScore: number
  teamBScore: number
  durationSeconds: number
  teamAPlayerIds: string[]
  teamBPlayerIds: string[]
}

interface MatchStore {
  format: MatchFormat
  targetScore: number
  scoringStyle: ScoringStyle
  teamA: Player[]
  teamB: Player[]
  subQueue: Player[]
  currentAScore: number
  currentBScore: number
  gameTimerStart: number | null
  isTimerRunning: boolean
  timerSeconds: number
  completedGames: CompletedGame[]

  setFormat: (f: MatchFormat) => void
  setTargetScore: (n: number) => void
  setScoringStyle: (s: ScoringStyle) => void
  randomize: (pool: Player[]) => void
  movePlayer: (playerId: string, to: 'A' | 'B' | 'sub') => void
  incrementScore: (team: 'A' | 'B', pts: number) => void
  startTimer: () => void
  stopTimer: () => number
  tickTimer: () => void
  endGame: () => CompletedGame
  reset: () => void
}

export const useMatchStore = create<MatchStore>((set, get) => ({
  format: '3v3',
  targetScore: 11,
  scoringStyle: 'targetScore',
  teamA: [],
  teamB: [],
  subQueue: [],
  currentAScore: 0,
  currentBScore: 0,
  gameTimerStart: null,
  isTimerRunning: false,
  timerSeconds: 0,
  completedGames: [],

  setFormat: (f) => set({ format: f, targetScore: FORMAT_DEFAULT_TARGET[f] }),
  setTargetScore: (n) => set({ targetScore: n }),
  setScoringStyle: (s) => set({ scoringStyle: s }),

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

  incrementScore: (team, pts) => {
    if (team === 'A') set(s => ({ currentAScore: s.currentAScore + pts }))
    else set(s => ({ currentBScore: s.currentBScore + pts }))
  },

  startTimer: () => set({ gameTimerStart: Date.now(), isTimerRunning: true }),
  stopTimer: () => {
    const start = get().gameTimerStart
    const elapsed = start ? Math.floor((Date.now() - start) / 1000) : 0
    set({ isTimerRunning: false, gameTimerStart: null })
    return elapsed
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
    return game
  },

  reset: () => set({
    teamA: [], teamB: [], subQueue: [],
    currentAScore: 0, currentBScore: 0,
    gameTimerStart: null, isTimerRunning: false, timerSeconds: 0,
    completedGames: [],
  }),
}))
