import { describe, it, expect } from 'vitest'
import { parseSheetIdFromUrl, buildMatchesRows, type ExportMatchRow, type ExportGameRow } from './sheetsExport'

describe('parseSheetIdFromUrl', () => {
  it('extracts the ID from a full edit URL', () => {
    expect(parseSheetIdFromUrl('https://docs.google.com/spreadsheets/d/1AbC-XyZ_123/edit#gid=0'))
      .toBe('1AbC-XyZ_123')
  })

  it('extracts the ID from a share URL with no trailing fragment', () => {
    expect(parseSheetIdFromUrl('https://docs.google.com/spreadsheets/d/1AbC-XyZ_123'))
      .toBe('1AbC-XyZ_123')
  })

  it('accepts a bare spreadsheet ID pasted directly', () => {
    expect(parseSheetIdFromUrl('1AbC-XyZ_123456789012345')).toBe('1AbC-XyZ_123456789012345')
  })

  it('trims surrounding whitespace', () => {
    expect(parseSheetIdFromUrl('  1AbC-XyZ_123456789012345  ')).toBe('1AbC-XyZ_123456789012345')
  })

  it('returns null for garbage input', () => {
    expect(parseSheetIdFromUrl('not a url')).toBeNull()
    expect(parseSheetIdFromUrl('')).toBeNull()
    expect(parseSheetIdFromUrl('https://example.com/whatever')).toBeNull()
  })
})

describe('buildMatchesRows — Task 3 ruling: Games folded into the Matches tab', () => {
  const match: ExportMatchRow = {
    id: 'm1', session_id: 's1', format: '3v3', target_score: 11,
    scoring_style: 'targetScore', started_at: '2026-01-01T00:00:00Z', ended_at: '2026-01-01T01:00:00Z',
  }
  const gameA: ExportGameRow = {
    id: 'g1', match_id: 'm1', game_number: 1, team_a_score: 11, team_b_score: 7,
    duration_seconds: 300, started_at: '2026-01-01T00:00:00Z', ended_at: '2026-01-01T00:05:00Z',
  }
  const gameB: ExportGameRow = {
    id: 'g2', match_id: 'm1', game_number: 2, team_a_score: 9, team_b_score: 11,
    duration_seconds: 400, started_at: '2026-01-01T00:10:00Z', ended_at: '2026-01-01T00:16:40Z',
  }

  it('emits one match row immediately followed by that match\'s own game rows', () => {
    const rows = buildMatchesRows([match], [gameA, gameB])
    expect(rows).toHaveLength(3)
    expect(rows[0][0]).toBe('match')
    expect(rows[1][0]).toBe('game')
    expect(rows[2][0]).toBe('game')
    // game rows immediately follow their own match, not a separate tab/section
    expect(rows[1][2]).toBe('m1') // match_id column
    expect(rows[2][2]).toBe('m1')
  })

  it('derives total_games/team_a_wins/team_b_wins/avg_margin_pts on the match row from its games', () => {
    const rows = buildMatchesRows([match], [gameA, gameB])
    const matchRow = rows[0]
    // columns: ... started_at(13) ended_at(14) total_games(15) team_a_wins(16) team_b_wins(17) avg_margin_pts(18)
    expect(matchRow[15]).toBe(2)  // total_games
    expect(matchRow[16]).toBe(1)  // team_a_wins (gameA)
    expect(matchRow[17]).toBe(1)  // team_b_wins (gameB)
    expect(matchRow[18]).toBe(3)  // avg margin: (4 + 2) / 2 = 3
  })

  it('a match with zero games still emits its own row with null aggregates', () => {
    const rows = buildMatchesRows([match], [])
    expect(rows).toHaveLength(1)
    expect(rows[0][0]).toBe('match')
    expect(rows[0][15]).toBe(0)    // total_games
    expect(rows[0][18]).toBeNull() // avg_margin_pts — no games to average
  })

  it('computes each game row\'s winner and margin correctly, including a tie', () => {
    const tie: ExportGameRow = { ...gameA, id: 'g3', team_a_score: 8, team_b_score: 8 }
    const rows = buildMatchesRows([match], [gameA, gameB, tie])
    const [, gA, gB, gTie] = rows
    // columns: game_number(7) team_a_score(8) team_b_score(9) winner(10) margin(11)
    expect(gA[10]).toBe('Team A')
    expect(gA[11]).toBe(4)
    expect(gB[10]).toBe('Team B')
    expect(gB[11]).toBe(2)
    expect(gTie[10]).toBe('Tie')
    expect(gTie[11]).toBe(0)
  })
})
