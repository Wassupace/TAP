import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackButton } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Icons } from '../components/ui/icons'
import { ShotChart } from '../components/ui/ShotChart'
import { useAttendanceStats } from '../hooks/useAttendanceStats'
import type { ChartMode } from '../types'

const MOCK = { id: '1', nickname: 'JC', name: 'Jordan C.', color: '#FF5A1F', w: 47, l: 23, ft: 82, ftGoal: 75, mid: 61, midGoal: 50, tpt: 38, tptGoal: 40 }

function StatBar({ label, value, goal, onClick }: { label: string; value: number; goal: number; onClick: () => void }) {
  const cls = value >= goal ? 'stat-fill-green' : value >= goal * 0.8 ? 'stat-fill-yellow' : 'stat-fill-red'
  const mark = value >= goal ? '✓' : '↑'
  return (
    <div className="my-[13px] cursor-pointer" onClick={onClick}>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="font-bold text-[13px] tracking-[.04em]">{label}</span>
        <span className="text-[11px] text-[var(--dim)] font-semibold">{value}% → Goal {goal}% {mark}</span>
      </div>
      <div className="stat-track">
        <div className={`stat-fill ${cls}`} style={{ width: `${value}%` }} />
        <span className="absolute top-[-3px] w-[2px] h-[17px] bg-chalk opacity-70 rounded-[2px]" style={{ left: `${goal}%` }} />
      </div>
    </div>
  )
}

export default function PlayerProfilePage() {
  const nav = useNavigate()
  const { id: playerId = '' } = useParams()
  const [chartMode, setChartMode] = useState<ChartMode | null>(null)
  const { data: attStats } = useAttendanceStats(playerId)

  return (
    <>
      <div className="min-h-dvh px-[18px] pt-[54px] pb-8">
        <BackButton onClick={() => nav('/players')}>Players</BackButton>

        {/* Profile card */}
        <div className="rounded-[18px] p-4 mt-4 mb-4 stagger" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}>
          <div className="flex gap-3.5 items-center">
            <Avatar nickname={MOCK.nickname} color={MOCK.color} variant="active" size={62} />
            <div className="flex-1">
              <div className="font-heading text-[20px]">
                {MOCK.name.split(' ')[0]} <span style={{ color: 'var(--dim)' }}>/ {MOCK.nickname}</span>
              </div>
              <button
                onClick={() => nav(`/players/${MOCK.id}/wl`)}
                className="inline-flex items-center gap-2 mt-1.5 px-3 py-1.5 rounded-full cursor-pointer border-0"
                style={{ background: 'var(--panel-3)', fontSize: 13, fontWeight: 700 }}
              >
                <span className="font-display text-[16px]">{MOCK.w}W</span>
                <span style={{ color: 'var(--faint)' }}>—</span>
                <span className="font-display text-[16px]">{MOCK.l}L</span>
                <span className="text-[12px]" style={{ color: 'var(--green)' }}>{Math.round(MOCK.w / (MOCK.w + MOCK.l) * 100)}%</span>
                <span className="w-3.5 h-3.5" style={{ color: 'var(--faint)' }}>{Icons.chevronRight}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Shooting stats */}
        <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-1">Shooting · tap a bar for the chart</p>
        <div className="stagger">
          <StatBar label="FT%" value={MOCK.ft} goal={MOCK.ftGoal} onClick={() => setChartMode('ft')} />
          <StatBar label="Mid%" value={MOCK.mid} goal={MOCK.midGoal} onClick={() => setChartMode('mid')} />
          <StatBar label="3PT%" value={MOCK.tpt} goal={MOCK.tptGoal} onClick={() => setChartMode('three')} />
        </div>

        {/* Attendance stats strip */}
        {attStats && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'var(--panel-2)', borderRadius: 'var(--r-sm)',
            padding: '12px 14px', marginTop: 10,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: 'var(--chalk)' }}>
                {attStats.totalSessions}
              </div>
              <div style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginTop: 2 }}>
                Sessions
              </div>
            </div>
            <div style={{ width: 1, background: 'var(--panel-3)', height: 36 }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: 'var(--chalk)' }}>
                {attStats.streak > 0 ? '🔥' : ''}{attStats.streak}
              </div>
              <div style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginTop: 2 }}>
                Streak
              </div>
            </div>
            <div style={{ width: 1, background: 'var(--panel-3)', height: 36 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                Last seen
              </div>
              <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 3 }}>
                {attStats.lastSeen
                  ? new Date(attStats.lastSeen).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                  : '—'}
                {attStats.lastLocation ? ` · ${attStats.lastLocation}` : ''}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Shot chart overlay */}
      {chartMode && (
        <ShotChart
          mode={chartMode}
          onModeChange={setChartMode}
          onClose={() => setChartMode(null)}
          playerName={MOCK.nickname}
        />
      )}
    </>
  )
}
