import { describe, expect, it } from 'vitest'
import { ABNAHME, AUFMASS, BAUTAGEBUCH, BEDENKEN, BEHINDERUNG, STUNDENZETTEL, VORLAGEN, dokDateiname, fehlend, leseMenge, rechneAufmass, type Block, type DokWerte } from './dokumente'

const kopf = { absender: 'Zimmerei Beispiel GmbH\nHolzweg 1', empfaenger: 'Bauherr Beispiel\nBaustraße 2', bauvorhaben: 'Neubau Halle', auftrag: '', ort: 'Musterstadt', datum: '2026-11-27' }
const werte = (text: Record<string, string>, tabellen: DokWerte['tabellen'] = {}): DokWerte => ({ text: { ...kopf, ...text }, tabellen })
const absaetze = (b: Block[]): string => b.flatMap((x) => (x.art === 'absatz' ? [x.text] : [])).join('\n')
const tabelle = (b: Block[], n = 0) => b.filter((x) => x.art === 'tabelle')[n]

describe('Mengen lesen', () => {
  it('Komma und Punkt, sonst nichts', () => {
    expect(leseMenge('7,5')).toBe(7.5)
    expect(leseMenge(' 12.25 ')).toBe(12.25)
    for (const s of ['', 'abc', '1e3', '-2', '7,5,0']) expect(Number.isNaN(leseMenge(s)), s).toBe(true)
  })
})

describe('Bedenkenanzeige', () => {
  const basis = { vertrag: 'vob', gegenstand: 'vorleistung', bedenken: 'Die Lattung ist nicht eben.', folgen: 'Die Deckung wird undicht.', stopp: '1', haftung: '1', frist: '2026-12-04' }
  it('VOB/B: Paragrafen, Gegenstand, Frist', () => {
    const d = BEDENKEN.baue(werte(basis), 1)
    expect(d.betreff).toBe('Bedenkenanzeige gemäß § 4 Abs. 3 VOB/B')
    expect(d.ortDatum).toBe('Musterstadt, 27.11.2026')
    const text = absaetze(d.bloecke)
    expect(text).toContain('gemäß § 4 Abs. 3 VOB/B Bedenken an gegen die Leistungen anderer Unternehmer.')
    expect(text).toContain('bis zum 04.12.2026')
    expect(text).toContain('§ 6 Abs. 1 VOB/B')
    expect(text).toContain('§ 13 Abs. 3 VOB/B')
    expect(text).toContain('Anlage: 1 Foto')
    expect(text).not.toContain('Unser Vorschlag')
  })
  it('BGB und abgewählte Haken', () => {
    const d = BEDENKEN.baue(werte({ ...basis, vertrag: 'bgb', stopp: '', haftung: '', frist: '', vorschlag: 'Lattung ausgleichen' }), 0)
    const text = absaetze(d.bloecke)
    expect(d.betreff).toBe('Bedenkenanzeige')
    expect(text).not.toContain('VOB')
    expect(text).not.toContain('nicht fortsetzen')
    expect(text).not.toContain('Haftung')
    expect(text).toContain('umgehend um Ihre schriftliche Entscheidung')
    expect(text).toContain('Lattung ausgleichen')
  })
  it('Pflichtangaben und Dateiname', () => {
    expect(fehlend(BEDENKEN, werte(basis))).toEqual([])
    expect(fehlend(BEDENKEN, werte({ ...basis, bedenken: ' ', empfaenger: '' }))).toEqual(['Empfänger', 'Unsere Bedenken'])
    expect(dokDateiname(BEDENKEN, werte(basis))).toBe('Bedenkenanzeige_Neubau-Halle_2026-11-27.pdf')
  })
})

