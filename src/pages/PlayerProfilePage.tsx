import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BackButton } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Icons } from '../components/ui/icons'
import { ShotChart } from '../components/ui/ShotChart'
import { ProgressBar } from '../components/ui/ProgressBar'
import { useAttendanceStats } from '../hooks/useAttendanceStats'
import { usePlayer } from '../hooks/usePlayers'
import { usePlayerWL, usePlayerShooting } from '../hooks/usePlayerStats'
import { playerColor } from '../utils/playerColor'
import { supabase } from '../lib/supabase'
import type { ChartMode, HeatEntry } from '../types'

export default function PlayerProfilePage() {
  const nav = useNavigate()
  const { id: playerId = '' } = useParams()
  const [chartMode, setChartMode] = useState<ChartMode | null>(null)

  const { data: player } = usePlayer(playerId)
  const { data: attStats } = useAttendanceStats(playerId)
  const { data: wl } = usePlayerWL(playerId)
  const { data: shooting } = usePlayerShooting(playerId)

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

  const color = player ? playerColor(player.id) : 'var(--orange)'

  // Shooting percentages: prefer computed from heat_entries; fallback to targets
  const ftPct   = shooting && shooting.ftAttempts > 0  ? shooting.ftMakes  / shooting.ftAttempts  : player?.target_ft_percent  ?? 0.75
  const midPct  = shooting && shooting.midAttempts > 0 ? shooting.midMakes / shooting.midAttempts  : player?.target_mid_percent ?? 0.5
  const tptPct  = shooting && shooting.tptAttempts > 0 ? shooting.tptMakes / shooting.tptAttempts  : player?.target_3pt_percent ?? 0.4
  const ftGoal  = player?.target_ft_percent  ?? 0.75
  const midGoal = player?.target_mid_percent ?? 0.5
  const tptGoal = player?.target_3pt_percent ?? 0.4

  const pct = (v: number) => Math.round(v * 100)

  if (!player) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p style={{ color: 'var(--faint)', fontSize: 13 }}>Loading…</p>
      </div>
    )
  }

  const wins   = wl?.wins   ?? 0
  const losses = wl?.losses ?? 0
  const total  = wins + losses

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
            <Avatar nickname={player.nickname} color={color} variant="active" size={62} />
            <div className="flex-1">
              <div className="font-heading text-[20px]">
                {player.name.split(' ')[0]} <span style={{ color: 'rgba(255,255,255,0.45)' }}>/ {player.nickname}</span>
              </div>
              <button
                onClick={() => nav(`/players/${player.id}/wl`)}
                className="inline-flex items-center gap-2 mt-1.5 px-3 py-1.5 rounded-full cursor-pointer border-0"
                style={{ background: 'rgba(255,255,255,0.08)', fontSize: 13, fontWeight: 700 }}
              >
                <span className="font-display text-[16px]">{wins}W</span>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>
                <span className="font-display text-[16px]">{losses}L</span>
                {total > 0 && <span className="text-[12px]" style={{ color: 'var(--green)' }}>{Math.round(wins / total * 100)}%</span>}
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
                {pct(ftPct)}% → Goal {pct(ftGoal)}% {ftPct >= ftGoal ? '✓' : '↑'}
              </span>
            </div>
            <ProgressBar value={ftPct} goal={ftGoal} />
          </div>

          {/* Mid% */}
          <div className="my-[13px] cursor-pointer" onClick={() => setChartMode('mid')}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="font-bold text-[13px] tracking-[.04em]">Mid%</span>
              <span className="text-[11px] text-[var(--dim)] font-semibold">
                {pct(midPct)}% → Goal {pct(midGoal)}% {midPct >= midGoal ? '✓' : '↑'}
              </span>
            </div>
            <ProgressBar value={midPct} goal={midGoal} />
          </div>

          {/* 3PT% */}
          <div className="my-[13px] cursor-pointer" onClick={() => setChartMode('three')}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="font-bold text-[13px] tracking-[.04em]">3PT%</span>
              <span className="text-[11px] text-[var(--dim)] font-semibold">
                {pct(tptPct)}% → Goal {pct(tptGoal)}% {tptPct >= tptGoal ? '✓' : '↑'}
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
          playerName={player.nickname}
          heatEntries={heatEntries}
        />
      )}
    </>
  )
}
