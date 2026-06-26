import { describe, expect, it } from 'vitest'

// Extract of the internal toCamelCase function from packages/nuxt/src/app/components/nuxt-time.vue
// Used in onPrehydrate as: name.slice(5).split('-').map(toCamelCase).join('')
// The edge case: split('data--foo') by '-' produces ['data', '', 'foo']
function toCamelCase (name: string, index: number) {
  if (index > 0) {
    return (name[0]?.toUpperCase() ?? '') + name.slice(1)
  }
  return name
}

describe('toCamelCase (internal helper from nuxt-time.vue)', () => {
  describe('happy path: non-empty segments', () => {
    it('should capitalize first letter when index > 0', () => {
      expect(toCamelCase('hello', 1)).toBe('Hello')
    })

    it('should capitalize single character when index > 0', () => {
      expect(toCamelCase('h', 1)).toBe('H')
    })

    it('should return as-is when index is 0', () => {
      expect(toCamelCase('hello', 0)).toBe('hello')
    })

    it('should handle multiple segments simulated via sequential map', () => {
      const result = ['relative', 'style'].map(toCamelCase).join('')
      expect(result).toBe('relativeStyle')
    })

    it('should handle kebab-case to camelCase conversion', () => {
      const result = 'time-zone-name'.split('-').map(toCamelCase).join('')
      expect(result).toBe('timeZoneName')
    })
  })

  describe('edge case: empty string segments', () => {
    it('should return empty string for empty name at index > 0 (was crashing before fix)', () => {
      // Previously: name[0]!.toUpperCase() would crash on empty string
      expect(toCamelCase('', 1)).toBe('')
    })

    it('should return empty string for empty name at index 0', () => {
      expect(toCamelCase('', 0)).toBe('')
    })

    it('should gracefully handle split producing empty segment', () => {
      // data--foo split by '-' => ['data', '', 'foo']
      const result = 'data--foo'.split('-').map(toCamelCase).join('')
      expect(result).toBe('dataFoo')
    })
  })
})