describe('Stundenzettel', () => {
  it('summiert die Stunden und lässt leere Zeilen weg', () => {
    const d = STUNDENZETTEL.baue(
      werte(
        { arbeiten: 'Sparren ausgewechselt', nummer: '12' },
        {
          stunden: [
            { wer: 'Meister', stunden: '3,5', was: 'Anleitung' },
            { wer: '', stunden: '', was: '' },
            { wer: 'Geselle', stunden: '8', was: 'Abbund' },
          ],
          material: [{ was: 'KVH 8/18', menge: '14,4', einheit: 'm' }],
        }
      ),
      0
    )
    expect(d.betreff).toBe('Stundenlohnzettel Nr. 12 vom 27.11.2026')
    const t = tabelle(d.bloecke)
    expect(t).toMatchObject({ zeilen: [['Meister', 'Anleitung', '3,5'], ['Geselle', 'Abbund', '8']], summen: [['Summe', '', '11,5']] })
    expect(tabelle(d.bloecke, 1)).toMatchObject({ zeilen: [['KVH 8/18', '14,4', 'm']] })
    expect(d.unterschriften).toEqual(['Auftragnehmer', 'Auftraggeber / Bauleitung'])
  })
  it('unlesbare Stunden bleiben sichtbar, zählen aber nicht mit', () => {
    const d = STUNDENZETTEL.baue(werte({ arbeiten: 'x' }, { stunden: [{ wer: 'A', stunden: 'acht', was: '' }, { wer: 'B', stunden: '2', was: '' }] }), 0)
    expect(tabelle(d.bloecke)).toMatchObject({ zeilen: [['A', '', 'acht'], ['B', '', '2']], summen: [['Summe', '', '2']] })
  })
  it('ohne Arbeitszeit fehlt eine Pflichtangabe, Material ist freiwillig', () => {
    expect(fehlend(STUNDENZETTEL, werte({ arbeiten: 'x' }, { stunden: [{ wer: '', stunden: '', was: '' }] }))).toEqual(['Arbeitszeit'])
    expect(fehlend(STUNDENZETTEL, werte({ arbeiten: 'x' }, { stunden: [{ wer: 'A', stunden: '1', was: '' }] }))).toEqual([])
  })
})

describe('Aufmaß', () => {
  it('Menge und Einheit folgen aus den ausgefüllten Maßen', () => {
    const r = rechneAufmass([
      { was: 'Lattung', anzahl: '2', laenge: '12,5', breite: '', hoehe: '' },
      { was: 'Schalung', anzahl: '', laenge: '8', breite: '4,5', hoehe: '' },
      { was: 'Dämmung', anzahl: '1', laenge: '8', breite: '4,5', hoehe: '0,2' },
      { was: 'Anker', anzahl: '24', laenge: '', breite: '', hoehe: '' },
      { was: 'Schalung 2', anzahl: '2', laenge: '3', breite: '2', hoehe: '' },
      { was: '', anzahl: '', laenge: '', breite: '', hoehe: '' },
    ])
    expect(r.zeilen).toHaveLength(5)
    expect(r.zeilen.map((z) => ('fehler' in z || 'titel' in z ? 'keine Menge' : `${z.menge} ${z.einheit}`))).toEqual(['25 m', '36 m²', '7.2 m³', '24 Stk', '12 m²'].map((s) => s))
    expect(r.summen).toEqual({ m: 25, 'm²': 48, 'm³': 7.2, Stk: 24 })
    // Breite ohne Länge zählt als ein Maß
    expect(rechneAufmass([{ was: 'x', anzahl: '3', laenge: '', breite: '2', hoehe: '' }]).summen).toEqual({ m: 6 })
  })
  it('unlesbare Zahl: Zeile wird als Fehler gezeigt und nicht summiert', () => {
    const r = rechneAufmass([{ was: 'A', anzahl: '1', laenge: '3x', breite: '', hoehe: '' }, { was: 'B', anzahl: '1', laenge: '3', breite: '', hoehe: '' }])
    expect(r.zeilen[0]).toEqual({ bezeichnung: 'A', fehler: true })
    expect(r.summen).toEqual({ m: 3 })
  })
  it('Dokument: Tabelle mit Summen je Einheit', () => {
    const d = AUFMASS.baue(werte({ teilnehmer: 'beide Seiten' }, { positionen: [{ was: 'Schalung', anzahl: '2', laenge: '8', breite: '4,5', hoehe: '' }, { was: 'Lattung', anzahl: '', laenge: '12,5', breite: '', hoehe: '' }] }), 0)
    expect(d.betreff).toBe('Aufmaß vom 27.11.2026')
    expect(tabelle(d.bloecke)).toMatchObject({
      zeilen: [['Schalung', '2', '8 × 4,5', '72', 'm²'], ['Lattung', '1', '12,5', '12,5', 'm']],
      summen: [['Summe m', '', '', '12,5', 'm'], ['Summe m²', '', '', '72', 'm²']],
    })
  })
})

