import { describe, it, expect } from 'vitest'
import { parseNumberPadDigits } from './parseNumberPadDigits'

describe('parseNumberPadDigits', () => {
  it('parses an empty string (no digits entered) to 0', () => {
    expect(parseNumberPadDigits('')).toBe(0)
  })

  it('parses a simple digit string', () => {
    expect(parseNumberPadDigits('7')).toBe(7)
  })

  it('parses a multi-digit string', () => {
    expect(parseNumberPadDigits('42')).toBe(42)
  })

  it('strips leading zeros', () => {
    expect(parseNumberPadDigits('007')).toBe(7)
  })

  it('parses an all-zero string to 0', () => {
    expect(parseNumberPadDigits('000')).toBe(0)
  })

  it('clamps to >= 0 (defensive, though digit input cannot produce negatives)', () => {
    expect(parseNumberPadDigits('-5')).toBe(0)
  })

  it('falls back to 0 for a non-numeric string', () => {
    expect(parseNumberPadDigits('abc')).toBe(0)
  })
})
