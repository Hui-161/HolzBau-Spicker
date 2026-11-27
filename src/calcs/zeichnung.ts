import type { Mass, Zeichnung } from './types'

/**
 * Maßstäbliche Zeichnungen als SVG mit Maßketten wie in einer Bauzeichnung: Maßlinie,
 * Maßhilfslinien, Begrenzungsstriche unter 45°, Maßzahl über der Linie.
 *
 * Der Inhalt entsteht nur aus Zahlen – es fließt kein frei eingegebener Text in das Markup.
 * Maßzahlen werden als Daten (Position + Wert) geliefert und erst in der Anzeige formatiert,
 * damit sie Einheit und Sprache folgen.
 */

const BREITE = 280
const MAX_HOEHE = 250

const LINIE = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"'
const DICK = 'fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"'
const HILF = 'fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"'
const FLAECHE = 'fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"'
// Maßlinien neutral, damit sie sich vom Bauteil abheben; der zweite Wert gilt im PDF
const MASS = 'fill="none" style="stroke:var(--leise,#555)" stroke-width="0.8"'
const STRICH = 'fill="none" style="stroke:var(--text,#000)" stroke-width="1.4" stroke-linecap="round"'

/** Abstand der ersten Maßkette vom Bauteil und der Ketten untereinander (in Zeichnungseinheiten) */
const KETTE_1 = 17
const KETTE_2 = 34

type Punkt = [number, number]
interface Rand {
  l: number
  r: number
  o: number
  u: number
}

/** Lage einer Maßkette: waagerecht auf Höhe h, senkrecht bei v oder parallel zur Strecke im Abstand p */
type Lage = { h: number } | { v: number } | { p: number }

interface KettenWahl {
  /** Maßzahlen je Abschnitt; ohne Angabe die Länge aus der Zeichnung */
  werte?: number[]
  /** Vorsatz je Abschnitt, z. B. „a = “ */
  vor?: (string | undefined)[]
}

const f1 = (n: number): string => n.toFixed(1)
const gueltig = (...z: number[]): boolean => z.every((x) => Number.isFinite(x))

/**
 * Zeichenblatt: bildet Bauteil-Koordinaten (y nach oben) maßstäblich ab und sammelt
 * Linien und Maßzahlen. Die Ränder müssen Platz für die Maßketten lassen.
 */
