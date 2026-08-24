import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton, Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'

const PLAYERS = [
  { id: '1', nickname: 'JC',    color: '#FF5A1F', rank: 1 },
  { id: '3', nickname: 'Dre',   color: '#22C55E', rank: 2 },
  { id: '2', nickname: 'Marcus',color: '#3B82F6', rank: 3 },
  { id: '5', nickname: 'Tomas', color: '#A855F7', rank: 4 },
  { id: '4', nickname: 'Sef',   color: '#EAB308', rank: 5 },
]

const SPOT_LABEL = 'Left Wing'

export default function BanksPage() {
  const nav = useNavigate()
  const [margin, setMargin] = useState(7)

  const rankBadgeStyle = (i: number): React.CSSProperties => {
    if (i === 0) return { background: 'var(--orange)', color: '#fff' }
    if (i === 1) return { background: 'rgba(255,255,255,0.1)', color: 'var(--dim)' }
    return { background: 'var(--panel-2)', color: 'var(--faint)' }
  }

  const rankBorderStyle = (i: number): React.CSSProperties => {
    if (i === 0) return { borderLeft: '3px solid var(--orange)' }
    return { borderLeft: '1px solid var(--line)' }
  }

  return (
    <div className="min-h-dvh px-[18px] pt-[54px] pb-28">
      <BackButton onClick={() => nav('/activity/setup')}>Setup</BackButton>

      {/* Hero gradient header */}
      <div style={{
        background: 'var(--hero-gradient)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--r-lg)',
        padding: '16px 18px',
        marginBottom: 20,
        marginTop: 16,
      }}>
        <p style={{ fontSize: 11, color: 'var(--hero-eyebrow)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>Banks · {SPOT_LABEL}</p>
        <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 20 }}>Result</div>
      </div>

      <p className="text-[var(--dim)] text-[13px] mb-4">Drag to set elimination order — last standing on top.</p>

      <div className="space-y-2 stagger">
        {PLAYERS.map((p, i) => {
          const isWinner = i === 0
          const isLast = i === PLAYERS.length - 1
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 p-[13px_14px]"
              style={{
                borderRadius: 'var(--r-md)',
                background: 'var(--panel-2)',
                border: '1px solid var(--line)',
                ...rankBorderStyle(i),
              }}
            >
              {/* Rank badge */}
              <span
                className="font-display text-[13px] w-[26px] h-[26px] flex items-center justify-center flex-shrink-0"
                style={{
                  borderRadius: 'var(--r-sm)',
                  fontWeight: 800,
                  ...rankBadgeStyle(i),
                }}
              >
                {i + 1}
              </span>
              <Avatar nickname={p.nickname} color={p.color} />
              <div>
                <div className="font-bold text-[14px]">{p.nickname}</div>
                {(isWinner || isLast) && (
                  <div className="text-[12px] mt-0.5" style={{ color: isWinner ? 'var(--orange)' : 'var(--red)' }}>
                    {isWinner ? 'Winner' : 'Out first'}
                  </div>
                )}
              </div>
              <div className="ml-auto text-[18px] tracking-[-3px] cursor-grab" style={{ color: 'var(--faint)' }}>⠿⠿</div>
            </div>
          )
        })}
      </div>

      {/* Winner margin */}
      <div
        className="flex items-center justify-between p-4 mt-3"
        style={{ borderRadius: 'var(--r-md)', background: 'var(--panel)', border: '1px solid var(--line)' }}
      >
        <span className="text-[13px] text-[var(--dim)]">Winner's final margin</span>
        <div
          className="flex items-center justify-between p-1.5 w-[130px]"
          style={{ borderRadius: 'var(--r-md)', background: 'var(--panel-2)', border: '1px solid var(--line)' }}
        >
          <button
            onClick={() => setMargin(m => Math.max(0, m - 1))}
            className="w-[44px] h-[44px] border-0 text-chalk text-[22px] font-bold cursor-pointer"
            style={{ borderRadius: 'var(--r-sm)', background: 'var(--panel-3)' }}
          >−</button>
          <span className="font-display text-[24px]">{margin}</span>
          <button
            onClick={() => setMargin(m => m + 1)}
            className="w-[44px] h-[44px] border-0 text-chalk text-[22px] font-bold cursor-pointer"
            style={{ borderRadius: 'var(--r-sm)', background: 'var(--panel-3)' }}
          >+</button>
        </div>
      </div>

      <div className="fixed bottom-[18px] left-[14px] right-[14px]">
        <Button variant="primary" onClick={() => nav('/match/recap')}>Save Result</Button>
      </div>
    </div>
  )
}
