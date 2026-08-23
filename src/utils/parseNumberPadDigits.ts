/**
 * Parses the digit string typed into a `NumberPad` into a concrete number,
 * clamped to `>= 0`. An empty string (no digits entered yet) parses to `0`
 * rather than `NaN`, and leading zeros are stripped the way `parseInt`
 * naturally handles them (e.g. "007" -> 7).
 */
export function parseNumberPadDigits(digits: string): number {
  if (digits === '') return 0
  const n = parseInt(digits, 10)
  if (Number.isNaN(n)) return 0
  return Math.max(0, n)
}