function blatt(punkte: Punkt[], rand: Rand) {
  const xs = punkte.map((p) => p[0])
  const ys = punkte.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const dx = x1 - x0 || 1
  const dy = y1 - y0 || 1
  const platz = BREITE - rand.l - rand.r
  const s = Math.min(platz / dx, (MAX_HOEHE - rand.o - rand.u) / dy)
  const links = rand.l + (platz - dx * s) / 2
  const px = ([x, y]: Punkt): Punkt => [links + (x - x0) * s, rand.o + (y1 - y) * s]
  const blattHoehe = Math.max(dy * s + rand.o + rand.u, 40)
  const teile: string[] = []
  const masse: Mass[] = []

  const pfad = (ps: Punkt[], stil: string, zu = false): string => `<path ${stil} d="M${ps.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' L')}${zu ? ' Z' : ''}"/>`

  const b = {
    px,
    /** Grenzen des Bauteils in Zeichnungseinheiten – daran richten sich die Maßketten aus */
    kante: { links, rechts: links + dx * s, oben: rand.o, unten: rand.o + dy * s },
    /** Linienzug in Bauteil-Koordinaten */
    zug: (ps: Punkt[], stil: string, zu = false): void => void teile.push(pfad(ps.map(px), stil, zu)),
    roh: (svg: string): void => void teile.push(svg),
    mass: (m: Mass): void => void masse.push(m),
    /** Maßzahl an einem Punkt, um (dx, dy) versetzt */
    anPunkt: (p: Punkt, wert: number, dxPx: number, dyPx: number, mehr: Partial<Mass> = {}): void => {
      const [x, y] = px(p)
      masse.push({ x: x + dxPx, y: y + dyPx, wert, art: 'len', ...mehr })
    },
    /** Maßzahl mitten auf einer Strecke, deckend hinterlegt (für Maße ohne Platz für eine Kette) */
    aufStrecke: (p: Punkt, q: Punkt, wert: number, mehr: Partial<Mass> = {}): void => {
      let [a, e] = [px(p), px(q)]
      if (a[0] > e[0] + 1e-6 || (Math.abs(a[0] - e[0]) <= 1e-6 && a[1] < e[1])) [a, e] = [e, a]
      masse.push({ x: (a[0] + e[0]) / 2, y: (a[1] + e[1]) / 2, drehung: (Math.atan2(e[1] - a[1], e[0] - a[0]) * 180) / Math.PI, wert, art: 'len', hinterlegt: true, ...mehr })
    },
    /**
     * Maßkette durch die angegebenen Punkte. Die Punkte werden rechtwinklig auf die Maßlinie
     * gelotet; zwischen je zwei benachbarten Loten steht eine Maßzahl.
     */
    kette: (ps: Punkt[], lage: Lage, wahl: KettenWahl = {}): void => {
      const pts = ps.map(px)
      // u = Leserichtung der Maßlinie, oben = Seite, auf der die Maßzahl steht (jeweils in Zeichnungseinheiten, y nach unten)
      let u: Punkt
      let q: Punkt
      if ('h' in lage) {
        u = [1, 0]
        q = [0, lage.h]
      } else if ('v' in lage) {
        u = [0, -1]
        q = [lage.v, 0]
      } else {
        const [a, e] = [pts[0], pts[pts.length - 1]]
        const len = Math.hypot(e[0] - a[0], e[1] - a[1]) || 1
        u = [(e[0] - a[0]) / len, (e[1] - a[1]) / len]
        // von links nach rechts bzw. von unten nach oben lesbar
        if (u[0] < -1e-6 || (Math.abs(u[0]) <= 1e-6 && u[1] > 0)) u = [-u[0], -u[1]]
        q = [a[0] + u[1] * lage.p, a[1] - u[0] * lage.p]
      }
      const oben: Punkt = [u[1], -u[0]]
      // Lote auf die Maßlinie, in Leserichtung sortiert; die Maßzahlen folgen der Reihenfolge der Punkte
      const lote = pts.map((p, i) => {
        const t = (p[0] - q[0]) * u[0] + (p[1] - q[1]) * u[1]
        return { p, t, fuss: [q[0] + u[0] * t, q[1] + u[1] * t] as Punkt, i }
      })
      const umgekehrt = lote.length > 1 && lote[0].t > lote[lote.length - 1].t
      lote.sort((a, c) => a.t - c.t)
      const [erster, letzter] = [lote[0], lote[lote.length - 1]]
      // Maßlinie mit kurzem Überstand
      teile.push(pfad([[erster.fuss[0] - u[0] * 3, erster.fuss[1] - u[1] * 3], [letzter.fuss[0] + u[0] * 3, letzter.fuss[1] + u[1] * 3]], MASS))
      for (const l of lote) {
        // Maßhilfslinie vom Bauteil zur Maßlinie, mit kleinem Abstand am Bauteil und Überstand an der Linie
        const [hx, hy] = [l.fuss[0] - l.p[0], l.fuss[1] - l.p[1]]
        const weit = Math.hypot(hx, hy)
        if (weit > 4) {
          const [ex, ey] = [hx / weit, hy / weit]
          teile.push(pfad([[l.p[0] + ex * 2.5, l.p[1] + ey * 2.5], [l.fuss[0] + ex * 3, l.fuss[1] + ey * 3]], MASS))
        }
        // Begrenzungsstrich unter 45°
        const [sx, sy] = [(u[0] + oben[0]) * 2.6, (u[1] + oben[1]) * 2.6]
        teile.push(pfad([[l.fuss[0] - sx, l.fuss[1] - sy], [l.fuss[0] + sx, l.fuss[1] + sy]], STRICH))
      }
      const drehung = (Math.atan2(u[1], u[0]) * 180) / Math.PI
      const n = lote.length - 1
      for (let i = 0; i < n; i++) {
        const lang = lote[i + 1].t - lote[i].t
        if (lang < 0.5) continue
        const nr = umgekehrt ? n - 1 - i : i
        const wert = wahl.werte?.[nr] ?? lang / s
        const vor = wahl.vor?.[nr]
        // geschätzte Breite der Maßzahl: passt sie nicht zwischen die Striche, rückt sie nach außen oder unter die Linie
        const breit = (String(Math.round(Math.abs(wert))).length + 2 + (vor?.length ?? 0)) * 5.3
        const mitte: Punkt = [(lote[i].fuss[0] + lote[i + 1].fuss[0]) / 2, (lote[i].fuss[1] + lote[i + 1].fuss[1]) / 2]
        let ort: Punkt = [mitte[0] + oben[0] * 6, mitte[1] + oben[1] * 6]
        let anker: Mass['anker'] = 'middle'
        if (lang < breit && n > 1) {
          // außen neben die Kette, sofern die Zahl dort noch auf das Blatt passt; sonst unter die Linie
          const passt = (start: Punkt, richtung: 1 | -1): boolean => {
            const ende: Punkt = [start[0] + u[0] * breit * richtung, start[1] + u[1] * breit * richtung]
            return [start, ende].every(([x, y]) => x >= 2 && x <= BREITE - 2 && y >= 2 && y <= blattHoehe - 2)
          }
          const links: Punkt = [erster.fuss[0] - u[0] * 5 + oben[0] * 6, erster.fuss[1] - u[1] * 5 + oben[1] * 6]
          const rechts: Punkt = [letzter.fuss[0] + u[0] * 5 + oben[0] * 6, letzter.fuss[1] + u[1] * 5 + oben[1] * 6]
          if (i === 0 && passt(links, -1)) {
            ort = links
            anker = 'end'
          } else if (i === n - 1 && passt(rechts, 1)) {
            ort = rechts
            anker = 'start'
          } else {
            ort = [mitte[0] - oben[0] * 7, mitte[1] - oben[1] * 7]
          }
        }
        masse.push({ x: ort[0], y: ort[1], wert, art: 'len', drehung: Math.abs(drehung) < 0.01 ? undefined : drehung, anker, vor })
      }
    },
    fertig: (): Zeichnung => ({ breite: BREITE, hoehe: blattHoehe, inhalt: teile.join(''), masse }),
  }
  return b
}

