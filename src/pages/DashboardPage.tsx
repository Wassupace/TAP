import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '../stores/sessionStore'
import { Icons } from '../components/ui/icons'
import { Avatar } from '../components/ui/Avatar'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { StatusDot } from '../components/ui/StatusDot'

function fmt(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const S = {
  iconBtn: {
    width: 42, height: 42, borderRadius: 14, display: 'grid', placeItems: 'center' as const,
    background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--chalk)',
    cursor: 'pointer', flexShrink: 0,
  } as React.CSSProperties,
  eyebrow: {
    fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase' as const,
    color: 'var(--faint)', fontWeight: 700, margin: '0 0 8px',
  } as React.CSSProperties,
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={20} height={20}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

// ── Setup modal ────────────────────────────────────────────────────────────────

function NewSessionModal({ onClose, onConfirm }: {
  onClose: () => void
  onConfirm: (location: string, players: string[]) => void
}) {
  const [location, setLocation] = useState('')
  const [players, setPlayers]   = useState<string[]>([])
  const [input, setInput]       = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addPlayer() {
    const name = input.trim()
    if (!name || players.includes(name)) return
    setPlayers(p => [...p, name])
    setInput('')
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); addPlayer() }
  }

  const canStart = location.trim().length > 0

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: 'var(--panel)',
          borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
          padding: '24px 18px 40px',
          maxHeight: '85dvh', overflowY: 'auto',
        }}
      >
        {/* Title */}
        <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 18, marginBottom: 20 }}>
          New Session
        </div>

        {/* Location */}
        <label style={{ display: 'block', marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8 }}>
            Gym / Location <span style={{ color: 'var(--orange)' }}>*</span>
          </p>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Levallois Gym"
            autoFocus
            style={{
              width: '100%', background: 'var(--panel-2)',
              border: `1px solid ${location.trim() ? 'var(--orange)' : 'var(--line-2)'}`,
              borderRadius: 'var(--r-sm)', color: 'var(--chalk)', fontSize: 16,
              padding: '12px 14px', outline: 'none',
              fontFamily: 'Archivo, sans-serif', boxSizing: 'border-box',
            }}
          />
        </label>

        {/* Players */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8 }}>
            Players on Court <span style={{ color: 'var(--faint)', fontWeight: 400, textTransform: 'none' }}>— optional</span>
          </p>

          {/* Input row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nickname"
              style={{
                flex: 1, background: 'var(--panel-2)', border: '1px solid var(--line-2)',
                borderRadius: 'var(--r-sm)', color: 'var(--chalk)', fontSize: 15,
                padding: '10px 14px', outline: 'none',
                fontFamily: 'Archivo, sans-serif',
              }}
            />
            <button
              type="button"
              onClick={addPlayer}
              disabled={!input.trim()}
              style={{
                padding: '0 16px', borderRadius: 'var(--r-sm)', border: 'none',
                background: input.trim() ? 'var(--orange)' : 'var(--panel-3)',
                color: input.trim() ? '#fff' : 'var(--faint)',
                fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                fontWeight: 700, fontSize: 13, cursor: input.trim() ? 'pointer' : 'not-allowed',
                textTransform: 'uppercase', letterSpacing: '0.04em',
                transition: 'all 0.15s',
              }}
            >
              Add
            </button>
          </div>

          {/* Player chips */}
          {players.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {players.map(name => (
                <div
                  key={name}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(255,90,31,0.12)', border: '1px solid rgba(255,90,31,0.3)',
                    borderRadius: 20, padding: '5px 10px 5px 5px',
                  }}
                >
                  <Avatar nickname={name} size={24} variant="active" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--chalk)' }}>{name}</span>
                  <button
                    type="button"
                    onClick={() => setPlayers(p => p.filter(x => x !== name))}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--faint)', fontSize: 16, lineHeight: 1, padding: 0, marginLeft: 2,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirm button */}
        <button
          type="button"
          onClick={() => canStart && onConfirm(location.trim(), players)}
          disabled={!canStart}
          style={{
            width: '100%', minHeight: 58,
            background: canStart
              ? 'linear-gradient(180deg, var(--orange-2), var(--orange))'
              : 'var(--panel-2)',
            border: 'none', borderRadius: 'var(--r-md)',
            color: canStart ? '#fff' : 'var(--faint)',
            fontFamily: '"Archivo Expanded", Archivo, sans-serif',
            fontWeight: 800, fontSize: 16, textTransform: 'uppercase',
            letterSpacing: '0.04em', cursor: canStart ? 'pointer' : 'not-allowed',
            boxShadow: canStart ? 'var(--accent-glow)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          Open Session
        </button>
      </div>
    </div>
  )
}

