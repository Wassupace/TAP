import { useState, useEffect } from 'react'

function isIosSafari(): boolean {
  const ua = navigator.userAgent
  const isIos = /iphone|ipad|ipod/i.test(ua)
  // Safari on iOS includes "Safari" but not "CriOS" (Chrome) or "FxiOS" (Firefox)
  const isSafari = /safari/i.test(ua) && !/crios|fxios|opios|mercury/i.test(ua)
  return isIos && isSafari
}

function isInStandaloneMode(): boolean {
  return 'standalone' in navigator && (navigator as Navigator & { standalone: boolean }).standalone
}

const DISMISSED_KEY = 'tap-ios-install-dismissed'

export function IOSInstallBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const alreadyDismissed = localStorage.getItem(DISMISSED_KEY)
    if (isIosSafari() && !isInStandaloneMode() && !alreadyDismissed) {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        className="relative flex items-start gap-3 rounded-2xl border border-[var(--line-2)] bg-[var(--panel)] p-4 shadow-xl"
        style={{ backdropFilter: 'blur(16px)' }}
      >
        {/* App icon — explicit width/height attrs + object-fit guard against
            Safari sometimes ignoring Tailwind's h-12/w-12 on a flex child
            with no intrinsic size hint, which renders the icon at its full
            180x180 source resolution instead. */}
        <img
          src="/icons/apple-touch-icon-180.png"
          alt="TAP"
          width={48}
          height={48}
          className="h-12 w-12 flex-shrink-0 rounded-xl object-cover"
          style={{ minWidth: 48, minHeight: 48, maxWidth: 48, maxHeight: 48 }}
        />

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--chalk)]">Install TAP</p>
          <p className="mt-0.5 text-xs text-[var(--muted)] leading-snug">
            Tap the{' '}
            <span className="inline-flex items-center gap-0.5 font-medium text-[var(--chalk)]">
              {/* Share icon inline */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="inline -mt-0.5">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              {' '}Share
            </span>{' '}
            button, then{' '}
            <span className="font-medium text-[var(--chalk)]">Add to Home Screen</span>.
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 text-[var(--muted)] hover:text-[var(--chalk)] transition-colors p-1 -mt-1 -mr-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Caret pointing down toward iOS share bar */}
        <div
          className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 border-b border-r border-[var(--line-2)] bg-[var(--panel)]"
        />
      </div>
    </div>
  )
}