/** Nullpunkt ist die Kervenecke an der Außenkante der Fußpfette; ohne Kerve liegt er auf der Sparrenunterkante. */
export function zeichneSparren(grundmass: number, ueberstand: number, neigungGrad: number, sparrenhoehe: number, kerve = 0): Zeichnung | undefined {
  const rad = (neigungGrad * Math.PI) / 180
  const t = Math.tan(rad)
  const lot = sparrenhoehe / Math.cos(rad)
  if (!gueltig(grundmass, ueberstand, t, lot, kerve)) return undefined
  // Die Unterkante liegt um das Kervenlot unter der Kervenecke
  const kLot = kerve / Math.cos(rad)
  const kSattel = kerve > 0 ? kerve / Math.sin(rad) : 0
  const unten = (x: number): number => x * t - kLot
  const sparren: Punkt[] = [
    [-ueberstand, unten(-ueberstand)],
    // Kerve: lotrechte Wange hoch zur Ecke, waagerechter Sattel zurück auf die Unterkante
    ...(kerve > 0 ? ([[0, unten(0)], [0, 0], [kSattel, 0]] as Punkt[]) : []),
    [grundmass, unten(grundmass)],
    [grundmass, unten(grundmass) + lot],
    [-ueberstand, unten(-ueberstand) + lot],
  ]
  const obenLinks = sparren[sparren.length - 1]
  const obenRechts = sparren[sparren.length - 2]
  const kerveOben: Punkt = [0, unten(0) + lot]
  // Fußpfette nur angedeutet, ihre Maße sind nicht bekannt
  const pf = Math.max(kSattel, sparrenhoehe * 0.6)
  const pfette: Punkt[] = [
    [0, 0],
    [pf, 0],
    [pf, -pf],
    [0, -pf],
  ]
  const mitFuss = ueberstand > 0 || kerve > 0
  const b = blatt([...sparren, ...pfette, [grundmass, 0]], { l: 32, r: 30, o: 44, u: 38 })
  b.zug([[0, 0], [grundmass, 0], [grundmass, unten(grundmass)]], HILF)
  if (mitFuss) b.zug([[0, 0], kerveOben], HILF)
  b.zug(pfette, HILF, true)
  b.zug(sparren, FLAECHE, true)
  // unten: Überstand und Grundmaß; rechts: Firsthöhe; am Sparren: Teillängen und Gesamtlänge
  b.kette([[-ueberstand, 0], [0, 0], [grundmass, 0]], { h: b.kante.unten + KETTE_1 })
  b.kette([[grundmass, 0], [grundmass, grundmass * t]], { v: b.kante.rechts + KETTE_1 })
  if (mitFuss && ueberstand > 0) {
    b.kette([obenLinks, kerveOben, obenRechts], { p: KETTE_1 })
    b.kette([obenLinks, obenRechts], { p: KETTE_2 })
  } else {
    b.kette([obenLinks, obenRechts], { p: KETTE_1 })
  }
  // Neigung im Dreieck, dort wo zwischen Grundlinie und Sparren Platz ist
  b.anPunkt([grundmass * 0.6, 0], neigungGrad, 0, -8, { art: 'ang' })
  // Nummern der Risse wie in der Anrissliste: Traufe, Kervensenkel, Ende des Waagrisses, First
  let nr = 0
  const nummer = (p: Punkt, dxPx: number, dyPx: number): void => b.anPunkt(p, ++nr, dxPx, dyPx, { art: 'int', klein: true, hinterlegt: true })
  nummer(sparren[0], -8, -7)
  if (mitFuss) nummer([0, unten(0)], -6, 7)
  if (kerve > 0) nummer([kSattel, 0], 8, 8)
  nummer([grundmass, unten(grundmass)], -9, 9)
  return b.fertig()
}

