import { describe, expect, it } from 'vitest'
import { maxBeiNeigung, ZIEGEL } from './ziegel'

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
  it('größte Decklänge hängt bei manchen Modellen von der Dachneigung ab', () => {
    const f = ZIEGEL.find((z) => z.id === 'nelskamp-finkenberger')!
    expect(maxBeiNeigung(f, 25)).toBe(33.5)
    expect(maxBeiNeigung(f, 30)).toBe(33.5)
    expect(maxBeiNeigung(f, 30.5)).toBe(34.5)
    expect(maxBeiNeigung(f, 45)).toBe(34.5)
    // ohne Stufen gilt immer der eine Wert
    expect(maxBeiNeigung(ZIEGEL[0], 10)).toBe(ZIEGEL[0].max)
    for (const z of ZIEGEL) for (const s of z.stufen ?? []) expect(s.max, z.name).toBeLessThanOrEqual(z.max)
  })
})
