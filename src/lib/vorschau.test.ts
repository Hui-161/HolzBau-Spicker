import { describe, expect, it } from 'vitest'
import { RECHNER, rechnerNachId } from '../calcs'
import type { Werte } from '../calcs/types'
import { vorschauAus } from './vorschau'
import { werteAus } from './werte'

const leer = (id: string, roh: Record<string, string> = {}): Werte => werteAus(rechnerNachId(id)!, roh)

describe('Eingabezeichnung aus Beispielwerten', () => {
  it('jeder Rechner mit Beispielwerten zeichnet schon ohne Eingaben, aber ohne Beispielzahlen', () => {
    const mit = RECHNER.filter((r) => r.beispiel)
    expect(mit.length).toBeGreaterThanOrEqual(13)
    for (const r of mit) {
      const z = vorschauAus(r, leer(r.id), 1)
      expect(z, r.id).toBeDefined()
      // kein Maß trägt einen Beispielwert: Es steht entweder der Wert des Feldes da (Vorgabe) oder nichts
      const w = leer(r.id)
      for (const m of z!.masse ?? []) {
        if (m.text) continue
        // berechnete Maße fehlen ganz, übrig sind nur Maße von Eingabefeldern
        expect(m.feld, r.id).toBeDefined()
        const feldwert = w[m.feld as string] as number
        if (Number.isFinite(feldwert)) expect(m.wert, `${r.id}: ${m.feld}`).toBe(feldwert)
        else expect(m.platzhalter, `${r.id}: ${m.feld}`).toBe(r.felder.find((f) => f.id === m.feld)!.label)
      }
    }
  })
  it('eingetragene Werte stehen sofort in der Zeichnung, die übrigen bleiben offen', () => {
    const r = rechnerNachId('sparren')!
    const z = vorschauAus(r, leer('sparren', { g: '520' }), 1)!
    const g = z.masse!.find((m) => m.feld === 'g')!
    expect(g.wert).toBe(520)
    expect(g.berechnet).toBe(false)
    const a = z.masse!.find((m) => m.feld === 'a')!
    // die Vorgabe 35° ist ein eingetragener Wert des Feldes
    expect(a.wert).toBe(35)
    expect(z.masse!.filter((m) => !m.text && !m.feld)).toEqual([])
  })
  it('unmögliche Eingaben fallen auf die Beispielform zurück statt zu verschwinden', () => {
    const r = rechnerNachId('sparren')!
    const z = vorschauAus(r, leer('sparren', { g: '400', a: '95' }), 1)
    expect(z).toBeDefined()
    expect(z!.masse!.find((m) => m.feld === 'a')!.wert).toBe(95)
  })
  it('Rechner ohne Beispielwerte haben keine Eingabezeichnung', () => {
    expect(vorschauAus(rechnerNachId('treppe')!, leer('treppe'), 1)).toBeUndefined()
  })
})