export function zeichneKehlbalken(weite: number, neigungGrad: number, hoeheUnten: number, balkenhoehe: number): Zeichnung | undefined {
  const t = Math.tan((neigungGrad * Math.PI) / 180)
  if (!gueltig(weite, t, hoeheUnten, balkenhoehe)) return undefined
  const first = (weite / 2) * t
  const dach: Punkt[] = [
    [0, 0],
    [weite / 2, first],
    [weite, 0],
  ]
  const oben = hoeheUnten + balkenhoehe
  const [xu, xo] = [hoeheUnten / t, oben / t]
  const balken: Punkt[] = [
    [xu, hoeheUnten],
    [weite - xu, hoeheUnten],
    [weite - xo, oben],
    [xo, oben],
  ]
  const b = blatt(dach, { l: 34, r: 14, o: 14, u: 30 })
  b.zug([[0, 0], [weite, 0]], HILF)
  b.zug(dach, LINIE)
  b.zug(balken, FLAECHE, true)
  b.kette([[0, 0], [weite, 0]], { h: b.kante.unten + KETTE_1 })
  // links die Höhen: Bezugslinie – Unterkante – Oberkante – Spitze
  b.kette([[0, 0], balken[0], balken[3], dach[1]], { v: b.kante.links - KETTE_1 })
  // Längen des Kehlbalkens direkt an seinen Kanten
  b.aufStrecke(balken[0], balken[1], weite - 2 * xu, { hinterlegt: true })
  const [, yOben] = b.px(balken[3])
  if (yOben - b.px(dach[1])[1] > 22) b.kette([balken[3], balken[2]], { h: yOben - 11 })
  else b.anPunkt(dach[1], weite - 2 * xo, 0, -7)
  return b.fertig()
}

