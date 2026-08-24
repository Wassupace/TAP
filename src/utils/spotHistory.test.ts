import { describe, it, expect } from 'vitest'
import { groupSpotHistoryByDrill, formatHeatSequence, type SpotHistoryHeatEntryRow } from './spotHistory'

function row(overrides: Partial<SpotHistoryHeatEntryRow>): SpotHistoryHeatEntryRow {
  return {
    id: 'h1',
    drill_id: 'd1',
    hand: 'right',
    spot: 'center',
    makes: 7,
    attempts: 10,
    heat_number: 1,
    recorded_at: '2026-08-01T10:00:00Z',
    drill: { started_at: '2026-08-01T09:00:00Z', session: { location: 'Levallois Gym' } },
    ...overrides,
  }
}

describe('groupSpotHistoryByDrill', () => {
  it('groups multiple drills at the same spot and sorts them by date, most recent first', () => {
    const rows: SpotHistoryHeatEntryRow[] = [
      row({ id: 'h1', drill_id: 'older', drill: { started_at: '2026-08-01T09:00:00Z', session: { location: 'Gym A' } } }),
      row({ id: 'h2', drill_id: 'newer', drill: { started_at: '2026-08-15T09:00:00Z', session: { location: 'Gym B' } } }),
      row({ id: 'h3', drill_id: 'middle', drill: { started_at: '2026-08-08T09:00:00Z', session: { location: 'Gym C' } } }),
    ]

    const result = groupSpotHistoryByDrill(rows)

    expect(result.map(r => r.drillId)).toEqual(['newer', 'middle', 'older'])
  })

  it('sorts heats within one drill by heat_number, regardless of input order', () => {
    const rows: SpotHistoryHeatEntryRow[] = [
      row({ id: 'h1', drill_id: 'd1', heat_number: 3, makes: 9, attempts: 10 }),
      row({ id: 'h2', drill_id: 'd1', heat_number: 1, makes: 7, attempts: 10 }),
      row({ id: 'h3', drill_id: 'd1', heat_number: 2, makes: 8, attempts: 10 }),
    ]

    const result = groupSpotHistoryByDrill(rows)

    expect(result).toHaveLength(1)
    expect(result[0].heats).toEqual([
      { heatNumber: 1, makes: 7, attempts: 10 },
      { heatNumber: 2, makes: 8, attempts: 10 },
      { heatNumber: 3, makes: 9, attempts: 10 },
    ])
  })

  it('computes total makes/attempts per drill across its heats', () => {
    const rows: SpotHistoryHeatEntryRow[] = [
      row({ id: 'h1', drill_id: 'd1', heat_number: 1, makes: 7, attempts: 10 }),
      row({ id: 'h2', drill_id: 'd1', heat_number: 2, makes: 8, attempts: 10 }),
    ]

    const result = groupSpotHistoryByDrill(rows)

    expect(result[0].makes).toBe(15)
    expect(result[0].attempts).toBe(20)
  })

  it('carries the drill\'s date and location from the embedded drill/session', () => {
    const rows: SpotHistoryHeatEntryRow[] = [
      row({ drill: { started_at: '2026-08-15T09:00:00Z', session: { location: 'Levallois Gym' } } }),
    ]

    const result = groupSpotHistoryByDrill(rows)

    expect(result[0].date).toBe('2026-08-15T09:00:00Z')
    expect(result[0].location).toBe('Levallois Gym')
  })

  it('falls back to recorded_at and a null location when the drill embed did not resolve', () => {
    const rows: SpotHistoryHeatEntryRow[] = [
      row({ recorded_at: '2026-08-20T11:00:00Z', drill: null }),
    ]

    const result = groupSpotHistoryByDrill(rows)

    expect(result[0].date).toBe('2026-08-20T11:00:00Z')
    expect(result[0].location).toBeNull()
  })

  it('returns an empty array for no rows', () => {
    expect(groupSpotHistoryByDrill([])).toEqual([])
  })
})

describe('formatHeatSequence', () => {
  it('joins heats as "makes/attempts" segments separated by " · ", in given order', () => {
    const result = formatHeatSequence([
      { heatNumber: 1, makes: 7, attempts: 10 },
      { heatNumber: 2, makes: 8, attempts: 10 },
      { heatNumber: 3, makes: 9, attempts: 10 },
    ])

    expect(result).toBe('7/10 · 8/10 · 9/10')
  })

  it('returns an empty string for no heats', () => {
    expect(formatHeatSequence([])).toBe('')
  })
})
