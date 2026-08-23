import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useThemeStore, resolveEffectiveTheme } from './themeStore'

function mockMatchMedia(matchesDark: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('dark') ? matchesDark : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
}

describe('themeStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useThemeStore.setState({ preference: 'system' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to the system preference', () => {
    expect(useThemeStore.getState().preference).toBe('system')
  })

  it('updates the preference via setPreference', () => {
    useThemeStore.getState().setPreference('dark')
    expect(useThemeStore.getState().preference).toBe('dark')

    useThemeStore.getState().setPreference('light')
    expect(useThemeStore.getState().preference).toBe('light')
  })

  it('persists the preference to localStorage under the tap-theme key', () => {
    useThemeStore.getState().setPreference('dark')
    const raw = localStorage.getItem('tap-theme')
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!).state.preference).toBe('dark')
  })

  describe('resolveEffectiveTheme', () => {
    it('resolves light and dark preferences directly, ignoring the OS setting', () => {
      mockMatchMedia(true)
      expect(resolveEffectiveTheme('light')).toBe('light')
      expect(resolveEffectiveTheme('dark')).toBe('dark')
    })

    it('resolves system to dark when the OS prefers dark', () => {
      mockMatchMedia(true)
      expect(resolveEffectiveTheme('system')).toBe('dark')
    })

    it('resolves system to light when the OS prefers light', () => {
      mockMatchMedia(false)
      expect(resolveEffectiveTheme('system')).toBe('light')
    })
  })
})
