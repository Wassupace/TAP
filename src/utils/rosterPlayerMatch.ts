import type { Player } from '../types'

/**
 * IDs of players whose nickname already appears in a nickname-based roster
 * (e.g. `sessionStore.players`). Used to pre-select rows in the
 * `PlayerPickerModal` for a roster that only tracks nicknames, not ids — a
 * best-effort match (exact string equality) given that data model's
 * limitation, not a robust identity resolution.
 */
export function idsMatchingRoster(players: Player[], roster: string[]): string[] {
  return players.filter(p => roster.includes(p.nickname)).map(p => p.id)
}

/**
 * Nicknames of the given players that are not yet present in a nickname-based
 * roster. Used after confirming the picker to know which newly selected
 * players actually need to be added — avoids pushing a duplicate nickname
 * for a player already on the roster.
 */
export function newNicknamesFor(selected: Player[], roster: string[]): string[] {
  return selected.filter(p => !roster.includes(p.nickname)).map(p => p.nickname)
}
