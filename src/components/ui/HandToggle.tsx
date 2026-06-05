import type { Hand } from '../../types'

type HandMode = 'all' | Hand

interface HandToggleProps {
  value: HandMode
  onChange: (v: HandMode) => void
  showAll?: boolean     // default true — show the ALL option
}

export function HandToggle({ value, onChange, showAll = true }: HandToggleProps) {
  const options: { key: HandMode; label: string }[] = [
    ...(showAll ? [{ key: 'all' as HandMode, label: 'ALL' }] : []),
    { key: 'left',  label: 'L' },
    { key: 'right', label: 'R' },
  ]

  return (
    <div style={{
      display: 'flex',
      background: 'var(--panel-2)',
      borderRadius: 'var(--r-sm)',
      padding: 3,
      gap: 3,
    }}>
      {options.map(opt => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          style={{
            flex: 1,
            padding: '9px 6px',
            borderRadius: 6,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: '"Archivo Expanded", Archivo, sans-serif',
            cursor: 'pointer',
            transition: 'all 0.15s',
            letterSpacing: '0.04em',
            background: value === opt.key ? 'var(--orange)' : 'transparent',
            color: value === opt.key ? '#fff' : 'var(--dim)',
            boxShadow: value === opt.key ? 'var(--accent-glow)' : 'none',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
