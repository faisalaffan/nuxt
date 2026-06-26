import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useLocalStorage } from '../src/app/composables/local-storage'

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

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------
  describe('happy path', () => {
    it('returns defaultValue when key does not exist', () => {
      const val = useLocalStorage('test-key', 'fallback')
      expect(val.value).toBe('fallback')
    })

    it('reads existing value from localStorage', () => {
      mockStorage.getItem = vi.fn(() => JSON.stringify('stored-value'))
      const val = useLocalStorage('test-key', 'fallback')
      expect(val.value).toBe('stored-value')
      expect(mockStorage.getItem).toHaveBeenCalledWith('test-key')
    })

    it('writes to localStorage when ref value changes', async () => {
      const val = useLocalStorage('test-key', 'initial')
      val.value = 'updated'
      await nextTick()
      expect(mockStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify('updated'))
    })
  })

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------
  describe('error handling', () => {
    it('falls back to defaultValue when localStorage.getItem throws', () => {
      mockStorage.getItem = vi.fn(() => { throw new Error('blocked') })
      const val = useLocalStorage('test-key', 'fallback')
      expect(val.value).toBe('fallback')
    })

    it('does not crash when localStorage.setItem throws (quota exceeded)', async () => {
      mockStorage.setItem = vi.fn(() => { throw new Error('quota exceeded') })
      const val = useLocalStorage('test-key', 'initial')

      expect(() => { val.value = 'new-value' }).not.toThrow()
      await nextTick()
      expect(mockStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify('new-value'))
    })

    it('falls back to defaultValue on corrupted JSON (JSON.parse error)', () => {
      mockStorage.getItem = vi.fn(() => '{corrupted json!!!}')
      const val = useLocalStorage('bad-key', 'fallback')
      expect(val.value).toBe('fallback')
    })
  })

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('handles null value stored in localStorage', () => {
      mockStorage.getItem = vi.fn(() => JSON.stringify(null))
      const val = useLocalStorage<string | null>('null-key', 'fallback')
      expect(val.value).toBeNull()
    })

    it('serializes new null values correctly on write', async () => {
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

    it('round-trips complex nested objects', () => {
      const obj = { a: [1, 2, 3], b: { c: true } }
      mockStorage.getItem = vi.fn(() => JSON.stringify(obj))
      const val = useLocalStorage<typeof obj>('complex-key', { a: [], b: { c: false } })
      expect(val.value).toEqual(obj)
    })
  })

  // ---------------------------------------------------------------------------
  // SSR — import.meta.server
  // ---------------------------------------------------------------------------
  describe('SSR', () => {
    beforeEach(() => {
      vi.stubGlobal('import', { meta: { server: true } })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('returns defaultValue on server without accessing localStorage', () => {
      vi.stubGlobal('localStorage', undefined)

      const val = useLocalStorage('ssr-key', 'server-default')
      expect(val.value).toBe('server-default')
    })
  })
})