describe('Behinderungsanzeige als Vorlage', () => {
  it('übernimmt den getesteten Brieftext', () => {
    const d = BEHINDERUNG.baue(werte({ vertrag: 'vob', seit: '2026-11-25', ursache: 'Decke nicht ausgehärtet.', auswirkung: 'Dachstuhl kann nicht gestellt werden.', fristverlaengerung: '1', mehrkosten: '', unterzeichner: 'M. Beispiel' }), 2)
    expect(d.betreff).toBe('Behinderungsanzeige gemäß § 6 Abs. 1 VOB/B')
    const text = absaetze(d.bloecke)
    expect(text).toContain('seit dem 25.11.2026')
    expect(text).toContain('§ 6 Abs. 2 und 4 VOB/B')
    expect(text).not.toContain('Mehrkosten')
    expect(text).toContain('Anlage: 2 Fotos')
    expect(d.unterschriften).toEqual(['M. Beispiel'])
    expect(fehlend(BEHINDERUNG, werte({ seit: '2026-11-25', ursache: 'x', auswirkung: '' }))).toEqual(['Auswirkungen auf die Leistung'])
  })
})

describe('Stundenzettel über mehrere Tage', () => {
  it('zeigt die Spalte Tag nur, wenn sie benutzt wird', () => {
    const zeilen = [{ wer: 'Geselle', stunden: '8', was: 'Abbund', tag: 'Mo 23.11.' }, { wer: 'Geselle', stunden: '6,5', was: 'Einbau', tag: '' }]
    expect(tabelle(STUNDENZETTEL.baue(werte({ arbeiten: 'x' }, { stunden: zeilen }), 0).bloecke)).toMatchObject({
      kopf: ['Tag', 'Wer', 'Tätigkeit', 'Stunden'],
      zeilen: [['Mo 23.11.', 'Geselle', 'Abbund', '8'], ['', 'Geselle', 'Einbau', '6,5']],
      summen: [['', 'Summe', '', '14,5']],
    })
  })
})

describe('Abnahmeprotokoll', () => {
  const basis = { vertrag: 'vob', leistung: 'Zimmerarbeiten', tag: '2026-11-27', ergebnis: 'mit' }
  it('mit Mängeln: Vorbehalt und nummerierte Liste', () => {
    const d = ABNAHME.baue(werte(basis, { maengel: [{ was: 'Ortgangbrett lose', bis: '04.12.2026' }, { was: '', bis: '' }, { was: 'Kerve nachstemmen', bis: '' }] }), 0)
    expect(d.betreff).toBe('Abnahmeprotokoll gemäß § 12 VOB/B')
    const text = absaetze(d.bloecke)
    expect(text).toContain('„Zimmerarbeiten“ wurde am 27.11.2026')
    expect(text).toContain('behält sich seine Rechte')
    expect(text).toContain('Verjährungsfrist')
    expect(tabelle(d.bloecke)).toMatchObject({ zeilen: [['1', 'Ortgangbrett lose', '04.12.2026'], ['2', 'Kerve nachstemmen', '']] })
  })
  it('verweigert: keine Abnahmewirkung; BGB nennt § 640', () => {
    const d = ABNAHME.baue(werte({ ...basis, vertrag: 'bgb', ergebnis: 'verweigert' }), 0)
    expect(d.betreff).toBe('Abnahmeprotokoll gemäß § 640 BGB')
    expect(absaetze(d.bloecke)).toContain('wird wegen der nachfolgend aufgeführten wesentlichen Mängel verweigert')
    expect(absaetze(d.bloecke)).not.toContain('Verjährungsfrist')
  })
  it('ohne Mängel braucht es keine Mängelliste', () => {
    expect(fehlend(ABNAHME, werte({ ...basis, ergebnis: 'ohne' }))).toEqual([])
    expect(absaetze(ABNAHME.baue(werte({ ...basis, ergebnis: 'ohne' }), 0).bloecke)).toContain('Mängel wurden nicht festgestellt')
  })
})

