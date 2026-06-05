import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BackButton } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Icons } from '../components/ui/icons'
import { ShotChart } from '../components/ui/ShotChart'
import { ProgressBar } from '../components/ui/ProgressBar'
import { useAttendanceStats } from '../hooks/useAttendanceStats'
import { supabase } from '../lib/supabase'
import type { ChartMode, HeatEntry } from '../types'

const MOCK = { id: '1', nickname: 'JC', name: 'Jordan C.', color: '#FF5A1F', w: 47, l: 23, ft: 82, ftGoal: 75, mid: 61, midGoal: 50, tpt: 38, tptGoal: 40 }

export default function PlayerProfilePage() {
  const nav = useNavigate()
  const { id: playerId = '' } = useParams()
  const [chartMode, setChartMode] = useState<ChartMode | null>(null)
  const { data: attStats } = useAttendanceStats(playerId)

  const { data: heatEntries = [] } = useQuery<HeatEntry[]>({
    queryKey: ['heat-entries', playerId],
    enabled: !!playerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('heat_entries')
        .select('*')
        .eq('player_id', playerId)
      if (error) throw error
      return data as HeatEntry[]
    },
  })

  const ftPct = MOCK.ft / 100
  const midPct = MOCK.mid / 100
  const tptPct = MOCK.tpt / 100
  const ftGoal = MOCK.ftGoal / 100
  const midGoal = MOCK.midGoal / 100
  const tptGoal = MOCK.tptGoal / 100

  return (
    <>
      <div className="min-h-dvh px-[18px] pt-[54px] pb-8">
        <BackButton onClick={() => nav('/players')}>Players</BackButton>

        {/* Hero profile card */}
        <div style={{
          background: 'var(--hero-gradient)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 'var(--r-lg)', padding: '20px 18px', marginBottom: 16, marginTop: 16,
        }}>
          <div className="flex gap-3.5 items-center">
            <Avatar nickname={MOCK.nickname} color={MOCK.color} variant="active" size={62} />
            <div className="flex-1">
              <div className="font-heading text-[20px]">
                {MOCK.name.split(' ')[0]} <span style={{ color: 'rgba(255,255,255,0.45)' }}>/ {MOCK.nickname}</span>
              </div>
              <button
                onClick={() => nav(`/players/${MOCK.id}/wl`)}
                className="inline-flex items-center gap-2 mt-1.5 px-3 py-1.5 rounded-full cursor-pointer border-0"
                style={{ background: 'rgba(255,255,255,0.08)', fontSize: 13, fontWeight: 700 }}
              >
                <span className="font-display text-[16px]">{MOCK.w}W</span>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>
                <span className="font-display text-[16px]">{MOCK.l}L</span>
                <span className="text-[12px]" style={{ color: 'var(--green)' }}>{Math.round(MOCK.w / (MOCK.w + MOCK.l) * 100)}%</span>
                <span className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{Icons.chevronRight}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Shooting stats */}
        <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-1">Shooting · tap a bar for the chart</p>
        <div className="stagger">
          {/* FT% */}
          <div className="my-[13px] cursor-pointer" onClick={() => setChartMode('ft')}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="font-bold text-[13px] tracking-[.04em]">FT%</span>
              <span className="text-[11px] text-[var(--dim)] font-semibold">
                {MOCK.ft}% → Goal {MOCK.ftGoal}% {MOCK.ft >= MOCK.ftGoal ? '✓' : '↑'}
              </span>
            </div>
            <ProgressBar value={ftPct} goal={ftGoal} />
          </div>

          {/* Mid% */}
          <div className="my-[13px] cursor-pointer" onClick={() => setChartMode('mid')}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="font-bold text-[13px] tracking-[.04em]">Mid%</span>
              <span className="text-[11px] text-[var(--dim)] font-semibold">
                {MOCK.mid}% → Goal {MOCK.midGoal}% {MOCK.mid >= MOCK.midGoal ? '✓' : '↑'}
              </span>
            </div>
            <ProgressBar value={midPct} goal={midGoal} />
          </div>

          {/* 3PT% */}
          <div className="my-[13px] cursor-pointer" onClick={() => setChartMode('three')}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="font-bold text-[13px] tracking-[.04em]">3PT%</span>
              <span className="text-[11px] text-[var(--dim)] font-semibold">
                {MOCK.tpt}% → Goal {MOCK.tptGoal}% {MOCK.tpt >= MOCK.tptGoal ? '✓' : '↑'}
              </span>
            </div>
            <ProgressBar value={tptPct} goal={tptGoal} />
          </div>
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
          heatEntries={heatEntries}
        />
      )}
    </>
  )
}
