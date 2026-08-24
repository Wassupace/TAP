import { useNavigate } from 'react-router-dom'
import { BackButton } from '../components/ui/Button'

const DATA = [
  { f: '1v1', w: 5,  l: 2  },
  { f: '2v2', w: 9,  l: 4  },
  { f: '3v3', w: 18, l: 9  },
  { f: '4v4', w: 11, l: 6  },
  { f: '5v5', w: 4,  l: 2  },
]

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

  return (
    <div className="min-h-dvh px-[18px] pt-[54px] pb-8">
      <BackButton onClick={() => nav('/players/1')}>JC's profile</BackButton>

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
        {DATA.map(({ f, w, l }) => {
          const tot = w + l
          const pct = Math.round(w / tot * 100)
          const green = pct >= 50
          const accentColor = FORMAT_COLORS[f] ?? 'var(--orange)'
          return (
            <div
              key={f}
              className="p-4 flex items-center gap-3.5"
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-lg)',
                borderLeft: `3px solid ${accentColor}`,
                paddingLeft: 14,
              }}
            >
              <div className="font-display text-[18px] w-12 shrink-0" style={{ color: accentColor }}>{f}</div>
              <div className="flex-1">
                <div className="stat-track">
                  <div className={`stat-fill ${green ? 'stat-fill-green' : 'stat-fill-red'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="text-right font-bold text-[14px] shrink-0">
                <span className="font-display">{w}</span>–<span className="font-display">{l}</span>{' '}
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
        <span className="text-[14px] text-[var(--dim)]">Banks · Middies · Next</span>
        <span className="font-display text-chalk">22–14</span>
      </div>
    </div>
  )
}
