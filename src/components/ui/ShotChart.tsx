import type { ChartMode } from '../../types'

/* ---- Court geometry constants (all in SVG units, viewBox 0 0 500 460) ---- */
const CX = 250, CY = 392
const R1 = 36.8   // restricted area
const R2 = 126.5  // inner mid-range
const R3 = 218.5  // three-point
const RBIG = 440  // clip outer three zones
const COURT = { l: 20, r: 480, top: 8, base: 440 }
const LANE  = { l: 176.4, r: 323.6, top: 265.5 }
const FTC   = { x: 250, y: 265.5, r: 55.2 }
const CORNER = { lx: 47.6, rx: 452.4, meetA: 22.13 }
const BB    = { y: 403.2, l: 222.4, r: 277.6 }

function polar(deg: number, r: number): [number, number] {
  const a = (deg * Math.PI) / 180
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)]
}

function arcPts(a0: number, a1: number, r: number, n = 16): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n)
    pts.push(polar(a, r))
  }
  return pts
}

function toPoly(pts: [number, number][]): string {
  return 'M' + pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L') + ' Z'
}

function sector(a0: number, a1: number, rIn: number, rOut: number): string {
  return toPoly([...arcPts(a0, a1, rIn), ...arcPts(a1, a0, rOut)])
}

function halfDisk(r: number): string {
  return toPoly(arcPts(0, 180, r, 28))
}

type ZoneType = 'paint' | 'mid' | 'three' | 'ft'

interface Zone {
  id: string
  type: ZoneType
  d: string
  lx: number
  ly: number
  makes: number
  attempts: number
}

function buildZones(): Zone[] {
  const Z: Zone[] = []

  // Restricted area
  const rCenter = polar(90, R1 * 0.5)
  Z.push({ id: 'restricted', type: 'paint', d: halfDisk(R1), lx: rCenter[0], ly: rCenter[1], makes: 38, attempts: 46 })

  // Interior 4 sectors
  const interior: [number, number, ZoneType, number, number, string][] = [
    [0, 45, 'paint', 31, 40, 'rblk'],
    [45, 90, 'mid', 9, 22, 'rpost'],
    [90, 135, 'mid', 7, 19, 'lpost'],
    [135, 180, 'paint', 27, 38, 'lblk'],
  ]
  interior.forEach(([a0, a1, t, m, a, id]) => {
    const lp = polar((a0 + a1) / 2, (R1 + R2) / 2)
    Z.push({ id, type: t, d: sector(a0, a1, R1, R2), lx: lp[0], ly: lp[1], makes: m, attempts: a })
  })

  // Mid-range 5 sectors
  const bins = [0, 36, 72, 108, 144, 180]
  const midData: [number, number, string][] = [[12,30,'mr0r'],[8,21,'mr45r'],[14,28,'mrtop'],[10,24,'mr45l'],[7,26,'mr0l']]
  for (let i = 0; i < 5; i++) {
    const lp = polar((bins[i] + bins[i+1]) / 2, (R2 + R3) / 2)
    Z.push({ id: midData[i][2], type: 'mid', d: sector(bins[i], bins[i+1], R2, R3), lx: lp[0], ly: lp[1], makes: midData[i][0], attempts: midData[i][1] })
  }

  // Three-point 5 sectors
  const thrData: [number, number, string][] = [[18,38,'t0r'],[11,40,'t45r'],[16,34,'ttop'],[12,37,'t45l'],[5,18,'t0l']]
  for (let i = 0; i < 5; i++) {
    const mid = (bins[i] + bins[i+1]) / 2
    let lp = polar(mid, R3 + 34)
    lp = [Math.max(34, Math.min(466, lp[0])), Math.max(20, lp[1])] as [number, number]
    Z.push({ id: thrData[i][2], type: 'three', d: sector(bins[i], bins[i+1], R3, RBIG), lx: lp[0], ly: lp[1], makes: thrData[i][0], attempts: thrData[i][1] })
  }

  return Z
}

function zoneColor(makes: number, attempts: number, type: ZoneType): string {
  if (attempts === 0) return 'rgba(156,163,175,0.2)'
  const pct = makes / attempts
  const [g, y] =
    type === 'three' ? [0.30, 0.11] :
    type === 'mid'   ? [0.50, 0.26] :
    type === 'ft'    ? [0.75, 0.51] :
                       [0.80, 0.51]
  const rgb = pct >= g ? '34,197,94' : pct >= y ? '234,179,8' : '239,68,68'
  return `rgba(${rgb},0.5)`
}

const ZONES = buildZones()

function isActive(zone: Zone, mode: ChartMode): boolean {
  if (mode === 'three') return zone.type === 'three'
  if (mode === 'mid')   return zone.type !== 'three'
  if (mode === 'ft')    return false
  return true
}

function CourtLines() {
  const arcPath = (pts: [number,number][]) =>
    'M' + pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L')

  const threeArcPts = arcPts(CORNER.meetA, 180 - CORNER.meetA, R3, 40)
  const restrictedPts = arcPts(0, 180, R1, 26)
  const threeL = polar(180 - CORNER.meetA, R3)
  const threeR = polar(CORNER.meetA, R3)

  return (
    <g fill="none" stroke="rgba(244,246,252,0.92)" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
      {/* Court boundary */}
      <path d={`M${COURT.l},${COURT.top} L${COURT.l},${COURT.base} L${COURT.r},${COURT.base} L${COURT.r},${COURT.top} Z`} />
      {/* Lane / key */}
      <rect x={LANE.l} y={LANE.top} width={LANE.r - LANE.l} height={COURT.base - LANE.top} />
      {/* Free throw circle */}
      <circle cx={FTC.x} cy={FTC.y} r={FTC.r} />
      {/* Restricted area arc */}
      <path d={arcPath(restrictedPts)} />
      {/* Three-point line: left corner + arc + right corner */}
      <path d={`M${CORNER.lx},${COURT.base} L${threeL[0].toFixed(1)},${threeL[1].toFixed(1)}`} />
      <path d={arcPath(threeArcPts)} />
      <path d={`M${CORNER.rx},${COURT.base} L${threeR[0].toFixed(1)},${threeR[1].toFixed(1)}`} />
      {/* Backboard */}
      <line x1={BB.l} y1={BB.y} x2={BB.r} y2={BB.y} strokeWidth={3} />
      {/* Hoop */}
      <circle cx={CX} cy={CY} r={7} strokeWidth={2} />
      <line x1={CX} y1={BB.y} x2={CX} y2={CY - 7} />
    </g>
  )
}

