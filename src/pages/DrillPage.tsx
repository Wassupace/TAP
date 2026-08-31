import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Icons } from '../components/ui/icons'
import { useDrillStore } from '../stores/drillStore'
import { useSessionStore } from '../stores/sessionStore'
import { useResolvePickedPlayers } from '../hooks/useResolvePickedPlayers'
import { PlayerPickerModal } from '../components/ui/PlayerPickerModal'
import { NumberPad } from '../components/ui/NumberPad'
import { playerColor } from '../utils/playerColor'
import { supabase } from '../lib/supabase'

import { type ShotSpot, SPOT_LABELS, SHOT_SPOTS, ALL_SHOT_TYPES } from '../types'

export default function DrillPage() {
  const nav = useNavigate()
  const {
    shotType, setShotType,
    hand, setHand,
    selectedSpots, toggleSpot,
    heatSize, setHeatSize,
    manualMode, setManualMode,
    makesTargetPerSpot, setMakesTarget,
    players, setPlayers,
    currentSpotIndex, currentPlayerIndex, setCurrentPlayerIndex,
    currentMakes, setMakes,
    currentAttempts, setAttempts,
    completedHeats,
    commitHeat,
    advanceSpot,
    undoLastHeat,
    reset,
    setDrillId,
  } = useDrillStore()
  const { activeSessionId } = useSessionStore()

  const { resolveIds } = useResolvePickedPlayers()

  const [setupStep, setSetupStep] = useState<number | null>(0)
  const [toastVisible, setToastVisible] = useState(false)
  const [playerPickerOpen, setPlayerPickerOpen] = useState(false)
  const [numberPadOpen, setNumberPadOpen] = useState(false)
  const [attemptsNumberPadOpen, setAttemptsNumberPadOpen] = useState(false)
  const [heatSizeNumberPadOpen, setHeatSizeNumberPadOpen] = useState(false)
  const [targetNumberPadOpen, setTargetNumberPadOpen] = useState(false)
  // Task 5 (PRD's PAUSE rule): mid-drill roster edit reuses the same
  // PlayerPickerModal as setup Step 4 — opening it doesn't touch
  // completedHeats/currentMakes, so no explicit "pause" state is needed.
  const [rosterEditOpen, setRosterEditOpen] = useState(false)

  const activeSpot = selectedSpots[currentSpotIndex] as ShotSpot | undefined
  const activePlayer = players[currentPlayerIndex]

  const changeMakes = (delta: number) => {
    setMakes(currentMakes + delta)
  }

  const handleStart = async () => {
    try {
      const { data, error } = await supabase
        .from('drills')
        .insert({
          session_id: activeSessionId,
          shot_type: shotType,
          hand,
          selected_spots: selectedSpots,
          heat_size: manualMode ? null : heatSize,
          makes_target_per_spot: makesTargetPerSpot,
          player_ids: players.map(p => p.id),
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (!error && data) setDrillId(data.id)
    } catch {
      // Offline — drillId stays null. commitHeat()'s `if (drillId)` gate
      // means any heats logged during this drill are never persisted (not
      // queued for later) until a drill row exists.
    }
    setSetupStep(null)
  }

  const saveHeat = () => {
    const { drillComplete } = commitHeat()
    if (drillComplete) {
      nav('/drill/recap')
      return
    }
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 1200)
  }

  // Task 4 (PRD §7.2): "Next Spot" is available once >=1 heat has been
  // logged on the current spot by ANYONE (not just the active shooter) —
  // heatsForCurrentSpot below stays scoped to the active player for the
  // heat-history strip. In Manual mode, a not-yet-saved tally also counts
  // (advanceSpot() auto-saves it).
  const heatsAtCurrentSpotAnyPlayer = completedHeats.filter(h => h.spot === activeSpot)
  const canAdvanceSpot = heatsAtCurrentSpotAnyPlayer.length > 0
    || (manualMode && (currentMakes > 0 || currentAttempts > 0))

  const handleNextSpot = () => {
    const { drillComplete } = advanceSpot()
    if (drillComplete) {
      nav('/drill/recap')
      return
    }
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 1200)
  }

  const heatsForCurrentSpot = completedHeats.filter(
    h => h.spot === activeSpot && h.playerId === (activePlayer?.id ?? '')
  )

  // ── Setup wizard ──────────────────────────────────────────────────────────
  if (setupStep !== null) {
    return (
      <div className="min-h-dvh flex flex-col">
        <div className="flex-1 overflow-y-auto no-scrollbar px-[18px] pt-[54px] pb-24">
          <button
            onClick={() => {
              if (setupStep === 0) { reset(); nav('/') }
              else setSetupStep(s => (s ?? 1) - 1)
            }}
            className="flex items-center gap-1.5 text-[var(--dim)] font-bold text-[13px] bg-transparent border-0 cursor-pointer mb-3"
          >
            <span className="w-[18px] h-[18px]">{Icons.back}</span> {setupStep === 0 ? 'Session' : 'Back'}
          </button>

          <span className="font-display text-[19px] uppercase tracking-[.02em] block mb-6">New Drill</span>

          {/* Step 0 — Shot type */}
          {setupStep === 0 && (
            <div className="stagger" style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>
                Shot type
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ALL_SHOT_TYPES.map(({ type, label }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { setShotType(type); setSetupStep(1) }}
                    style={{
                      width: '100%', minHeight: 52,
                      borderRadius: 'var(--r-md)',
                      display: 'flex', alignItems: 'center', paddingLeft: 16,
                      background: shotType === type ? 'rgba(255,90,31,0.1)' : 'var(--panel)',
                      border: shotType === type ? '2px solid var(--orange)' : '1px solid var(--line)',
                      cursor: 'pointer',
                      fontSize: 14, fontWeight: 800, color: 'var(--chalk)',
                      fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 — Spots */}
          {setupStep === 1 && (
            <div className="stagger" style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>
                Select spots
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SHOT_SPOTS.map(spot => (
                  <button
                    key={spot}
                    type="button"
                    onClick={() => toggleSpot(spot)}
                    style={{
                      flex: '1 1 calc(33% - 8px)', minHeight: 52,
                      borderRadius: 'var(--r-md)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: selectedSpots.includes(spot) ? 'rgba(255,90,31,0.1)' : 'var(--panel)',
                      border: selectedSpots.includes(spot) ? '2px solid var(--orange)' : '1px solid var(--line)',
                      cursor: 'pointer',
                      fontSize: 13, fontWeight: 800, color: 'var(--chalk)',
                      fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                    }}
                  >
                    {selectedSpots.includes(spot) && '✓ '}{SPOT_LABELS[spot]}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <Button
                  variant="primary"
                  className="w-full !min-h-[54px]"
                  onClick={() => { if (selectedSpots.length > 0) setSetupStep(2) }}
                >
                  Next →
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 — Hand selection */}
          {setupStep === 2 && (
            <div className="stagger" style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>
                Which hand?
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                {(['left', 'right'] as const).map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => { setHand(h); setSetupStep(3) }}
                    style={{
                      flex: 1, minHeight: 88,
                      borderRadius: 'var(--r-md)',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 8,
                      background: hand === h ? 'rgba(255,90,31,0.1)' : 'var(--panel)',
                      border: hand === h ? '2px solid var(--orange)' : '1px solid var(--line)',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{h === 'left' ? '🤚' : '✋'}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--chalk)', textTransform: 'capitalize' }}>{h}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Heat size (PRD §7.1b: 5 / 10 / Player Input / Manual) */}
          {setupStep === 3 && (
            <div className="stagger" style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>
                Heat size (shots per heat)
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[5, 10].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => { setHeatSize(n); setManualMode(false); setSetupStep(4) }}
                    style={{
                      flex: '1 1 calc(50% - 8px)', minHeight: 64,
                      borderRadius: 'var(--r-md)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: !manualMode && heatSize === n ? 'rgba(255,90,31,0.1)' : 'var(--panel)',
                      border: !manualMode && heatSize === n ? '2px solid var(--orange)' : '1px solid var(--line)',
                      cursor: 'pointer',
                      fontSize: 20, fontWeight: 800, color: 'var(--chalk)',
                      fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                    }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setHeatSizeNumberPadOpen(true)}
                  style={{
                    flex: '1 1 calc(50% - 8px)', minHeight: 64,
                    borderRadius: 'var(--r-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: !manualMode && ![5, 10].includes(heatSize) ? 'rgba(255,90,31,0.1)' : 'var(--panel)',
                    border: !manualMode && ![5, 10].includes(heatSize) ? '2px solid var(--orange)' : '1px solid var(--line)',
                    cursor: 'pointer',
                    fontSize: 14, fontWeight: 800, color: 'var(--chalk)',
                    fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                  }}
                >
                  {!manualMode && ![5, 10].includes(heatSize) ? heatSize : 'Player Input'}
                </button>
                <button
                  type="button"
                  onClick={() => { setManualMode(true); setSetupStep(4) }}
                  style={{
                    flex: '1 1 calc(50% - 8px)', minHeight: 64,
                    borderRadius: 'var(--r-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: manualMode ? 'rgba(255,90,31,0.1)' : 'var(--panel)',
                    border: manualMode ? '2px solid var(--orange)' : '1px solid var(--line)',
                    cursor: 'pointer',
                    fontSize: 14, fontWeight: 800, color: 'var(--chalk)',
                    fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                  }}
                >
                  Manual
                </button>
              </div>
            </div>
          )}

          {/* Step 4 — Players (at least one required) */}
          {setupStep === 4 && (
            <div className="stagger" style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>
                Players
              </p>
              <p style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 16 }}>
                {players.length > 0
                  ? 'Tap to change who is shooting this drill.'
                  : 'Pick at least one player — in a solo drill, pick yourself.'}
              </p>

              {players.length > 0 && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                  {players.map(p => (
                    <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 56 }}>
                      <Avatar nickname={p.nickname || p.name} color={playerColor(p.id)} size={44} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 56 }}>
                        {p.nickname || p.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setPlayerPickerOpen(true)}
                style={{
                  width: '100%', minHeight: 52, marginBottom: 16,
                  borderRadius: 'var(--r-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'var(--panel-2)', border: '1px dashed var(--line-2)',
                  color: 'var(--orange)', cursor: 'pointer',
                  fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                  fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                }}
              >
                <span style={{ width: 16, height: 16 }}>{Icons.plus}</span>
                {players.length > 0 ? 'Change Players' : 'Select Players'}
              </button>

              <Button
                variant="primary"
                className="w-full !min-h-[54px]"
                onClick={() => {
                  if (players.length === 0) return
                  // Task 2 (PRD §7.3): group drills skip the optional target step
                  // entirely (fixed attempt quota only) — solo keeps it.
                  if (players.length > 1) handleStart()
                  else setSetupStep(5)
                }}
              >
                {players.length > 1 ? 'Start Drill' : 'Next →'}
              </Button>
            </div>
          )}

          {/* Step 5 — Makes target (solo only, PRD §7.3): 10 / 50 / 100 / Player Input / None */}
          {setupStep === 5 && (
            <div className="stagger" style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>
                Makes target per spot
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {[10, 50, 100].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMakesTarget(n)}
                    style={{
                      flex: '1 1 calc(33% - 8px)', minHeight: 64,
                      borderRadius: 'var(--r-md)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: makesTargetPerSpot === n ? 'rgba(255,90,31,0.1)' : 'var(--panel)',
                      border: makesTargetPerSpot === n ? '2px solid var(--orange)' : '1px solid var(--line)',
                      cursor: 'pointer',
                      fontSize: 20, fontWeight: 800, color: 'var(--chalk)',
                      fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                    }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setTargetNumberPadOpen(true)}
                  style={{
                    flex: '1 1 calc(33% - 8px)', minHeight: 64,
                    borderRadius: 'var(--r-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: makesTargetPerSpot !== undefined && ![10, 50, 100].includes(makesTargetPerSpot) ? 'rgba(255,90,31,0.1)' : 'var(--panel)',
                    border: makesTargetPerSpot !== undefined && ![10, 50, 100].includes(makesTargetPerSpot) ? '2px solid var(--orange)' : '1px solid var(--line)',
                    cursor: 'pointer',
                    fontSize: 13, fontWeight: 800, color: 'var(--chalk)',
                    fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                  }}
                >
                  {makesTargetPerSpot !== undefined && ![10, 50, 100].includes(makesTargetPerSpot) ? makesTargetPerSpot : 'Player Input'}
                </button>
                <button
                  type="button"
                  onClick={() => setMakesTarget(undefined)}
                  style={{
                    flex: '1 1 calc(33% - 8px)', minHeight: 64,
                    borderRadius: 'var(--r-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: makesTargetPerSpot === undefined ? 'rgba(255,90,31,0.1)' : 'var(--panel)',
                    border: makesTargetPerSpot === undefined ? '2px solid var(--orange)' : '1px solid var(--line)',
                    cursor: 'pointer',
                    fontSize: 13, fontWeight: 800, color: 'var(--chalk)',
                    fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                  }}
                >
                  None
                </button>
              </div>
              <Button variant="primary" className="w-full !min-h-[54px]" onClick={handleStart}>
                Start Drill
              </Button>
            </div>
          )}
        </div>

        <PlayerPickerModal
          isOpen={playerPickerOpen}
          selectedIds={players.map(p => p.id)}
          onConfirm={(ids) => {
            // resolveIds handles the new-player-creation race (task-3 review
            // Finding 2) — see src/hooks/useResolvePickedPlayers.ts.
            resolveIds(ids).then((resolved) => {
              setPlayers(resolved)
              setCurrentPlayerIndex(0)
            })
          }}
          onClose={() => setPlayerPickerOpen(false)}
        />

        <NumberPad
          isOpen={heatSizeNumberPadOpen}
          value={heatSize}
          label="Heat size"
          onConfirm={(v) => { if (v > 0) { setHeatSize(v); setManualMode(false); setSetupStep(4) } }}
          onClose={() => setHeatSizeNumberPadOpen(false)}
        />
        <NumberPad
          isOpen={targetNumberPadOpen}
          value={makesTargetPerSpot ?? 0}
          label="Makes target per spot"
          onConfirm={(v) => setMakesTarget(v > 0 ? v : undefined)}
          onClose={() => setTargetNumberPadOpen(false)}
        />
      </div>
    )
  }

  // ── Active drill view ─────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh flex flex-col">
      <div className="flex-1 overflow-y-auto no-scrollbar px-[18px] pt-[54px] pb-24">
        <button onClick={() => nav('/')} className="flex items-center gap-1.5 text-[var(--dim)] font-bold text-[13px] bg-transparent border-0 cursor-pointer mb-3">
          <span className="w-[18px] h-[18px]">{Icons.back}</span> Session
        </button>

        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-[19px] uppercase tracking-[.02em]">
            {ALL_SHOT_TYPES.find(t => t.type === shotType)?.label ?? 'Drill'}
          </span>
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold capitalize" style={{ background: 'rgba(34,197,94,.14)', color: 'var(--green)' }}>
            {hand} hand
          </div>
        </div>

        {/* Spot queue */}
        <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">Spot Queue</p>
        <div className="flex gap-1.5 mb-5">
          {selectedSpots.map((spot, idx) => {
            const state = idx < currentSpotIndex ? 'done' : idx === currentSpotIndex ? 'active' : 'upcoming'
            return (
              <div
                key={spot}
                className={`flex-1 text-center py-2.5 text-[12px] font-bold spot-${state}`}
                style={state === 'active'
                  ? { background: 'var(--orange)', color: '#fff', borderRadius: 'var(--r-sm)' }
                  : { borderRadius: 'var(--r-sm)' }
                }
              >
                {state === 'done' && '✓ '}{SPOT_LABELS[spot]}
              </div>
            )
          })}
        </div>

        {/* Makes counter */}
        <div className="p-6 text-center mb-5" style={{ background: 'var(--panel-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)' }}>
          {activePlayer && (
            <p className="font-display text-[26px] uppercase tracking-[.02em] leading-none mb-2" style={{ color: 'var(--chalk)' }}>
              {activePlayer.nickname || activePlayer.name}
            </p>
          )}
          <p className="text-[11px] tracking-[.1em] uppercase text-[var(--faint)] font-bold mb-4">
            {activeSpot ? SPOT_LABELS[activeSpot] : '—'}
          </p>
          <div className="text-[11px] tracking-[.1em] uppercase text-[var(--faint)] font-bold mb-3">MAKES THIS HEAT</div>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => changeMakes(-1)}
              className="w-[60px] h-[60px] rounded-full text-chalk text-[30px] font-bold cursor-pointer border"
              style={{ background: 'var(--panel-3)', borderColor: 'var(--line-2)' }}
            >−</button>
            <div>
              <button
                type="button"
                onClick={() => setNumberPadOpen(true)}
                className="font-display text-[64px] leading-[.9] bg-transparent border-0 p-0 cursor-pointer"
                style={{ color: 'inherit' }}
              >
                {currentMakes}
              </button>
              {!manualMode && <span className="font-display text-[30px] text-[var(--faint)]">/{heatSize}</span>}
            </div>
            <button
              onClick={() => changeMakes(1)}
              className="w-[60px] h-[60px] rounded-full text-[#0c0c0c] text-[30px] font-bold cursor-pointer border-0"
              style={{ background: 'var(--orange)' }}
            >+</button>
          </div>

          {/* Manual mode (PRD §7.1b/§7.3): no fixed heat size — attempts are
              tallied alongside makes instead of a fixed denominator. */}
          {manualMode && (
            <>
              <div className="text-[11px] tracking-[.1em] uppercase text-[var(--faint)] font-bold mt-5 mb-3">ATTEMPTS THIS HEAT</div>
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => setAttempts(currentAttempts - 1)}
                  className="w-[48px] h-[48px] rounded-full text-chalk text-[24px] font-bold cursor-pointer border"
                  style={{ background: 'var(--panel-3)', borderColor: 'var(--line-2)' }}
                >−</button>
                <button
                  type="button"
                  onClick={() => setAttemptsNumberPadOpen(true)}
                  className="font-display text-[40px] leading-[.9] bg-transparent border-0 p-0 cursor-pointer"
                  style={{ color: 'inherit' }}
                >
                  {currentAttempts}
                </button>
                <button
                  onClick={() => setAttempts(currentAttempts + 1)}
                  className="w-[48px] h-[48px] rounded-full text-[#0c0c0c] text-[24px] font-bold cursor-pointer border-0"
                  style={{ background: 'var(--orange)' }}
                >+</button>
              </div>
            </>
          )}
        </div>

        {/* Roster strip — manual shooter override */}
        {players.length > 0 && (
          <>
            <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">Shooter</p>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar mb-5" style={{ paddingBottom: 2 }}>
              {players.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setCurrentPlayerIndex(idx)}
                  title={p.nickname || p.name}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
                    width: 52, opacity: idx === currentPlayerIndex ? 1 : 0.5,
                  }}
                >
                  <Avatar
                    nickname={p.nickname || p.name}
                    color={playerColor(p.id)}
                    variant={idx === currentPlayerIndex ? 'active' : 'default'}
                    size={44}
                  />
                  <span
                    className="text-[10px] font-bold"
                    style={{
                      color: idx === currentPlayerIndex ? 'var(--chalk)' : 'var(--faint)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 52,
                    }}
                  >
                    {p.nickname || p.name}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Heat history */}
        {heatsForCurrentSpot.length > 0 && (
          <>
            <p className="text-[11px] tracking-[.2em] uppercase text-[var(--faint)] font-bold mb-2">
              Heats · {activeSpot ? SPOT_LABELS[activeSpot] : '—'}
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {heatsForCurrentSpot.map((h, i) => {
                const pct = Math.round((h.makes / h.attempts) * 100)
                return (
                  <div key={i} className="flex-none p-[9px_13px] text-center" style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', borderLeft: '3px solid var(--green)' }}>
                    <div className="text-[10px] text-[var(--faint)] font-bold">H{h.heatNumber}</div>
                    <div className="font-display text-[15px]">{h.makes}/{h.attempts}</div>
                    <div className="text-[11px]" style={{ color: 'var(--green)' }}>{pct}%</div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Undo last heat */}
        {completedHeats.length > 0 && (
          <button
            type="button"
            onClick={() => undoLastHeat()}
            style={{
              width: '100%', minHeight: 44,
              background: 'transparent',
              border: '1px solid var(--panel-3)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--dim)', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', marginTop: 8,
              fontFamily: '"Archivo Expanded", Archivo, sans-serif',
              letterSpacing: '0.04em', textTransform: 'uppercase' as const,
            }}
          >
            ↩ Undo Last Heat
          </button>
        )}
      </div>

      {/* Toast */}
      {toastVisible && (
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 text-[#06210f] font-bold uppercase tracking-[.05em] text-[15px] px-[26px] py-4 toast-show" style={{ borderRadius: 'var(--r-md)', background: 'rgba(34,197,94,.95)', boxShadow: '0 16px 40px -10px rgba(34,197,94,.6)' }}>
          ✓ Heat saved — next spot
        </div>
      )}

      {/* Floating bar */}
      <div className="absolute bottom-[18px] left-[14px] right-[14px] flex flex-col gap-2.5">
        <div className="flex gap-2.5">
          <Button variant="ghost" className="!flex-none !w-[54px] !min-h-[54px]" onClick={() => setRosterEditOpen(true)}>
            <span className="w-5 h-5">{Icons.roster}</span>
          </Button>
          <Button variant="primary" className="flex-1 !min-h-[54px] !text-[14px]" onClick={saveHeat}>
            Save Heat & Next
          </Button>
          <Button variant="ghost" className="!flex-none !min-h-[54px] !text-[14px] !w-[110px]" onClick={() => nav('/drill/recap')}>
            End Drill
          </Button>
        </div>
        {/* Next Spot (Task 4, PRD §7.2): always available once >=1 heat has
            been logged on the current spot, regardless of any makes target. */}
        <Button variant="ghost" className="!min-h-[46px] !text-[13px]" onClick={handleNextSpot} disabled={!canAdvanceSpot}>
          Next Spot →
        </Button>
      </div>

      <NumberPad
        isOpen={numberPadOpen}
        value={currentMakes}
        label="Makes this heat"
        onConfirm={setMakes}
        onClose={() => setNumberPadOpen(false)}
      />
      <NumberPad
        isOpen={attemptsNumberPadOpen}
        value={currentAttempts}
        label="Attempts this heat"
        onConfirm={setAttempts}
        onClose={() => setAttemptsNumberPadOpen(false)}
      />

      {/* Pause mid-heat (Task 5, PRD PAUSE rule): the shared player picker,
          opened without touching completedHeats/currentMakes. */}
      <PlayerPickerModal
        isOpen={rosterEditOpen}
        selectedIds={players.map(p => p.id)}
        onConfirm={(ids) => {
          resolveIds(ids).then((resolved) => {
            setPlayers(resolved)
            setCurrentPlayerIndex(0)
          })
        }}
        onClose={() => setRosterEditOpen(false)}
      />
    </div>
  )
}
