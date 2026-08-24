import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Tag } from '../components/ui/Tag'
import { Icons } from '../components/ui/icons'
import { usePlayers, useAddPlayer } from '../hooks/usePlayers'
import { usePlayerWL } from '../hooks/usePlayerStats'
import { playerColor } from '../utils/playerColor'
import type { Player } from '../types'

function AddPlayerSheet({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const addPlayer = useAddPlayer()

  const canSave = name.trim().length > 0 && nickname.trim().length > 0

  async function handleSave() {
    if (!canSave) return
    await addPlayer.mutateAsync({
      name: name.trim(),
      nickname: nickname.trim(),
      target_ft_percent: 0.75,
      target_mid_percent: 0.5,
      target_3pt_percent: 0.4,
    })
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: 'var(--panel)', borderRadius: 'var(--r-lg) var(--r-lg) 0 0', padding: '24px 18px 40px' }}>
        <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 18, marginBottom: 20 }}>Add Player</div>
        <label style={{ display: 'block', marginBottom: 14 }}>
          <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8 }}>Full Name <span style={{ color: 'var(--orange)' }}>*</span></p>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jordan Carter" autoFocus style={{ width: '100%', background: 'var(--panel-2)', border: `1px solid ${name.trim() ? 'var(--orange)' : 'var(--line-2)'}`, borderRadius: 'var(--r-sm)', color: 'var(--chalk)', fontSize: 16, padding: '12px 14px', outline: 'none', fontFamily: 'Archivo, sans-serif', boxSizing: 'border-box' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 24 }}>
          <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8 }}>Nickname <span style={{ color: 'var(--orange)' }}>*</span></p>
          <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. JC" style={{ width: '100%', background: 'var(--panel-2)', border: `1px solid ${nickname.trim() ? 'var(--orange)' : 'var(--line-2)'}`, borderRadius: 'var(--r-sm)', color: 'var(--chalk)', fontSize: 16, padding: '12px 14px', outline: 'none', fontFamily: 'Archivo, sans-serif', boxSizing: 'border-box' }} />
        </label>
        <button type="button" onClick={handleSave} disabled={!canSave || addPlayer.isPending} style={{ width: '100%', minHeight: 58, background: canSave ? 'linear-gradient(180deg, var(--orange-2), var(--orange))' : 'var(--panel-2)', border: 'none', borderRadius: 'var(--r-md)', color: canSave ? '#fff' : 'var(--faint)', fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.04em', cursor: canSave ? 'pointer' : 'not-allowed', boxShadow: canSave ? 'var(--accent-glow)' : 'none' }}>
          {addPlayer.isPending ? 'Saving…' : 'Add Player'}
        </button>
      </div>
    </div>
  )
}

// One roster row, extracted so `usePlayerWL` can be called per-row (a hook
// can't be called inside the `.map()` below without violating rules-of-
// hooks) — one extra query per visible row is acceptable at this app's
// roster scale (Task 12 brief). Fixes PRD bug §12.1's "wasted space" on the
// roster row with a W-L pill, e.g. "12-4", or "–" before the player has any
// games yet.
function PlayerRosterRow({
  player, isHovered, color, onClick, onHoverStart, onHoverEnd,
}: {
  player: Player
  isHovered: boolean
  color: string
  onClick: () => void
  onHoverStart: () => void
  onHoverEnd: () => void
}) {
  const { data: wl } = usePlayerWL(player.id)
  const total = (wl?.wins ?? 0) + (wl?.losses ?? 0)
  const wlLabel = total > 0 ? `${wl!.wins}-${wl!.losses}` : '–'
  const wlVariant = total === 0 ? 'neutral' : wl!.wins >= wl!.losses ? 'positive' : 'negative'

  return (
    <button
      onClick={onClick}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      className="w-full flex gap-3 items-center p-[13px_14px] cursor-pointer text-left transition-all"
      style={{
        background: isHovered ? 'var(--panel-2)' : 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
        borderLeft: isHovered ? `3px solid ${color}` : '1px solid var(--line)',
        paddingLeft: isHovered ? 11 : 14,
      }}
    >
      <Avatar nickname={player.nickname} color={color} />
      <div className="flex-1">
        <div className="font-bold text-[14px]">{player.nickname}</div>
        <div className="text-[12px] text-[var(--dim)]">{player.name}</div>
      </div>
      <Tag variant={wlVariant}>{wlLabel}</Tag>
    </button>
  )
}

export default function PlayersPage() {
  const nav = useNavigate()
  const [query, setQuery] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const { data: players = [], isLoading, isError } = usePlayers()

  const filtered = players.filter(
    (p) =>
      p.nickname.toLowerCase().includes(query.toLowerCase()) ||
      p.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="min-h-dvh px-[18px] pt-[54px] pb-8">
      <BackButton onClick={() => nav('/')}>Dashboard</BackButton>

      {/* Hero gradient header */}
      <div style={{
        background: 'var(--hero-gradient)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--r-lg)',
        padding: '16px 18px', marginBottom: 16, marginTop: 16,
      }}>
        <p style={{ fontSize: 11, color: 'var(--hero-eyebrow)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>Roster</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 20 }}>Players</div>
          <button type="button" onClick={() => setShowAdd(true)} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'var(--chalk)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <span style={{ width: 18, height: 18 }}>{Icons.plus}</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 px-4 py-3 mb-4" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
        <span className="w-[18px] h-[18px] text-[var(--faint)]">{Icons.search}</span>
        <input
          type="text"
          placeholder="Search players…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="bg-transparent border-0 outline-none text-[14px] text-chalk placeholder:text-[var(--faint)] flex-1"
        />
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 13, padding: '40px 0' }}>Loading roster…</div>
      )}

      {isError && (
        <div style={{ textAlign: 'center', color: 'var(--red)', fontSize: 13, padding: '40px 0' }}>Could not load players. Check your Supabase connection.</div>
      )}

      {!isLoading && !isError && players.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--panel)', border: '1px dashed var(--line-2)', borderRadius: 'var(--r-lg)' }}>
          <p style={{ color: 'var(--dim)', fontSize: 13, marginBottom: 16 }}>No players yet — add your crew.</p>
          <button type="button" onClick={() => setShowAdd(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--orange)', color: '#fff', fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            <span style={{ width: 16, height: 16 }}>{Icons.plus}</span>Add First Player
          </button>
        </div>
      )}

      <div className="space-y-2 stagger">
        {filtered.map(p => (
          <PlayerRosterRow
            key={p.id}
            player={p}
            isHovered={hoveredId === p.id}
            color={playerColor(p.id)}
            onClick={() => nav(`/players/${p.id}`)}
            onHoverStart={() => setHoveredId(p.id)}
            onHoverEnd={() => setHoveredId(null)}
          />
        ))}
      </div>

      {showAdd && <AddPlayerSheet onClose={() => setShowAdd(false)} />}
    </div>
  )
}
