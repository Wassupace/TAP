import { useState, type CSSProperties } from 'react'
import { Avatar } from './Avatar'
import { Icons } from './icons'
import { usePlayers, useAddPlayer } from '../../hooks/usePlayers'
import { playerColor } from '../../utils/playerColor'
import { matchesPlayerQuery } from '../../utils/matchesPlayerQuery'

export interface PlayerPickerModalProps {
  isOpen: boolean
  selectedIds: string[]
  onConfirm: (ids: string[]) => void
  onClose: () => void
}

const inputStyle = (filled: boolean): CSSProperties => ({
  width: '100%', background: 'var(--panel-3)',
  border: `1px solid ${filled ? 'var(--orange)' : 'var(--line-2)'}`,
  borderRadius: 'var(--r-sm)', color: 'var(--chalk)', fontSize: 15,
  padding: '10px 12px', outline: 'none',
  fontFamily: 'Archivo, sans-serif', boxSizing: 'border-box',
})

const fieldLabel: CSSProperties = {
  fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase',
  letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6,
}

export function PlayerPickerModal({ isOpen, selectedIds, onConfirm, onClose }: PlayerPickerModalProps) {
  const { data: players = [], isLoading, isError } = usePlayers()
  const addPlayer = useAddPlayer()

  const [selection, setSelection] = useState<string[]>(selectedIds)
  const [query, setQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newNickname, setNewNickname] = useState('')

  // Re-seed all local state from the caller's props whenever the modal
  // transitions from closed to open — this is React's documented pattern for
  // adjusting state on a prop change (done during render, not in an effect,
  // so it resolves in the same commit instead of causing an extra render
  // pass). Once open, `selection` etc. become the working draft and should
  // not resync if `selectedIds` changes underneath it while still open.
  const [wasOpen, setWasOpen] = useState(isOpen)
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) {
      setSelection(selectedIds)
      setQuery('')
      setShowAddForm(false)
      setNewName('')
      setNewNickname('')
    }
  }

  if (!isOpen) return null

  const filtered = players.filter(p => matchesPlayerQuery(p, query))
  const canSaveNew = newName.trim().length > 0 && newNickname.trim().length > 0

  function toggle(id: string) {
    setSelection(sel => (sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]))
  }

  function cancelAddForm() {
    setShowAddForm(false)
    setNewName('')
    setNewNickname('')
  }

  function handleConfirm() {
    onConfirm(selection)
    onClose()
  }

  async function handleSaveNewPlayer() {
    if (!canSaveNew) return
    const created = await addPlayer.mutateAsync({
      name: newName.trim(),
      nickname: newNickname.trim(),
      target_ft_percent: 0.75,
      target_mid_percent: 0.5,
      target_3pt_percent: 0.4,
    })
    setSelection(sel => (sel.includes(created.id) ? sel : [...sel, created.id]))
    cancelAddForm()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: 'var(--panel)',
          borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
          padding: '24px 18px 40px',
          maxHeight: '85dvh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
          <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 18 }}>
            Select Players
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center',
                background: 'var(--panel-2)', border: '1px solid var(--line-2)', color: 'var(--faint)',
                fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: 0,
              }}
            >
              ×
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              style={{
                padding: '9px 18px', borderRadius: 'var(--r-sm)', border: 'none',
                background: 'linear-gradient(180deg, var(--orange-2), var(--orange))',
                color: '#fff', fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em',
                cursor: 'pointer', boxShadow: 'var(--accent-glow)', whiteSpace: 'nowrap',
              }}
            >
              Confirm{selection.length > 0 ? ` (${selection.length})` : ''}
            </button>
          </div>
        </div>

        {/* Search */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 14,
            background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)',
            flexShrink: 0,
          }}
        >
          <span style={{ width: 18, height: 18, color: 'var(--faint)' }}>{Icons.search}</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search players…"
            style={{
              flex: 1, background: 'transparent', border: 0, outline: 'none',
              color: 'var(--chalk)', fontSize: 14, fontFamily: 'Archivo, sans-serif',
            }}
          />
        </div>

        {/* Player list */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 14 }}>
          {isLoading && (
            <div style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 13, padding: '30px 0' }}>
              Loading roster…
            </div>
          )}

          {!isLoading && isError && (
            <div style={{ textAlign: 'center', color: 'var(--red)', fontSize: 13, padding: '30px 0' }}>
              Could not load players. Check your Supabase connection.
            </div>
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 13, padding: '30px 0' }}>
              {players.length === 0 ? 'No players in roster yet.' : `No players match "${query}".`}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(p => {
              const isSelected = selection.includes(p.id)
              const color = playerColor(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                    padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
                    background: isSelected ? 'rgba(255,90,31,0.12)' : 'var(--panel-2)',
                    border: `1px solid ${isSelected ? 'rgba(255,90,31,0.3)' : 'var(--line)'}`,
                    borderLeft: isSelected ? '3px solid var(--orange)' : `1px solid ${isSelected ? 'rgba(255,90,31,0.3)' : 'var(--line)'}`,
                    borderRadius: 'var(--r-sm)',
                  }}
                >
                  <Avatar nickname={p.nickname} color={color} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--chalk)' }}>{p.nickname}</div>
                    <div style={{ fontSize: 12, color: 'var(--dim)' }}>{p.name}</div>
                  </div>
                  <div
                    style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      display: 'grid', placeItems: 'center',
                      background: isSelected ? 'var(--orange)' : 'var(--panel-3)',
                      color: isSelected ? '#fff' : 'var(--faint)',
                    }}
                  >
                    <span style={{ width: 14, height: 14 }}>{isSelected ? Icons.check : Icons.plus}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer: add new player (fixed, does not scroll with the list) */}
        <div style={{ flexShrink: 0 }}>
          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 14px', borderRadius: 'var(--r-md)',
                background: 'var(--panel-2)', border: '1px dashed var(--line-2)',
                color: 'var(--orange-2)', fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em',
                cursor: 'pointer',
              }}
            >
              <span style={{ width: 16, height: 16 }}>{Icons.plus}</span>
              Add New Player
            </button>
          ) : (
            <div style={{ background: 'var(--panel-2)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-md)', padding: 14 }}>
              <label style={{ display: 'block', marginBottom: 10 }}>
                <p style={fieldLabel}>Full Name <span style={{ color: 'var(--orange)' }}>*</span></p>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Jordan Carter"
                  autoFocus
                  style={inputStyle(newName.trim().length > 0)}
                />
              </label>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <p style={fieldLabel}>Nickname <span style={{ color: 'var(--orange)' }}>*</span></p>
                <input
                  type="text"
                  value={newNickname}
                  onChange={e => setNewNickname(e.target.value)}
                  placeholder="e.g. JC"
                  style={inputStyle(newNickname.trim().length > 0)}
                />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={cancelAddForm}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 'var(--r-sm)',
                    background: 'var(--panel-3)', border: '1px solid var(--line-2)',
                    color: 'var(--dim)', fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                    fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewPlayer}
                  disabled={!canSaveNew || addPlayer.isPending}
                  style={{
                    flex: 2, padding: '10px 0', borderRadius: 'var(--r-sm)', border: 'none',
                    background: canSaveNew ? 'linear-gradient(180deg, var(--orange-2), var(--orange))' : 'var(--panel-3)',
                    color: canSaveNew ? '#fff' : 'var(--faint)',
                    fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                    fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em',
                    cursor: canSaveNew ? 'pointer' : 'not-allowed',
                  }}
                >
                  {addPlayer.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
