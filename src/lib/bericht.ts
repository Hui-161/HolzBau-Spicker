import type { Mass, Zeichnung } from '../calcs/types'

/** Ein Rechner im Projektbericht – alle Texte sind bereits übersetzt und formatiert. */
export interface BerichtTeil {
  titel: string
  eingaben: [string, string][]
  ausgaben: [string, string][]
  zeichnungen: { svg: string; breite: number; hoehe: number }[]
  listen: { titel: string; kopf: string[]; zeilen: string[][] }[]
}

export interface Bericht {
  titel: string
  /** z. B. „Stand 27.11.2026 · Maße in cm“ */
  unterzeile: string
  notizTitel: string
  notiz: string
  /** Projektfotos, je eines pro Seite am Ende */
  fotos?: { daten: string; breite: number; hoehe: number; titel: string }[]
  teile: BerichtTeil[]
  fusszeile: string
  /** „Seite“ und „von“ in der gewählten Sprache */
  seite: [string, string]
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Zeichnung als eigenständiges SVG mit festen Farben: außerhalb der Seite gelten weder
 * `currentColor` noch die Farbvariablen der App.
 */
export function zeichnungAlsSvg(z: Zeichnung, beschriftung: (m: Mass) => string): string {
  const texte = (z.masse ?? [])
    .map((m) => {
      const text = beschriftung(m)
      const dreh = m.drehung ? ` transform="rotate(${m.drehung} ${m.x} ${m.y})"` : ''
      const grund = m.hinterlegt ? `<rect x="${m.x - text.length * 2.8 - 3}" y="${m.y - 6.5}" width="${text.length * 5.6 + 6}" height="13" rx="2" fill="#fff"${dreh}/>` : ''
      return `${grund}<text x="${m.x}" y="${m.y}" text-anchor="${m.anker ?? 'middle'}" dominant-baseline="middle" font-family="Helvetica, Arial, sans-serif" font-size="${m.klein ? 8.5 : 10.5}" fill="#000" stroke="#fff" stroke-width="3" stroke-linejoin="round" paint-order="stroke"${dreh}>${esc(text)}</text>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${z.breite} ${z.hoehe}" width="${z.breite}" height="${z.hoehe}" style="color:#2f5d3a"><rect width="100%" height="100%" fill="#fff"/>${z.inhalt}${texte}</svg>`
}

/** SVG in ein PNG wandeln (für das PDF). */
async function svgAlsPng(svg: string, breite: number, hoehe: number, faktor = 4): Promise<string> {
  const bild = new Image()
  bild.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  await bild.decode()
  const flaeche = document.createElement('canvas')
  flaeche.width = Math.round(breite * faktor)
  flaeche.height = Math.round(hoehe * faktor)
  const stift = flaeche.getContext('2d')
  if (!stift) throw new Error('Kein Zeichenkontext')
  stift.drawImage(bild, 0, 0, flaeche.width, flaeche.height)
  return flaeche.toDataURL('image/png')
}

const LINKS = 20
const RECHTS = 20
const OBEN = 18
const UNTEN = 18
const SEITE_B = 210
const SEITE_H = 297
const BREITE = SEITE_B - LINKS - RECHTS
const ZEILE = 5
const MAX_ZEILEN = 80

/** Setzt den Projektbericht als A4-PDF. Alles geschieht auf dem Gerät. */
export async function erzeugeBericht(b: Bericht): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  let y = OBEN

  const platz = (hoehe: number): void => {
    if (y + hoehe > SEITE_H - UNTEN) {
      doc.addPage()
      y = OBEN
    }
  }
  const schrift = (fett: boolean, groesse: number, grau = 0): void => {
    doc.setFont('helvetica', fett ? 'bold' : 'normal')
    doc.setFontSize(groesse)
    doc.setTextColor(grau)
  }
  const absatz = (text: string, fett = false, groesse = 10, grau = 0): void => {
    schrift(fett, groesse, grau)
    for (const teil of text.split('\n')) {
      for (const z of doc.splitTextToSize(teil === '' ? ' ' : teil, BREITE) as string[]) {
        platz(ZEILE)
        doc.text(z, LINKS, y)
        y += ZEILE
      }
    }
  }
  /** Bezeichnung links, Wert rechtsbündig; lange Bezeichnungen brechen um */
  const paar = ([name, wert]: [string, string], spalte = BREITE): void => {
    schrift(false, 10)
    const wertBreite = doc.getTextWidth(wert)
    const zeilen = doc.splitTextToSize(name, Math.max(30, spalte - wertBreite - 4)) as string[]
    platz(ZEILE * zeilen.length)
    doc.setTextColor(90)
    doc.text(zeilen, LINKS, y)
    doc.setTextColor(0)
    doc.text(wert, LINKS + spalte, y, { align: 'right' })
    y += ZEILE * zeilen.length
  }

  absatz(b.titel, true, 16)
  y += 1
  absatz(b.unterzeile, false, 10, 90)
  y += 3
  if (b.notiz.trim()) {
    absatz(b.notizTitel, true, 11)
    absatz(b.notiz.trim())
    y += 3
  }

  for (const teil of b.teile) {
    // Überschrift nicht allein am Seitenende stehen lassen
    platz(ZEILE * 5)
    doc.setDrawColor(170)
    doc.line(LINKS, y - 2, SEITE_B - RECHTS, y - 2)
    y += 3
    absatz(teil.titel, true, 12)
    y += 1
    for (const e of teil.eingaben) {
      // mehrzeilige Eingaben (Stücklisten) als Block darunter
      if (e[1].includes('\n')) {
        absatz(e[0], false, 10, 90)
        absatz(e[1])
      } else paar(e)
    }
    y += 2
    schrift(true, 10)
    for (const a of teil.ausgaben) paar(a)
    for (const z of teil.zeichnungen) {
      const breite = Math.min(120, BREITE)
      const hoehe = (breite * z.hoehe) / z.breite
      platz(hoehe + 4)
      y += 2
      doc.addImage(await svgAlsPng(z.svg, z.breite, z.hoehe), 'PNG', LINKS, y, breite, hoehe)
      y += hoehe + 2
    }
    for (const l of teil.listen) {
      y += 2
      platz(ZEILE * 3)
      absatz(l.titel, true, 10)
      const n = l.kopf.length
      // erste Spalte schmal, wenn sie nur eine Nummer trägt; der Rest teilt sich die Breite
      const erste = n > 2 && l.kopf[0].length <= 7 ? 16 : BREITE / n
      const weite = n > 1 ? (BREITE - erste) / (n - 1) : BREITE
      const x = (i: number): number => LINKS + (i === 0 ? 0 : erste + (i - 1) * weite)
      const zeile = (zellen: string[], grau: number): void => {
        schrift(false, 9, grau)
        const umbruch = zellen.map((c, i) => doc.splitTextToSize(c, (i === 0 ? erste : weite) - 2) as string[])
        const hoch = Math.max(...umbruch.map((u) => u.length)) * 4.3
        platz(hoch)
        umbruch.forEach((u, i) => doc.text(u, x(i), y))
        y += hoch
      }
      zeile(l.kopf, 90)
      for (const z of l.zeilen.slice(0, MAX_ZEILEN)) zeile(z, 0)
      if (l.zeilen.length > MAX_ZEILEN) zeile(['…'], 90)
    }
    y += 5
  }

  for (const [i, f] of (b.fotos ?? []).entries()) {
    doc.addPage()
    y = OBEN
    absatz(f.titel.trim() || `Foto ${i + 1}`, true, 11)
    y += 2
    const maxH = SEITE_H - UNTEN - y - 8
    const k = Math.min(BREITE / f.breite, maxH / f.hoehe)
    doc.addImage(f.daten, 'JPEG', LINKS, y, f.breite * k, f.hoehe * k)
  }

  const seiten = doc.getNumberOfPages()
  schrift(false, 8, 110)
  for (let s = 1; s <= seiten; s++) {
    doc.setPage(s)
    doc.text(doc.splitTextToSize(b.fusszeile, BREITE - 30) as string[], LINKS, SEITE_H - 11)
    doc.text(`${b.seite[0]} ${s} ${b.seite[1]} ${seiten}`, SEITE_B - RECHTS, SEITE_H - 11, { align: 'right' })
  }
  return doc.output('blob')
}
