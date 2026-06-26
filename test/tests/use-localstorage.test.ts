// Standalone test for useLocalStorage composable
// Run: npx vitest run test/tests/use-localstorage.test.ts

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useLocalStorage } from '../../packages/nuxt/src/app/composables/local-storage'

type MockStorage = Record<string, string>

function createMockStorage (initial: MockStorage = {}): Storage {
  let store = { ...initial }
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    get length () { return Object.keys(store).length },
  } as unknown as Storage
}

describe('useLocalStorage', () => {
  let mockStorage: Storage

  beforeEach(() => {
    mockStorage = createMockStorage()
    vi.stubGlobal('localStorage', mockStorage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('happy path', () => {
    it('returns default value when key does not exist', () => {
      const val = useLocalStorage('test-key', 'fallback')
      expect(val.value).toBe('fallback')
    })

    it('reads existing value from localStorage', () => {
      mockStorage.getItem = vi.fn(() => JSON.stringify('stored-value'))
      const val = useLocalStorage('test-key', 'fallback')
      expect(val.value).toBe('stored-value')
      expect(mockStorage.getItem).toHaveBeenCalledWith('test-key')
    })

    it('writes value to localStorage when ref changes', async () => {
      const val = useLocalStorage('test-key', 'initial')
      val.value = 'updated'
      await nextTick()
      expect(mockStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify('updated'))
    })

    it('handles complex objects', () => {
      mockStorage.getItem = vi.fn(() => JSON.stringify({ nested: { foo: 'bar' } }))
      const val = useLocalStorage<{ nested: { foo: string } }>('obj-key', { nested: { foo: 'default' } })
      expect(val.value).toEqual({ nested: { foo: 'bar' } })
    })
  })

  describe('negative / error handling', () => {
    it('falls back to default on JSON.parse error', () => {
      mockStorage.getItem = vi.fn(() => '{corrupted json!!!}')
      const val = useLocalStorage('bad-key', 'fallback')
      expect(val.value).toBe('fallback')
    })

    it('does not crash when localStorage.setItem throws', async () => {
      mockStorage.setItem = vi.fn(() => { throw new Error('quota exceeded') })
      const val = useLocalStorage('test-key', 'initial')

      // Should not throw
      expect(() => { val.value = 'new-value' }).not.toThrow()
      await nextTick()
      // setItem was called but caught the error
      expect(mockStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify('new-value'))
    })

    it('does not crash when localStorage.getItem throws', () => {
      mockStorage.getItem = vi.fn(() => { throw new Error('blocked') })
      const val = useLocalStorage('test-key', 'fallback')
      expect(val.value).toBe('fallback')
    })
  })

  describe('edge cases', () => {
    it('handles null values', () => {
      mockStorage.getItem = vi.fn(() => JSON.stringify(null))
      const val = useLocalStorage<string | null>('null-key', 'fallback')
      expect(val.value).toBeNull()
    })

    it('serializes new null values correctly', async () => {
      const val = useLocalStorage<string | null>('null-key', 'fallback')
      val.value = null
      await nextTick()
      expect(mockStorage.setItem).toHaveBeenCalledWith('null-key', JSON.stringify(null))
    })

    it('handles boolean values', () => {
      mockStorage.getItem = vi.fn(() => JSON.stringify(false))
      const val = useLocalStorage('bool-key', true)
      expect(val.value).toBe(false)
    })

    it('handles numeric values', () => {
      mockStorage.getItem = vi.fn(() => JSON.stringify(42))
      const val = useLocalStorage('num-key', 0)
      expect(val.value).toBe(42)
    })
  })
})
