import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BackButton } from '../components/ui/Button'
import {
  credentialsConfigured, isConnected, getAuthUrl, handleOAuthCallback,
  linkExistingSheet, disconnect, getSheetName, SheetsExportError,
} from '../lib/sheetsExport'
import { scheduleExport, hasPendingExport } from '../lib/exportQueue'
import { attemptPendingExport } from '../lib/exportWorker'

export default function SheetsExportPage() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [connected, setConnected]   = useState(isConnected)
  const [pending, setPending]       = useState(false)
  const [toast, setToast]           = useState('')
  const [configOk]                  = useState(credentialsConfigured)
  const [sheetUrl, setSheetUrl]     = useState('')
  const [linking, setLinking]       = useState(false)

  // Handle OAuth callback (code param in URL)
  useEffect(() => {
    const code = params.get('code')
    if (!code) return
    handleOAuthCallback(code)
      .then(() => { setConnected(true); nav('/settings/sheets', { replace: true }) })
      .catch((e: unknown) => setToast(e instanceof SheetsExportError ? e.message : 'Auth failed'))
  }, [params, nav])

  // Reflects the durable export job's status (Task 4, PRD §9.3) — polls
  // instead of awaiting exportToSheets() directly, so the export itself
  // survives navigating away from this page entirely.
  useEffect(() => {
    let prevPending = false
    hasPendingExport().then(p => { prevPending = p; setPending(p) })
    const id = setInterval(async () => {
      const stillPending = await hasPendingExport()
      if (prevPending && !stillPending) setToast('Export complete ✓')
      prevPending = stillPending
      setPending(stillPending)
    }, 2000)
    return () => clearInterval(id)
  }, [])

  const tabs = ['Sessions', 'Matches', 'Competitive Games', 'Drills', 'Players', 'Career Stats']

  async function doExport() {
    await scheduleExport()
    setPending(true)
    setToast('Export queued — running in background')
    attemptPendingExport()
    setTimeout(() => setToast(''), 3000)
  }

  async function handleLinkSheet() {
    if (!sheetUrl.trim()) return
    setLinking(true)
    try {
      await linkExistingSheet(sheetUrl.trim())
      setSheetUrl('')
      setToast('Sheet linked ✓')
    } catch (e) {
      setToast(e instanceof SheetsExportError ? e.message : 'Could not link that sheet')
    } finally {
      setLinking(false)
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
                Setup required
              </p>
              <code style={{ fontSize: 11, color: '#86EFAC', lineHeight: 1.8, display: 'block' }}>
                VITE_GOOGLE_CLIENT_ID=… (in .env.local)<br/>
                GOOGLE_CLIENT_SECRET=… (server-only, Vercel project env vars)
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
          {!getSheetName() && (
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
              <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontWeight: 700, marginBottom: 8 }}>
                Link an existing sheet (optional)
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={e => setSheetUrl(e.target.value)}
                  placeholder="Paste a Google Sheets URL"
                  style={{
                    flex: 1, minHeight: 44, background: 'var(--panel-2)',
                    border: '1px solid var(--line-2)', borderRadius: 'var(--r-sm)',
                    color: 'var(--chalk)', fontSize: 13, padding: '0 12px', outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleLinkSheet}
                  disabled={linking || !sheetUrl.trim()}
                  style={{
                    minHeight: 44, padding: '0 16px', borderRadius: 'var(--r-sm)', border: 'none',
                    background: linking || !sheetUrl.trim() ? 'var(--panel-2)' : 'var(--orange)',
                    color: linking || !sheetUrl.trim() ? 'var(--faint)' : '#0c0c0c',
                    fontWeight: 800, fontSize: 12, textTransform: 'uppercase' as const,
                    cursor: linking || !sheetUrl.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {linking ? 'Linking…' : 'Link'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--faint)', marginTop: 6 }}>
                Or just tap Export Now below to create a new spreadsheet instead.
              </p>
            </div>
          )}
          <div style={{ padding: 16 }}>
            <button
              type="button"
              onClick={doExport}
              disabled={pending}
              style={{
                width: '100%', minHeight: 56,
                background: pending
                  ? 'var(--panel-2)'
                  : 'linear-gradient(180deg, var(--orange-2), var(--orange))',
                border: 'none', borderRadius: 'var(--r-md)',
                color: pending ? 'var(--dim)' : '#fff',
                fontFamily: '"Archivo Expanded", Archivo, sans-serif',
                fontWeight: 800, fontSize: 15,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.04em',
                cursor: pending ? 'not-allowed' : 'pointer',
                boxShadow: pending ? 'none' : 'var(--accent-glow)',
              }}
            >
              {pending ? 'Exporting…' : 'Export Now'}
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
