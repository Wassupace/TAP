import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Icons } from '../components/ui/icons'

import { type ShotSpot, SPOT_LABELS } from '../types'

type SpotState = 'done' | 'active' | 'upcoming'

const SPOTS_EXAMPLE: { spot: ShotSpot; state: SpotState }[] = [
  { spot: 'left0', state: 'done' },
  { spot: 'center', state: 'active' },
  { spot: 'right45', state: 'upcoming' },
  { spot: 'right0', state: 'upcoming' },
]

const HEAT_HISTORY = [
  { h: 'H1', m: '8/10', p: '80%' },
  { h: 'H2', m: '6/10', p: '60%' },
  { h: 'H3', m: '9/10', p: '90%' },
]

export default function DrillPage() {
  const nav = useNavigate()
  const [makes, setMakes] = useState(7)
  const heatSize = 10
  const [toastVisible, setToastVisible] = useState(false)

  const changeMakes = (delta: number) => {
    setMakes(m => Math.max(0, Math.min(heatSize, m + delta)))
  }

  const saveHeat = () => {
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 1200)
    setMakes(0)
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="flex-1 overflow-y-auto no-scrollbar px-[18px] pt-[54px] pb-24">
        <button onClick={() => nav('/')} className="flex items-center gap-1.5 text-[var(--dim)] font-bold text-[13px] bg-transparent border-0 cursor-pointer mb-3">
          <span className="w-[18px] h-[18px]">{Icons.back}</span> Session
        </button>

        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-[19px] uppercase tracking-[.02em]">3PT Drill</span>
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold" style={{ background: 'rgba(34,197,94,.14)', color: 'var(--green)' }}>Solo</div>
        </div>

        {/* Spot queue */}
        <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">Spot Queue</p>
        <div className="flex gap-1.5 mb-5">
          {SPOTS_EXAMPLE.map(({ spot, state }) => (
            <div
              key={spot}
              className={`flex-1 text-center py-2.5 rounded-[11px] text-[12px] font-bold spot-${state}`}
            >
              {state === 'done' && '✓ '}{SPOT_LABELS[spot]}
            </div>
          ))}
        </div>

        {/* Makes counter */}
        <div className="rounded-[18px] p-6 text-center mb-5" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}>
          <p className="text-[11px] tracking-[.1em] uppercase text-[var(--faint)] font-bold mb-4">Center · JC shooting</p>
          <div className="text-[11px] tracking-[.1em] uppercase text-[var(--faint)] font-bold mb-3">MAKES THIS HEAT</div>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => changeMakes(-1)}
              className="w-[60px] h-[60px] rounded-full text-chalk text-[30px] font-bold cursor-pointer border"
              style={{ background: 'var(--panel-3)', borderColor: 'var(--line-2)' }}
            >−</button>
            <div>
              <span className="font-display text-[64px] leading-[.9]">{makes}</span>
              <span className="font-display text-[30px] text-[var(--faint)]">/{heatSize}</span>
            </div>
            <button
              onClick={() => changeMakes(1)}
              className="w-[60px] h-[60px] rounded-full text-[#0c0c0c] text-[30px] font-bold cursor-pointer border-0"
              style={{ background: 'var(--orange)' }}
            >+</button>
          </div>
        </div>

        {/* Heat history */}
        <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">Heats · Center</p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {HEAT_HISTORY.map(h => (
            <div key={h.h} className="flex-none rounded-[11px] p-[9px_13px] text-center" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
              <div className="text-[10px] text-[var(--faint)] font-bold">{h.h}</div>
              <div className="font-display text-[15px]">{h.m}</div>
              <div className="text-[11px]" style={{ color: 'var(--green)' }}>{h.p}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toastVisible && (
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 text-[#06210f] font-bold uppercase tracking-[.05em] text-[15px] rounded-[18px] px-[26px] py-4 toast-show" style={{ background: 'rgba(34,197,94,.95)', boxShadow: '0 16px 40px -10px rgba(34,197,94,.6)' }}>
          ✓ 10 makes — next spot
        </div>
      )}

      {/* Floating bar */}
      <div className="absolute bottom-[18px] left-[14px] right-[14px] flex gap-2.5">
        <Button variant="primary" className="flex-1 !min-h-[54px] !text-[14px]" onClick={saveHeat}>
          Save Heat & Next
        </Button>
        <Button variant="ghost" className="!flex-none !min-h-[54px] !text-[14px] !w-[110px]" onClick={() => nav('/drill/recap')}>
          End Drill
        </Button>
      </div>
    </div>
  )
}
