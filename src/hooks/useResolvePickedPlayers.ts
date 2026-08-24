import { usePlayers } from './usePlayers'
import type { Player } from '../types'

/**
 * Resolves `PlayerPickerModal`-confirmed ids to full `Player` objects.
 *
 * The picker can confirm an id for a player that was just created in the
 * same interaction (via its "Add New Player" form). `useAddPlayer`'s
 * `onSuccess` only kicks off a `players` query invalidation — it doesn't
 * await the refetch — so the locally-cached player list can race ahead of
 * it: tapping Confirm right after adding a new player can land before the
 * cache has the new row. When every confirmed id already resolves against
 * the cached list, `resolveIds` returns it as-is; otherwise it explicitly
 * refetches and re-resolves against the fresh result, so the new player
 * isn't silently dropped.
 *
 * If the refetch itself fails (e.g. offline), `resolveIds` falls back to
 * whatever it could resolve from the stale cached list — consistent with
 * how the rest of this app degrades offline (see DrillPage's/MatchSetupPage's
 * handleStart) — rather than rejecting and leaving the caller to handle it.
 *
 * Extracted from three near-identical copies of this logic in
 * `DrillPage.tsx` and `DashboardPage.tsx` (final-review Finding D).
 */
export function useResolvePickedPlayers() {
  const { data: allPlayers = [], refetch } = usePlayers()

  async function resolveIds(ids: string[]): Promise<Player[]> {
    const resolved = allPlayers.filter(p => ids.includes(p.id))
    if (resolved.length === ids.length) {
      return resolved
    }
    try {
      const { data } = await refetch()
      return (data ?? []).filter(p => ids.includes(p.id))
    } catch {
      // Offline or refetch failed — fall back to the best-effort match
      // from the stale cached list rather than leaving the caller hanging
      // with an unhandled rejection.
      return resolved
    }
  }

  return { allPlayers, resolveIds }
}
