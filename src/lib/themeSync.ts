import { useThemeStore, resolveEffectiveTheme, DARK_MEDIA_QUERY, type ThemePreference } from '../stores/themeStore'

function applyTheme(preference: ThemePreference) {
  document.documentElement.dataset.theme = resolveEffectiveTheme(preference)
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
