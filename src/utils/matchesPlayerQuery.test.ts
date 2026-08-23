import { describe, it, expect } from 'vitest'
import { matchesPlayerQuery } from './matchesPlayerQuery'
import type { Player } from '../types'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Jordan Carter',
    nickname: 'JC',
    target_ft_percent: 0.75,
    target_mid_percent: 0.5,
    target_3pt_percent: 0.4,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('matchesPlayerQuery', () => {
  it('matches on nickname substring, case-insensitively', () => {
    const player = makePlayer({ nickname: 'JC', name: 'Someone Else' })
    expect(matchesPlayerQuery(player, 'jc')).toBe(true)
  })

  it('matches on full name substring, case-insensitively', () => {
    const player = makePlayer({ nickname: 'XX', name: 'Jordan Carter' })
    expect(matchesPlayerQuery(player, 'CARTER')).toBe(true)
  })

  it('matches a substring in the middle of the name', () => {
    const player = makePlayer({ nickname: 'XX', name: 'Jordan Carter' })
    expect(matchesPlayerQuery(player, 'dan car')).toBe(true)
  })

  it('returns false when the query matches neither field', () => {
    const player = makePlayer({ nickname: 'JC', name: 'Jordan Carter' })
    expect(matchesPlayerQuery(player, 'xyz')).toBe(false)
  })

  it('matches everything on an empty query', () => {
    expect(matchesPlayerQuery(makePlayer(), '')).toBe(true)
  })

  it('is insensitive to query case when the field is mixed-case', () => {
    const player = makePlayer({ nickname: 'MvP', name: 'Mister Valuable Player' })
    expect(matchesPlayerQuery(player, 'mvp')).toBe(true)
  })
})
