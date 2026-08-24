import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Icons } from '../components/ui/icons'
import { useSession } from '../hooks/useSessions'
import { useActivityFeed } from '../hooks/useActivityFeed'

function fmtDuration(startedAt: string | undefined | null, endedAt: string | undefined | null): string {
  if (!startedAt || !endedAt) return '—'
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

export default function SessionRecapPage() {
  const nav = useNavigate()
  const { id: sessionId = '' } = useParams()

  const { data: session } = useSession(sessionId)
  const { data: activities = [] } = useActivityFeed(sessionId || null)

  const duration = fmtDuration(session?.started_at, session?.ended_at)
  const dateStr = session?.date
    ? new Date(session.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })
    : '—'

  const matchActivities = activities.filter(a => a.activity_type === 'match')
  const drillActivities = activities.filter(a => a.activity_type === 'drill')

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="flex-1 overflow-y-auto no-scrollbar px-[18px] pt-[54px] pb-24 stagger">

        {/* Hero summary card */}
        <Card variant="hero" style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: 'var(--hero-eyebrow)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 6px' }}>
            Session Complete
          </p>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 28, letterSpacing: '-0.02em' }}>
            {duration}
          </div>
          <p style={{ fontSize: 13, color: 'var(--dim)', margin: '4px 0 0' }}>
            {session?.location ?? '—'} · {dateStr}
          </p>
        </Card>

        {/* Activity summary callouts */}
        {activities.length > 0 && (
          <Card variant="accent" style={{ marginBottom: 8 }}>
            <div className="flex gap-3">
              <div className="w-[42px] h-[42px] grid place-items-center flex-none" style={{ borderRadius: 'var(--r-sm)', background: 'var(--orange-soft)', color: 'var(--orange-2)' }}>
                <span className="w-[21px] h-[21px]">{Icons.ball}</span>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>Activities</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--chalk)', lineHeight: 1.35 }}>
                  {matchActivities.length > 0 && `${matchActivities.length} match${matchActivities.length > 1 ? 'es' : ''}`}
                  {matchActivities.length > 0 && drillActivities.length > 0 && ' · '}
                  {drillActivities.length > 0 && `${drillActivities.length} drill${drillActivities.length > 1 ? 's' : ''}`}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Per-activity detail */}
        {activities.map(a => (
          <Card key={a.id} variant="accent" style={{ marginBottom: 8 }}>
            <div className="flex gap-3">
              <div className="w-[42px] h-[42px] grid place-items-center flex-none" style={{ borderRadius: 'var(--r-sm)', background: 'var(--orange-soft)', color: 'var(--orange-2)' }}>
                <span className="w-[21px] h-[21px]">
                  {a.activity_type === 'match' ? Icons.ball : a.activity_type === 'drill' ? Icons.target : Icons.bolt}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>
                  {a.activity_type}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--chalk)', lineHeight: 1.35 }}>
                  {a.feed_summary ?? '—'}
                </div>
              </div>
            </div>
          </Card>
        ))}

        {activities.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 13, padding: '16px 0' }}>
            No logged activities for this session.
          </div>
        )}

        {/* Notes */}
        {session?.notes && (
          <div style={{ background: 'var(--panel)', borderLeft: '3px solid var(--orange)', borderRadius: 'var(--r-sm)', padding: '12px 16px', marginTop: 8 }}>
            <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 6px' }}>Notes</p>
            <p style={{ fontSize: 14, color: 'var(--dim)', fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>"{session.notes}"</p>
          </div>
        )}
      </div>

      <div className="absolute bottom-[18px] left-[14px] right-[14px]">
        <Button variant="primary" onClick={() => nav('/')}>Done</Button>
      </div>
    </div>
  )
}

