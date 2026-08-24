import { describe, it, expect } from 'vitest'
import { fmtDuration } from './formatDuration'

describe('fmtDuration', () => {
  it('returns an em dash when startedAt is missing', () => {
    expect(fmtDuration(undefined, '2026-08-20T11:00:00Z')).toBe('—')
  })

  it('returns an em dash when endedAt is missing', () => {
    expect(fmtDuration('2026-08-20T10:00:00Z', undefined)).toBe('—')
  })

  it('returns an em dash when both are missing', () => {
    expect(fmtDuration(null, null)).toBe('—')
  })

  it('formats a sub-hour duration as minutes only', () => {
    expect(fmtDuration('2026-08-20T10:00:00Z', '2026-08-20T10:45:00Z')).toBe('45min')
  })

  it('formats an hour-plus duration as hours and minutes', () => {
    expect(fmtDuration('2026-08-20T10:00:00Z', '2026-08-20T12:30:00Z')).toBe('2h 30min')
  })

  it('formats an exact-hour duration with 0 minutes', () => {
    expect(fmtDuration('2026-08-20T10:00:00Z', '2026-08-20T12:00:00Z')).toBe('2h 0min')
  })

  it('formats a zero-length duration as 0min', () => {
    expect(fmtDuration('2026-08-20T10:00:00Z', '2026-08-20T10:00:00Z')).toBe('0min')
  })
})
