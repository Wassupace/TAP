import { describe, it, expect } from 'vitest'
import { resolveInitialTheme } from './initialTheme'

describe('resolveInitialTheme', () => {
  it('resolves an explicit stored "dark" preference directly, ignoring the OS setting', () => {
    const stored = JSON.stringify({ state: { preference: 'dark' }, version: 0 })
    expect(resolveInitialTheme(stored, false)).toBe('dark')
  })

  it('resolves an explicit stored "light" preference directly, ignoring the OS setting', () => {
    const stored = JSON.stringify({ state: { preference: 'light' }, version: 0 })
    expect(resolveInitialTheme(stored, true)).toBe('light')
  })

  it('resolves a stored "system" preference via prefersDark=true', () => {
    const stored = JSON.stringify({ state: { preference: 'system' }, version: 0 })
    expect(resolveInitialTheme(stored, true)).toBe('dark')
  })

  it('resolves a stored "system" preference via prefersDark=false', () => {
    const stored = JSON.stringify({ state: { preference: 'system' }, version: 0 })
    expect(resolveInitialTheme(stored, false)).toBe('light')
  })

  it('falls back to prefersDark when nothing has been stored yet (first-ever visit)', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark')
    expect(resolveInitialTheme(undefined, false)).toBe('light')
  })

  it('falls back to prefersDark when the stored value is corrupted JSON', () => {
    expect(resolveInitialTheme('{not valid json', true)).toBe('dark')
    expect(resolveInitialTheme('{not valid json', false)).toBe('light')
  })

  it('falls back to prefersDark when the stored JSON is well-formed but missing state.preference', () => {
    expect(resolveInitialTheme(JSON.stringify({ version: 0 }), true)).toBe('dark')
    expect(resolveInitialTheme(JSON.stringify({ state: {} }), false)).toBe('light')
  })

  it('falls back to prefersDark when the stored preference value is not one of the known values', () => {
    const stored = JSON.stringify({ state: { preference: 'purple' }, version: 0 })
    expect(resolveInitialTheme(stored, true)).toBe('dark')
    expect(resolveInitialTheme(stored, false)).toBe('light')
  })

  it('falls back to prefersDark when the stored value is an empty string', () => {
    expect(resolveInitialTheme('', true)).toBe('dark')
    expect(resolveInitialTheme('', false)).toBe('light')
  })
})
