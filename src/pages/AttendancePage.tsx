import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton, Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Icons } from '../components/ui/icons'
import { useSessionStore } from '../stores/sessionStore'

const MOCK_PLAYERS = [
  { id: '1', nickname: 'JC',    name: 'Jordan C.',  color: '#FF5A1F' },
  { id: '2', nickname: 'Marcus',name: 'Marcus T.',  color: '#3B82F6' },
  { id: '3', nickname: 'Dre',   name: 'Andre P.',   color: '#22C55E' },
  { id: '4', nickname: 'Sef',   name: 'Yousef K.',  color: '#EAB308' },
  { id: '5', nickname: 'Tomas', name: 'Tomas R.',   color: '#A855F7' },
  { id: '6', nickname: 'Leo',   name: 'Leo M.',     color: '#EF4444' },
]

export default function AttendancePage() {
  const nav = useNavigate()
  const { setActiveSession } = useSessionStore()
  const [checked, setChecked] = useState<Set<string>>(new Set(MOCK_PLAYERS.slice(0, 5).map(p => p.id)))

  const toggle = (id: string) => setChecked(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const open = () => {
    setActiveSession('mock-session-1', 'Levallois Gym')
    nav('/')
  }

  return (
    <div className="min-h-dvh px-[18px] pt-[54px] pb-28">
      <BackButton onClick={() => nav('/calendar')}>Calendar</BackButton>

      <div className="flex items-center justify-between mt-4 mb-1">
        <span className="font-display text-[22px] uppercase tracking-[.02em]">Who's In?</span>
      </div>
      <p className="text-[var(--dim)] text-[13px] mb-4">Levallois Gym · review expected players, add walk-ins.</p>

      <div className="space-y-2 stagger">
        {MOCK_PLAYERS.map(p => (
          <button
            key={p.id}
            onClick={() => toggle(p.id)}
            className="w-full flex gap-3 items-center p-[13px_14px] rounded-[12px] cursor-pointer transition-all text-left"
            style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}
          >
            <Avatar nickname={p.nickname} color={p.color} />
            <div className="flex-1">
              <div className="font-bold text-[14px]">{p.nickname}</div>
              <div className="text-[12px] text-[var(--dim)]">{p.name}</div>
            </div>
            <div
              className="w-[30px] h-[30px] rounded-full grid place-items-center flex-none"
              style={{
                background: checked.has(p.id) ? 'var(--green)' : 'var(--panel-3)',
                color: checked.has(p.id) ? '#06210f' : 'var(--faint)',
              }}
            >
              {checked.has(p.id) ? <span className="w-4 h-4">{Icons.check}</span> : <span className="w-4 h-4">{Icons.plus}</span>}
            </div>
          </button>
        ))}

        <button className="w-full flex gap-3 items-center p-[13px_14px] rounded-[12px] cursor-pointer" style={{ background: 'var(--panel)', border: '1px dashed var(--line-2)' }}>
          <span className="w-5 h-5 text-[var(--faint)]">{Icons.plus}</span>
          <span className="text-[14px] text-[var(--dim)]">Add walk-in</span>
        </button>
      </div>

      <div className="fixed bottom-[18px] left-[14px] right-[14px]">
        <Button variant="primary" onClick={open}>
          Open Session · {checked.size} in
        </Button>
      </div>
    </div>
  )
}
