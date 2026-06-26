import { ref, watch } from 'vue'
import type { Ref } from 'vue'

/**
 * SSR-safe localStorage composable with reactive sync.
 *
 * Reads and writes a value to `localStorage`, automatically keeping the
 * reactive ref in sync. On the server, returns the default value without
 * accessing `localStorage`.
 *
 * @param key - The localStorage key
 * @param defaultValue - The default value to use when the key doesn't exist or on server
 * @returns A reactive ref that syncs with localStorage
 * @since 4.0.0
 */
export function useLocalStorage<T> (key: string, defaultValue: T): Ref<T> {
  if (import.meta.server) {
    return ref(defaultValue) as Ref<T>
  }

  let stored: T
  try {
    const raw = localStorage.getItem(key)
    stored = raw !== null ? JSON.parse(raw) as T : defaultValue
  } catch {
    stored = defaultValue
  }

  const state = ref<T>(stored) as Ref<T>

  watch(state, (val) => {
    try {
      localStorage.setItem(key, JSON.stringify(val))
    } catch {
      // localStorage may be full or unavailable
    }
  })

  return state
}
