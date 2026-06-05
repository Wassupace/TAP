import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '../stores/sessionStore'
import { Icons } from '../components/ui/icons'
import { Avatar } from '../components/ui/Avatar'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { StatusDot } from '../components/ui/StatusDot'

const MOCK_PLAYERS = [
  { id: '1', nickname: 'JC',    color: '#FF5A1F' },
  { id: '2', nickname: 'Marcus',color: '#3B82F6' },
  { id: '3', nickname: 'Dre',   color: '#22C55E' },
  { id: '4', nickname: 'Sef',   color: '#EAB308' },
  { id: '5', nickname: 'Tomas', color: '#A855F7' },
  { id: '6', nickname: 'Leo',   color: '#EF4444' },
]

const MOCK_FEED = [
  { type: 'match', title: '3v3 Match',       summary: 'Team A won 4–1 · 6 games', time: '42m' },
  { type: 'drill', title: 'Free Throw Drill', summary: '100 shots · 82% · solo',  time: '18m' },
  { type: 'comp',  title: 'Banks',            summary: 'JC won by 7 · 5 players', time: '24m' },
  { type: 'match', title: '4v4 Match',        summary: 'Team B won 3–2 · 5 games',time: '38m' },
]

const FEED_CONFIG: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  match: { bg: 'var(--orange-soft)', color: 'var(--orange-2)', icon: <span style={{ width: 19, height: 19, display: 'flex' }}>{Icons.ball}</span> },
  drill: { bg: 'rgba(34,197,94,.14)', color: 'var(--green)',   icon: <span style={{ width: 19, height: 19, display: 'flex' }}>{Icons.target}</span> },
  comp:  { bg: 'rgba(59,130,246,.14)', color: 'var(--blue)',   icon: <span style={{ width: 19, height: 19, display: 'flex' }}>{Icons.trophy}</span> },
}

function fmt(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const S = {
  iconBtn: {
    width: 42, height: 42, borderRadius: 14, display: 'grid', placeItems: 'center' as const,
    background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--chalk)', cursor: 'pointer', flexShrink: 0,
  } as React.CSSProperties,
  eyebrow: {
    fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase' as const,
    color: 'var(--faint)', fontWeight: 700, margin: '0 0 8px',
  } as React.CSSProperties,
  card: {
    background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)',
  } as React.CSSProperties,
}

import React from 'react'

export default function DashboardPage() {
  const nav = useNavigate()
  const { activeSessionId, activeLocation, elapsedSeconds, tick, setActiveSession } = useSessionStore()

  useEffect(() => {
    if (!activeSessionId) return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeSessionId, tick])

  if (!activeSessionId) {
    return <IdleDashboard
      onStart={() => setActiveSession('mock-session-1', 'Levallois Gym')}
      onCalendar={() => nav('/calendar')}
      onPlayers={() => nav('/players')}
    />
  }

  return <ActiveDashboard location={activeLocation} elapsed={elapsedSeconds} />
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={20} height={20}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function IdleDashboard({ onStart, onCalendar, onPlayers }: { onStart: () => void; onCalendar: () => void; onPlayers: () => void }) {
  const nav = useNavigate()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', padding: '54px 18px 0' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={onPlayers} style={S.iconBtn}>
          <span style={{ width: 20, height: 20, display: 'flex' }}>{Icons.roster}</span>
        </button>
        <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.02em' }}>TAP</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCalendar} style={S.iconBtn}>
            <span style={{ width: 20, height: 20, display: 'flex' }}>{Icons.calendar}</span>
          </button>
          <button type="button" onClick={() => nav('/settings')} style={S.iconBtn}>
            <GearIcon />
          </button>
        </div>
      </div>

      {/* Centre */}
      <div className="stagger" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, textAlign: 'center', paddingBottom: 60 }}>
        <div style={{ width: 120, height: 120, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--orange-soft)', border: '1px solid rgba(255,90,31,.3)' }}>
          <span style={{ width: 56, height: 56, display: 'flex', color: 'var(--orange)' }}>{Icons.ball}</span>
        </div>

        <div>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 24, textTransform: 'uppercase' }}>No Active Session</div>
          <p style={{ color: 'var(--dim)', fontSize: 13, marginTop: 8, maxWidth: 240 }}>Start logging when you hit the court. Or open a planned session from the calendar.</p>
        </div>

        <button
          onClick={onStart}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexDirection: 'row',
            width: 280, minHeight: 72, borderRadius: 'var(--r-lg)', fontFamily: '"Archivo Expanded", Archivo, sans-serif',
            fontWeight: 800, fontSize: 18, letterSpacing: '.02em', textTransform: 'uppercase', cursor: 'pointer',
            border: 0, color: '#0c0c0c', background: 'linear-gradient(180deg,var(--orange-2),var(--orange))',
            boxShadow: '0 12px 28px -10px rgba(255,90,31,.7)',
          }}
        >
          <span style={{ width: 20, height: 20, display: 'flex' }}>{Icons.plus}</span>
          Start New Session
        </button>

        <button onClick={onCalendar} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--dim)', fontWeight: 700, fontSize: 13, background: 'none', border: 0, cursor: 'pointer' }}>
          <span style={{ width: 16, height: 16, display: 'flex' }}>{Icons.calendar}</span>
          View planned sessions
        </button>
      </div>
    </div>
  )
}

