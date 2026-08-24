import { describe, it, expect } from 'vitest'
import { buildRecurringSessionDates, RECURRING_SESSION_COUNT } from './recurringSessions'

describe('buildRecurringSessionDates', () => {
  it('returns 8 dates by default, 7 days apart, starting from the given date', () => {
    const result = buildRecurringSessionDates('2026-09-01')

    expect(result).toHaveLength(RECURRING_SESSION_COUNT)
    expect(result.map((r) => r.date)).toEqual([
      '2026-09-01',
      '2026-09-08',
      '2026-09-15',
      '2026-09-22',
      '2026-09-29',
      '2026-10-06',
      '2026-10-13',
      '2026-10-20',
    ])
  })

  it('captures the JS day-of-week of the selected date on every entry', () => {
    // 2026-09-01 is a Tuesday (getDay() === 2)
    const result = buildRecurringSessionDates('2026-09-01')

    expect(result.every((r) => r.weekday === 2)).toBe(true)
  })

  it('carries the weekday across a month/year boundary correctly', () => {
    // 2026-12-29 is a Tuesday; the 7-day-interval batch crosses into 2027
    const result = buildRecurringSessionDates('2026-12-29')

    expect(result.map((r) => r.date)).toEqual([
      '2026-12-29',
      '2027-01-05',
      '2027-01-12',
      '2027-01-19',
      '2027-01-26',
      '2027-02-02',
      '2027-02-09',
      '2027-02-16',
    ])
    expect(result.every((r) => r.weekday === 2)).toBe(true)
  })

  it('respects a custom count', () => {
    const result = buildRecurringSessionDates('2026-09-01', 3)
    expect(result.map((r) => r.date)).toEqual(['2026-09-01', '2026-09-08', '2026-09-15'])
  })
})