describe('Bautagesbericht', () => {
  it('zählt das Personal und kommt ohne Empfänger aus', () => {
    const w = werte({ empfaenger: '', arbeiten: 'Sparren gestellt', wetter: 'trocken', temperatur: '4 °C', nummer: '7' }, { personal: [{ wer: 'Gesellen', anzahl: '3' }, { wer: 'Meister', anzahl: '1' }] })
    expect(fehlend(BAUTAGEBUCH, w)).toEqual([])
    const d = BAUTAGEBUCH.baue(w, 0)
    expect(d.betreff).toBe('Bautagesbericht Nr. 7 vom 27.11.2026')
    expect(absaetze(d.bloecke)).toContain('Wetter: trocken · Temperatur: 4 °C')
    expect(tabelle(d.bloecke)).toMatchObject({ zeilen: [['Gesellen', '3'], ['Meister', '1']], summen: [['Summe', '4']] })
  })
})

describe('alle Vorlagen', () => {
  it('haben eindeutige Feld-IDs, die Kopffelder und einen Dateinamen', () => {
    for (const [id, v] of Object.entries(VORLAGEN)) {
      expect(v.id, id).toBe(id)
      const ids = v.felder.map((f) => f.id)
      expect(new Set(ids).size, id).toBe(ids.length)
      for (const pflicht of ['absender', 'empfaenger', 'bauvorhaben', 'auftrag', 'ort', 'datum']) expect(ids, id).toContain(pflicht)
      expect(v.unterschriften.length, id).toBeGreaterThan(0)
      // baut auch mit leeren Angaben, ohne Fehler zu werfen
      const leer = { text: {}, tabellen: {} }
      expect(v.baue(leer, 0).unterschriften.length, id).toBe(v.unterschriften.length)
      expect(fehlend(v, leer).length, id).toBeGreaterThan(0)
    }
  })
})

