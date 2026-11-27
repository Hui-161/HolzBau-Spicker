import { describe, expect, it } from 'vitest'
import { pruefeZiegelfund, rechnerKatalog, werkzeugLies, werkzeugRechne } from './kiwerkzeug'

describe('KI-Werkzeuge: das Modell bedient die Rechner, gerechnet wird vom Kern', () => {
  it('das Verzeichnis nennt Rechner und Felder, aber keine Sensor- oder Dokumentansichten', () => {
    const k = rechnerKatalog()
    expect(k).toContain('sparren – Sparren')
    expect(k).toContain('- g: Grundmaß (Länge in cm)')
    expect(k).toContain('senkel = lotrecht (Senkelschnitt)')
    expect(k).not.toContain('neigungsmesser')
    expect(k).not.toContain('Behinderungsanzeige')
  })
  it('rechne liefert die Zahlen des Rechenkerns und einen Vorschlag zum Übernehmen', () => {
    const r = werkzeugRechne({ rechner: 'sparren', werte: { g: 400, a: 35, ue: 50, h: 18, k: 3 } })
    expect(r.fehler).toBe(false)
    expect(r.text).toMatch(/Sparrenlänge gesamt: 549[.,]3 cm/)
    expect(r.vorschlag).toEqual({ rechner: 'sparren', titel: 'Sparren', werte: { g: '400', a: '35', ue: '50', h: '18', k: '3' } })
  })
  it('fehlende, unbekannte und unzulässige Angaben werden abgelehnt statt geraten', () => {
    expect(werkzeugRechne({ rechner: 'sparren', werte: { a: 35 } }).text).toContain('g (Grundmaß)')
    expect(werkzeugRechne({ rechner: 'sparren', werte: { g: 400, h: 18, laenge: 5 } }).text).toContain('kein Feld „laenge“')
    expect(werkzeugRechne({ rechner: 'sparren', werte: { g: 400, h: 18, tr: 'schraeg' } }).text).toContain('nicht wählbar')
    expect(werkzeugRechne({ rechner: 'statik', werte: {} }).fehler).toBe(true)
    expect(werkzeugRechne({ rechner: 'behinderung', werte: {} }).fehler).toBe(true)
    expect(werkzeugRechne({ rechner: 'sparren', werte: { g: 400, a: 95, h: 18 } }).fehler).toBe(true)
    expect(werkzeugRechne('sparren').fehler).toBe(true)
    // kein Vorschlag, wenn nicht gerechnet werden konnte
    expect(werkzeugRechne({ rechner: 'sparren', werte: { a: 35 } }).vorschlag).toBeUndefined()
  })
  it('lies_eingaben gibt nur Felder des Rechners zurück', () => {
    const r = werkzeugLies({ rechner: 'sparren' }, { sparren: { g: '400', a: '35', fremd: 'x', ue: '' } })
    expect(r.text).toContain('g = 400')
    expect(r.text).not.toContain('fremd')
    expect(werkzeugLies({ rechner: 'sparren' }, {}).text).toContain('keine Eingaben')
  })
  it('Ziegelfund: nur plausible Decklängen werden angenommen', () => {
    const roh = { hersteller: 'Muster', modell: 'Pfanne 1', decklaenge_min_cm: 31.2, decklaenge_max_cm: 34.5, deckbreite_cm: 30, laf_cm: null, fundstelle: 'S. 2', hinweis: '' }
    expect(pruefeZiegelfund(roh)).toMatchObject({ name: 'Muster Pfanne 1', min: 31.2, max: 34.5, deckbreite: 30, laf: undefined })
    expect(pruefeZiegelfund({ ...roh, decklaenge_min_cm: null })).toBeUndefined()
    expect(pruefeZiegelfund({ ...roh, decklaenge_min_cm: 40 })).toBeUndefined() // min > max
    expect(pruefeZiegelfund({ ...roh, decklaenge_min_cm: 312, decklaenge_max_cm: 345 })).toBeUndefined() // Millimeter nicht umgerechnet
    expect(pruefeZiegelfund(undefined)).toBeUndefined()
  })
})