/** Nummern an den Schiftern; bei dichter Folge nur jede k-te, damit sie lesbar bleiben. */
function nummern(b: ReturnType<typeof blatt>, abstaende: number[], ort: (d: number) => Punkt, dx: number, dy: number): void {
  const sichtbar = abstaende.slice(0, 60)
  if (sichtbar.length === 0) return
  const [a, e] = [b.px(ort(sichtbar[0])), b.px(ort(sichtbar[1] ?? sichtbar[0] * 2))]
  const schritt = Math.max(1, Math.ceil(11 / (Math.hypot(e[0] - a[0], e[1] - a[1]) || 11)))
  sichtbar.forEach((d, i) => {
    if ((i + 1) % schritt === 0) b.anPunkt(ort(d), i + 1, dx, dy, { art: 'int', klein: true })
  })
}

/** Grundriss der Walmecke mit Grat und Schiftern. */
export function zeichneGrat(grundHaupt: number, grundWalm: number, schifterHaupt: number[], schifterWalm: number[]): Zeichnung | undefined {
  if (!gueltig(grundHaupt, grundWalm)) return undefined
  const x = grundHaupt
  const w = grundWalm
  const first = w * 0.45
  const b = blatt(
    [
      [0, 0],
      [w + first, x],
    ],
    { l: 44, r: 14, o: 14, u: 40 }
  )
  b.zug([[w + first, 0], [0, 0], [0, x]], LINIE)
  for (const d of schifterHaupt.slice(0, 60)) b.zug([[d, 0], [d, (d * x) / w]], HILF)
  for (const d of schifterWalm.slice(0, 60)) b.zug([[0, d], [(d * w) / x, d]], HILF)
  b.zug([[w, 0], [w, x]], HILF)
  b.zug([[w, x], [w + first, x]], LINIE)
  b.zug([[0, 0], [w, x]], DICK)
  // Schifter tragen die Nummer aus der Liste, außen an der Traufe; die Maßketten liegen weiter außen
  nummern(b, schifterHaupt, (d) => [d, 0], 0, 8)
  nummern(b, schifterWalm, (d) => [0, d], -8, 0)
  const mitNummern = schifterHaupt.length > 0
  b.kette([[0, 0], [w, 0]], { h: b.kante.unten + (mitNummern ? KETTE_1 + 9 : KETTE_1) })
  b.kette([[0, 0], [0, x]], { v: b.kante.links - (mitNummern ? KETTE_1 + 9 : KETTE_1) })
  // Grundriss: am Grat steht das Gratgrundmaß, nicht die wahre Länge
  b.aufStrecke([0, 0], [w, x], Math.hypot(w, x))
  return b.fertig()
}

/** Stäbe auf einer Strecke, von oben gesehen. */
export function zeichneEinteilung(breite: number, staerke: number, kanten: number[]): Zeichnung | undefined {
  if (!gueltig(breite, staerke) || kanten.length > 80) return undefined
  const tiefe = breite * 0.16
  const b = blatt(
    [
      [0, 0],
      [breite, tiefe],
    ],
    { l: 34, r: 16, o: 46, u: 30 }
  )
  b.zug(
    [
      [0, 0],
      [breite, 0],
      [breite, tiefe],
      [0, tiefe],
    ],
    HILF,
    true
  )
  for (const k of kanten) {
    b.zug(
      [
        [k, 0],
        [k + staerke, 0],
        [k + staerke, tiefe],
        [k, tiefe],
      ],
      FLAECHE,
      true
    )
  }
  b.kette([[0, 0], [breite, 0]], { h: b.kante.unten + KETTE_1 })
  if (kanten.length >= 2) {
    const [a, e] = kanten
    // am ersten Feld: Stab und lichtes Maß, darüber das Achsmaß
    b.kette([[a, tiefe], [a + staerke, tiefe], [e, tiefe]], { h: b.kante.oben - KETTE_1 })
    b.kette([[a, tiefe], [e, tiefe]], { h: b.kante.oben - KETTE_2 })
  }
  return b.fertig()
}

