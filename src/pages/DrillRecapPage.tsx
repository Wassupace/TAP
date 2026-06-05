import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Icons } from '../components/ui/icons'
import { useDrillStore } from '../stores/drillStore'
import { useSessionStore } from '../stores/sessionStore'
import { useLogActivity } from '../hooks/useActivityFeed'

const CALLOUT_ACCENT: Record<string, string> = {
  'Best spot': 'var(--green)',
  'Spot to watch': 'var(--red)',
}

function calloutAccent(label: string): string {
  return CALLOUT_ACCENT[label] ?? 'var(--orange)'
}

export default function DrillRecapPage() {
  const nav = useNavigate()
  const { completedHeats, drillId, shotType, selectedSpots, reset } = useDrillStore()
  const { activeSessionId } = useSessionStore()
  const logActivity = useLogActivity()

  const totalMakes    = completedHeats.reduce((s, h) => s + h.makes, 0)
  const totalAttempts = completedHeats.reduce((s, h) => s + h.attempts, 0)
  const totalPct      = totalAttempts > 0 ? Math.round((totalMakes / totalAttempts) * 100) : 0

  // Per-spot aggregates
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

  type Callout = { icon: React.ReactNode; label: string; value: string }
  const callouts: Callout[] = [
    { icon: Icons.target, label: 'Session total', value: `${totalAttempts} attempts · ${totalMakes} makes (${totalPct}%)` },
    best && best !== worst ? { icon: Icons.flame, label: 'Best spot', value: `${best.spot} — ${Math.round(best.pct * 100)}%` } : null,
    worst && best !== worst ? { icon: Icons.bolt, label: 'Spot to watch', value: `${worst.spot} — ${Math.round(worst.pct * 100)}%` } : null,
  ].filter(Boolean) as Callout[]

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
        </div>
      </div>

      <div className="absolute bottom-[18px] left-[14px] right-[14px]">
        <Button variant="primary" onClick={handleDone}>Back to Session</Button>
      </div>
    </div>
  )
}