describe('Befunde des vierten Prüflaufs', () => {
  it('Stundenzettel: unlesbare oder fehlende Stunden sperren den Export', () => {
    const zeilen = [{ wer: 'A', stunden: '8', was: '' }, { wer: 'B', stunden: '7,5 h', was: '' }, { wer: 'C', stunden: '', was: 'Zuarbeit' }]
    expect(STUNDENZETTEL.pruefe?.(werte({ arbeiten: 'x' }, { stunden: zeilen }))).toEqual(['Arbeitszeit: Zahl in Zeile 2 fehlt oder ist nicht lesbar', 'Arbeitszeit: Zahl in Zeile 3 fehlt oder ist nicht lesbar'])
    expect(STUNDENZETTEL.pruefe?.(werte({ arbeiten: 'x' }, { stunden: [zeilen[0]], material: [{ was: 'KVH', menge: 'viel', einheit: 'm' }] }))).toEqual(['Material: Menge in Zeile 1 ist nicht lesbar'])
    expect(STUNDENZETTEL.pruefe?.(werte({ arbeiten: 'x' }, { stunden: [zeilen[0]], material: [{ was: 'Kran', menge: '', einheit: '' }] }))).toEqual([])
  })
  it('Bautagesbericht: unlesbare Anzahl sperrt den Export', () => {
    expect(BAUTAGEBUCH.pruefe?.(werte({ arbeiten: 'x' }, { personal: [{ wer: 'Gesellen', anzahl: '2' }, { wer: 'Meister', anzahl: 'einer' }] }))).toEqual(['Personal: Zahl in Zeile 2 fehlt oder ist nicht lesbar'])
  })
  it('Abnahme: Ergebnis und Mängelliste müssen zusammenpassen', () => {
    const mangel = { maengel: [{ was: 'Ortgangbrett lose', bis: '' }] }
    const basis = { vertrag: 'vob', leistung: 'Zimmerarbeiten', tag: '2026-11-27' }
    expect(ABNAHME.pruefe?.(werte({ ...basis, ergebnis: 'ohne' }, mangel))).toHaveLength(1)
    expect(ABNAHME.pruefe?.(werte({ ...basis, ergebnis: 'mit' }))).toHaveLength(1)
    expect(ABNAHME.pruefe?.(werte({ ...basis, ergebnis: 'verweigert' }, { maengel: [{ was: '', bis: '' }] }))).toHaveLength(1)
    expect(ABNAHME.pruefe?.(werte({ ...basis, ergebnis: 'ohne' }))).toEqual([])
    expect(ABNAHME.pruefe?.(werte({ ...basis, ergebnis: 'mit' }, mangel))).toEqual([])
  })
  it('Aufmaß: Abzug mit negativer Anzahl, Zwischenüberschrift, unlesbare Zeile sperrt', () => {
    const zeilen = [
      { was: 'Fassade Süd', anzahl: '', laenge: '', breite: '', hoehe: '' },
      { was: 'Schalung', anzahl: '1', laenge: '8', breite: '3', hoehe: '' },
      { was: 'Abzug Fenster', anzahl: '-2', laenge: '1,2', breite: '1,5', hoehe: '' },
      { was: 'Abzug Tür', anzahl: '− 1', laenge: '1', breite: '2', hoehe: '' },
    ]
    const r = rechneAufmass(zeilen)
    expect(r.zeilen[0]).toEqual({ bezeichnung: 'Fassade Süd', titel: true })
    expect(r.summen['m²']).toBeCloseTo(24 - 3.6 - 2)
    expect(r.summen.Stk).toBeUndefined()
    expect(AUFMASS.pruefe?.(werte({}, { positionen: zeilen }))).toEqual([])
    expect(AUFMASS.pruefe?.(werte({}, { positionen: [...zeilen, { was: 'x', anzahl: '1', laenge: '3x', breite: '', hoehe: '' }] }))).toEqual(['Positionen: Zahl in Zeile 5 ist nicht lesbar'])
    expect(tabelle(AUFMASS.baue(werte({}, { positionen: zeilen }), 0).bloecke)).toMatchObject({ zeilen: [['Fassade Süd', '', '', '', ''], ['Schalung', '1', '8 × 3', '24', 'm²'], ['Abzug Fenster', '-2', '1,2 × 1,5', '-3,6', 'm²'], ['Abzug Tür', '-1', '1 × 2', '-2', 'm²']] })
  })
  it('Bedenken: Haftungsbaustein nicht bei Unfallgefahren, Arbeitsruhe nicht vorbelegt', () => {
    const basis = { vertrag: 'vob', bedenken: 'x', folgen: 'y', haftung: '1' }
    expect(absaetze(BEDENKEN.baue(werte({ ...basis, gegenstand: 'sicherung' }), 0).bloecke)).not.toContain('§ 13')
    expect(absaetze(BEDENKEN.baue(werte({ ...basis, gegenstand: 'ausfuehrung' }), 0).bloecke)).toContain('§ 13 Abs. 3 VOB/B')
    expect(BEDENKEN.felder.find((f) => f.id === 'stopp')?.vorgabe).toBeUndefined()
  })
  it('Behinderung: Aufforderung zur Beseitigung ist abwählbar, alte Dokumente behalten sie', () => {
    const basis = { vertrag: 'vob', seit: '2026-11-25', ursache: 'Sturm', auswirkung: 'Kein Kranbetrieb' }
    expect(absaetze(BEHINDERUNG.baue(werte({ ...basis, aufforderung: '' }), 0).bloecke)).not.toContain('zu beseitigen')
    expect(absaetze(BEHINDERUNG.baue(werte({ ...basis, aufforderung: '1' }), 0).bloecke)).toContain('zu beseitigen')
    expect(absaetze(BEHINDERUNG.baue(werte(basis), 0).bloecke)).toContain('zu beseitigen')
  })
  it('Dateiname: kein Bindestrich am Ende, nur ein echtes Datum', () => {
    expect(dokDateiname(AUFMASS, werte({ bauvorhaben: 'a'.repeat(39) + ' b c' }))).toBe(`Aufmass_${'a'.repeat(39)}_2026-11-27.pdf`)
    expect(dokDateiname(AUFMASS, werte({ datum: '../../x' }))).toBe('Aufmass_Neubau-Halle.pdf')
  })
})