export function zeichneStern(zacken: number, aussen: number, innen: number, kante: number): Zeichnung | undefined {
  if (!gueltig(zacken, aussen, innen, kante)) return undefined
  const punkte: Punkt[] = []
  for (let i = 0; i < 2 * zacken; i++) {
    const r = i % 2 === 0 ? aussen : innen
    const w = Math.PI / 2 + (i * Math.PI) / zacken
    punkte.push([r * Math.cos(w), r * Math.sin(w)])
  }
  const b = blatt(
    [
      [-aussen, -aussen],
      [aussen, aussen],
    ],
    { l: 30, r: 30, o: 22, u: 30 }
  )
  const [mx, my] = b.px([0, 0])
  b.roh(`<circle cx="${f1(mx)}" cy="${f1(my)}" r="${f1(b.px([aussen, 0])[0] - mx)}" ${HILF}/>`)
  b.zug(punkte, FLAECHE, true)
  b.kette([[-aussen, -aussen], [aussen, -aussen]], { h: b.kante.unten + KETTE_1 }, { werte: [2 * aussen], vor: ['Ø '] })
  // Stablänge an der ersten Kante links der oberen Spitze, außen
  b.kette([punkte[1], punkte[0]], { p: 12 }, { werte: [kante] })
  return b.fertig()
}

/** Dreieck mit c als Grundseite, α links, β rechts. */
export function zeichneDreieck(a: number, b_: number, c: number, alphaGrad: number): Zeichnung | undefined {
  if (!gueltig(a, b_, c, alphaGrad)) return undefined
  const rad = (alphaGrad * Math.PI) / 180
  const A: Punkt = [0, 0]
  const B: Punkt = [c, 0]
  const C: Punkt = [b_ * Math.cos(rad), b_ * Math.sin(rad)]
  const b = blatt([A, B, C], { l: 36, r: 36, o: 32, u: 30 })
  b.zug([A, B, C], FLAECHE, true)
  // Maßketten immer auf der Außenseite: bei überhängender Spitze wechselt die Seite
  b.kette([A, B], { h: b.kante.unten + KETTE_1 }, { werte: [c], vor: ['c = '] })
  b.kette([A, C], { p: C[0] >= 0 ? 14 : -14 }, { werte: [b_], vor: ['b = '] })
  b.kette([B, C], { p: C[0] <= c ? 14 : -14 }, { werte: [a], vor: ['a = '] })
  // Winkel innen an der Ecke, auf der Winkelhalbierenden; entfällt, wenn die Ecke dafür zu eng ist
  const winkel = (ecke: Punkt, p: Punkt, q: Punkt): void => {
    const [e, p1, q1] = [b.px(ecke), b.px(p), b.px(q)]
    const [l1, l2] = [Math.hypot(p1[0] - e[0], p1[1] - e[1]), Math.hypot(q1[0] - e[0], q1[1] - e[1])]
    const u: Punkt = [(p1[0] - e[0]) / l1, (p1[1] - e[1]) / l1]
    const v: Punkt = [(q1[0] - e[0]) / l2, (q1[1] - e[1]) / l2]
    const halb = Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1]))) / 2
    const abstand = Math.max(18, 15 / Math.sin(halb))
    if (abstand > 0.5 * Math.min(l1, l2)) return
    const bl = Math.hypot(u[0] + v[0], u[1] + v[1]) || 1
    b.mass({ x: e[0] + ((u[0] + v[0]) / bl) * abstand, y: e[1] + ((u[1] + v[1]) / bl) * abstand, wert: (halb * 360) / Math.PI, art: 'ang', klein: true })
  }
  winkel(A, B, C)
  winkel(B, A, C)
  winkel(C, A, B)
  return b.fertig()
}

export function zeichnePultdach(breite: number, ueberstandTief: number, ueberstandHoch: number, neigungGrad: number): Zeichnung | undefined {
  const rad = (neigungGrad * Math.PI) / 180
  const t = Math.tan(rad)
  if (!gueltig(breite, ueberstandTief, ueberstandHoch, t)) return undefined
  const a: Punkt = [-ueberstandTief, -ueberstandTief * t]
  const e: Punkt = [breite + ueberstandHoch, (breite + ueberstandHoch) * t]
  const b = blatt([a, e, [0, 0], [breite, 0]], { l: 16, r: 34, o: 30, u: 38 })
  b.zug([[0, 0], [breite, 0], [breite, breite * t]], HILF)
  b.zug([a, e], DICK)
  b.kette([[a[0], 0], [0, 0], [breite, 0], [e[0], 0]], { h: b.kante.unten + KETTE_1 })
  b.kette([[breite, 0], [breite, breite * t]], { v: b.kante.rechts + KETTE_1 })
  b.kette([a, e], { p: KETTE_1 })
  b.anPunkt([breite * 0.6, 0], neigungGrad, 0, -8, { art: 'ang' })
  return b.fertig()
}

