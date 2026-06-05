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

export default function BanksPage() {
  const nav = useNavigate()
  const [margin, setMargin] = useState(7)


  const rankColor = (i: number, total: number) => {
    if (i === 0) return 'var(--green)'
    if (i === total - 1) return 'var(--red)'
    return 'var(--orange-2)'
  }

  return (
    <div className="min-h-dvh px-[18px] pt-[54px] pb-28">
      <BackButton onClick={() => nav('/activity/setup')}>Setup</BackButton>
      <div className="flex items-center justify-between mt-4 mb-2">
        <span className="font-display text-[22px] uppercase tracking-[.02em]">Banks · Result</span>
      </div>
      <p className="text-[var(--dim)] text-[13px] mb-4">Drag to set elimination order — last standing on top.</p>

      <div className="space-y-2 stagger">
        {PLAYERS.map((p, i) => {
          const isWinner = i === 0
          const isLast = i === PLAYERS.length - 1
          const col = rankColor(i, PLAYERS.length)
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 p-[13px_14px] rounded-[14px]"
              style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}
            >
              <span className="font-display text-[18px] w-[26px] text-center" style={{ color: col }}>{i + 1}</span>
              <Avatar nickname={p.nickname} color={p.color} />
              <div>
                <div className="font-bold text-[14px]">{p.nickname}</div>
                {(isWinner || isLast) && <div className="text-[12px] mt-0.5" style={{ color: col }}>{isWinner ? 'Winner' : 'Out first'}</div>}
              </div>
              <div className="ml-auto text-[18px] tracking-[-3px] cursor-grab" style={{ color: 'var(--faint)' }}>⠿⠿</div>
            </div>
          )
        })}
      </div>

      {/* Winner margin */}
      <div className="flex items-center justify-between rounded-[14px] p-4 mt-3" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
        <span className="text-[13px] text-[var(--dim)]">Winner's final margin</span>
        <div className="flex items-center justify-between rounded-[14px] p-1.5 w-[130px]" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}>
          <button onClick={() => setMargin(m => Math.max(0, m - 1))} className="w-[44px] h-[44px] rounded-[10px] border-0 text-chalk text-[22px] font-bold cursor-pointer" style={{ background: 'var(--panel-3)' }}>−</button>
          <span className="font-display text-[24px]">{margin}</span>
          <button onClick={() => setMargin(m => m + 1)} className="w-[44px] h-[44px] rounded-[10px] border-0 text-chalk text-[22px] font-bold cursor-pointer" style={{ background: 'var(--panel-3)' }}>+</button>
        </div>
      </div>

      <div className="fixed bottom-[18px] left-[14px] right-[14px]">
        <Button variant="primary" onClick={() => nav('/match/recap')}>Save Result</Button>
      </div>
    </div>
  )
}
