import type { Player } from '../types'

/**
 * Case-insensitive substring match against a player's nickname or full name.
 * Mirrors the filter predicate already used by `PlayersPage.tsx`'s roster search.
 */
export function matchesPlayerQuery(player: Player, query: string): boolean {
  const q = query.toLowerCase()
  return player.nickname.toLowerCase().includes(q) || player.name.toLowerCase().includes(q)
}
