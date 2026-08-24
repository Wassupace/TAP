import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mock Supabase chain (same convention as src/hooks/useSessions.test.tsx /
// useRecentPlayerActivity.test.tsx) ──────────────────────────────────────────
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('../lib/supabase', () => ({ supabase: { from: mockFrom } }))

import {
  usePlayerWL,
  usePlayerWLByFormat,
  usePlayerRecreationalRecord,
  groupWLByFormat,
  tallyRecreationalRecord,
  RECREATIONAL_GAME_TYPES,
  type GameFormatRow,
  type CompetitiveResultGameTypeRow,
} from './usePlayerStats'
import { ALL_FORMATS } from '../types'

type Result = { data?: unknown; error?: unknown }

// `games`'s chain: .select(...).contains(column, [id]) — same two
// independent `.contains()` calls (team_a, then team_b) as usePlayerWL
// already issues, per useRecentPlayerActivity.test.tsx's `buildMatchesChain`
// convention (the same column resolves regardless of call order).
function buildGamesChain(byColumn: { team_a_player_ids?: Result; team_b_player_ids?: Result }) {
  const chain = { select: vi.fn(), contains: vi.fn() }
  chain.select.mockReturnValue(chain)
  chain.contains.mockImplementation((column: string) =>
    Promise.resolve(byColumn[column as 'team_a_player_ids' | 'team_b_player_ids'] ?? { data: [], error: null })
  )
  return chain
}

// `competitive_results`'s chain: .select(...).eq('player_id', id)
function buildCompetitiveResultsChain(result: Result) {
  const chain = { select: vi.fn(), eq: vi.fn() }
  chain.select.mockReturnValue(chain)
  chain.eq.mockResolvedValue(result)
  return chain
}

function mockTables(opts: { gamesA?: Result; gamesB?: Result; competitive?: Result }) {
  const gamesChain = buildGamesChain({
    team_a_player_ids: opts.gamesA ?? { data: [], error: null },
    team_b_player_ids: opts.gamesB ?? { data: [], error: null },
  })
  const competitiveChain = buildCompetitiveResultsChain(opts.competitive ?? { data: [], error: null })

  ;(mockFrom as MockedFunction<typeof mockFrom>).mockImplementation((table: string) => {
    if (table === 'games') return gamesChain
    if (table === 'competitive_results') return competitiveChain
    throw new Error(`unexpected table: ${table}`)
  })
  return { gamesChain, competitiveChain }
}

let container: HTMLDivElement
let root: Root
let queryClient: QueryClient

beforeEach(() => {
  vi.clearAllMocks()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  queryClient = new QueryClient()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

// Same harness + settle-polling convention as useSessions.test.tsx's
// `waitForSettled` — poll the hook's OWN captured `isLoading`, never a
// cache-level proxy like `queryClient.isFetching()`.
function mountHook<T>(useHook: () => T): () => T {
  let captured: T | null = null
  function Harness() {
    captured = useHook()
    return null
  }
  act(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>
    )
  })
  return () => captured!
}

async function waitForSettled(getHook: () => { isLoading: boolean }) {
  for (let i = 0; i < 20; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    if (!getHook().isLoading) return
  }
}

// ── Pure grouping/counting logic ─────────────────────────────────────────────

describe('groupWLByFormat', () => {
  it('covers all 5 ALL_FORMATS even when the player only played 2 of them, with the other 3 at 0/0', () => {
    const gamesA: GameFormatRow[] = [
      { team_a_score: 11, team_b_score: 5, team_a_player_ids: ['p1'], team_b_player_ids: ['p2'], match: { format: '3v3' } },
    ]
    const gamesB: GameFormatRow[] = [
      { team_a_score: 11, team_b_score: 5, team_a_player_ids: ['p2'], team_b_player_ids: ['p1'], match: { format: '1v1' } },
    ]

    const result = groupWLByFormat(gamesA, gamesB, 'p1')

    expect(result.map(r => r.format)).toEqual(ALL_FORMATS)
    expect(result.find(r => r.format === '3v3')).toEqual({ format: '3v3', wins: 1, losses: 0 })
    expect(result.find(r => r.format === '1v1')).toEqual({ format: '1v1', wins: 0, losses: 1 })
    for (const format of ['2v2', '4v4', '5v5'] as const) {
      expect(result.find(r => r.format === format)).toEqual({ format, wins: 0, losses: 0 })
    }
  })

  it('counts a tied game as a loss for the player, matching tallyBySide\'s established tie=loss rule (not MatchRecapPage\'s team-vs-team "everything not a strict A win falls to B" display convention, which is a different, team-level idiom)', () => {
    const gamesA: GameFormatRow[] = [
      { team_a_score: 9, team_b_score: 9, team_a_player_ids: ['p1'], team_b_player_ids: ['p2'], match: { format: '5v5' } },
    ]
    const result = groupWLByFormat(gamesA, [], 'p1')
    expect(result.find(r => r.format === '5v5')).toEqual({ format: '5v5', wins: 0, losses: 1 })
  })

  it('only counts a game toward the format if the player actually appears on the side being tallied', () => {
    const gamesA: GameFormatRow[] = [
      { team_a_score: 11, team_b_score: 5, team_a_player_ids: ['someone-else'], team_b_player_ids: ['p2'], match: { format: '2v2' } },
    ]
    const result = groupWLByFormat(gamesA, [], 'p1')
    expect(result.find(r => r.format === '2v2')).toEqual({ format: '2v2', wins: 0, losses: 0 })
  })

  it('skips a row whose match embed is null (e.g. an orphaned game) instead of throwing', () => {
    const gamesA: GameFormatRow[] = [
      { team_a_score: 11, team_b_score: 5, team_a_player_ids: ['p1'], team_b_player_ids: [], match: null },
    ]
    const result = groupWLByFormat(gamesA, [], 'p1')
    expect(result.every(r => r.wins === 0 && r.losses === 0)).toBe(true)
  })

  it('sums to the same total wins/losses as tallyBySide would over the same rows (stays consistent with usePlayerWL)', () => {
    const gamesA: GameFormatRow[] = [
      { team_a_score: 11, team_b_score: 5, team_a_player_ids: ['p1'], team_b_player_ids: ['p2'], match: { format: '3v3' } },
      { team_a_score: 5, team_b_score: 11, team_a_player_ids: ['p1'], team_b_player_ids: ['p2'], match: { format: '1v1' } },
    ]
    const gamesB: GameFormatRow[] = [
      { team_a_score: 5, team_b_score: 11, team_a_player_ids: ['p2'], team_b_player_ids: ['p1'], match: { format: '4v4' } },
    ]
    const result = groupWLByFormat(gamesA, gamesB, 'p1')
    const totalWins = result.reduce((s, r) => s + r.wins, 0)
    const totalLosses = result.reduce((s, r) => s + r.losses, 0)
    // p1: 3v3 win, 1v1 loss, 4v4 win => 2-1
    expect({ wins: totalWins, losses: totalLosses }).toEqual({ wins: 2, losses: 1 })
  })
})

describe('tallyRecreationalRecord', () => {
  it('explicitly excludes a middies result from the count — 2 banks wins + 1 middies win is 2-0, not 3-0', () => {
    const rows: CompetitiveResultGameTypeRow[] = [
      { rank: 1, competitive_games: { game_type: 'banks' } },
      { rank: 1, competitive_games: { game_type: 'banks' } },
      { rank: 1, competitive_games: { game_type: 'middies' } },
    ]
    expect(tallyRecreationalRecord(rows)).toEqual({ wins: 2, losses: 0 })
  })

  it('counts rank 2+ as a loss, for each of the 3 recreational types', () => {
    const rows: CompetitiveResultGameTypeRow[] = RECREATIONAL_GAME_TYPES.map(game_type => ({
      rank: 2,
      competitive_games: { game_type },
    }))
    expect(tallyRecreationalRecord(rows)).toEqual({ wins: 0, losses: 3 })
  })

  it('never lets a middies result count as a loss either — it is skipped entirely, not defaulted to a loss', () => {
    const rows: CompetitiveResultGameTypeRow[] = [
      { rank: 3, competitive_games: { game_type: 'middies' } },
      { rank: 1, competitive_games: { game_type: 'next' } },
    ]
    expect(tallyRecreationalRecord(rows)).toEqual({ wins: 1, losses: 0 })
  })

  it('skips a row with a null competitive_games embed instead of throwing', () => {
    const rows: CompetitiveResultGameTypeRow[] = [{ rank: 1, competitive_games: null }]
    expect(tallyRecreationalRecord(rows)).toEqual({ wins: 0, losses: 0 })
  })

  it('returns 0-0 for an empty result set', () => {
    expect(tallyRecreationalRecord([])).toEqual({ wins: 0, losses: 0 })
  })
})

// ── Hooks, against two different fake players with different histories —
// the literal regression this task fixes (WinLossPage used to render the
// same hardcoded DATA array no matter which player's route was open). ───────

describe('usePlayerWLByFormat', () => {
  it('produces different, individually-correct per-format records for two different players', async () => {
    // Player A: one 3v3 win.
    mockTables({
      gamesA: {
        data: [
          { team_a_score: 11, team_b_score: 5, team_a_player_ids: ['player-a'], team_b_player_ids: ['x'], match: { format: '3v3' } },
        ],
        error: null,
      },
    })
    const getHookA = mountHook(() => usePlayerWLByFormat('player-a'))
    await waitForSettled(getHookA)

    expect(mockFrom).toHaveBeenCalledWith('games')
    const aResult = getHookA().data!
    expect(aResult.find(r => r.format === '3v3')).toEqual({ format: '3v3', wins: 1, losses: 0 })
    expect(aResult.find(r => r.format === '5v5')).toEqual({ format: '5v5', wins: 0, losses: 0 })

    // Player B: one 5v5 loss — a completely different record from player A.
    mockTables({
      gamesB: {
        data: [
          { team_a_score: 21, team_b_score: 5, team_a_player_ids: ['x'], team_b_player_ids: ['player-b'], match: { format: '5v5' } },
        ],
        error: null,
      },
    })
    const getHookB = mountHook(() => usePlayerWLByFormat('player-b'))
    await waitForSettled(getHookB)

    const bResult = getHookB().data!
    expect(bResult.find(r => r.format === '5v5')).toEqual({ format: '5v5', wins: 0, losses: 1 })
    expect(bResult.find(r => r.format === '3v3')).toEqual({ format: '3v3', wins: 0, losses: 0 })

    // The two players' records are not the mocked-array regression this
    // task fixes: they genuinely differ.
    expect(aResult).not.toEqual(bResult)
  })

  it('requests the games/matches embed with the same select shape usePlayerShooting uses for heat_entries/drills', async () => {
    const { gamesChain } = mockTables({})
    const getHook = mountHook(() => usePlayerWLByFormat('p1'))
    await waitForSettled(getHook)

    expect(gamesChain.select).toHaveBeenCalledWith(
      'team_a_score, team_b_score, team_a_player_ids, team_b_player_ids, match:matches(format)'
    )
  })
})

describe('usePlayerRecreationalRecord', () => {
  it('produces different, individually-correct recreational records for two different players, excluding middies for both', async () => {
    mockTables({
      competitive: {
        data: [
          { rank: 1, competitive_games: { game_type: 'banks' } },
          { rank: 1, competitive_games: { game_type: 'banks' } },
          { rank: 1, competitive_games: { game_type: 'middies' } }, // must not count
        ],
        error: null,
      },
    })
    const getHookA = mountHook(() => usePlayerRecreationalRecord('player-a'))
    await waitForSettled(getHookA)
    expect(getHookA().data).toEqual({ wins: 2, losses: 0 })

    mockTables({
      competitive: {
        data: [
          { rank: 2, competitive_games: { game_type: 'next' } },
          { rank: 3, competitive_games: { game_type: 'generic' } },
          { rank: 1, competitive_games: { game_type: 'middies' } }, // must not count
        ],
        error: null,
      },
    })
    const getHookB = mountHook(() => usePlayerRecreationalRecord('player-b'))
    await waitForSettled(getHookB)
    expect(getHookB().data).toEqual({ wins: 0, losses: 2 })

    expect(getHookA().data).not.toEqual(getHookB().data)
  })

  it('scopes the query to this player via .eq(player_id, ...)', async () => {
    const { competitiveChain } = mockTables({})
    const getHook = mountHook(() => usePlayerRecreationalRecord('p1'))
    await waitForSettled(getHook)

    expect(competitiveChain.eq).toHaveBeenCalledWith('player_id', 'p1')
  })
})

// ── Regression guard: usePlayerWL's existing behavior is untouched ─────────

describe('usePlayerWL (unchanged)', () => {
  it('still aggregates wins/losses across both sides for a single player', async () => {
    mockTables({
      gamesA: {
        data: [{ team_a_score: 11, team_b_score: 5, team_a_player_ids: ['p1'], team_b_player_ids: ['p2'] }],
        error: null,
      },
      gamesB: {
        data: [{ team_a_score: 11, team_b_score: 5, team_a_player_ids: ['p2'], team_b_player_ids: ['p1'] }],
        error: null,
      },
    })
    const getHook = mountHook(() => usePlayerWL('p1'))
    await waitForSettled(getHook)
    expect(getHook().data).toEqual({ wins: 1, losses: 1 })
  })
})
