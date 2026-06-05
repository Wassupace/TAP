interface ProgressBarProps {
  value: number      // 0–1
  goal?: number      // 0–1, draws a goal marker line if provided
  glow?: boolean
  height?: number
}

// Resolved hex values matching CSS token definitions
const COLOR_GREEN  = '#10B981'
const COLOR_YELLOW = '#F59E0B'
const COLOR_RED    = '#EF4444'
const COLOR_ORANGE = '#FF5A1F'

export function ProgressBar({ value, goal, glow = true, height = 11 }: ProgressBarProps) {
  const pct = Math.min(1, Math.max(0, value)) * 100
  const color =
    goal === undefined
      ? COLOR_ORANGE
      : value >= goal
        ? COLOR_GREEN
        : value >= goal * 0.8
          ? COLOR_YELLOW
          : COLOR_RED

  return (
    <div style={{
      height, borderRadius: height / 2,
      background: 'var(--panel-2)',
      overflow: 'visible', position: 'relative',
    }}>
      <div style={{
        height: '100%', borderRadius: height / 2,
        width: `${pct}%`,
        background: `linear-gradient(90deg, ${color}bb, ${color})`,
        boxShadow: glow ? `0 0 8px ${color}88` : 'none',
        transition: 'width 0.4s ease',
      }} />
      {goal !== undefined && (
        <div style={{
          position: 'absolute', top: -2, bottom: -2,
          left: `${goal * 100}%`,
          width: 2, background: 'rgba(255,255,255,0.4)',
          borderRadius: 1,
        }} />
      )}
    </div>
  )
}
