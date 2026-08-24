/**
 * Pure logic for the Player Profile edit sheet (PRD §4.1): required-field
 * validation and the percent <-> stored-fraction conversion for the three
 * shooting-target inputs. Extracted so it's unit-testable without mounting
 * the bottom-sheet component (this repo has no component-test library).
 */

/**
 * Required-field check for Name/Nickname. Mirrors `PlayersPage.tsx`'s
 * `AddPlayerSheet` `canSave` pattern exactly: both fields must have
 * non-whitespace content.
 */
export function isPlayerEditValid(name: string, nickname: string): boolean {
  return name.trim().length > 0 && nickname.trim().length > 0
}

/**
 * Converts a stored 0-1 fraction (e.g. `target_ft_percent`) into the 0-100
 * value shown in a number input, for pre-filling the edit sheet.
 */
export function fractionToPercentInput(fraction: number): number {
  return Math.round(fraction * 100)
}

/**
 * Converts a 0-100 number-input value back into the stored 0-1 fraction on
 * save. Non-finite input (e.g. a cleared field) falls back to 0 rather than
 * saving `NaN`. The input is clamped to `[0, 100]` before dividing so the
 * result is always a valid `[0, 1]` fraction — the `min`/`max` attributes on
 * the `<input type="number">` are not natively enforced, so this is the only
 * guard against an out-of-range value (e.g. `500` or `-20`) reaching
 * Supabase.
 */
export function percentInputToFraction(percent: number): number {
  if (!Number.isFinite(percent)) return 0
  const clamped = Math.min(100, Math.max(0, percent))
  return clamped / 100
}
