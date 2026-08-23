import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useThemeStore } from '../stores/themeStore'
import { initThemeSync } from './themeSync'

interface FakeMql {
  matches: boolean
  media: string
  listeners: Set<() => void>
  addEventListener: (type: string, cb: () => void) => void
  removeEventListener: (type: string, cb: () => void) => void
}

function mockMatchMedia(initialMatchesDark: boolean): FakeMql {
  const fake: FakeMql = {
    matches: initialMatchesDark,
    media: '(prefers-color-scheme: dark)',
    listeners: new Set(),
    addEventListener: vi.fn((type, cb) => { if (type === 'change') fake.listeners.add(cb) }),
    removeEventListener: vi.fn((type, cb) => { if (type === 'change') fake.listeners.delete(cb) }),
  }
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(fake))
  return fake
}

function fireChange(fake: FakeMql, matches: boolean) {
  fake.matches = matches
  fake.listeners.forEach(cb => cb())
}

describe('initThemeSync', () => {
  beforeEach(() => {
    localStorage.clear()
    useThemeStore.setState({ preference: 'system' })
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('applies the resolved theme to document.documentElement on init', () => {
    mockMatchMedia(true)
    const stop = initThemeSync()
    expect(document.documentElement.dataset.theme).toBe('dark')
    stop()
  })

  it('reacts live to an OS-level preference change while on "system"', () => {
    const fake = mockMatchMedia(false)
    const stop = initThemeSync()
    expect(document.documentElement.dataset.theme).toBe('light')

    fireChange(fake, true)
    expect(document.documentElement.dataset.theme).toBe('dark')
    stop()
  })

  it('ignores the OS-level change once the preference is explicitly light/dark', () => {
    const fake = mockMatchMedia(false)
    const stop = initThemeSync()
    useThemeStore.getState().setPreference('light')
    expect(document.documentElement.dataset.theme).toBe('light')

    fireChange(fake, true)
    expect(document.documentElement.dataset.theme).toBe('light')
    stop()
  })

  it('updates the document theme whenever the preference changes', () => {
    mockMatchMedia(false)
    const stop = initThemeSync()
    useThemeStore.getState().setPreference('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    stop()
  })
})
