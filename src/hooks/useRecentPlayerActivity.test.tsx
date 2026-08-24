import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mock Supabase chain (same convention as src/hooks/useSessionHighlights.test.tsx) ──
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('../lib/supabase', () => ({ supabase: { from: mockFrom } }))

import {
  useRecentPlayerActivity,
  computeMatchWL,
  formatMatchResultLine,
  formatDrillResultLine,
  formatCompetitiveResultLine,
  ordinal,
  mergeAndSortActivity,
  type ActivityLogItem,
} from './useRecentPlayerActivity'

type Result = { data?: unknown; error?: unknown }

// `matches`'s chain: .select(...).contains(column, [id]) — the *same*
// column resolves independently of call order, since useRecentPlayerActivity
// issues two separate `.contains()` calls against this table (team_a, then
// team_b), same pattern usePlayerWL already uses instead of a guessed
// `.or()` filter.
function buildMatchesChain(byColumn: { team_a_player_ids?: Result; team_b_player_ids?: Result }) {
  const chain = { select: vi.fn(), contains: vi.fn() }
  chain.select.mockReturnValue(chain)
  chain.contains.mockImplementation((column: string) =>
    Promise.resolve(byColumn[column as 'team_a_player_ids' | 'team_b_player_ids'] ?? { data: [], error: null })
  )
  return chain
}

// `drills`'s chain: .select(...).contains('player_ids', [id])
function buildContainsChain(result: Result) {
  const chain = { select: vi.fn(), contains: vi.fn() }
  chain.select.mockReturnValue(chain)
  chain.contains.mockResolvedValue(result)
  return chain
}

// `competitive_results`'s chain: .select(...).eq('player_id', id)
function buildEqChain(result: Result) {
  const chain = { select: vi.fn(), eq: vi.fn() }
  chain.select.mockReturnValue(chain)
  chain.eq.mockResolvedValue(result)
  return chain
}