// ── Dashboard root ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const nav = useNavigate()
  const { activeSessionId, activeLocation, elapsedSeconds, tick, setActiveSession } = useSessionStore()
  const [showSetup, setShowSetup] = useState(false)

  useEffect(() => {
    if (!activeSessionId) return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeSessionId, tick])

  function handleConfirm(location: string, players: string[]) {
    setShowSetup(false)
    setActiveSession(crypto.randomUUID(), location, players)
  }

  if (!activeSessionId) {
    return (
      <>
        <IdleDashboard
          onStart={() => setShowSetup(true)}
          onCalendar={() => nav('/calendar')}
          onPlayers={() => nav('/players')}
        />
        {showSetup && (
          <NewSessionModal
            onClose={() => setShowSetup(false)}
            onConfirm={handleConfirm}
          />
        )}
      </>
    )
  }

  return <ActiveDashboard location={activeLocation} elapsed={elapsedSeconds} />
}

// ── Idle state ─────────────────────────────────────────────────────────────────

function IdleDashboard({ onStart, onCalendar, onPlayers }: {
  onStart: () => void
  onCalendar: () => void
  onPlayers: () => void
}) {
  const nav = useNavigate()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', padding: '54px 18px 0' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button type="button" onClick={onPlayers} style={S.iconBtn}>
          <span style={{ width: 20, height: 20, display: 'flex' }}>{Icons.roster}</span>
        </button>
        <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.02em' }}>TAP</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={onCalendar} style={S.iconBtn}>
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
          <p style={{ color: 'var(--dim)', fontSize: 13, marginTop: 8, maxWidth: 240 }}>
            Start logging when you hit the court. Or open a planned session from the calendar.
          </p>
        </div>

        <button
          type="button"
          onClick={onStart}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: 280, minHeight: 72, borderRadius: 'var(--r-lg)',
            fontFamily: '"Archivo Expanded", Archivo, sans-serif',
            fontWeight: 800, fontSize: 18, letterSpacing: '.02em', textTransform: 'uppercase',
            cursor: 'pointer', border: 0, color: '#fff',
            background: 'linear-gradient(180deg,var(--orange-2),var(--orange))',
            boxShadow: '0 12px 28px -10px rgba(255,90,31,.7)',
          }}
        >
          <span style={{ width: 20, height: 20, display: 'flex' }}>{Icons.plus}</span>
          Start New Session
        </button>

        <button
          type="button"
          onClick={onCalendar}
          style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--dim)', fontWeight: 700, fontSize: 13, background: 'none', border: 0, cursor: 'pointer' }}
        >
          <span style={{ width: 16, height: 16, display: 'flex' }}>{Icons.calendar}</span>
          View planned sessions
        </button>
      </div>
    </div>
  )
}

// ── Active session ─────────────────────────────────────────────────────────────

