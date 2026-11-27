import { atan, pruefe } from './trig'

/* ---------- Treppe (Schrittmaßregel, alle Maße in cm) ---------- */

export function treppe(geschosshoeheCm: number, wunschSteigungCm = 18, schrittmassCm = 63) {
  pruefe(geschosshoeheCm > 0, 'Geschosshöhe muss größer als 0 sein.')
  pruefe(wunschSteigungCm > 0, 'Steigung muss größer als 0 sein.')
  // die Anzahl, deren Steigung dem Wunsch am nächsten kommt
  const unten = Math.max(1, Math.floor(geschosshoeheCm / wunschSteigungCm))
  const naeher = (n: number): number => Math.abs(geschosshoeheCm / n - wunschSteigungCm)
  const steigungen = naeher(unten + 1) < naeher(unten) ? unten + 1 : unten
  const steigung = geschosshoeheCm / steigungen
  const auftritt = schrittmassCm - 2 * steigung
  pruefe(auftritt > 0, 'Mit dieser Steigung ergibt sich kein Auftritt.')
  return {
    steigungen,
    auftritte: steigungen - 1,
    steigung,
    auftritt,
    lauflaenge: (steigungen - 1) * auftritt,
    neigung: atan(steigung / auftritt),
    /** Bequemlichkeitsregel: a − s ≈ 12 cm */
    bequem: auftritt - steigung,
    /** Sicherheitsregel: a + s ≈ 46 cm */
    sicher: auftritt + steigung,
  }
}

/* ---------- Holzmenge ---------- */

export function holzmenge(breiteCm: number, hoeheCm: number, laengeM: number, stueck: number, dichte = 0) {
  pruefe(breiteCm > 0 && hoeheCm > 0 && laengeM > 0, 'Querschnitt und Länge müssen größer als 0 sein.')
  pruefe(stueck > 0, 'Stückzahl muss größer als 0 sein.')
  const volumen = (breiteCm / 100) * (hoeheCm / 100) * laengeM * stueck
  return {
    volumen,
    laufmeter: laengeM * stueck,
    /** Abwicklung aller vier Seiten, z. B. für Anstrich */
    oberflaeche: 2 * ((breiteCm + hoeheCm) / 100) * laengeM * stueck,
    gewicht: volumen * dichte,
  }
}

/* ---------- Maßstab ---------- */

export function massstab(wert: number, zahl: number, richtung: 'planZuReal' | 'realZuPlan') {
  pruefe(zahl > 0, 'Maßstabszahl muss größer als 0 sein.')
  return richtung === 'planZuReal' ? wert * zahl : wert / zahl
}

/* ---------- Zuschnitt / Verschnitt ---------- */

export interface Teil {
  laenge: number
  anzahl: number
}

/** Liest eine Stückliste: je Zeile (oder durch ; getrennt) „Länge“ oder „Länge x Anzahl“. */
export function leseTeile(text: string): Teil[] {
  const zahl = (s: string): number => (/^\d+([.,]\d+)?$/.test(s) ? Number.parseFloat(s.replace(',', '.')) : NaN)
  const teile: Teil[] = []
  for (const zeile of text.split(/[\n;]/)) {
    const z = zeile.trim()
    if (z === '') continue
    const [l, n = '1', ...mehr] = z.split(/\s*[x×*]\s*/i)
    pruefe(mehr.length === 0, 'Stückliste: je Zeile „Länge“ oder „Länge x Anzahl“, zum Beispiel 240 x 3.')
    const [laenge, anzahl] = [zahl(l.trim()), zahl(n.trim())]
    pruefe(Number.isFinite(laenge) && laenge > 0 && Number.isInteger(anzahl) && anzahl > 0, 'Stückliste: je Zeile „Länge“ oder „Länge x Anzahl“, zum Beispiel 240 x 3.')
    teile.push({ laenge, anzahl })
  }
  pruefe(teile.length > 0, 'Bitte mindestens ein Teil eingeben.')
  return teile
}

/** Liest Stangenlängen: je Zeile (oder durch ; getrennt) eine Länge. */
export function leseLaengen(text: string): number[] {
  const laengen: number[] = []
  for (const zeile of text.split(/[\n;]/)) {
    const z = zeile.trim()
    if (z === '') continue
    pruefe(/^\d+([.,]\d+)?$/.test(z), 'Stangenlängen: je Zeile eine Länge, zum Beispiel 500.')
    const l = Number.parseFloat(z.replace(',', '.'))
    pruefe(l > 0, 'Stangenlänge muss größer als 0 sein.')
    if (!laengen.includes(l)) laengen.push(l)
  }
  pruefe(laengen.length > 0, 'Bitte mindestens eine Stangenlänge eingeben.')
  pruefe(laengen.length <= 10, 'Höchstens 10 verschiedene Stangenlängen.')
  return laengen.sort((a, b) => b - a)
}

