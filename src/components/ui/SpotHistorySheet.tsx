import { Card } from './Card'
import { useSpotHistory, type HandFilter } from '../../hooks/useSpotHistory'
import { formatHeatSequence } from '../../utils/spotHistory'
import { SPOT_LABELS, type ShotSpot } from '../../types'

interface SpotHistorySheetProps {
  playerId: string
  spot: ShotSpot
  handMode: HandFilter
  onClose: () => void
}

const HAND_FILTER_LABEL: Record<HandFilter, string> = {
  all: 'All Hands',
  left: 'Left Hand',
  right: 'Right Hand',
}

function formatDrillDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

/**
 * Task 11 (PRD §4.4): opened by tapping a mid-range or three-point zone in
 * `ShotChart.tsx` — both zones for the same spot (e.g. the mid and three
 * zone that make up "Top of Key") open this same sheet scoped to that
 * spot. Same bottom-sheet shell as `PlayerPickerModal`/`EditPlayerSheet`
 * (backdrop `rgba(0,0,0,.75)` + `blur(6px)`, `var(--r-lg) var(--r-lg) 0 0`,
 * `padding: 24px 18px 40px`, `maxHeight: 85dvh`), stacked above
 * `ShotChart`'s own `z-[70]` overlay.
 */
export function SpotHistorySheet({ playerId, spot, handMode, onClose }: SpotHistorySheetProps) {
  const { data: rows, isPending, isError } = useSpotHistory(playerId, spot, handMode)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: 'var(--panel)',
          borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
          padding: '24px 18px 40px',
          maxHeight: '85dvh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--chalk)' }}>
              {SPOT_LABELS[spot]} History
            </div>
            <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginTop: 2 }}>
              {HAND_FILTER_LABEL[handMode]}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center',
              background: 'var(--panel-2)', border: '1px solid var(--line-2)', color: 'var(--faint)',
              fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: 0, flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Drill rows */}
        <div style={{ flex: 1, overflowY: 'auto', marginTop: 16 }}>
          {isPending && (
            <div style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 13, padding: '30px 0' }}>
              Loading history…
            </div>
          )}

          {!isPending && isError && (
            <div style={{ textAlign: 'center', color: 'var(--red)', fontSize: 13, padding: '30px 0' }}>
              Could not load history. Check your Supabase connection.
            </div>
          )}

          {!isPending && !isError && rows.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 13, padding: '30px 0' }}>
              No history yet for this spot.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map(row => {
              const pct = row.attempts > 0 ? Math.round((row.makes / row.attempts) * 100) : 0
              return (
                <Card key={row.drillId} variant="accent">
                  <div className="flex items-baseline justify-between">
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--chalk)' }}>
                      {formatDrillDate(row.date)}{row.location ? ` · ${row.location}` : ''}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--orange-2)' }}>
                      {row.makes}/{row.attempts} · {pct}%
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 6 }}>
                    {formatHeatSequence(row.heats)}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
