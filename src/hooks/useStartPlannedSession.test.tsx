import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Player, Session } from '../types'

// ── Mock every lower-level hook this composes, so the test doesn't need a
// real react-query provider, a real Zustand store, or a real Router — same
// convention as src/hooks/useResolvePickedPlayers.test.tsx. ─────────────────
const mockMutateAsync = vi.fn()
let mockIsPending = false
vi.mock('./useSessions', () => ({
  useActivateSession: () => ({ mutateAsync: mockMutateAsync, isPending: mockIsPending }),
}))

let mockPlayers: Player[] = []
let mockPlayersLoading = false
vi.mock('./usePlayers', () => ({
  usePlayers: () => ({ data: mockPlayers, isLoading: mockPlayersLoading }),
}))

const mockSetActiveSession = vi.fn()
vi.mock('../stores/sessionStore', () => ({
  useSessionStore: () => ({ setActiveSession: mockSetActiveSession }),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

import { useStartPlannedSession } from './useStartPlannedSession'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Jordan Carter',
    nickname: 'JC',
    target_ft_percent: 0.75,
    target_mid_percent: 0.5,
    target_3pt_percent: 0.4,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'sess-1',
    date: '2026-08-24',
    location: 'Levallois Gym',
    state: 'planned',
    is_recurring: false,
    expected_player_ids: [],
    ...overrides,
  }
}

const PLAYER_A = makePlayer({ id: 'player-a', nickname: 'Ace' })
const PLAYER_B = makePlayer({ id: 'player-b', nickname: 'Bee' })

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.clearAllMocks()
  mockIsPending = false
  mockPlayers = []
  mockPlayersLoading = false
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function mountHook(): () => ReturnType<typeof useStartPlannedSession> {
  let captured: ReturnType<typeof useStartPlannedSession> | null = null
  function Harness() {
    captured = useStartPlannedSession()
    return null
  }
  act(() => {
    root.render(<Harness />)
  })
  return () => captured!
}

describe('useStartPlannedSession', () => {
  it('activates the session with its full expected roster, resolves nicknames, and navigates home', async () => {
    mockPlayers = [PLAYER_A, PLAYER_B]
    mockMutateAsync.mockResolvedValue(undefined)
    const session = makeSession({ expected_player_ids: [PLAYER_A.id, PLAYER_B.id] })
    const getHook = mountHook()

    await act(async () => {
      await getHook().start(session)
    })

    expect(mockMutateAsync).toHaveBeenCalledWith({
      sessionId: session.id,
      presentPlayerIds: [PLAYER_A.id, PLAYER_B.id],
    })
    expect(mockSetActiveSession).toHaveBeenCalledWith(session.id, session.location, ['Ace', 'Bee'])
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('still flips the local session active and navigates home when the activate write fails (offline fallback)', async () => {
    mockPlayers = [PLAYER_A]
    mockMutateAsync.mockRejectedValue(new Error('offline'))
    const session = makeSession({ expected_player_ids: [PLAYER_A.id] })
    const getHook = mountHook()

    await act(async () => {
      await getHook().start(session)
    })

    expect(mockSetActiveSession).toHaveBeenCalledWith(session.id, session.location, ['Ace'])
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('passes through isPending and playersLoading from the underlying hooks', () => {
    mockIsPending = true
    mockPlayersLoading = true
    const getHook = mountHook()

    expect(getHook().isPending).toBe(true)
    expect(getHook().playersLoading).toBe(true)
  })
})
