import { describe, expect, it } from 'vitest'
import { FAUSTREGELN, vorbemessung } from './vorbemessung'

describe('Vorbemessung nach Faustformel', () => {
  it('eigener Teiler: Höhe = Spannweite / Teiler, ohne Breite', () => {
    const r = vorbemessung('frei', 480, 24)
    expect(r.hoehe).toBeCloseTo(20, 9)
    expect(r.breiteVon).toBeUndefined()
    expect(() => vorbemessung('frei', 480)).toThrow()
    expect(() => vorbemessung('frei', 480, 2)).toThrow()
    expect(() => vorbemessung('frei', 0, 24)).toThrow()
  })
  it('Holzbalkendecke: l/20, Breite 1/2 bis 2/3 der Höhe, mindestens 10 cm', () => {
    const r = vorbemessung('decke', 450)
    expect(r.hoehe).toBeCloseTo(22.5, 9)
    expect(r.breiteVon).toBeCloseTo(11.25, 9)
    expect(r.breiteBis).toBeCloseTo(15, 9)
    // kleine Spannweite: das Mindestmaß greift
    expect(vorbemessung('decke', 300).breiteVon).toBe(10)
    expect(vorbemessung('decke', 300).breiteBis).toBe(10)
  })
  it('Flachdach nach Dachlast: l/24, l/20, l/16, Breite mindestens halbe Höhe', () => {
    expect(vorbemessung('flachLeicht', 480).hoehe).toBeCloseTo(20, 9)
    expect(vorbemessung('flachMittel', 480).hoehe).toBeCloseTo(24, 9)
    expect(vorbemessung('flachSchwer', 480).hoehe).toBeCloseTo(30, 9)
    expect(vorbemessung('flachSchwer', 480).breiteVon).toBeCloseTo(15, 9)
  })
  it('Sparren: s/24 (+ 2 cm im Sparrendach), Breite aus dem Achsabstand mit Mindestmaß 8 cm', () => {
    expect(vorbemessung('sparrenSparrendach', 480).hoehe).toBeCloseTo(22, 9)
    expect(vorbemessung('sparrenPfettendach', 480).hoehe).toBeCloseTo(20, 9)
    expect(vorbemessung('sparrenPfettendach', 480).breiteVon).toBeUndefined()
    expect(vorbemessung('sparrenPfettendach', 480, undefined, 90).breiteVon).toBeCloseTo(9, 9)
    expect(vorbemessung('sparrenPfettendach', 480, undefined, 62.5).breiteVon).toBe(8)
    expect(vorbemessung('kehlbalken', 400, undefined, 80)).toMatchObject({ hoehe: 20, breiteVon: 10 })
  })
  it('Sparren im Kehlbalkendach: s/24 + 4 cm, Breite e/8 mit Mindestmaß 8 cm', () => {
    const r = vorbemessung('sparrenKehlbalkendach', 480, undefined, 80)
    expect(r.hoehe).toBeCloseTo(24, 9)
    expect(r.breiteVon).toBeCloseTo(10, 9)
    expect(vorbemessung('sparrenKehlbalkendach', 480, undefined, 60).breiteVon).toBe(8)
  })
  it('Pfetten: l/24 + a/30 bzw. a/50, Breite l/40 + a/50 und 0,5 bis 0,7 der Höhe', () => {
    const p = vorbemessung('pfette45', 480, undefined, undefined, 300)
    expect(p.hoehe).toBeCloseTo(480 / 24 + 300 / 30, 9)
    expect(p.breiteFormel).toBeCloseTo(480 / 40 + 300 / 50, 9)
    expect(p.breiteVon).toBeCloseTo(15, 9)
    expect(p.breiteBis).toBeCloseTo(21, 9)
    expect(vorbemessung('pfette15', 480, undefined, undefined, 300).hoehe).toBeCloseTo(480 / 24 + 300 / 50, 9)
    const s = vorbemessung('pfetteSpitzboden', 480, undefined, undefined, 300, 150)
    expect(s.hoehe).toBeCloseTo(480 / 24 + 450 / 30, 9)
    expect(s.breiteFormel).toBeCloseTo(480 / 24 + 450 / 50, 9)
    expect(() => vorbemessung('pfette45', 480)).toThrow()
    expect(() => vorbemessung('pfetteSpitzboden', 480, undefined, undefined, 300)).toThrow()
  })
  it('jede feste Regel hat einen Teiler im üblichen Bereich', () => {
    for (const r of Object.values(FAUSTREGELN)) {
      expect(r.teiler).toBeGreaterThanOrEqual(16)
      expect(r.teiler).toBeLessThanOrEqual(24)
    }
  })
  it('rechnet Dreieck-Streben-Binder als Bereich mit Obergrenze', () => {
    const r = vorbemessung('dreieckStrebenBinder', 600)
    expect(r.hoehe).toBeCloseTo(30, 9)
    expect(r.hoeheBis).toBeCloseTo(40, 9)
    expect(r.ausserhalb).toBe(false)
    const g = vorbemessung('dreieckStrebenBinder', 1200)
    expect(g.hoehe).toBeCloseTo(60, 9)
    expect(g.hoeheBis).toBe(75)
    expect(g.ausserhalb).toBe(true)
  })
  it('rechnet Brettschichtholz-Einfeldträger mit l/17', () => {
    expect(vorbemessung('bshEinfeld', 1700).hoehe).toBeCloseTo(100, 9)
    expect(vorbemessung('bshEinfeld', 1700).ausserhalb).toBe(false)
    expect(vorbemessung('bshEinfeld', 800).ausserhalb).toBe(true)
  })
  it('gibt beim Sparren im Pfettendach den Grat- oder Kehlsparren mit 1,5-facher Höhe an', () => {
    expect(vorbemessung('sparrenPfettendach', 480).gratHoehe).toBeCloseTo(30, 9)
    expect(vorbemessung('sparrenSparrendach', 480).gratHoehe).toBeUndefined()
  })
  it('rechnet mit der ideellen Stützweite je Trägerart', () => {
    const u = undefined
    expect(vorbemessung('decke', 500, u, u, u, u, 'einfeld').hoehe).toBeCloseTo(25, 9)
    expect(vorbemessung('decke', 500, u, u, u, u, 'endfeld09').hoehe).toBeCloseTo(22.5, 9)
    expect(vorbemessung('decke', 500, u, u, u, u, 'endfeld08').hoehe).toBeCloseTo(20, 9)
    expect(vorbemessung('decke', 500, u, u, u, u, 'mittelfeld')).toMatchObject({ faktor: 0.6, ideell: 300, hoehe: 15 })
    expect(vorbemessung('frei', 100, 24, u, u, u, 'kragarm').hoehe).toBeCloseTo(10, 9)
    // bei Sparren, Pfetten und Bindern bleibt die Trägerart ohne Wirkung
    expect(vorbemessung('sparrenPfettendach', 480, u, u, u, u, 'mittelfeld')).toMatchObject({ faktor: 1, hoehe: 20 })
    expect(vorbemessung('bshEinfeld', 1700, u, u, u, u, 'mittelfeld').faktor).toBe(1)
  })
})
