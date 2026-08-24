import { describe, it, expect } from 'vitest'
import { isMissed, pillState, selectDayPills, fmtPillDuration, pillLabel } from './calendarPills'
import type { Session } from '../types'

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 's1',
    date: '2026-08-20',
    location: 'Levallois Gym',
    state: 'planned',
    is_recurring: false,
    expected_player_ids: [],
    ...overrides,
  }
}

const TODAY = '2026-08-22'

describe('isMissed', () => {
  it('is true for a planned session dated before today', () => {
    expect(isMissed(makeSession({ state: 'planned', date: '2026-08-20' }), TODAY)).toBe(true)
  })

  it('is false for a planned session dated today', () => {
    expect(isMissed(makeSession({ state: 'planned', date: TODAY }), TODAY)).toBe(false)
  })

  it('is false for a planned session dated in the future', () => {
    expect(isMissed(makeSession({ state: 'planned', date: '2026-08-25' }), TODAY)).toBe(false)
  })

  it('is false for a past-dated completed session', () => {
    expect(isMissed(makeSession({ state: 'completed', date: '2026-08-20' }), TODAY)).toBe(false)
  })

  it('is false for a past-dated active session', () => {
    expect(isMissed(makeSession({ state: 'active', date: '2026-08-20' }), TODAY)).toBe(false)
  })
})

describe('pillState', () => {
  it('returns missed for a past-dated planned session', () => {
    expect(pillState(makeSession({ state: 'planned', date: '2026-08-20' }), TODAY)).toBe('missed')
  })

  it('returns the raw state for active/planned(future)/completed', () => {
    expect(pillState(makeSession({ state: 'active' }), TODAY)).toBe('active')
    expect(pillState(makeSession({ state: 'planned', date: '2026-08-25' }), TODAY)).toBe('planned')
    expect(pillState(makeSession({ state: 'completed', date: '2026-08-20' }), TODAY)).toBe('completed')
  })
})

describe('selectDayPills', () => {
  it('returns both sessions and zero overflow for a two-session day', () => {
    const a = makeSession({ id: 'a', location: 'Levallois Gym', state: 'completed' })
    const b = makeSession({ id: 'b', location: 'Neuilly Gym', state: 'planned', date: '2026-08-25' })
    const { pills, overflow } = selectDayPills([a, b], TODAY)
    expect(pills.map((p) => p.id)).toEqual(['b', 'a']) // planned ranks above completed
    expect(overflow).toBe(0)
  })

  it('caps at maxPills and reports the remainder as overflow', () => {
    const sessions = [
      makeSession({ id: 'a', state: 'completed' }),
      makeSession({ id: 'b', state: 'completed' }),
      makeSession({ id: 'c', state: 'active' }),
    ]
    const { pills, overflow } = selectDayPills(sessions, TODAY, 2)
    expect(pills).toHaveLength(2)
    expect(pills[0].id).toBe('c') // active sorts first
    expect(overflow).toBe(1)
  })

  it('orders active > planned > missed > completed', () => {
    const active = makeSession({ id: 'active', state: 'active' })
    const planned = makeSession({ id: 'planned', state: 'planned', date: '2026-08-25' })
    const missed = makeSession({ id: 'missed', state: 'planned', date: '2026-08-20' })
    const completed = makeSession({ id: 'completed', state: 'completed', date: '2026-08-20' })
    const { pills } = selectDayPills([completed, missed, planned, active], TODAY, 4)
    expect(pills.map((p) => p.id)).toEqual(['active', 'planned', 'missed', 'completed'])
  })

  it('returns empty pills and zero overflow for no sessions', () => {
    expect(selectDayPills([], TODAY)).toEqual({ pills: [], overflow: 0 })
  })
})

describe('fmtPillDuration', () => {
  it('rounds down to whole hours when >= 1h', () => {
    expect(fmtPillDuration('2026-08-20T10:00:00Z', '2026-08-20T12:30:00Z')).toBe('2h')
  })

  it('shows minutes when under 1h', () => {
    expect(fmtPillDuration('2026-08-20T10:00:00Z', '2026-08-20T10:45:00Z')).toBe('45m')
  })

  it('returns an em dash when either timestamp is missing', () => {
    expect(fmtPillDuration(undefined, '2026-08-20T10:45:00Z')).toBe('—')
    expect(fmtPillDuration('2026-08-20T10:00:00Z', undefined)).toBe('—')
  })
})

describe('pillLabel', () => {
  it('formats a completed session with truncated location and duration', () => {
    const s = makeSession({
      location: 'Levallois Gym',
      state: 'completed',
      date: '2026-08-20',
      started_at: '2026-08-20T10:00:00Z',
      ended_at: '2026-08-20T12:00:00Z',
    })
    expect(pillLabel(s, TODAY)).toBe('Levall· 2h')
  })

  it('formats a planned session', () => {
    const s = makeSession({ location: 'Levallois Gym', state: 'planned', date: '2026-08-25' })
    expect(pillLabel(s, TODAY)).toBe('Levall· Plan')
  })

  it('formats an active session', () => {
    const s = makeSession({ location: 'Levallois Gym', state: 'active' })
    expect(pillLabel(s, TODAY)).toBe('Levall· Live')
  })

  it('formats a missed (past-dated planned) session', () => {
    const s = makeSession({ location: 'Levallois Gym', state: 'planned', date: '2026-08-20' })
    expect(pillLabel(s, TODAY)).toBe('Levall· Miss')
  })

  it('truncates a short location without padding', () => {
    const s = makeSession({ location: 'YMCA', state: 'active' })
    expect(pillLabel(s, TODAY)).toBe('YMCA· Live')
  })
})
