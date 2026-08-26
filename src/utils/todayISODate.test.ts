import { describe, it, expect } from 'vitest'
import { todayISODate } from './todayISODate'

describe('todayISODate', () => {
  it('returns local date components, not a UTC-shifted date', () => {
    // Late evening local time — if this were implemented via
    // `toISOString().split('T')[0]` (UTC) instead of local getters, a
    // positive-UTC-offset reader would see this roll to the *next* day.
    const localLateEvening = new Date(2026, 0, 15, 23, 30, 0) // Jan 15 2026, 23:30 local
    expect(todayISODate(localLateEvening)).toBe('2026-01-15')
  })

  it('does not roll back a day for early-morning local time either', () => {
    // A negative-UTC-offset reader is the mirror case: early morning local
    // time can be the *previous* UTC day.
    const localEarlyMorning = new Date(2026, 0, 15, 0, 15, 0) // Jan 15 2026, 00:15 local
    expect(todayISODate(localEarlyMorning)).toBe('2026-01-15')
  })

  it('pads single-digit months and days with a leading zero', () => {
    expect(todayISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('handles a double-digit month and day with no extra padding', () => {
    expect(todayISODate(new Date(2026, 11, 25))).toBe('2026-12-25')
  })

  it('defaults to the current local date when called with no argument', () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    expect(todayISODate()).toBe(`${year}-${month}-${day}`)
  })
})
