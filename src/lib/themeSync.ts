import { useThemeStore, resolveEffectiveTheme, DARK_MEDIA_QUERY, type ThemePreference, type EffectiveTheme } from '../stores/themeStore'

/**
 * Mirrors src/index.css's `--ink` token for each theme (`--ink: #FFFFFF` in
 * `[data-theme="light"]`, `--ink: #0F0F14` in `[data-theme="dark"]`). The
 * `<meta name="theme-color">` tag that colors the browser/PWA chrome has no
 * access to CSS custom properties, so this is a second, deliberately
 * hardcoded copy — keep it in sync if `--ink`'s values ever change.
 */
const THEME_COLOR: Record<EffectiveTheme, string> = {
  light: '#FFFFFF',
  dark: '#0F0F14',
}

function applyTheme(preference: ThemePreference) {
  const effective = resolveEffectiveTheme(preference)
  document.documentElement.dataset.theme = effective

  const meta = document.querySelector('meta[name="theme-color"]')
  meta?.setAttribute('content', THEME_COLOR[effective])
}

/**
 * Keeps `document.documentElement.dataset.theme` in sync with the theme
 * preference store — including reacting live if the OS-level
 * `prefers-color-scheme` changes while the 'system' preference is active.
 */
export function initThemeSync(): () => void {
  applyTheme(useThemeStore.getState().preference)

  const mql = window.matchMedia(DARK_MEDIA_QUERY)
  const handleMediaChange = () => {
    if (useThemeStore.getState().preference === 'system') {
      applyTheme('system')
    }
  }
  mql.addEventListener('change', handleMediaChange)

  const unsubscribe = useThemeStore.subscribe((state) => {
    applyTheme(state.preference)
  })

  return () => {
    mql.removeEventListener('change', handleMediaChange)
    unsubscribe()
  }
}
