import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackButton, Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Icons } from '../components/ui/icons'
import { useSessionStore } from '../stores/sessionStore'
import { usePlayers } from '../hooks/usePlayers'
import { useSession, useActivateSession } from '../hooks/useSessions'
import { playerColor } from '../utils/playerColor'

export default function AttendancePage() {
  const nav = useNavigate()
  const { sessionId = '' } = useParams()
  const { setActiveSession } = useSessionStore()
  const activateSession = useActivateSession()

  const { data: session } = useSession(sessionId)
  const { data: allPlayers = [] } = usePlayers()

  // Determine expected players: if session has expected_player_ids, filter those first
  const expectedIds = new Set(session?.expected_player_ids ?? [])
  const expectedPlayers = expectedIds.size > 0
    ? allPlayers.filter((p) => expectedIds.has(p.id))
    : allPlayers

  const [checked, setChecked] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (expectedPlayers.length > 0) {
      setChecked(new Set(expectedPlayers.map((p) => p.id)))
    }
  }, [expectedPlayers.length])

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const open = async () => {
    const presentIds = [...checked]
    const presentPlayers = allPlayers.filter((p) => checked.has(p.id))
    const location = session?.location ?? 'Court'

    try {
      await activateSession.mutateAsync({ sessionId, presentPlayerIds: presentIds })
      setActiveSession(sessionId, location, presentPlayers.map((p) => p.nickname))
    } catch {
      setActiveSession(sessionId, location, presentPlayers.map((p) => p.nickname))
    }
    nav('/')
  }

  const location = session?.location ?? '—'
  const displayPlayers = expectedPlayers.length > 0 ? expectedPlayers : allPlayers

  return (
    <div className="min-h-dvh px-[18px] pt-[54px] pb-28">
      <BackButton onClick={() => nav('/calendar')}>Calendar</BackButton>

      <div className="flex items-center justify-between mt-4 mb-1">
        <span className="font-display text-[22px] uppercase tracking-[.02em]">Who's In?</span>
      </div>
      <p className="text-[var(--dim)] text-[13px] mb-4">{location} · review expected players, add walk-ins.</p>

      {allPlayers.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 13, padding: '30px 0' }}>
          No players in roster yet.{' '}
          <button onClick={() => nav('/players')} style={{ color: 'var(--orange-2)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Add players →</button>
        </div>
      )}

      <div className="space-y-2 stagger">
        {displayPlayers.map((p) => {
          const color = playerColor(p.id)
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className="w-full flex gap-3 items-center p-[13px_14px] cursor-pointer transition-all text-left"
              style={{
                background: 'var(--panel-2)',
                border: '1px solid var(--line)',
                borderLeft: checked.has(p.id) ? '3px solid var(--green)' : '1px solid var(--line)',
                borderRadius: 'var(--r-sm)',
              }}
            >
              <Avatar nickname={p.nickname} color={color} />
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
          )
        })}
      </div>

      <div className="fixed bottom-[18px] left-[14px] right-[14px]">
        <Button variant="primary" onClick={open} disabled={activateSession.isPending}>
          {activateSession.isPending ? 'Opening…' : `Open Session · ${checked.size} in`}
        </Button>
      </div>
    </div>
  )
}