/** Schnitt durch die Schleppgaube: Hauptdach, Gaubenfront und Gaubendach. */
export function zeichneGaube(neigungHaupt: number, neigungGaube: number, hoeheFront: number, lauf: number): Zeichnung | undefined {
  const tH = Math.tan((neigungHaupt * Math.PI) / 180)
  const tG = Math.tan((neigungGaube * Math.PI) / 180)
  if (!gueltig(tH, tG, hoeheFront, lauf)) return undefined
  const oben: Punkt = [lauf, lauf * tH]
  const haupt: Punkt[] = [
    [-0.25 * lauf, -0.25 * lauf * tH],
    [1.2 * lauf, 1.2 * lauf * tH],
  ]
  const b = blatt([...haupt, [0, hoeheFront]], { l: 34, r: 16, o: 32, u: 30 })
  b.zug([[0, 0], [lauf, 0], oben], HILF)
  b.zug(haupt, LINIE)
  b.zug([[0, 0], [0, hoeheFront], oben], 'fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"')
  b.kette([[0, 0], [lauf, 0]], { h: b.kante.unten + KETTE_1 })
  b.kette([[0, 0], [0, hoeheFront]], { v: b.px([0, 0])[0] - KETTE_1 })
  b.kette([[0, hoeheFront], oben], { p: KETTE_1 })
  // Anschlusslänge auf dem Hauptdach: direkt auf der Linie, eine Kette läge im Gaubenkörper
  b.aufStrecke([0, 0], oben, lauf / Math.cos((neigungHaupt * Math.PI) / 180))
  return b.fertig()
}

/** Grundriss des Zelt- oder Turmdachs: Traufen als Vieleck, Grate zur Spitze. */
export function zeichneZeltdach(seiten: number, seitenlaenge: number, gratGrund: number): Zeichnung | undefined {
  if (!gueltig(seiten, seitenlaenge, gratGrund) || seiten < 3 || seiten > 24) return undefined
  const ecken: Punkt[] = []
  for (let i = 0; i < seiten; i++) {
    // untere Seite waagerecht
    const w = -Math.PI / 2 - Math.PI / seiten + (i * 2 * Math.PI) / seiten
    ecken.push([gratGrund * Math.cos(w), gratGrund * Math.sin(w)])
  }
  const b = blatt(ecken, { l: 20, r: 20, o: 14, u: 30 })
  b.zug(ecken, FLAECHE, true)
  for (const e of ecken) b.zug([[0, 0], e], LINIE)
  b.kette([ecken[0], ecken[1]], { h: b.kante.unten + KETTE_1 }, { werte: [seitenlaenge] })
  b.aufStrecke([0, 0], ecken[1], gratGrund)
  return b.fertig()
}

/**
 * Grundriss der Sattel- oder Walmgaube: Front unten, Hauptdach oben.
 * walmGrund > 0 zeichnet die abgewalmte Front mit ihren beiden Graten.
 */