function mockTables(opts: {
  matchesA?: Result
  matchesB?: Result
  drills?: Result
  competitive?: Result
}) {
  const matchesChain = buildMatchesChain({
    team_a_player_ids: opts.matchesA ?? { data: [], error: null },
    team_b_player_ids: opts.matchesB ?? { data: [], error: null },
  })
  const drillsChain = buildContainsChain(opts.drills ?? { data: [], error: null })
  const competitiveChain = buildEqChain(opts.competitive ?? { data: [], error: null })

  ;(mockFrom as MockedFunction<typeof mockFrom>).mockImplementation((table: string) => {
    if (table === 'matches') return matchesChain
    if (table === 'drills') return drillsChain
    if (table === 'competitive_results') return competitiveChain
    throw new Error(`unexpected table: ${table}`)
  })
  return { matchesChain, drillsChain, competitiveChain }
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

// Same harness + settle-polling convention as
// src/hooks/useSessions.test.tsx's `waitForSettled` — poll the hook's OWN
// captured `isPending`, never a cache-level proxy like `queryClient.isFetching()`
// or a bare `useIsFetching()` counter (see useSessionHighlights.test.tsx's
// long comment on why that races).
function mountHook(playerId: string): () => ReturnType<typeof useRecentPlayerActivity> {
  let captured: ReturnType<typeof useRecentPlayerActivity> | null = null
  function Harness() {
    captured = useRecentPlayerActivity(playerId)
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

async function waitForSettled(getHook: () => { isPending: boolean }) {
  for (let i = 0; i < 20; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    if (!getHook().isPending) return
  }
}

describe('useRecentPlayerActivity', () => {
  it('merges matches, drills, and competitive games into one date-descending list', async () => {
    mockTables({
      matchesA: {
        data: [
          {
            id: 'match-1',
            format: '3v3',
            started_at: '2026-08-10T18:00:00Z',
            session: { location: 'Levallois Gym' },
            games: [
              { team_a_score: 11, team_b_score: 6, team_a_player_ids: ['p1'], team_b_player_ids: [] },
              // p1 sat this one out on a sub rotation — counts toward the
              // match's total game count but not toward their own W/L.
              { team_a_score: 9, team_b_score: 11, team_a_player_ids: [], team_b_player_ids: [] },
            ],
          },
        ],
        error: null,
      },
      drills: {
        data: [
          {
            id: 'drill-1',
            shot_type: 'freeThrow',
            hand: 'right',
            started_at: '2026-08-15T18:00:00Z',
            session: { location: 'Gym B' },
            heat_entries: [
              { player_id: 'p1', hand: 'right', makes: 8, attempts: 10 },
              { player_id: 'other', hand: 'left', makes: 100, attempts: 100 },
            ],
          },
        ],
        error: null,
      },
      competitive: {
        data: [
          {
            id: 'result-1',
            rank: 2,
            competitive_games: {
              game_type: 'banks',
              custom_name: null,
              player_ids: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
              started_at: '2026-08-20T18:00:00Z',
              session: { location: 'Gym C' },
            },
          },
        ],
        error: null,
      },
    })

    const getHook = mountHook('p1')
    await waitForSettled(getHook)

    expect(mockFrom).toHaveBeenCalledWith('matches')
    expect(mockFrom).toHaveBeenCalledWith('drills')
    expect(mockFrom).toHaveBeenCalledWith('competitive_results')

    const data = getHook().data
    expect(data.map(d => d.id)).toEqual(['result-1', 'drill-1', 'match-1'])

    expect(data[0]).toEqual({
      id: 'result-1',
      activityType: 'competitiveGame',
      label: 'Banks',
      location: 'Gym C',
      date: '2026-08-20T18:00:00Z',
      resultLine: '2nd of 6',
    })
    expect(data[1]).toEqual({
      id: 'drill-1',
      activityType: 'drill',
      label: 'Free Throws — Right',
      location: 'Gym B',
      date: '2026-08-15T18:00:00Z',
      resultLine: '80% · R · 8/10',
    })
    expect(data[2]).toEqual({
      id: 'match-1',
      activityType: 'match',
      label: '3v3 Match',
      location: 'Levallois Gym',
      date: '2026-08-10T18:00:00Z',
      resultLine: 'W · 1 of 2 games',
    })
  })

  it('dedupes a match returned by both the team_a and team_b contains queries', async () => {
    const sharedMatch = {
      id: 'match-dup',
      format: '1v1',
      started_at: '2026-08-01T10:00:00Z',
      session: { location: 'Gym A' },
      games: [{ team_a_score: 11, team_b_score: 4, team_a_player_ids: ['p1'], team_b_player_ids: [] }],
    }
    mockTables({
      matchesA: { data: [sharedMatch], error: null },
      matchesB: { data: [sharedMatch], error: null },
    })

    const getHook = mountHook('p1')
    await waitForSettled(getHook)

    expect(getHook().data).toHaveLength(1)
  })

  it('returns an empty list when the player has no activity in any of the three tables', async () => {
    mockTables({})
    const getHook = mountHook('p1')
    await waitForSettled(getHook)

    expect(getHook().data).toEqual([])
  })
})

describe('computeMatchWL', () => {
  it('tallies wins and losses across a match with a mix of results, including team-side switches between games', () => {
    const games = [
      { team_a_score: 11, team_b_score: 5, team_a_player_ids: ['p1'], team_b_player_ids: ['p2'] }, // p1 win (side a)
      { team_a_score: 11, team_b_score: 5, team_a_player_ids: ['p2'], team_b_player_ids: ['p1'] }, // p1 loss (side b)
      { team_a_score: 9, team_b_score: 11, team_a_player_ids: ['p2'], team_b_player_ids: ['p1'] }, // p1 win (side b)
      { team_a_score: 11, team_b_score: 9, team_a_player_ids: ['p2'], team_b_player_ids: ['p1'] }, // p1 loss (side b)
      { team_a_score: 15, team_b_score: 3, team_a_player_ids: ['p1'], team_b_player_ids: ['p2'] }, // p1 win (side a)
    ]

    expect(computeMatchWL(games, 'p1')).toEqual({ wins: 3, losses: 2 })
  })

  it('never counts a game the player did not appear in on either side', () => {
    const games = [
      { team_a_score: 11, team_b_score: 5, team_a_player_ids: ['other-a'], team_b_player_ids: ['other-b'] },
    ]
    expect(computeMatchWL(games, 'p1')).toEqual({ wins: 0, losses: 0 })
  })
})

describe('formatMatchResultLine', () => {
  it('formats a winning record', () => {
    expect(formatMatchResultLine({ wins: 4, losses: 1 }, 5)).toBe('W · 4 of 5 games')
  })
  it('formats a losing record', () => {
    expect(formatMatchResultLine({ wins: 1, losses: 4 }, 5)).toBe('L · 1 of 5 games')
  })
  it('formats a tied record', () => {
    expect(formatMatchResultLine({ wins: 2, losses: 2 }, 4)).toBe('T · 2 of 4 games')
  })
  it('singularizes "game" for a single-game match', () => {
    expect(formatMatchResultLine({ wins: 1, losses: 0 }, 1)).toBe('W · 1 of 1 game')
  })
})

describe('formatDrillResultLine', () => {
  it('formats makes across multiple attempts with the rounded percentage and hand letter', () => {
    expect(formatDrillResultLine(82, 100, 'right')).toBe('82% · R · 82/100')
  })
  it('formats a left-hand drill', () => {
    expect(formatDrillResultLine(3, 10, 'left')).toBe('30% · L · 3/10')
  })
  it('shows 0% (not NaN or division by zero) when the player logged no attempts', () => {
    expect(formatDrillResultLine(0, 0, 'right')).toBe('0% · R · 0/0')
  })
  it('falls back to an em dash when no hand is known', () => {
    expect(formatDrillResultLine(0, 0, null)).toBe('0% · — · 0/0')
  })
})

describe('ordinal', () => {
  it.each([
    [1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'],
    [11, '11th'], [12, '12th'], [13, '13th'],
    [21, '21st'], [22, '22nd'], [23, '23rd'],
  ])('formats %i as %s', (n, expected) => {
    expect(ordinal(n)).toBe(expected)
  })
})

describe('formatCompetitiveResultLine', () => {
  it('formats a ranking result', () => {
    expect(formatCompetitiveResultLine(2, 6)).toBe('2nd of 6')
  })
  it('formats first place', () => {
    expect(formatCompetitiveResultLine(1, 4)).toBe('1st of 4')
  })
})

describe('mergeAndSortActivity', () => {
  function item(overrides: Partial<ActivityLogItem>): ActivityLogItem {
    return {
      id: 'x', activityType: 'match', label: 'x', location: null, date: '2026-01-01T00:00:00Z', resultLine: 'x',
      ...overrides,
    }
  }

  it('sorts mixed activity types by date descending', () => {
    const matches = [item({ id: 'm1', activityType: 'match', date: '2026-08-10T00:00:00Z' })]
    const drills = [item({ id: 'd1', activityType: 'drill', date: '2026-08-20T00:00:00Z' })]
    const competitive = [item({ id: 'c1', activityType: 'competitiveGame', date: '2026-08-15T00:00:00Z' })]

    const result = mergeAndSortActivity(matches, drills, competitive)

    expect(result.map(r => r.id)).toEqual(['d1', 'c1', 'm1'])
  })

  it('applies no cap to the merged list', () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      item({ id: `a${i}`, date: new Date(2026, 0, i + 1).toISOString() })
    )
    expect(mergeAndSortActivity(many)).toHaveLength(25)
  })

  it('returns an empty array when every group is empty', () => {
    expect(mergeAndSortActivity([], [], [])).toEqual([])
  })
})
