import { describe, expect, it } from 'vitest'
import { baueAnzeige, dateiname, datumDeutsch, fehlendeAngaben, type AnzeigeDaten } from './anzeige'

const basis: AnzeigeDaten = {
  vertrag: 'vob',
  absender: 'Zimmerei Beispiel GmbH\nHolzweg 1\n12345 Musterstadt',
  empfaenger: 'Bauherr Beispiel\n\nBaustraße 2',
  bauvorhaben: 'Neubau Halle, Baustraße 2',
  auftrag: 'Nr. 4711 vom 01.10.2026',
  ort: 'Musterstadt',
  datum: '2026-11-27',
  leistung: 'Dachstuhl aufrichten',
  seit: '2026-11-25',
  ursache: 'Die Betondecke ist nicht ausgehärtet.',
  auswirkung: 'Der Dachstuhl kann nicht gestellt werden.',
  dauer: '',
  massnahme: '',
  fristverlaengerung: true,
  mehrkosten: true,
  unterzeichner: 'M. Beispiel',
}
const text = (d: AnzeigeDaten, fotos = 0) => baueAnzeige(d, fotos).absaetze.map((p) => p.text).join('\n')

describe('Behinderungsanzeige', () => {
  it('Datum', () => {
    expect(datumDeutsch('2026-11-05')).toBe('05.11.2026')
    expect(datumDeutsch('gestern')).toBe('gestern')
  })
  it('VOB/B: nennt die Paragrafen und das Datum der Behinderung', () => {
    const a = baueAnzeige(basis, 2)
    expect(a.betreff).toBe('Behinderungsanzeige gemäß § 6 Abs. 1 VOB/B')
    expect(a.ortDatum).toBe('Musterstadt, 27.11.2026')
    expect(a.absender).toHaveLength(3)
    expect(a.empfaenger).toEqual(['Bauherr Beispiel', 'Baustraße 2'])
    expect(a.bezug).toEqual(['Bauvorhaben: Neubau Halle, Baustraße 2', 'Auftrag: Nr. 4711 vom 01.10.2026', 'Betroffene Leistung: Dachstuhl aufrichten'])
    const t = text(basis, 2)
    expect(t).toContain('seit dem 25.11.2026')
    expect(t).toContain('§ 6 Abs. 2 und 4 VOB/B')
    expect(t).toContain('§ 6 Abs. 6 VOB/B')
    expect(t).toContain('derzeit nicht absehbar')
    expect(t).toContain('Anlage: 2 Fotos')
    expect(t).not.toContain('Erforderliche Maßnahmen')
  })
  it('BGB: ohne VOB-Paragrafen', () => {
    const d = { ...basis, vertrag: 'bgb' as const }
    expect(baueAnzeige(d).betreff).toBe('Behinderungsanzeige')
    expect(text(d)).not.toContain('VOB')
    expect(text(d)).toContain('§ 642 BGB')
  })
  it('freiwillige Angaben steuern den Text', () => {
    const d = { ...basis, dauer: 'etwa 2 Wochen', massnahme: 'Decke freigeben', fristverlaengerung: false, mehrkosten: false, auftrag: '', leistung: '' }
    const t = text(d, 1)
    expect(t).toContain('Voraussichtliche Dauer der Behinderung: etwa 2 Wochen')
    expect(t).toContain('Decke freigeben')
    expect(t).not.toContain('Ausführungsfristen')
    expect(t).not.toContain('Mehrkosten')
    expect(t).toContain('Anlage: 1 Foto')
    expect(baueAnzeige(d).bezug).toEqual(['Bauvorhaben: Neubau Halle, Baustraße 2'])
  })
  it('Pflichtangaben und Dateiname', () => {
    expect(fehlendeAngaben(basis)).toEqual([])
    expect(fehlendeAngaben({ ...basis, ursache: '  ', empfaenger: '' })).toEqual(['Empfänger', 'Hindernde Umstände'])
    expect(dateiname(basis)).toBe('Behinderungsanzeige_Neubau-Halle-Baustrasse-2_2026-11-27.pdf')
    expect(dateiname({ ...basis, bauvorhaben: '../../x<y>' })).toBe('Behinderungsanzeige_x-y_2026-11-27.pdf')
  })
})
