import { useNavigate } from 'react-router-dom'
import { BackButton } from '../components/ui/Button'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { StatusDot } from '../components/ui/StatusDot'

export default function SettingsPage() {
  const nav = useNavigate()
  const { status, pendingCount, lastSyncedAt } = useOnlineStatus()

  const row = (
    label: string,
    sub: string,
    onClick?: () => void,
    right?: React.ReactNode
  ) => (
    <div
      key={label}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 0', borderBottom: '1px solid var(--line)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--chalk)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>{sub}</div>
      </div>
      {right ?? (onClick ? <span style={{ color: 'var(--faint)', fontSize: 18 }}>›</span> : null)}
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', padding: '54px 18px 0' }}>
      <div style={{ marginBottom: 16 }}>
        <BackButton onClick={() => nav(-1)}>Back</BackButton>
      </div>

      {/* Hero header */}
      <div style={{
        background: 'var(--hero-gradient)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--r-lg)',
        padding: '16px 18px', marginBottom: 24,
      }}>
        <p style={{ fontSize: 11, color: '#93C5FD', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>
          TAP
        </p>
        <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 20 }}>
          Settings
        </div>
        <p style={{ fontSize: 12, color: 'var(--dim)', margin: '2px 0 0' }}>v1.0 — PRD v5.4</p>
      </div>

      {/* Data & Export */}
      <p style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>
        Data & Export
      </p>
      <div style={{ background: 'var(--panel)', borderRadius: 'var(--r-md)', padding: '0 16px' }}>
        {row('Google Sheets Export', 'One-tap full data export', () => nav('/settings/sheets'))}
        {row(
          'Supabase Status',
          `${status === 'online' ? 'Online' : status === 'syncing' ? 'Syncing…' : 'Offline'}${pendingCount > 0 ? ` · ${pendingCount} pending` : ''}`,
          undefined,
          <StatusDot status={status} pendingCount={pendingCount} lastSyncedAt={lastSyncedAt} />
        )}
      </div>

      {/* About */}
      <p style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, marginTop: 24, marginBottom: 4 }}>
        About
      </p>
      <div style={{ background: 'var(--panel)', borderRadius: 'var(--r-md)', padding: '0 16px' }}>
        {row('Version', 'TAP v1.0 — PRD v5.4')}
      </div>
    </div>
  )
}
