import { useNavigate } from 'react-router-dom'
import { BackButton } from '../components/ui/Button'

const DATA = [
  { f: '1v1', w: 5,  l: 2  },
  { f: '2v2', w: 9,  l: 4  },
  { f: '3v3', w: 18, l: 9  },
  { f: '4v4', w: 11, l: 6  },
  { f: '5v5', w: 4,  l: 2  },
]

export default function WinLossPage() {
  const nav = useNavigate()

  return (
    <div className="min-h-dvh px-[18px] pt-[54px] pb-8">
      <BackButton onClick={() => nav('/players/1')}>JC's profile</BackButton>
      <div className="flex items-center justify-between mt-4 mb-5">
        <span className="font-display text-[22px] uppercase tracking-[.02em]">Match Record</span>
      </div>

      <div className="space-y-2.5 stagger">
        {DATA.map(({ f, w, l }) => {
          const tot = w + l
          const pct = Math.round(w / tot * 100)
          const green = pct >= 50
          return (
            <div key={f} className="rounded-[18px] p-4 flex items-center gap-3.5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
              <div className="font-display text-[18px] w-12 shrink-0" style={{ color: 'var(--orange-2)' }}>{f}</div>
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
      <div className="rounded-[18px] p-4 flex justify-between items-center" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
        <span className="text-[14px] text-[var(--dim)]">Banks · Middies · Next</span>
        <span className="font-display text-chalk">22–14</span>
      </div>
    </div>
  )
}
