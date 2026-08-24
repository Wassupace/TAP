import { describe, it, expect } from 'vitest'
import { idsMatchingRoster, newNicknamesFor, noLongerSelectedNicknames } from './rosterPlayerMatch'
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

describe('idsMatchingRoster', () => {
  it('returns ids of players whose nickname is already in the roster', () => {
    const players = [
      makePlayer({ id: 'p1', nickname: 'JC' }),
      makePlayer({ id: 'p2', nickname: 'Bull' }),
      makePlayer({ id: 'p3', nickname: 'Zed' }),
    ]
    expect(idsMatchingRoster(players, ['Bull', 'Zed'])).toEqual(['p2', 'p3'])
  })

  it('returns an empty array when no nicknames match', () => {
    const players = [makePlayer({ id: 'p1', nickname: 'JC' })]
    expect(idsMatchingRoster(players, ['Someone Else'])).toEqual([])
  })

  it('is case-sensitive (best-effort, exact match only)', () => {
    const players = [makePlayer({ id: 'p1', nickname: 'JC' })]
    expect(idsMatchingRoster(players, ['jc'])).toEqual([])
  })

  it('returns an empty array for an empty roster', () => {
    const players = [makePlayer({ id: 'p1', nickname: 'JC' })]
    expect(idsMatchingRoster(players, [])).toEqual([])
  })
})

describe('newNicknamesFor', () => {
  it('returns nicknames of selected players not already in the roster', () => {
    const selected = [
      makePlayer({ id: 'p1', nickname: 'JC' }),
      makePlayer({ id: 'p2', nickname: 'Bull' }),
    ]
    expect(newNicknamesFor(selected, ['JC'])).toEqual(['Bull'])
  })

  it('returns an empty array when every selected nickname is already on the roster', () => {
    const selected = [makePlayer({ id: 'p1', nickname: 'JC' })]
    expect(newNicknamesFor(selected, ['JC'])).toEqual([])
  })

  it('returns all nicknames when the roster is empty', () => {
    const selected = [
      makePlayer({ id: 'p1', nickname: 'JC' }),
      makePlayer({ id: 'p2', nickname: 'Bull' }),
    ]
    expect(newNicknamesFor(selected, [])).toEqual(['JC', 'Bull'])
  })
})

describe('noLongerSelectedNicknames', () => {
  it('returns roster nicknames whose matching player id was unchecked', () => {
    const players = [
      makePlayer({ id: 'p1', nickname: 'JC' }),
      makePlayer({ id: 'p2', nickname: 'Bull' }),
      makePlayer({ id: 'p3', nickname: 'Zed' }),
    ]
    // 'JC' and 'Bull' are on court; the picker confirms only 'p1' (JC) —
    // 'Bull' (p2) was unchecked and should be flagged for removal.
    expect(noLongerSelectedNicknames(players, ['JC', 'Bull'], ['p1'])).toEqual(['Bull'])
  })

  it('returns an empty array when every roster nickname is still selected', () => {
    const players = [
      makePlayer({ id: 'p1', nickname: 'JC' }),
      makePlayer({ id: 'p2', nickname: 'Bull' }),
    ]
    expect(noLongerSelectedNicknames(players, ['JC', 'Bull'], ['p1', 'p2'])).toEqual([])
  })

  it('returns every roster nickname when the confirmed selection is empty', () => {
    const players = [
      makePlayer({ id: 'p1', nickname: 'JC' }),
      makePlayer({ id: 'p2', nickname: 'Bull' }),
    ]
    expect(noLongerSelectedNicknames(players, ['JC', 'Bull'], [])).toEqual(['JC', 'Bull'])
  })

  it('leaves a roster nickname with no matching player untouched', () => {
    const players = [makePlayer({ id: 'p1', nickname: 'JC' })]
    // 'Ghost' isn't in `players` (e.g. that player record was deleted) —
    // there's no id to check against `selectedIds`, so it's left alone
    // rather than guessed at.
    expect(noLongerSelectedNicknames(players, ['JC', 'Ghost'], [])).toEqual(['JC'])
  })

  it('returns an empty array for an empty roster', () => {
    const players = [makePlayer({ id: 'p1', nickname: 'JC' })]
    expect(noLongerSelectedNicknames(players, [], [])).toEqual([])
  })
})
