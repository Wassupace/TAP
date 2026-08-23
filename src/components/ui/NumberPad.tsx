import { useState, type CSSProperties } from 'react'
import { parseNumberPadDigits } from '../../utils/parseNumberPadDigits'

export interface NumberPadProps {
  isOpen: boolean
  value: number
  label: string // e.g. "Team A score", "Makes this heat"
  onConfirm: (value: number) => void
  onClose: () => void
}

// Caps entry at 4 digits (0-9999) — comfortably covers any score or makes
// count this app tracks, and keeps the large digit display from wrapping.
const MAX_DIGITS = 4

const digitButtonStyle: CSSProperties = {
  minHeight: 64,
  borderRadius: 'var(--r-md)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--panel-2)', border: '1px solid var(--line)',
  color: 'var(--chalk)', cursor: 'pointer', padding: 0,
  fontSize: 24, fontWeight: 800,
  fontFamily: '"Archivo Expanded", Archivo, sans-serif',
}

export function NumberPad({ isOpen, value, label, onConfirm, onClose }: NumberPadProps) {
  // Direct entry always starts from a blank slate — it replaces the old
  // value rather than editing it (PRD §1.4), so `value` is never used to
  // pre-fill this state.
  const [digits, setDigits] = useState('')

  // Re-seed to an empty entry every time the sheet transitions from closed to
  // open — same closed->open resync pattern as `PlayerPickerModal` (resolved
  // during render, not in an effect, so it lands in the same commit).
  const [wasOpen, setWasOpen] = useState(isOpen)
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) setDigits('')
  }

  if (!isOpen) return null

  function appendDigit(d: string) {
    setDigits(prev => (prev.length >= MAX_DIGITS ? prev : prev + d))
  }

  function backspace() {
    setDigits(prev => prev.slice(0, -1))
  }

  function handleDone() {
    onConfirm(parseNumberPadDigits(digits))
    onClose()
  }

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
          maxHeight: '85dvh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexShrink: 0 }}>
          <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 18 }}>
            {label}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center',
              background: 'var(--panel-2)', border: '1px solid var(--line-2)', color: 'var(--faint)',
              fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Current entry */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <span className="font-display" style={{ fontSize: 64, lineHeight: 0.9, color: 'var(--chalk)' }}>
            {digits === '' ? '0' : digits}
          </span>
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--faint)', fontWeight: 700, marginBottom: 22, flexShrink: 0 }}>
          Current: {value}
        </div>

        {/* Digit grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16, flexShrink: 0 }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
            <button key={d} type="button" onClick={() => appendDigit(d)} style={digitButtonStyle}>
              {d}
            </button>
          ))}
          <div />
          <button type="button" onClick={() => appendDigit('0')} style={digitButtonStyle}>
            0
          </button>
          <button
            type="button"
            onClick={backspace}
            aria-label="Backspace"
            style={{ ...digitButtonStyle, fontSize: 20, color: 'var(--dim)' }}
          >
            ⌫
          </button>
        </div>

        {/* Done */}
        <button
          type="button"
          onClick={handleDone}
          style={{
            width: '100%', minHeight: 54, borderRadius: 'var(--r-md)', border: 'none',
            background: 'linear-gradient(180deg, var(--orange-2), var(--orange))',
            color: '#fff', fontFamily: '"Archivo Expanded", Archivo, sans-serif',
            fontWeight: 800, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.04em',
            cursor: 'pointer', boxShadow: 'var(--accent-glow)', flexShrink: 0,
          }}
        >
          Done
        </button>
      </div>
    </div>
  )
}
