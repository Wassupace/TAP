import { useState, useRef } from 'react'
import type { SyncStatus } from '../../types'

interface StatusDotProps {
  status: SyncStatus
  pendingCount?: number
  lastSyncedAt?: Date | null
}

export function StatusDot({ status, pendingCount = 0, lastSyncedAt }: StatusDotProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const dotColor = status === 'online' ? '#10B981' : status === 'syncing' ? '#F59E0B' : '#6B7280'
  const label    = status === 'online' ? 'Online'  : status === 'syncing' ? 'Syncing' : 'Offline'

  const lastSyncText = lastSyncedAt
    ? `${Math.round((Date.now() - lastSyncedAt.getTime()) / 60000)} min ago`
    : 'Never'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '4px 6px', borderRadius: 8,
        }}
      >
        <span
          style={{
            width: 8, height: 8, borderRadius: '50%', background: dotColor,
            boxShadow: status !== 'offline' ? `0 0 5px ${dotColor}` : 'none',
            display: 'inline-block',
          }}
          className={status === 'syncing' ? 'sync-pulse' : ''}
        />
        <span style={{ fontSize: 11, color: 'var(--dim)', fontWeight: 600 }}>{label}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 50,
            background: 'var(--panel)', border: '1px solid var(--line-2)',
            borderRadius: 'var(--r-sm)', padding: '10px 14px',
            fontSize: 11, color: 'var(--dim)', whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div>Last synced: <strong style={{ color: 'var(--chalk)' }}>{lastSyncText}</strong></div>
          {pendingCount > 0 && (
            <div style={{ marginTop: 4 }}>{pendingCount} op{pendingCount !== 1 ? 's' : ''} pending</div>
          )}
        </div>
      )}

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 49 }}
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  )
}
