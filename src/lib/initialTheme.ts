import type { EffectiveTheme } from '../stores/themeStore'

/**
 * Pure-logic mirror of the inline cold-load bootstrap script in
 * `index.html`.
 *
 * `index.html` needs to set `document.documentElement`'s `data-theme`
 * attribute *synchronously*, before the stylesheet's `[data-theme]`-scoped
 * color tokens (see `src/index.css`) are needed for first paint — otherwise
 * dark-mode users see a white/transparent flash on cold load, since
 * `main.tsx`'s module script (and this app's `initThemeSync()`) only runs
 * after the browser has already parsed the HTML and applied the stylesheet.
 *
 * Because that script must run before any build step / module graph exists,
 * it can't import this function — it carries its own literal copy of this
 * same logic. This function exists purely so the *logic* is unit-testable;
 * if either copy changes, update the other to match.
 *
 * @param storedValue - the raw string from
 *   `localStorage.getItem(THEME_STORAGE_KEY)` (zustand `persist` shape:
 *   `{"state":{"preference":"light"|"dark"|"system"},"version":0}`), or
 *   `null`/`undefined` if nothing has been stored yet (first-ever visit).
 * @param prefersDark - `window.matchMedia('(prefers-color-scheme: dark)').matches`
 */
export function resolveInitialTheme(
  storedValue: string | null | undefined,
  prefersDark: boolean
): EffectiveTheme {
  let preference: unknown = 'system'

  if (storedValue) {
    try {
      const parsed = JSON.parse(storedValue)
      const candidate = parsed && parsed.state && parsed.state.preference
      if (candidate === 'light' || candidate === 'dark' || candidate === 'system') {
        preference = candidate
      }
    } catch {
      // Corrupted localStorage value — fall through to 'system' resolution.
    }
  }

  if (preference === 'light' || preference === 'dark') {
    return preference
  }
  return prefersDark ? 'dark' : 'light'
}
