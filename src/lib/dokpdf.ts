import type { DokInhalt } from '../core/dokumente'
import type { Bild } from './pdf'

const LINKS = 25
const RECHTS = 20
const OBEN = 20
const UNTEN = 18
const SEITE_B = 210
const SEITE_H = 297
const BREITE = SEITE_B - LINKS - RECHTS
const ZEILE = 5.2

/**
 * Setzt eine Dokumentvorlage als A4-PDF: Briefkopf, Absätze, Tabellen, Unterschriften, Fotos.
 * Die PDF-Bibliothek wird erst hier geladen. Alles geschieht auf dem Gerät.
 */
export async function erzeugeDokument(d: DokInhalt, unterschriften: (string | undefined)[], bilder: Bild[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  let y = OBEN

  const platz = (hoehe: number): void => {
    if (y + hoehe > SEITE_H - UNTEN) {
      doc.addPage()
      y = OBEN
    }
  }
  const schrift = (fett: boolean, groesse = 11): void => {
    doc.setFont('helvetica', fett ? 'bold' : 'normal')
    doc.setFontSize(groesse)
    doc.setTextColor(0)
  }
  const schreibe = (text: string, opt: { fett?: boolean; groesse?: number; abstand?: number } = {}): void => {
    schrift(!!opt.fett, opt.groesse)
    for (const absatz of text.split('\n')) {
      for (const z of doc.splitTextToSize(absatz === '' ? ' ' : absatz, BREITE) as string[]) {
        platz(ZEILE)
        doc.text(z, LINKS, y)
        y += ZEILE
      }
    }
    y += opt.abstand ?? 0
  }

  schreibe(d.absender.join('\n'), { groesse: 10, abstand: 9 })
  schreibe(d.empfaenger.join('\n'), { abstand: 8 })
  if (d.ortDatum) {
    schrift(false)
    platz(ZEILE)
    doc.text(d.ortDatum, SEITE_B - RECHTS, y, { align: 'right' })
    y += ZEILE + 4
  }
  schreibe(d.betreff, { fett: true, groesse: 13, abstand: 2 })
  schreibe(d.bezug.join('\n'), { abstand: 5 })
  if (d.anrede) schreibe(d.anrede, { abstand: 3 })

  for (const b of d.bloecke) {
    if (b.art === 'absatz') {
      // eine Überschrift nicht allein am Seitenende stehen lassen
      if (b.fett) platz(ZEILE * 3)
      schreibe(b.text, { fett: b.fett, abstand: b.fett ? 0.5 : 3.5 })
      continue
    }
    // Tabelle: Textspalten teilen sich den Platz, Zahlenspalten sind schmal
    const n = b.kopf.length
    const schmal = 24
    const istSchmal = (i: number): boolean => b.rechts[i] || b.kopf[i] === '' || b.kopf[i] === 'Nr.'
    const anzahlSchmal = b.kopf.filter((_, i) => istSchmal(i)).length
    const breit = (BREITE - anzahlSchmal * schmal) / Math.max(1, n - anzahlSchmal)
    const weite = b.kopf.map((_, i) => (istSchmal(i) ? schmal : breit))
    const x0 = weite.map((_, i) => LINKS + weite.slice(0, i).reduce((a, w) => a + w, 0))
    const zeile = (zellen: string[], fett: boolean, kopfzeile = false): void => {
      schrift(fett, 10)
      const umbruch = zellen.map((c, i) => doc.splitTextToSize(c, weite[i] - 3) as string[])
      const hoch = Math.max(1, ...umbruch.map((u) => u.length)) * 4.6 + 1.6
      // nach einem Seitenumbruch den Tabellenkopf wiederholen
      if (!kopfzeile && y + hoch > SEITE_H - UNTEN) {
        platz(hoch)
        zeile(b.kopf, true, true)
        schrift(fett, 10)
      }
      platz(hoch)
      umbruch.forEach((u, i) => {
        if (b.rechts[i]) doc.text(u, x0[i] + weite[i] - 2, y, { align: 'right' })
        else doc.text(u, x0[i] + (i === 0 ? 0 : 1), y)
      })
      y += hoch
      doc.setDrawColor(200)
      doc.line(LINKS, y - 4.2, LINKS + BREITE, y - 4.2)
    }
    zeile(b.kopf, true, true)
    for (const z of b.zeilen) zeile(z, false)
    for (const z of b.summen ?? []) zeile(z, true)
    y += 3
  }

  // Gruß und Unterschriften bleiben zusammen auf einer Seite
  platz(42)
  y += 2
  if (d.gruss) schreibe(d.gruss, { abstand: 1 })
  const spalte = d.unterschriften.length > 1 ? BREITE / d.unterschriften.length : 80
  d.unterschriften.forEach((name, i) => {
    const x = LINKS + i * spalte
    const bild = unterschriften[i]
    if (bild) doc.addImage(bild, 'PNG', x, y, 54, 18)
    doc.setDrawColor(120)
    doc.line(x, y + 19, x + Math.min(70, spalte - 6), y + 19)
    schrift(false, 10)
    doc.text(doc.splitTextToSize(name, spalte - 6) as string[], x, y + 19 + ZEILE)
  })
  y += 19 + ZEILE * 2

  bilder.forEach((b, i) => {
    doc.addPage()
    y = OBEN
    schreibe(`Anlage ${i + 1} von ${bilder.length}: ${d.betreff}`, { fett: true, abstand: 1 })
    schreibe(d.bezug[0] ?? '', { groesse: 10, abstand: 3 })
    const maxH = SEITE_H - UNTEN - y - 6
    const f = Math.min(BREITE / b.breite, maxH / b.hoehe)
    doc.addImage(b.daten, 'JPEG', LINKS, y, b.breite * f, b.hoehe * f)
  })

  const seiten = doc.getNumberOfPages()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(110)
  for (let s = 1; s <= seiten; s++) {
    doc.setPage(s)
    doc.text(`Seite ${s} von ${seiten}`, SEITE_B - RECHTS, SEITE_H - 10, { align: 'right' })
  }
  return doc.output('blob')
}