interface Stange {
  laenge: number
  teile: number[]
  rest: number
}

/**
 * Eine Aufteilung nach dem Verfahren „größtes passendes Teil zuerst“. Stehen mehrere Längen zur
 * Wahl, bekommt jede neue Stange die Länge, die sich mit den verbleibenden Teilen am besten füllt.
 */
function verteile(laengen: number[], schnittbreite: number, alle: number[]): Stange[] {
  const offen = [...alle]
  const fuelle = (l: number): number[] => {
    const plaetze: number[] = []
    let frei = l
    offen.forEach((teil, i) => {
      // jedes Teil braucht einen Schnitt; nur das letzte darf bündig am Stangenende sitzen
      if (teil <= frei + 1e-9) {
        plaetze.push(i)
        frei -= teil + schnittbreite
      }
    })
    return plaetze
  }
  const stangen: Stange[] = []
  while (offen.length > 0) {
    let beste: { laenge: number; plaetze: number[]; quote: number } | undefined
    for (const l of laengen) {
      const plaetze = fuelle(l)
      if (plaetze.length === 0) continue
      const quote = plaetze.reduce((a, i) => a + offen[i], 0) / l
      // bessere Ausnutzung gewinnt; bei Gleichstand die längere Stange (steht zuerst)
      if (!beste || quote > beste.quote + 1e-9) beste = { laenge: l, plaetze, quote }
    }
    if (!beste) break
    const gewaehlt = beste.plaetze.map((i) => offen[i])
    for (const i of [...beste.plaetze].reverse()) offen.splice(i, 1)
    const belegt = gewaehlt.reduce((a, b) => a + b, 0) + schnittbreite * gewaehlt.length
    stangen.push({ laenge: beste.laenge, teile: gewaehlt, rest: Math.max(0, beste.laenge - belegt) })
  }
  return stangen
}

/**
 * Teilt Zuschnitte auf Stangen auf. Bei mehreren Stangenlängen werden mehrere Aufteilungen
 * verglichen – die gemischte und jede Länge für sich – und die mit dem geringsten Materialeinsatz
 * genommen. Das ist ein Näherungsverfahren: meist nahe am Bestwert, aber nicht garantiert das Minimum.
 */
export function verschnitt(stangenlaengen: number | number[], schnittbreite: number, teile: Teil[]) {
  const laengen = [...new Set(Array.isArray(stangenlaengen) ? stangenlaengen : [stangenlaengen])].sort((a, b) => b - a)
  pruefe(laengen.length > 0 && laengen.every((l) => l > 0), 'Stangenlänge muss größer als 0 sein.')
  pruefe(schnittbreite >= 0, 'Schnittbreite darf nicht negativ sein.')
  // erst zählen, dann ausrollen: sonst legt eine riesige Stückzahl den Rechner lahm
  const stueck = teile.reduce((a, t) => a + t.anzahl, 0)
  pruefe(stueck > 0, 'Bitte mindestens ein Teil eingeben.')
  pruefe(stueck <= 2000, 'Zu viele Teile (höchstens 2000).')
  const alle = teile.flatMap((t) => Array<number>(t.anzahl).fill(t.laenge)).sort((a, b) => b - a)
  pruefe(alle[0] <= laengen[0] + 1e-9, 'Mindestens ein Teil ist länger als die längste Stange. Längere Stangen eintragen oder das Stoßen überlanger Teile wählen.')
  const genutzt = alle.reduce((a, b) => a + b, 0)
  const material = (st: Stange[]): number => st.reduce((a, s) => a + s.laenge, 0)

  // Kandidaten: alle Längen gemischt, dazu jede einzelne Länge, auf die das größte Teil passt
  const kandidaten = [verteile(laengen, schnittbreite, alle)]
  if (laengen.length > 1) for (const l of laengen) if (alle[0] <= l + 1e-9) kandidaten.push(verteile([l], schnittbreite, alle))
  // am wenigsten Material gewinnt, bei Gleichstand die Aufteilung mit weniger Stangen
  const stangen = kandidaten.reduce((a, b) => (material(b) < material(a) - 1e-9 || (Math.abs(material(b) - material(a)) <= 1e-9 && b.length < a.length) ? b : a))

  return {
    stangen,
    anzahl: stangen.length,
    teile: alle.length,
    rest: stangen.reduce((a, s) => a + s.rest, 0),
    ausnutzung: (genutzt / material(stangen)) * 100,
    /** Bedarf je Stangenlänge, längste zuerst */
    bedarf: laengen.map((l) => ({ laenge: l, anzahl: stangen.filter((s) => s.laenge === l).length })).filter((b) => b.anzahl > 0),
  }
}
