import { describe, expect, it } from 'vitest'
import { RECHNER } from '../calcs'
import { STICHWORTE } from '../calcs/stichworte'
import { EN } from '../lib/en'
import { normiere, suche, type Suchbar } from './suche'

const eintraege: Suchbar[] = RECHNER.map((r) => ({
  id: r.id,
  titel: [r.titel, EN[r.titel] ?? ''],
  text: [r.kurz, r.gruppe, EN[r.kurz] ?? '', EN[r.gruppe] ?? ''],
  stichworte: STICHWORTE[r.id] ?? [],
}))
const ids = (anfrage: string): string[] => suche(anfrage, eintraege).map((t) => t.id)

describe('Schlagwortsuche', () => {
  it('jede Funktion hat Schlagworte, und es gibt keine für unbekannte Funktionen', () => {
    expect(RECHNER.filter((r) => (STICHWORTE[r.id] ?? []).length < 5).map((r) => r.id)).toEqual([])
    expect(Object.keys(STICHWORTE).filter((id) => !RECHNER.some((r) => r.id === id))).toEqual([])
  })
  it('jedes Schlagwort findet seine Funktion', () => {
    const fehlt: string[] = []
    for (const [id, worte] of Object.entries(STICHWORTE)) for (const w of worte) if (!ids(w).includes(id)) fehlt.push(`${id}: ${w}`)
    expect(fehlt).toEqual([])
  })
  it('Schreibweisen: Umlaute, ß, Groß- und Kleinschreibung', () => {
    expect(normiere('Maßstäbe  ÜBER-Eck')).toBe('massstaebe ueber eck')
    expect(ids('GAUPE')[0]).toBe('gaube')
    expect(ids('kubikmeter')[0]).toBe('holz')
    expect(ids('massstab')[0]).toBe('massstab')
    expect(ids('Maßstab')[0]).toBe('massstab')
    expect(ids('laenge')).toContain('sparren')
  })
  it('abweichende Namen führen zur richtigen Funktion', () => {
    const erwartet: [string, string][] = [
      ['Klaue', 'sparren'],
      ['Schifter', 'grat'],
      ['Hexenschnitt', 'grat'],
      ['Zange', 'kehlbalken'],
      ['Velux', 'dachfenster'],
      ['Auswechslung', 'dachfenster'],
      ['Lattmaß', 'lattung'],
      ['Geländer', 'einteilung'],
      ['Kreuzmaß', 'diagonale'],
      ['Maurerdreieck', '345'],
      ['Wasserwaage', 'neigungsmesser'],
      ['Stufen', 'treppe'],
      ['Schnittliste', 'verschnitt'],
      ['Nagelabstand', 'abstaende'],
      ['Baubehinderung', 'behinderung'],
      ['Carport', 'pultdach'],
      ['Pavillon', 'zeltdach'],
      ['dormer', 'gaube'],
    ]
    expect(erwartet.filter(([w, id]) => ids(w)[0] !== id)).toEqual([])
  })
  it('Titel-Treffer stehen vor Schlagwort-Treffern', () => {
    expect(ids('Sparren').slice(0, 2)).toEqual(['sparren', 'sparreneinteilung'])
    expect(ids('Treppe')[0]).toBe('treppe')
  })
  it('mehrere Wörter grenzen ein, die Reihenfolge ist egal', () => {
    expect(ids('winkel kontrolle')).toContain('diagonale')
    // alle Dokumentvorlagen, sonst nichts
    expect(ids('pdf unterschrift').sort()).toEqual(RECHNER.filter((r) => r.eigen === 'dokument').map((r) => r.id).sort())
    expect(ids('unterschrift pdf').sort()).toEqual(ids('pdf unterschrift').sort())
    expect(ids('regie tagelohn')).toEqual(['stundenzettel'])
    expect(ids('sparren xyzxyz')).toEqual([])
  })
  it('verzeiht Tippfehler bei längeren Wörtern, nicht bei kurzen', () => {
    expect(ids('Kelbalken')[0]).toBe('kehlbalken')
    expect(ids('Hexenschnit')[0]).toBe('grat')
    expect(ids('Dachfenstr')[0]).toBe('dachfenster')
    expect(ids('Behinderungsanzige')[0]).toBe('behinderung')
    expect(ids('Trepe')[0]).toBe('treppe')
    expect(ids('xyz')).toEqual([])
  })
  it('nennt das Schlagwort, über das gefunden wurde', () => {
    expect(suche('velux', eintraege)[0]).toEqual({ id: 'dachfenster', ueber: 'Velux' })
    expect(suche('Treppe', eintraege)[0].ueber).toBeUndefined()
  })
  it('leere Suche liefert alles in der ursprünglichen Reihenfolge', () => {
    expect(ids('  ')).toEqual(RECHNER.map((r) => r.id))
  })
})
