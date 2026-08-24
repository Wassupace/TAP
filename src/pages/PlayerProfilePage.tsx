import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BackButton } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Icons } from '../components/ui/icons'
import { ShotChart } from '../components/ui/ShotChart'
import { ProgressBar } from '../components/ui/ProgressBar'
import { useAttendanceStats } from '../hooks/useAttendanceStats'
import { usePlayer, useUpdatePlayer } from '../hooks/usePlayers'
import { usePlayerWL, usePlayerShooting } from '../hooks/usePlayerStats'
import { playerColor } from '../utils/playerColor'
import { isPlayerEditValid, fractionToPercentInput, percentInputToFraction } from '../utils/playerEditForm'
import { supabase } from '../lib/supabase'
import type { ChartMode, HeatEntry, Player } from '../types'

// ── Edit Player sheet (PRD §4.1) ────────────────────────────────────────────
// Opened from the pencil affordance on the hero card below. Same bottom-sheet
// shell and required-field validation pattern as `PlayersPage.tsx`'s
// `AddPlayerSheet`, plus three plain number inputs (0-100) for the shooting
// targets, pre-filled from the player's current target_*_percent (x100) and
// converted back to the stored 0-1 range on save via useUpdatePlayer() —
// that hook already existed with zero call sites before this task.
function EditPlayerSheet({ player, onClose }: { player: Player; onClose: () => void }) {
  const [name, setName] = useState(player.name)
  const [nickname, setNickname] = useState(player.nickname)
  const [ftPercent, setFtPercent] = useState(String(fractionToPercentInput(player.target_ft_percent)))
  const [midPercent, setMidPercent] = useState(String(fractionToPercentInput(player.target_mid_percent)))
  const [tptPercent, setTptPercent] = useState(String(fractionToPercentInput(player.target_3pt_percent)))
  const updatePlayer = useUpdatePlayer()

  const canSave = isPlayerEditValid(name, nickname)

  async function handleSave() {
    if (!canSave) return
    await updatePlayer.mutateAsync({
      id: player.id,
      name: name.trim(),
      nickname: nickname.trim(),
      target_ft_percent: percentInputToFraction(Number(ftPercent)),
      target_mid_percent: percentInputToFraction(Number(midPercent)),
      target_3pt_percent: percentInputToFraction(Number(tptPercent)),
    })
    onClose()
  }

  const textInputStyle = (filled: boolean) => ({
    width: '100%', background: 'var(--panel-2)', border: `1px solid ${filled ? 'var(--orange)' : 'var(--line-2)'}`,
    borderRadius: 'var(--r-sm)', color: 'var(--chalk)', fontSize: 16, padding: '12px 14px', outline: 'none',
    fontFamily: 'Archivo, sans-serif', boxSizing: 'border-box' as const,
  })

  const numberInputStyle = {
    width: '100%', background: 'var(--panel-2)', border: '1px solid var(--line-2)',
    borderRadius: 'var(--r-sm)', color: 'var(--chalk)', fontSize: 16, padding: '12px 14px', outline: 'none',
    fontFamily: 'Archivo, sans-serif', boxSizing: 'border-box' as const,
  }

  const labelStyle = { fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8 }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: 'var(--panel)', borderRadius: 'var(--r-lg) var(--r-lg) 0 0', padding: '24px 18px 40px' }}>
        <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 18, marginBottom: 20 }}>Edit Player</div>

        <label style={{ display: 'block', marginBottom: 14 }}>
          <p style={labelStyle}>Full Name <span style={{ color: 'var(--orange)' }}>*</span></p>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jordan Carter" autoFocus style={textInputStyle(name.trim().length > 0)} />
        </label>
        <label style={{ display: 'block', marginBottom: 20 }}>
          <p style={labelStyle}>Nickname <span style={{ color: 'var(--orange)' }}>*</span></p>
          <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. JC" style={textInputStyle(nickname.trim().length > 0)} />
        </label>

        <p style={labelStyle}>Shooting Targets (%)</p>
        <div className="flex gap-2.5" style={{ marginBottom: 24 }}>
          <label style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 6 }}>FT%</p>
            <input type="number" min={0} max={100} value={ftPercent} onChange={(e) => setFtPercent(e.target.value)} style={numberInputStyle} />
          </label>
          <label style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 6 }}>Mid%</p>
            <input type="number" min={0} max={100} value={midPercent} onChange={(e) => setMidPercent(e.target.value)} style={numberInputStyle} />
          </label>
          <label style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 6 }}>3PT%</p>
            <input type="number" min={0} max={100} value={tptPercent} onChange={(e) => setTptPercent(e.target.value)} style={numberInputStyle} />
          </label>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || updatePlayer.isPending}
          style={{
            width: '100%', minHeight: 58, background: canSave ? 'linear-gradient(180deg, var(--orange-2), var(--orange))' : 'var(--panel-2)',
            border: 'none', borderRadius: 'var(--r-md)', color: canSave ? '#fff' : 'var(--faint)',
            fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.04em',
            cursor: canSave ? 'pointer' : 'not-allowed', boxShadow: canSave ? 'var(--accent-glow)' : 'none',
          }}
        >
          {updatePlayer.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

export default function PlayerProfilePage() {
  const nav = useNavigate()
  const { id: playerId = '' } = useParams()
  const [chartMode, setChartMode] = useState<ChartMode | null>(null)
  const [showEdit, setShowEdit] = useState(false)

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
              <div className="font-heading text-[20px] flex items-center gap-2">
                <span>{player.name.split(' ')[0]} <span style={{ color: 'rgba(255,255,255,0.45)' }}>/ {player.nickname}</span></span>
                <button
                  type="button"
                  onClick={() => setShowEdit(true)}
                  aria-label="Edit player"
                  className="cursor-pointer border-0"
                  style={{ width: 22, height: 22, display: 'grid', placeItems: 'center', background: 'none', color: 'rgba(255,255,255,0.45)', padding: 0, flexShrink: 0 }}
                >
                  <span style={{ width: 14, height: 14 }}>{Icons.edit}</span>
                </button>
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

      {/* Edit player sheet, opened via the pencil affordance on the hero card */}
      {showEdit && (
        <EditPlayerSheet player={player} onClose={() => setShowEdit(false)} />
      )}
    </>
  )
}
