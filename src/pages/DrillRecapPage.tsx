import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Icons } from '../components/ui/icons'
import { useDrillStore } from '../stores/drillStore'
import { useSessionStore } from '../stores/sessionStore'
import { useLogActivity } from '../hooks/useActivityFeed'
import { SPOT_LABELS } from '../types'

const CALLOUT_ACCENT: Record<string, string> = {
  'Spot best': 'var(--green)',
  'Spot to work': 'var(--red)',
}

function calloutAccent(label: string): string {
  return CALLOUT_ACCENT[label] ?? 'var(--orange)'
}

function pct(makes: number, attempts: number): number {
  return attempts > 0 ? Math.round((makes / attempts) * 100) : 0
}

export default function DrillRecapPage() {
  const nav = useNavigate()
  const { completedHeats, drillId, shotType, hand, selectedSpots, players, reset } = useDrillStore()
  const { activeSessionId } = useSessionStore()
  const logActivity = useLogActivity()

  const totalMakes    = completedHeats.reduce((s, h) => s + h.makes, 0)
  const totalAttempts = completedHeats.reduce((s, h) => s + h.attempts, 0)
  const totalPct      = pct(totalMakes, totalAttempts)

  // Per-spot aggregates (across every player)
  const spotMap = new Map<string, { makes: number; attempts: number }>()
  for (const h of completedHeats) {
    const key = h.spot ?? 'center'
    const existing = spotMap.get(key) ?? { makes: 0, attempts: 0 }
    spotMap.set(key, { makes: existing.makes + h.makes, attempts: existing.attempts + h.attempts })
  }

  const spotEntries = [...spotMap.entries()].map(([spot, { makes, attempts }]) => ({
    spot, makes, attempts, pct: attempts > 0 ? makes / attempts : 0,
  }))
  const best  = spotEntries.reduce<typeof spotEntries[0] | null>((b, s) => !b || s.pct > b.pct ? s : b, null)
  const worst = spotEntries.reduce<typeof spotEntries[0] | null>((b, s) => !b || s.pct < b.pct ? s : b, null)
  // Efficiency (PRD §7.5): the spot with the most raw makes — a volume
  // signal distinct from Spot best's percentage (a 100%-on-2-attempts spot
  // isn't necessarily the one carrying the session).
  const mostMakes = spotEntries.reduce<typeof spotEntries[0] | null>((b, s) => !b || s.makes > b.makes ? s : b, null)

  // Heat trend (PRD §7.5): the chronological makes-per-heat sequence for the
  // whole drill, with a simple first-half-vs-second-half trend descriptor —
  // "richer than raw percentage alone" per §7.2.
  const heatSequence = completedHeats.map(h => h.makes)
  let trendLabel = 'steady'
  if (heatSequence.length >= 2) {
    const mid = Math.ceil(heatSequence.length / 2)
    const firstHalf = heatSequence.slice(0, mid)
    const secondHalf = heatSequence.slice(mid)
    const avg = (arr: number[]) => arr.reduce((s, n) => s + n, 0) / arr.length
    const delta = avg(secondHalf) - avg(firstHalf)
    trendLabel = delta > 0.5 ? 'strong finish' : delta < -0.5 ? 'cooled off' : 'steady'
  }

  type Callout = { icon: React.ReactNode; label: string; value: string }
  const callouts: Callout[] = [
    { icon: Icons.target, label: 'Session total', value: `${totalAttempts} shots · ${totalMakes} makes (${totalPct}%) — ${hand} hand` },
    best && best !== worst ? { icon: Icons.flame, label: 'Spot best', value: `${SPOT_LABELS[best.spot as keyof typeof SPOT_LABELS] ?? best.spot} — ${Math.round(best.pct * 100)}%` } : null,
    worst && best !== worst ? { icon: Icons.bolt, label: 'Spot to work', value: `${SPOT_LABELS[worst.spot as keyof typeof SPOT_LABELS] ?? worst.spot} — ${Math.round(worst.pct * 100)}%` } : null,
    mostMakes && spotEntries.length > 1 ? { icon: Icons.bolt, label: 'Efficiency', value: `${SPOT_LABELS[mostMakes.spot as keyof typeof SPOT_LABELS] ?? mostMakes.spot}: ${mostMakes.makes} makes in ${mostMakes.attempts} attempts` } : null,
    heatSequence.length >= 2 ? { icon: Icons.clock, label: 'Heat trend', value: `${heatSequence.join(', ')} — ${trendLabel}` } : null,
  ].filter(Boolean) as Callout[]

  // Full breakdown table (PRD §7.5) — rows = players, columns = spots
  // selected for this drill, each cell the heat-by-heat sequence for that
  // player at that spot, plus a totals row/column.
  function heatsFor(playerId: string, spot: string) {
    return completedHeats.filter(h => h.playerId === playerId && (h.spot ?? 'center') === spot)
  }
  function aggregate(heats: typeof completedHeats) {
    const makes = heats.reduce((s, h) => s + h.makes, 0)
    const attempts = heats.reduce((s, h) => s + h.attempts, 0)
    return { makes, attempts, pct: pct(makes, attempts) }
  }
  const playerTotal = (playerId: string) => aggregate(completedHeats.filter(h => h.playerId === playerId))

  async function handleDone() {
    if (activeSessionId) {
      logActivity.mutate({
        session_id: activeSessionId,
        activity_type: 'drill',
        reference_id: drillId ?? '',
        feed_summary: `${shotType} · ${selectedSpots.length} spot${selectedSpots.length !== 1 ? 's' : ''} · ${totalAttempts} att · ${totalPct}%`,
      })
    }
    reset()
    nav('/')
  }

  const subtitle = `${shotType} · ${selectedSpots.length} spot${selectedSpots.length !== 1 ? 's' : ''}`

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 stagger">
        {/* Hero gradient header */}
        <div
          className="px-[18px] pt-[54px] pb-8 text-center"
          style={{ background: 'var(--hero-gradient)' }}
        >
          <div className="inline-grid place-items-center w-16 h-16 rounded-full mb-2" style={{ background: 'rgba(34,197,94,.16)', color: 'var(--green)' }}>
            <span className="w-6 h-6">{Icons.target}</span>
          </div>
          <div className="font-display text-[26px] uppercase">Drill Complete</div>
          <p className="text-[var(--dim)] text-[13px] mt-1">{subtitle}</p>
        </div>

        <div className="px-[18px] pt-5">
          {callouts.map(c => (
            <div
              key={c.label}
              className="flex gap-3 p-[15px] mb-2.5"
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-md)',
                borderLeft: `3px solid ${calloutAccent(c.label)}`,
              }}
            >
              <div className="w-[42px] h-[42px] grid place-items-center flex-none" style={{ background: 'var(--orange-soft)', color: 'var(--orange-2)', borderRadius: 'var(--r-sm)' }}>
                <span className="w-[21px] h-[21px]">{c.icon}</span>
              </div>
              <div>
                <div className="text-[11px] tracking-[.12em] uppercase font-bold mb-1" style={{ color: 'var(--orange-2)' }}>{c.label}</div>
                <div className="text-[15px] font-semibold leading-[1.35]">{c.value}</div>
              </div>
            </div>
          ))}

          {/* Full breakdown table — always shown below the callouts */}
          {players.length > 0 && selectedSpots.length > 0 && (
            <>
              <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mt-4 mb-2">Breakdown</p>
              <div className="overflow-x-auto no-scrollbar" style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: 'var(--panel-2)' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>Player</th>
                      {selectedSpots.map(spot => (
                        <th key={spot} style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>
                          {SPOT_LABELS[spot]}
                        </th>
                      ))}
                      <th style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--orange-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map(p => {
                      const total = playerTotal(p.id)
                      return (
                        <tr key={p.id} style={{ borderTop: '1px solid var(--line)' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 700, whiteSpace: 'nowrap' }}>{p.nickname || p.name}</td>
                          {selectedSpots.map(spot => {
                            const heats = heatsFor(p.id, spot)
                            const cell = aggregate(heats)
                            return (
                              <td key={spot} style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--dim)' }}>
                                {heats.length > 0 ? (
                                  <>
                                    <div style={{ whiteSpace: 'nowrap' }}>{heats.map(h => `${h.makes}/${h.attempts}`).join(' · ')}</div>
                                    <div style={{ fontWeight: 700, color: 'var(--chalk)', marginTop: 2 }}>{cell.makes}/{cell.attempts} · {cell.pct}%</div>
                                  </>
                                ) : '—'}
                              </td>
                            )
                          })}
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--orange-2)' }}>
                            {total.makes}/{total.attempts} · {total.pct}%
                          </td>
                        </tr>
                      )
                    })}
                    <tr style={{ borderTop: '2px solid var(--line-2)', background: 'var(--panel-2)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 800, textTransform: 'uppercase', fontSize: 10, letterSpacing: '.06em', color: 'var(--faint)' }}>Total</td>
                      {selectedSpots.map(spot => {
                        const agg = spotMap.get(spot) ?? { makes: 0, attempts: 0 }
                        return (
                          <td key={spot} style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>
                            {agg.makes}/{agg.attempts} · {pct(agg.makes, agg.attempts)}%
                          </td>
                        )
                      })}
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: 'var(--orange-2)' }}>
                        {totalMakes}/{totalAttempts} · {totalPct}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="absolute bottom-[18px] left-[14px] right-[14px]">
        <Button variant="primary" onClick={handleDone}>Back to Session</Button>
      </div>
    </div>
  )
}