function ActiveDashboard({ location, elapsed }: { location: string; elapsed: number }) {
  const nav = useNavigate()
  const [showNotesModal, setShowNotesModal] = useState(false)
  const { clearActiveSession, notes, setNotes } = useSessionStore()
  const { status, pendingCount, lastSyncedAt } = useOnlineStatus()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '54px 18px 96px' }}>

        {/* Top icon row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={() => nav('/players')} style={S.iconBtn}>
            <span style={{ width: 20, height: 20, display: 'flex' }}>{Icons.roster}</span>
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => nav('/calendar')} style={S.iconBtn}>
              <span style={{ width: 20, height: 20, display: 'flex' }}>{Icons.calendar}</span>
            </button>
            <button type="button" onClick={() => nav('/settings')} style={S.iconBtn}>
              <GearIcon />
            </button>
          </div>
        </div>

        {/* Session header card */}
        <div className="stagger" style={{
          background: 'var(--hero-gradient)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 'var(--r-lg)', padding: '16px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <div>
            <p style={{ fontSize: 11, color: '#93C5FD', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>
              Active Session
            </p>
            <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 19 }}>
              {location}
            </div>
            <p style={{ fontSize: 11, color: 'var(--dim)', margin: '2px 0 0' }}>
              {fmt(elapsed)} elapsed
            </p>
          </div>
          <StatusDot status={status} pendingCount={pendingCount} lastSyncedAt={lastSyncedAt} />
        </div>

        {/* Action Hub — two large blocky buttons */}
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          {/* New Match — primary orange */}
          <button
            onClick={() => nav('/match/setup')}
            style={{
              minHeight: 72, borderRadius: 'var(--r-lg)', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 6, border: 0, cursor: 'pointer',
              fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800,
              fontSize: 16, letterSpacing: '.02em', textTransform: 'uppercase',
              color: '#0c0c0c', background: 'linear-gradient(180deg,var(--orange-2),var(--orange))',
              boxShadow: '0 12px 28px -10px rgba(255,90,31,.7)',
            }}
          >
            <span style={{ width: 24, height: 24, display: 'flex' }}>{Icons.ball}</span>
            <span>New Match</span>
          </button>

          {/* New Activity — ghost dark */}
          <button
            onClick={() => nav('/activity/setup')}
            style={{
              minHeight: 72, borderRadius: 'var(--r-lg)', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid var(--line-2)',
              cursor: 'pointer', fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800,
              fontSize: 16, letterSpacing: '.02em', textTransform: 'uppercase',
              color: 'var(--chalk)', background: 'var(--panel-2)',
            }}
          >
            <span style={{ width: 24, height: 24, display: 'flex' }}>{Icons.target}</span>
            <span>New Activity</span>
          </button>
        </div>

        {/* Shooting Drill — full-width secondary button */}
        <div className="stagger" style={{ marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => nav('/drill')}
            style={{
              width: '100%', minHeight: 50,
              borderRadius: 'var(--r-md)',
              display: 'flex', flexDirection: 'row',
              alignItems: 'center', justifyContent: 'center', gap: 8,
              border: '1px solid var(--line-2)',
              cursor: 'pointer',
              fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800,
              fontSize: 14, letterSpacing: '0.02em', textTransform: 'uppercase' as const,
              color: 'var(--chalk)', background: 'var(--panel-2)',
            }}
          >
            <span style={{ width: 18, height: 18, display: 'flex' }}>{Icons.target}</span>
            Shooting Drill
          </button>
        </div>

        {/* On court roster chips */}
        <div className="stagger">
          <p style={S.eyebrow}>On Court · {MOCK_PLAYERS.length}</p>
          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 14, marginBottom: 8, scrollbarWidth: 'none' }}>
            {MOCK_PLAYERS.map(p => <Avatar key={p.id} nickname={p.nickname} color={p.color} />)}
            <div style={{ width: 38, height: 38, minWidth: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--panel-3)', color: 'var(--dim)', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>+</div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="stagger">
          <p style={S.eyebrow}>Today</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {MOCK_FEED.map((item, i) => {
              const cfg = FEED_CONFIG[item.type]
              return (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '13px 14px', background: 'var(--panel)', border: '1px solid var(--line)', borderLeft: `3px solid ${cfg.color}`, borderRadius: 'var(--r-sm)' }}>
                  <div style={{ width: 38, height: 38, minWidth: 38, borderRadius: 11, display: 'grid', placeItems: 'center', background: cfg.bg, color: cfg.color, flexShrink: 0 }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>{item.summary}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--faint)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{item.time} ago</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Floating End Session */}
      <div style={{ position: 'fixed', bottom: 18, left: 14, right: 14 }}>
        <button
          onClick={() => setShowNotesModal(true)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
            minHeight: 54, borderRadius: 'var(--r-md)', fontFamily: '"Archivo Expanded", Archivo, sans-serif',
            fontWeight: 800, fontSize: 14, letterSpacing: '.02em', textTransform: 'uppercase',
            cursor: 'pointer', border: '1px solid var(--line-2)', background: 'var(--panel-2)', color: 'var(--dim)',
          }}
        >
          End Session
        </button>
      </div>

      {showNotesModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 80,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'flex-end',
          }}
          onClick={() => setShowNotesModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', background: 'var(--panel)',
              borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
              padding: '20px 18px 36px',
            }}
          >
            <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, marginBottom: 12 }}>
              Session Notes — Optional
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={500}
              placeholder="Anything the numbers can't capture…"
              style={{
                width: '100%', background: 'var(--panel-2)', border: '1px solid var(--line-2)',
                borderRadius: 'var(--r-sm)', color: 'var(--chalk)', fontSize: 15,
                padding: '12px 14px', resize: 'none', height: 100, outline: 'none',
                fontFamily: 'Archivo, sans-serif', boxSizing: 'border-box' as const,
              }}
            />
            <p style={{ fontSize: 11, color: 'var(--faint)', marginTop: 4, textAlign: 'right' as const }}>
              {notes.length}/500
            </p>
            <button
              type="button"
              onClick={() => {
                setShowNotesModal(false)
                clearActiveSession()
                nav('/session-recap/mock')
              }}
              style={{
                marginTop: 16, width: '100%', minHeight: 58,
                background: 'linear-gradient(180deg, var(--orange-2), var(--orange))',
                border: 'none', borderRadius: 'var(--r-md)', color: '#fff',
                fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                fontWeight: 800, fontSize: 15, textTransform: 'uppercase' as const,
                letterSpacing: '0.04em', cursor: 'pointer',
                boxShadow: 'var(--accent-glow)',
              }}
            >
              End Session
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