function ActiveDashboard({ location, elapsed }: { location: string; elapsed: number }) {
  const nav = useNavigate()
  const [showNotesModal, setShowNotesModal] = useState(false)
  const { clearActiveSession, notes, setNotes, players, addPlayer, removePlayer } = useSessionStore()
  const { status, pendingCount, lastSyncedAt } = useOnlineStatus()
  const [addingPlayer, setAddingPlayer] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)

  function submitNewPlayer() {
    addPlayer(newPlayerName)
    setNewPlayerName('')
    setAddingPlayer(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '54px 18px 96px' }}>

        {/* Top icon row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button type="button" onClick={() => nav('/players')} style={S.iconBtn}>
            <span style={{ width: 20, height: 20, display: 'flex' }}>{Icons.roster}</span>
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => nav('/calendar')} style={S.iconBtn}>
              <span style={{ width: 20, height: 20, display: 'flex' }}>{Icons.calendar}</span>
            </button>
            <button type="button" onClick={() => nav('/settings')} style={S.iconBtn}>
              <GearIcon />
            </button>
          </div>
        </div>

        {/* Session hero card */}
        <div className="stagger" style={{
          background: 'var(--hero-gradient)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 'var(--r-lg)', padding: '16px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
        }}>
          <div>
            <p style={{ fontSize: 11, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>
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

        {/* Action Hub */}
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <button type="button" onClick={() => nav('/match/setup')} style={{
            minHeight: 72, borderRadius: 'var(--r-lg)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6, border: 0, cursor: 'pointer',
            fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800,
            fontSize: 16, letterSpacing: '.02em', textTransform: 'uppercase',
            color: '#fff', background: 'linear-gradient(180deg,var(--orange-2),var(--orange))',
            boxShadow: '0 12px 28px -10px rgba(255,90,31,.7)',
          }}>
            <span style={{ width: 24, height: 24, display: 'flex' }}>{Icons.ball}</span>
            <span>New Match</span>
          </button>

          <button type="button" onClick={() => nav('/activity/setup')} style={{
            minHeight: 72, borderRadius: 'var(--r-lg)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid var(--line-2)',
            cursor: 'pointer', fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800,
            fontSize: 16, letterSpacing: '.02em', textTransform: 'uppercase',
            color: 'var(--chalk)', background: 'var(--panel-2)',
          }}>
            <span style={{ width: 24, height: 24, display: 'flex' }}>{Icons.target}</span>
            <span>New Activity</span>
          </button>
        </div>

        <div className="stagger" style={{ marginBottom: 20 }}>
          <button type="button" onClick={() => nav('/drill')} style={{
            width: '100%', minHeight: 50, borderRadius: 'var(--r-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: '1px solid var(--line-2)', cursor: 'pointer',
            fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800,
            fontSize: 14, letterSpacing: '0.02em', textTransform: 'uppercase',
            color: 'var(--chalk)', background: 'var(--panel-2)',
          }}>
            <span style={{ width: 18, height: 18, display: 'flex' }}>{Icons.target}</span>
            Shooting Drill
          </button>
        </div>

        {/* On court roster */}
        <div className="stagger">
          <p style={S.eyebrow}>On Court{players.length > 0 ? ` · ${players.length}` : ''}</p>
          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 14, marginBottom: 8, scrollbarWidth: 'none', alignItems: 'center' }}>
            {players.map(name => (
              <button
                key={name}
                type="button"
                title={`Remove ${name}`}
                onClick={() => removePlayer(name)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
              >
                <Avatar nickname={name} variant="active" />
              </button>
            ))}

            {/* Add player inline */}
            {addingPlayer ? (
              <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                <input
                  ref={addInputRef}
                  autoFocus
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitNewPlayer(); if (e.key === 'Escape') setAddingPlayer(false) }}
                  placeholder="Nickname"
                  style={{
                    width: 90, background: 'var(--panel-2)', border: '1px solid var(--orange)',
                    borderRadius: 'var(--r-sm)', color: 'var(--chalk)', fontSize: 13,
                    padding: '6px 10px', outline: 'none', fontFamily: 'Archivo, sans-serif',
                  }}
                />
                <button type="button" onClick={submitNewPlayer} style={{
                  background: 'var(--orange)', border: 'none', borderRadius: 'var(--r-sm)',
                  color: '#fff', fontSize: 13, fontWeight: 700, padding: '6px 10px', cursor: 'pointer',
                }}>✓</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingPlayer(true)}
                style={{
                  width: 38, height: 38, minWidth: 38, borderRadius: '50%', display: 'grid',
                  placeItems: 'center', background: 'var(--panel-3)', color: 'var(--dim)',
                  fontSize: 20, fontWeight: 400, flexShrink: 0, border: 'none', cursor: 'pointer',
                }}
              >
                +
              </button>
            )}
          </div>
          {players.length === 0 && !addingPlayer && (
            <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: -6, marginBottom: 8 }}>
              Tap + to add players — or leave empty for a solo session.
            </p>
          )}
        </div>

        {/* Activity feed — empty state until activities are logged */}
        <div className="stagger">
          <p style={S.eyebrow}>Today</p>
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)', padding: '24px 16px',
            textAlign: 'center', color: 'var(--faint)', fontSize: 13,
          }}>
            No activities yet — hit the court and start logging.
          </div>
        </div>
      </div>

      {/* Floating End Session */}
      <div style={{ position: 'fixed', bottom: 18, left: 14, right: 14 }}>
        <button
          type="button"
          onClick={() => setShowNotesModal(true)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
            minHeight: 54, borderRadius: 'var(--r-md)',
            fontFamily: '"Archivo Expanded", Archivo, sans-serif',
            fontWeight: 800, fontSize: 14, letterSpacing: '.02em', textTransform: 'uppercase',
            cursor: 'pointer', border: '1px solid var(--line-2)', background: 'var(--panel-2)', color: 'var(--dim)',
          }}
        >
          End Session
        </button>
      </div>

      {/* Notes modal */}
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
            <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 12 }}>
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
                fontFamily: 'Archivo, sans-serif', boxSizing: 'border-box',
              }}
            />
            <p style={{ fontSize: 11, color: 'var(--faint)', marginTop: 4, textAlign: 'right' }}>
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
                fontWeight: 800, fontSize: 15, textTransform: 'uppercase',
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
