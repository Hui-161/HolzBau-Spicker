import { describe, expect, it } from 'vitest'
import { ZIEGEL } from './ziegel'

describe('Ziegelraster', () => {
  it('Decklängen sind plausibel und eindeutig', () => {
    expect(new Set(ZIEGEL.map((z) => z.id)).size).toBe(ZIEGEL.length)
    for (const z of ZIEGEL) {
      // Falzziegel und Dachsteine liegen zwischen etwa 25 und 45 cm, das Verschiebespiel bei wenigen cm
      expect(z.min, z.name).toBeGreaterThan(25)
      expect(z.max, z.name).toBeLessThan(45)
      expect(z.max - z.min, z.name).toBeGreaterThan(0)
      expect(z.max - z.min, z.name).toBeLessThan(5)
    }
  })
})
