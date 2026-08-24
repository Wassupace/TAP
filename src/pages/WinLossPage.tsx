import { useNavigate, useParams } from 'react-router-dom'
import { BackButton } from '../components/ui/Button'
import { usePlayer } from '../hooks/usePlayers'
import { usePlayerWLByFormat, usePlayerRecreationalRecord } from '../hooks/usePlayerStats'

// Accent colours per format for left-border tinting
const FORMAT_COLORS: Record<string, string> = {
  '1v1': '#FF5A1F',
  '2v2': '#3B82F6',
  '3v3': '#22C55E',
  '4v4': '#EAB308',
  '5v5': '#A855F7',
}

export default function WinLossPage() {
  const nav = useNavigate()
  const { id = '' } = useParams<{ id: string }>()

  const { data: player } = usePlayer(id)
  const { data: byFormatData } = usePlayerWLByFormat(id)
  const { data: recreational } = usePlayerRecreationalRecord(id)
  const byFormat = byFormatData ?? []

  const recWins = recreational?.wins ?? 0
  const recLosses = recreational?.losses ?? 0

  return (
    <div className="min-h-dvh px-[18px] pt-[54px] pb-8">
      <BackButton onClick={() => nav(`/players/${id}`)}>
        {player ? `${player.nickname}'s profile` : 'Profile'}
      </BackButton>

      {/* Hero gradient header */}
      <div style={{
        background: 'var(--hero-gradient)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--r-lg)',
        padding: '16px 18px', marginBottom: 20, marginTop: 16,
      }}>
        <p style={{ fontSize: 11, color: 'var(--hero-eyebrow)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>History</p>
        <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 20 }}>Match Record</div>
      </div>

      <div className="space-y-2.5 stagger">
        {byFormat.map(({ format, wins, losses }) => {
          const tot = wins + losses
          const pct = tot > 0 ? Math.round(wins / tot * 100) : 0
          const green = tot > 0 && pct >= 50
          const accentColor = FORMAT_COLORS[format] ?? 'var(--orange)'
          return (
            <div
              key={format}
              className="p-4 flex items-center gap-3.5"
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-lg)',
                borderLeft: `3px solid ${accentColor}`,
                paddingLeft: 14,
              }}
            >
              <div className="font-display text-[18px] w-12 shrink-0" style={{ color: accentColor }}>{format}</div>
              <div className="flex-1">
                <div className="stat-track">
                  <div className={`stat-fill ${green ? 'stat-fill-green' : 'stat-fill-red'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="text-right font-bold text-[14px] shrink-0">
                <span className="font-display">{wins}</span>–<span className="font-display">{losses}</span>{' '}
                <span className="text-[12px] text-[var(--dim)]">{pct}%</span>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mt-6 mb-3">Recreational</p>
      <div
        className="p-4 flex justify-between items-center"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)',
          borderLeft: '3px solid var(--orange)',
          paddingLeft: 14,
        }}
      >
        <span className="text-[14px] text-[var(--dim)]">Banks · Next · Generic</span>
        <span className="font-display text-chalk">{recWins}–{recLosses}</span>
      </div>
    </div>
  )
}
