import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Icons } from '../components/ui/icons'
import { useDrillStore } from '../stores/drillStore'
import { usePlayers } from '../hooks/usePlayers'
import { PlayerPickerModal } from '../components/ui/PlayerPickerModal'
import { playerColor } from '../utils/playerColor'

import { type ShotSpot, SPOT_LABELS, SHOT_SPOTS, ALL_SHOT_TYPES } from '../types'

export default function DrillPage() {
  const nav = useNavigate()
  const {
    shotType, setShotType,
    hand, setHand,
    selectedSpots, toggleSpot,
    heatSize, setHeatSize,
    makesTargetPerSpot, setMakesTarget,
    players, setPlayers,
    currentSpotIndex, currentPlayerIndex, setCurrentPlayerIndex,
    currentMakes, setMakes,
    completedHeats,
    commitHeat,
    undoLastHeat,
    reset,
  } = useDrillStore()

  const { data: allPlayers = [], refetch: refetchPlayers } = usePlayers()

  const [setupStep, setSetupStep] = useState<number | null>(0)
  const [toastVisible, setToastVisible] = useState(false)
  const [playerPickerOpen, setPlayerPickerOpen] = useState(false)

  const activeSpot = selectedSpots[currentSpotIndex] as ShotSpot | undefined
  const activePlayer = players[currentPlayerIndex]

  const changeMakes = (delta: number) => {
    setMakes(currentMakes + delta)
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

          {/* Step 3 — Heat size */}
          {setupStep === 3 && (
            <div className="stagger" style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>
                Heat size (shots per heat)
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[5, 8, 10, 12, 15, 20].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => { setHeatSize(n); setSetupStep(4) }}
                    style={{
                      flex: '1 1 calc(33% - 8px)', minHeight: 64,
                      borderRadius: 'var(--r-md)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: heatSize === n ? 'rgba(255,90,31,0.1)' : 'var(--panel)',
                      border: heatSize === n ? '2px solid var(--orange)' : '1px solid var(--line)',
                      cursor: 'pointer',
                      fontSize: 20, fontWeight: 800, color: 'var(--chalk)',
                      fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 — Players (skip-able) */}
          {setupStep === 4 && (
            <div className="stagger" style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>
                Players
              </p>
              <p style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 16 }}>
                {players.length > 0
                  ? 'Tap to change who is shooting this drill.'
                  : 'Leave empty for a solo drill — pick players for a group drill.'}
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
                  color: 'var(--orange-2)', cursor: 'pointer',
                  fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                  fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                }}
              >
                <span style={{ width: 16, height: 16 }}>{Icons.plus}</span>
                {players.length > 0 ? 'Change Players' : 'Select Players'}
              </button>

              <Button variant="primary" className="w-full !min-h-[54px]" onClick={() => setSetupStep(5)}>
                Next →
              </Button>
            </div>
          )}

          {/* Step 5 — Makes target */}
          {setupStep === 5 && (
            <div className="stagger" style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>
                Makes target per spot
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {[5, 8, 10, 15, 20].map(n => (
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
              <Button variant="primary" className="w-full !min-h-[54px]" onClick={() => setSetupStep(null)}>
                Start Drill
              </Button>
            </div>
          )}
        </div>

        <PlayerPickerModal
          isOpen={playerPickerOpen}
          selectedIds={players.map(p => p.id)}
          onConfirm={(ids) => {
            const resolved = allPlayers.filter(p => ids.includes(p.id))
            if (resolved.length === ids.length) {
              // Every selected id (including any just-created player) is
              // already present in allPlayers — resolve immediately.
              setPlayers(resolved)
              setCurrentPlayerIndex(0)
              return
            }
            // A selected id (the just-created player, most likely) isn't in
            // allPlayers yet — useAddPlayer's onSuccess only kicks off an
            // invalidation, it doesn't await the refetch, so tapping Confirm
            // right after adding a new player can race ahead of it. Refetch
            // explicitly and resolve against the fresh result instead of
            // calling setPlayers with an incomplete list that would silently
            // drop the new player (task-3 review Finding 2).
            refetchPlayers().then(({ data }) => {
              const freshResolved = (data ?? []).filter(p => ids.includes(p.id))
              setPlayers(freshResolved)
              setCurrentPlayerIndex(0)
            })
          }}
          onClose={() => setPlayerPickerOpen(false)}
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
              <span className="font-display text-[64px] leading-[.9]">{currentMakes}</span>
              <span className="font-display text-[30px] text-[var(--faint)]">/{heatSize}</span>
            </div>
            <button
              onClick={() => changeMakes(1)}
              className="w-[60px] h-[60px] rounded-full text-[#0c0c0c] text-[30px] font-bold cursor-pointer border-0"
              style={{ background: 'var(--orange)' }}
            >+</button>
          </div>
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
      <div className="absolute bottom-[18px] left-[14px] right-[14px] flex gap-2.5">
        <Button variant="primary" className="flex-1 !min-h-[54px] !text-[14px]" onClick={saveHeat}>
          Save Heat & Next
        </Button>
        <Button variant="ghost" className="!flex-none !min-h-[54px] !text-[14px] !w-[110px]" onClick={() => nav('/drill/recap')}>
          End Drill
        </Button>
      </div>
    </div>
  )
}
