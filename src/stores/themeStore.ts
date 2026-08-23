import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePreference = 'light' | 'dark' | 'system'
export type EffectiveTheme = 'light' | 'dark'

export const THEME_PREFERENCES: ThemePreference[] = ['light', 'dark', 'system']

export const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

/**
 * The `zustand/middleware` `persist` storage key. Also read directly (via
 * `localStorage.getItem`) by the cold-load bootstrap script in
 * `index.html` and its logic mirror in `src/lib/initialTheme.ts` — keep
 * those in sync if this key ever changes.
 */
export const THEME_STORAGE_KEY = 'tap-theme'

interface ThemeStore {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
    }),
    { name: THEME_STORAGE_KEY }
  )
)

/** Resolves a theme preference to the actual light/dark theme that should render. */
export function resolveEffectiveTheme(preference: ThemePreference): EffectiveTheme {
  if (preference === 'system') {
    return window.matchMedia(DARK_MEDIA_QUERY).matches ? 'dark' : 'light'
  }
  return preference
}
