import { describe, it, expect } from 'vitest'
import { isPlayerEditValid, fractionToPercentInput, percentInputToFraction } from './playerEditForm'

describe('isPlayerEditValid', () => {
  it('is valid when both name and nickname have content', () => {
    expect(isPlayerEditValid('Jordan Carter', 'JC')).toBe(true)
  })

  it('is invalid when name is empty', () => {
    expect(isPlayerEditValid('', 'JC')).toBe(false)
  })

  it('is invalid when nickname is empty', () => {
    expect(isPlayerEditValid('Jordan Carter', '')).toBe(false)
  })

  it('is invalid when either field is only whitespace', () => {
    expect(isPlayerEditValid('   ', 'JC')).toBe(false)
    expect(isPlayerEditValid('Jordan Carter', '   ')).toBe(false)
  })

  it('is invalid when both fields are empty', () => {
    expect(isPlayerEditValid('', '')).toBe(false)
  })
})

describe('fractionToPercentInput', () => {
  it('converts a stored fraction to a whole-number percent', () => {
    expect(fractionToPercentInput(0.75)).toBe(75)
    expect(fractionToPercentInput(0.5)).toBe(50)
    expect(fractionToPercentInput(0.4)).toBe(40)
  })

  it('rounds to the nearest whole percent', () => {
    expect(fractionToPercentInput(0.753)).toBe(75)
    expect(fractionToPercentInput(0.756)).toBe(76)
  })

  it('handles 0 and 1', () => {
    expect(fractionToPercentInput(0)).toBe(0)
    expect(fractionToPercentInput(1)).toBe(100)
  })
})

describe('percentInputToFraction', () => {
  it('converts a 0-100 percent value back to a stored fraction', () => {
    expect(percentInputToFraction(75)).toBe(0.75)
    expect(percentInputToFraction(50)).toBe(0.5)
    expect(percentInputToFraction(40)).toBe(0.4)
  })

  it('handles 0 and 100', () => {
    expect(percentInputToFraction(0)).toBe(0)
    expect(percentInputToFraction(100)).toBe(1)
  })

  it('falls back to 0 for non-finite input instead of saving NaN', () => {
    expect(percentInputToFraction(NaN)).toBe(0)
    expect(percentInputToFraction(Infinity)).toBe(0)
  })

  it('clamps values above 100 down to a fraction of 1', () => {
    expect(percentInputToFraction(500)).toBe(1)
    expect(percentInputToFraction(101)).toBe(1)
  })

  it('clamps negative values up to a fraction of 0', () => {
    expect(percentInputToFraction(-20)).toBe(0)
    expect(percentInputToFraction(-1)).toBe(0)
  })
})

describe('round-trip', () => {
  it('fractionToPercentInput then percentInputToFraction recovers the original for exact values', () => {
    for (const fraction of [0, 0.4, 0.5, 0.75, 1]) {
      expect(percentInputToFraction(fractionToPercentInput(fraction))).toBeCloseTo(fraction, 5)
    }
  })
})
