import { pruefe } from './trig'
import { verschnitt } from './sonstiges'

/**
 * Stückliste mit Querschnitt und Bezeichnung.
 * Zeilenform:  [Bezeichnung:] Länge [x Anzahl] [@ Querschnitt]
 * Beispiele:   240 x 3            Sparren: 480 x 12 @ 8/18            Pfosten: 250 @ 12/12
 * Teile werden nach Querschnitt getrennt verteilt – ein 8/18 kann nicht aus einem 12/12 geschnitten werden.
 */
export interface ListenTeil {
  laenge: number
  anzahl: number
  /** leer = ohne Angabe */
  querschnitt: string
  bezeichnung: string
}

const FEHLER = 'Stückliste: je Zeile „Länge“ oder „Länge x Anzahl“, wahlweise mit „Name:“ davor und „@ Querschnitt“ dahinter.'

const zahl = (s: string): number => (/^\d+([.,]\d+)?$/.test(s) ? Number.parseFloat(s.replace(',', '.')) : NaN)

/** „8 / 18“, „8x18“ und „8/18“ sind derselbe Querschnitt */
const normQuerschnitt = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[x×*:]/g, '/')
    .slice(0, 20)

export function leseStueckliste(text: string): ListenTeil[] {
  const teile: ListenTeil[] = []
  for (const zeile of text.split(/[\n;]/)) {
    let rest = zeile.trim()
    if (rest === '') continue
    let bezeichnung = ''
    let querschnitt = ''
    // erst den Querschnitt abtrennen: er darf selbst einen Doppelpunkt enthalten („8:18“)
    const at = rest.lastIndexOf('@')
    if (at >= 0) {
      querschnitt = normQuerschnitt(rest.slice(at + 1))
      rest = rest.slice(0, at).trim()
      pruefe(querschnitt !== '', FEHLER)
      // „240 @ 8/18 x 3“ würde sonst als Querschnitt 8/18/3 gelesen
      pruefe(!/^[\d.,]+(\/[\d.,]+){2,}$/.test(querschnitt), 'Stückliste: Die Anzahl gehört vor das „@“, zum Beispiel 240 x 3 @ 8/18.')
    }
    const doppelpunkt = rest.indexOf(':')
    if (doppelpunkt >= 0) {
      bezeichnung = rest.slice(0, doppelpunkt).trim().slice(0, 40)
      rest = rest.slice(doppelpunkt + 1).trim()
      // „12:30“ ist vermutlich ein Tippfehler und kein Bauteil namens 12
      pruefe(!/^[\d.,]*$/.test(bezeichnung), FEHLER)
    }
    const [l, n = '1', ...mehr] = rest.split(/\s*[x×*]\s*/i)
    const [laenge, anzahl] = [zahl(l.trim()), zahl(n.trim())]
    pruefe(mehr.length === 0 && Number.isFinite(laenge) && laenge > 0 && Number.isInteger(anzahl) && anzahl > 0, FEHLER)
    pruefe(anzahl <= 2000, 'Zu viele Teile (höchstens 2000).')
    teile.push({ laenge, anzahl, querschnitt, bezeichnung })
  }
  pruefe(teile.length > 0, 'Bitte mindestens ein Teil eingeben.')
  return teile
}

/** Verteilt die Teile je Querschnitt getrennt auf Stangen. */
export function zuschnitt(stangenlaengen: number[], schnittbreite: number, teile: ListenTeil[]) {
  pruefe(teile.reduce((a, t) => a + t.anzahl, 0) <= 2000, 'Zu viele Teile (höchstens 2000).')
  const querschnitte = [...new Set(teile.map((t) => t.querschnitt))]
  pruefe(querschnitte.length <= 30, 'Höchstens 30 verschiedene Querschnitte.')
  const gruppen = querschnitte.map((q) => {
    const eigene = teile.filter((t) => t.querschnitt === q)
    const r = verschnitt(stangenlaengen, schnittbreite, eigene)
    // Bezeichnungen den verteilten Längen wieder zuordnen: je Länge ein Vorrat an Namen
    const vorrat = new Map<number, string[]>()
    for (const t of eigene) {
      const namen = vorrat.get(t.laenge) ?? []
      for (let i = 0; i < t.anzahl; i++) namen.push(t.bezeichnung)
      vorrat.set(t.laenge, namen)
    }
    const stangen = r.stangen.map((s) => ({
      ...s,
      namen: [...new Set(s.teile.map((l) => vorrat.get(l)?.shift() ?? '').filter((n) => n !== ''))],
    }))
    return { querschnitt: q, ...r, stangen }
  })
  const material = gruppen.reduce((a, g) => a + g.stangen.reduce((b, s) => b + s.laenge, 0), 0)
  const genutzt = teile.reduce((a, t) => a + t.laenge * t.anzahl, 0)
  return {
    gruppen,
    anzahl: gruppen.reduce((a, g) => a + g.anzahl, 0),
    teile: gruppen.reduce((a, g) => a + g.teile, 0),
    rest: gruppen.reduce((a, g) => a + g.rest, 0),
    ausnutzung: (genutzt / material) * 100,
    /** Bedarf je Querschnitt und Stangenlänge */
    bedarf: gruppen.flatMap((g) => g.bedarf.map((b) => ({ querschnitt: g.querschnitt, ...b }))),
  }
}