export function zeichneSattelgaube(breite: number, trauflaenge: number, firstEnde: number, kehlGrund: number, walmGrund = 0): Zeichnung | undefined {
  if (!gueltig(breite, trauflaenge, firstEnde, kehlGrund, walmGrund)) return undefined
  const h = breite / 2
  const umriss: Punkt[] = [
    [-h, 0],
    [h, 0],
    [h, trauflaenge],
    [0, firstEnde],
    [-h, trauflaenge],
  ]
  const b = blatt(umriss, { l: 34, r: 34, o: 14, u: 30 })
  b.zug(umriss, FLAECHE, true)
  b.zug([[0, walmGrund], [0, firstEnde]], LINIE)
  // Kehlen zum Hauptdach
  b.zug([[-h, trauflaenge], [0, firstEnde]], DICK)
  b.zug([[h, trauflaenge], [0, firstEnde]], DICK)
  if (walmGrund > 0) {
    b.zug([[-h, 0], [0, walmGrund]], LINIE)
    b.zug([[h, 0], [0, walmGrund]], LINIE)
  }
  b.kette([[-h, 0], [h, 0]], { h: b.kante.unten + KETTE_1 })
  // links: Trauflänge und der Rest bis zum Firstende; rechts: Walm-Grundmaß und First
  b.kette([[-h, 0], [-h, trauflaenge], [0, firstEnde]], { v: b.kante.links - KETTE_1 })
  b.kette(walmGrund > 0 ? [[h, 0], [0, walmGrund], [0, firstEnde]] : [[h, 0], [0, firstEnde]], { v: b.kante.rechts + KETTE_1 })
  b.aufStrecke([h, trauflaenge], [0, firstEnde], kehlGrund)
  return b.fertig()
}

/** Draufsicht auf die Sparrenlage mit Fenster, Wechseln und gekappten Sparren. */
export function zeichneDachfenster(
  fensterbreite: number,
  fensterhoehe: number,
  achsmass: number,
  sparrenbreite: number,
  gekappt: number,
  wechsellaenge: number,
  wechselabstand: number
): Zeichnung | undefined {
  if (!gueltig(fensterbreite, fensterhoehe, achsmass, sparrenbreite, gekappt, wechsellaenge, wechselabstand)) return undefined
  const s = sparrenbreite
  const ueber = Math.max(wechselabstand * 0.3, 3 * s)
  const [unten, oben] = [-ueber - s, wechselabstand + s + ueber]
  const balken = (x: number, y0: number, y1: number): Punkt[] => [
    [x, y0],
    [x + s, y0],
    [x + s, y1],
    [x, y1],
  ]
  const b = blatt(
    [
      [0, unten],
      [wechsellaenge + 2 * s, oben],
    ],
    { l: 16, r: 36, o: 46, u: 14 }
  )
  // durchlaufende Sparren links und rechts
  b.zug(balken(0, unten, oben), FLAECHE, true)
  b.zug(balken(s + wechsellaenge, unten, oben), FLAECHE, true)
  // gekappte Sparren enden an den Wechseln
  for (let i = 1; i <= gekappt; i++) {
    b.zug(balken(i * achsmass, unten, -s), FLAECHE, true)
    b.zug(balken(i * achsmass, wechselabstand + s, oben), FLAECHE, true)
  }
  // Wechsel unten und oben
  const wechsel = (y: number): Punkt[] => [
    [s, y],
    [s + wechsellaenge, y],
    [s + wechsellaenge, y + s],
    [s, y + s],
  ]
  b.zug(wechsel(-s), FLAECHE, true)
  b.zug(wechsel(wechselabstand), FLAECHE, true)
  // Fenster mittig im Feld
  const fx = s + (wechsellaenge - fensterbreite) / 2
  const fy = (wechselabstand - fensterhoehe) / 2
  const fenster: Punkt[] = [
    [fx, fy],
    [fx + fensterbreite, fy],
    [fx + fensterbreite, fy + fensterhoehe],
    [fx, fy + fensterhoehe],
  ]
  b.zug(fenster, LINIE, true)
  b.zug([fenster[0], fenster[2]], HILF)
  b.zug([fenster[1], fenster[3]], HILF)
  // oben: Rest – Fenster – Rest, darüber die Wechsellänge; rechts: Luft – Fenster – Luft
  b.kette([[s, oben], [fx, oben], [fx + fensterbreite, oben], [s + wechsellaenge, oben]], { h: b.kante.oben - KETTE_1 })
  b.kette([[s, oben], [s + wechsellaenge, oben]], { h: b.kante.oben - KETTE_2 })
  const rechts = wechsellaenge + 2 * s
  b.kette([[rechts, 0], [rechts, fy], [rechts, fy + fensterhoehe], [rechts, wechselabstand]], { v: b.kante.rechts + KETTE_1 })
  return b.fertig()
}