interface ShotChartProps {
  mode: ChartMode
  onModeChange: (m: ChartMode) => void
  onClose: () => void
  playerName?: string
}

export function ShotChart({ mode, onModeChange, onClose, playerName = 'Player' }: ShotChartProps) {
  const ftOn = mode === 'ft'
  const ftColor = ftOn ? zoneColor(41, 50, 'ft') : 'rgba(156,163,175,0.18)'

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col overlay-enter"
      style={{ background: 'rgba(6,9,14,.88)', backdropFilter: 'blur(8px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-[64px] pb-3">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-[var(--dim)] font-bold text-[13px] bg-transparent border-0 cursor-pointer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" width={18} height={18}>
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Back
        </button>
        <div className="font-display text-[20px] uppercase tracking-wide">Shot Chart · {playerName}</div>
        <div className="w-[60px]" />
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 justify-center mb-3 px-4">
        {(['ft', 'mid', 'three'] as ChartMode[]).map(m => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className="font-heading text-[13px] tracking-[.04em] px-[18px] py-[9px] rounded-full border cursor-pointer transition-all"
            style={{
              background: mode === m ? 'var(--orange)' : 'var(--panel)',
              color: mode === m ? '#0c0c0c' : 'var(--dim)',
              borderColor: mode === m ? 'var(--orange)' : 'var(--line-2)',
            }}
          >
            {m === 'ft' ? 'FT' : m === 'mid' ? 'MID' : '3PT'}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="mx-4 rounded-[18px] p-2" style={{ background: 'linear-gradient(180deg,#10202c,#0a141c)', border: '1px solid var(--line)' }}>
        <svg viewBox="0 0 500 460" width="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="courtClip">
              <rect x={COURT.l} y={COURT.top} width={COURT.r - COURT.l} height={COURT.base - COURT.top} />
            </clipPath>
          </defs>

          {/* Zone fills — rendered FIRST (below court lines) */}
          <g clipPath="url(#courtClip)">
            {ZONES.map(z => {
              const active = isActive(z, mode)
              const fill = active ? zoneColor(z.makes, z.attempts, z.type) : 'rgba(156,163,175,0.18)'
              return (
                <path key={z.id} d={z.d} fill={fill} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              )
            })}
          </g>

          {/* Court lines — rendered LAST, always on top */}
          <CourtLines />

          {/* Zone labels — on top of everything */}
          {ZONES.map(z => {
            const active = isActive(z, mode)
            const label = active ? `${z.makes}/${z.attempts}` : '—'
            const pct = active && z.attempts > 0 ? `${Math.round((z.makes / z.attempts) * 100)}%` : '—'
            const chipFill = active ? 'rgba(255,255,255,.82)' : 'rgba(20,27,38,.6)'
            const textCol = active ? '#0c0c0c' : 'rgba(244,246,252,.45)'
            return (
              <g key={z.id} transform={`translate(${z.lx.toFixed(1)},${z.ly.toFixed(1)})`}>
                <rect x={-19} y={-13} width={38} height={26} rx={6} fill={chipFill} />
                <text x={0} y={-2} textAnchor="middle" fontFamily="Archivo,sans-serif" fontWeight={800} fontSize={10} fill={textCol}>{label}</text>
                <text x={0} y={9} textAnchor="middle" fontFamily="Anton,sans-serif" fontSize={10} fill={active ? '#0c0c0c' : 'rgba(244,246,252,.4)'}>{pct}</text>
              </g>
            )
          })}

          {/* Free throw spot marker */}
          <g transform={`translate(${FTC.x},${FTC.y})`}>
            <circle r={22} fill={ftColor} stroke="rgba(255,255,255,.5)" strokeWidth={1.5} />
            <rect x={-20} y={-12} width={40} height={24} rx={6} fill={ftOn ? 'rgba(255,255,255,.85)' : 'rgba(20,27,38,.6)'} />
            <text x={0} y={-1} textAnchor="middle" fontFamily="Archivo" fontWeight={800} fontSize={10} fill={ftOn ? '#0c0c0c' : 'rgba(244,246,252,.45)'}>{ftOn ? '41/50' : 'FT'}</text>
            <text x={0} y={9} textAnchor="middle" fontFamily="Anton" fontSize={10} fill={ftOn ? '#0c0c0c' : 'rgba(244,246,252,.4)'}>{ftOn ? '82%' : '—'}</text>
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-4 justify-center mt-4 text-[11px] text-[var(--dim)] font-semibold">
        {[
          { color: 'var(--green)', label: 'On target' },
          { color: 'var(--yellow)', label: 'Close' },
          { color: 'var(--red)', label: 'Leaking' },
          { color: 'rgba(156,163,175,.4)', label: 'No data' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <i className="inline-block w-[11px] h-[11px] rounded-[3px]" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>

      <p className="text-center text-[var(--faint)] text-[11px] mt-auto mb-6 px-4">
        Tap outside or swipe down to dismiss
      </p>

      {/* Tap outside to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  )
}
