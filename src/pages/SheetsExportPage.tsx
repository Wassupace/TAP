import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BackButton } from '../components/ui/Button'
import {
  credentialsConfigured, isConnected, getAuthUrl, handleOAuthCallback,
  exportToSheets, disconnect, getSheetName, SheetsExportError,
} from '../lib/sheetsExport'

export default function SheetsExportPage() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [connected, setConnected]   = useState(isConnected)
  const [exporting, setExporting]   = useState(false)
  const [toast, setToast]           = useState('')
  const [configOk]                  = useState(credentialsConfigured)

  // Handle OAuth callback (code param in URL)
  useEffect(() => {
    const code = params.get('code')
    if (!code) return
    handleOAuthCallback(code)
      .then(() => { setConnected(true); nav('/settings/sheets', { replace: true }) })
      .catch((e: unknown) => setToast(e instanceof SheetsExportError ? e.message : 'Auth failed'))
  }, [params, nav])

  const tabs = ['Sessions', 'Matches', 'Competitive Games', 'Drills', 'Players', 'Career Stats']

  async function doExport() {
    setExporting(true)
    try {
      await exportToSheets()
      setToast('Export complete ✓')
    } catch (e) {
      setToast(e instanceof SheetsExportError ? e.message : 'Export failed')
    } finally {
      setExporting(false)
      setTimeout(() => setToast(''), 3000)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', padding: '54px 18px 0' }}>
      <div style={{ marginBottom: 16 }}>
        <BackButton onClick={() => nav('/settings')}>Settings</BackButton>
      </div>

      {/* Header */}
      <div style={{
        background: 'var(--hero-gradient)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--r-lg)',
        padding: '16px 18px', marginBottom: 20,
      }}>
        <p style={{ fontSize: 11, color: 'var(--hero-eyebrow)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>
          Export
        </p>
        <div style={{ fontFamily: '"Archivo Expanded", Archivo, sans-serif', fontWeight: 800, fontSize: 20 }}>
          Google Sheets
        </div>
        <p style={{ fontSize: 12, color: 'var(--dim)', margin: '2px 0 0' }}>Full data export · 6 tabs</p>
      </div>

      {/* Tab chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {tabs.map(t => (
          <span key={t} style={{
            background: 'var(--panel)', border: '1px solid var(--line)',
            borderRadius: 20, padding: '4px 10px',
            fontSize: 11, color: 'var(--dim)', fontWeight: 600,
          }}>{t}</span>
        ))}
      </div>

      {!connected ? (
        <div style={{ background: 'var(--panel)', borderRadius: 'var(--r-md)', padding: 16 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'var(--panel-2)', borderRadius: 20,
            padding: '4px 10px', fontSize: 11, fontWeight: 700,
            color: 'var(--faint)', marginBottom: 16,
          }}>
            ⬤ Not connected
          </div>

          <button
            type="button"
            onClick={() => { if (configOk) window.location.href = getAuthUrl() }}
            style={{
              width: '100%', minHeight: 56,
              background: configOk
                ? 'linear-gradient(180deg, var(--orange-2), var(--orange))'
                : 'var(--panel-2)',
              border: 'none', borderRadius: 'var(--r-md)',
              color: configOk ? '#fff' : 'var(--faint)',
              fontFamily: '"Archivo Expanded", Archivo, sans-serif',
              fontWeight: 800, fontSize: 15,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.04em',
              cursor: configOk ? 'pointer' : 'not-allowed',
              boxShadow: configOk ? 'var(--accent-glow)' : 'none',
            }}
          >
            Connect Google Account
          </button>

          {!configOk && (
            <div style={{
              marginTop: 12, background: 'rgba(16,185,129,0.07)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 'var(--r-sm)', padding: '10px 14px',
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#34D399', margin: '0 0 6px' }}>
                Setup required in .env.local
              </p>
              <code style={{ fontSize: 11, color: '#86EFAC', lineHeight: 1.8, display: 'block' }}>
                VITE_GOOGLE_CLIENT_ID=…<br/>
                VITE_GOOGLE_CLIENT_SECRET=…
              </code>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--panel)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#34D399',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              Connected
            </div>
            {getSheetName() && (
              <p style={{ fontSize: 12, color: 'var(--dim)', marginTop: 8, margin: '8px 0 0' }}>
                Sheet: <strong style={{ color: 'var(--chalk)' }}>{getSheetName()}</strong>
              </p>
            )}
          </div>
          <div style={{ padding: 16 }}>
            <button
              type="button"
              onClick={doExport}
              disabled={exporting}
              style={{
                width: '100%', minHeight: 56,
                background: exporting
                  ? 'var(--panel-2)'
                  : 'linear-gradient(180deg, var(--orange-2), var(--orange))',
                border: 'none', borderRadius: 'var(--r-md)',
                color: exporting ? 'var(--dim)' : '#fff',
                fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                fontWeight: 800, fontSize: 15,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.04em',
                cursor: exporting ? 'not-allowed' : 'pointer',
                boxShadow: exporting ? 'none' : 'var(--accent-glow)',
              }}
            >
              {exporting ? 'Exporting…' : 'Export Now'}
            </button>
            <p style={{ fontSize: 11, color: 'var(--faint)', textAlign: 'center' as const, marginTop: 6 }}>
              Overwrites all 6 tabs · runs in background
            </p>
            <button
              type="button"
              onClick={() => { disconnect(); setConnected(false) }}
              style={{
                width: '100%', marginTop: 12, minHeight: 44, background: 'transparent',
                border: '1px solid var(--panel-3)', borderRadius: 'var(--r-sm)',
                color: 'var(--faint)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--panel)', border: '1px solid var(--line-2)',
          borderRadius: 'var(--r-sm)', padding: '10px 18px',
          fontSize: 13, fontWeight: 600, color: 'var(--chalk)',
          boxShadow: 'var(--shadow)', zIndex: 99,
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
