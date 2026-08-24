import { describe, it, expect } from 'vitest'
import { isMissed, pillState, selectDayPills, pillLabel } from './calendarPills'
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

describe('pillLabel', () => {
  // Review fix, round 1 (Finding 2): the grid pill's ~33px text area at
  // font-size:8px/font-weight:700 only budgets ~6-7 characters total (see
  // the derivation comment above LOCATION_CHARS in calendarPills.ts) — not
  // enough for "<loc>· <suffix>" (up to 12 chars). The fix drops the
  // separator and status suffix entirely; state is conveyed by pill
  // color alone (unaffected by this change). pillLabel now takes a raw
  // location string, not a Session, since state/date no longer factor into
  // the label at all.
  it('truncates a long location to 6 characters, no suffix', () => {
    expect(pillLabel('Levallois Gym')).toBe('Levall')
  })

  it('leaves a short location untouched, no padding', () => {
    expect(pillLabel('YMCA')).toBe('YMCA')
  })

  it('truncates at exactly 6 characters for a 6-character location', () => {
    expect(pillLabel('Neuill')).toBe('Neuill')
  })

  it('produces a label whose text fits the computed ~33px / ~6-7 char budget', () => {
    // 6 chars * ~4.8px (Archivo bold @ 8px, ~0.6em average glyph width) =
    // 28.8px, inside the ~33.14px content-area budget derived in
    // calendarPills.ts. The label must never exceed LOCATION_CHARS (6).
    const label = pillLabel('Wembley Arena')
    expect(label.length).toBeLessThanOrEqual(6)
    expect(label).toBe('Wemble')
  })
})
