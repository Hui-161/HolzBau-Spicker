import { EingabeFehler, pruefe } from './trig'

/** außen: Stab an beiden Enden · ecke: Stab nur am Ende · innen: kein Stab an den Enden */
export type EinteilArt = 'aussen' | 'ecke' | 'innen'

const felderJeArt = (n: number, art: EinteilArt): number =>
  art === 'aussen' ? n - 1 : art === 'ecke' ? n : n + 1

/** Kleinste Stabzahl, bei der das Achsmaß maxAchs nicht überschritten wird. */
export function stabAnzahl(breite: number, staerke: number, maxAchs: number, art: EinteilArt): number {
  pruefe(maxAchs > staerke, 'Max. Achsmaß muss größer als die Materialstärke sein.')
  pruefe(breite > 0 && staerke > 0, 'Breite und Materialstärke müssen größer als 0 sein.')
  const mindest = art === 'aussen' ? 2 : 1
  // nur Stabzahlen, die überhaupt auf die Breite passen
  for (let n = mindest; n * staerke <= breite + 1e-9 && n < 100000; n++) {
    const felder = felderJeArt(n, art)
    if (felder > 0 && (breite - n * staerke) / felder + staerke <= maxAchs + 1e-9) return n
  }
  throw new EingabeFehler('Mit diesem Achsmaß passt keine Einteilung auf die Breite.')
}

export function einteilung(breite: number, staerke: number, anzahl: number, art: EinteilArt) {
  pruefe(breite > 0, 'Breite muss größer als 0 sein.')
  pruefe(staerke > 0, 'Materialstärke muss größer als 0 sein.')
  pruefe(Number.isInteger(anzahl) && anzahl >= 0, 'Anzahl muss eine ganze Zahl sein.')
  const felder = felderJeArt(anzahl, art)
  pruefe(felder > 0, 'Für diese Art der Einteilung werden mehr Stäbe benötigt.')
  const feld = (breite - anzahl * staerke) / felder
  pruefe(feld >= 0, 'So viele Stäbe passen nicht auf die Breite.')
  const achs = feld + staerke
  // Position = linke Kante jedes Stabes, gemessen vom Anfang
  const start = art === 'aussen' ? 0 : feld
  const positionen = Array.from({ length: anzahl }, (_, i) => start + i * achs)
  return { anzahl, felder, feldbreite: feld, achsmass: achs, positionen }
}

export interface SparrenEinteilungEingabe {
  /** Gebäudelänge, Außenkante Giebel bis Außenkante Giebel */
  laenge: number
  sparrenbreite: number
  /** Giebel-Außenkante bis Außenkante erster Sparren */
  randabstand: number
  maxAchs: number
}

export function sparrenEinteilung(e: SparrenEinteilungEingabe) {
  pruefe(e.sparrenbreite > 0, 'Sparrenbreite muss größer als 0 sein.')
  pruefe(e.maxAchs > 0, 'Max. Achsmaß muss größer als 0 sein.')
  pruefe(e.randabstand >= 0, 'Randabstand darf nicht negativ sein.')
  const achsStrecke = e.laenge - 2 * e.randabstand - e.sparrenbreite
  pruefe(achsStrecke > 0, 'Die Länge ist zu kurz für zwei Sparren mit diesem Randabstand.')
  const felder = Math.ceil(achsStrecke / e.maxAchs - 1e-9)
  const achsmass = achsStrecke / felder
  const sparren = Array.from({ length: felder + 1 }, (_, i) => {
    const kante = e.randabstand + i * achsmass
    return { kante, achse: kante + e.sparrenbreite / 2 }
  })
  return {
    felder,
    anzahl: felder + 1,
    achsmass,
    lichtesMass: achsmass - e.sparrenbreite,
    sparren,
  }
}
