const PALETTE = [
  '#FF5A1F', // orange
  '#3B82F6', // blue
  '#22C55E', // green
  '#EAB308', // yellow
  '#A855F7', // purple
  '#EF4444', // red
  '#06B6D4', // cyan
  '#F97316', // amber
]

/** Deterministic color derived from player id. */
export function playerColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}
