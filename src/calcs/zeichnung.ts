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

// Planzeichnung: schwarze Haarlinien auf weißem Grund, unabhängig vom Farbschema der App.
/** sichtbare Kante */
const LINIE = 'fill="none" stroke="#111" stroke-width="0.8" stroke-linejoin="round" stroke-linecap="round"'
/** hervorgehobenes Bauteil oder Schnitt, um den es geht */
const DICK = 'fill="none" stroke="#111" stroke-width="1.5" stroke-linecap="round"'
/** verdeckte Kante, Riss, Bezugslinie */
const HILF = 'fill="none" stroke="#111" stroke-width="0.35" stroke-dasharray="3.5 2"'
/** Holz in der Ansicht: zart getönt, damit Bauteil und Luft unterscheidbar bleiben */
const FLAECHE = 'fill="#f4eddc" stroke="#111" stroke-width="0.8" stroke-linejoin="round"'
/** Achse: Strichpunktlinie */
const ACHSE = 'fill="none" stroke="#111" stroke-width="0.3" stroke-dasharray="7 2 1 2"'
/** angedeutetes Holz im Schnitt (Maße nicht bekannt) */
const SCHNITT = 'fill="#fff" stroke="#111" stroke-width="0.5" stroke-dasharray="3.5 2"'
// Maßlinien und Maßhilfslinien
const MASS = 'fill="none" stroke="#333" stroke-width="0.3"'
const STRICH = 'fill="none" stroke="#000" stroke-width="0.8" stroke-linecap="round"'

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
  /** Maßhilfslinien nur als kurze Stücke an der Maßlinie, wenn sie sonst durch andere Maße liefen */
  kurz?: boolean
  /** Kennung des Eingabefelds je Abschnitt: die Maßzahl lässt sich dann in der Zeichnung antippen und ändern */
  feld?: (string | undefined)[]
  /** je Abschnitt: Wert ist berechnet oder offen, nicht eingegeben */
  berechnet?: (boolean | undefined)[]
}

const f1 = (n: number): string => n.toFixed(1)
/** Diagonalkreuz: Zeichen für Holz im Schnitt */
const kreuz = (b: { zug: (ps: Punkt[], stil: string) => void }, r: Punkt[]): void => {
  b.zug([r[0], r[2]], MASS)
  b.zug([r[1], r[3]], MASS)
}

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
    aufStrecke: (p: Punkt, q: Punkt, wert: number, mehr: Partial<Mass> = {}, neben?: number): void => {
      let [a, e] = [px(p), px(q)]
      if (a[0] > e[0] + 1e-6 || (Math.abs(a[0] - e[0]) <= 1e-6 && a[1] < e[1])) [a, e] = [e, a]
      const len = Math.hypot(e[0] - a[0], e[1] - a[1]) || 1
      // neben = Abstand neben der Strecke (positiv: über der Leserichtung); dann frei stehend statt hinterlegt
      const [ox, oy] = neben === undefined ? [0, 0] : [((e[1] - a[1]) / len) * neben, (-(e[0] - a[0]) / len) * neben]
      masse.push({ x: (a[0] + e[0]) / 2 + ox, y: (a[1] + e[1]) / 2 + oy, drehung: (Math.atan2(e[1] - a[1], e[0] - a[0]) * 180) / Math.PI, wert, art: 'len', hinterlegt: neben === undefined, ...mehr })
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
          const ab = wahl.kurz ? Math.max(2.5, weit - 7) : 2.5
          teile.push(pfad([[l.p[0] + ex * ab, l.p[1] + ey * ab], [l.fuss[0] + ex * 3, l.fuss[1] + ey * 3]], MASS))
        }
        // Begrenzungsstrich unter 45°
        const [sx, sy] = [(u[0] + oben[0]) * 2.6, (u[1] + oben[1]) * 2.6]
        teile.push(pfad([[l.fuss[0] - sx, l.fuss[1] - sy], [l.fuss[0] + sx, l.fuss[1] + sy]], STRICH))
      }
      const drehung = (Math.atan2(u[1], u[0]) * 180) / Math.PI
      const n = lote.length - 1
      // liegt das Bauteil auf der Seite der Maßzahlen, laufen dort die Maßhilfslinien
      const bauteilOben = !wahl.kurz && lote.some((l) => (l.p[0] - l.fuss[0]) * oben[0] + (l.p[1] - l.fuss[1]) * oben[1] > 4)
      let zweiteReihe = false
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
        if (lang < breit + 4 && n === 1) {
          // einzelnes enges Maß: auf die Seite ohne Maßhilfslinien
          if (bauteilOben) ort = [mitte[0] - oben[0] * 7, mitte[1] - oben[1] * 7]
        } else if (lang < breit + 4) {
          // außen neben die Kette, sofern die Zahl dort noch auf das Blatt passt; sonst unter die Linie
          const passt = (start: Punkt, richtung: 1 | -1): boolean => {
            const ende: Punkt = [start[0] + u[0] * breit * richtung, start[1] + u[1] * breit * richtung]
            return [start, ende].every(([x, y]) => x >= 2 && x <= BREITE - 2 && y >= 2 && y <= blattHoehe - 2)
          }
          const links: Punkt = [erster.fuss[0] - u[0] * 8 + oben[0] * 6, erster.fuss[1] - u[1] * 8 + oben[1] * 6]
          const rechts: Punkt = [letzter.fuss[0] + u[0] * 8 + oben[0] * 6, letzter.fuss[1] + u[1] * 8 + oben[1] * 6]
          if (i === 0 && passt(links, -1)) {
            ort = links
            anker = 'end'
          } else if (i === n - 1 && passt(rechts, 1)) {
            ort = rechts
            anker = 'start'
          } else {
            // mittleres enges Maß: weg von den Maßhilfslinien, notfalls in eine zweite Reihe
            if (bauteilOben) ort = [mitte[0] - oben[0] * 7, mitte[1] - oben[1] * 7]
            else if (!zweiteReihe) ort = [mitte[0] + oben[0] * 16, mitte[1] + oben[1] * 16]
            zweiteReihe = !bauteilOben && !zweiteReihe
          }
        } else {
          zweiteReihe = false
        }
        masse.push({ x: ort[0], y: ort[1], wert, art: 'len', drehung: Math.abs(drehung) < 0.01 ? undefined : drehung, anker, vor, feld: wahl.feld?.[nr], berechnet: wahl.berechnet?.[nr] })
      }
    },
    /**
     * Fortlaufende Bemaßung auf einer waagerechten Linie: Nullpunkt mit Kreis, an jedem Punkt
     * das Maß ab Null, quer zur Linie geschrieben – zum Antragen vom eingehängten Bandmaß.
     */
    laufkette: (ps: Punkt[], hoehe: number, werte: number[]): void => {
      const xs_ = ps.map((p) => px(p)[0])
      if (xs_.length < 2) return
      const [anfang, ende] = [xs_[0], xs_[xs_.length - 1]]
      const r = anfang <= ende ? 1 : -1
      teile.push(pfad([[anfang, hoehe], [ende + 3 * r, hoehe]], MASS))
      teile.push(`<circle cx="${f1(anfang)}" cy="${f1(hoehe)}" r="2.6" fill="#fff" stroke="#000" stroke-width="0.7"/>`)
      // bei dichter Folge nur jedes k-te Maß beschriften, die Striche bleiben alle
      const dichte = Math.abs(ende - anfang) / (xs_.length - 1)
      const schritt = Math.max(1, Math.ceil(10 / (dichte || 10)))
      xs_.forEach((x, i) => {
        ps[i] && teile.push(pfad([[x, px(ps[i])[1] + 2.5], [x, hoehe + 3]], MASS))
        if (i > 0) teile.push(pfad([[x - 2.6, hoehe + 2.6], [x + 2.6, hoehe - 2.6]], STRICH))
        // der Nullpunkt trägt nur den Kreis: eine „0“ würde das erste Maß überdecken
        // ein Maß dicht am Nullpunkt rückt zur Seite, damit es nicht im Kreis steht
        const eng = Math.abs(x - anfang) < 9 ? (9 - Math.abs(x - anfang)) * r : 0
        if (i > 0 && (i % schritt === 0 || i === xs_.length - 1)) masse.push({ x: x + eng, y: hoehe + 6, wert: werte[i], art: 'len', drehung: -90, anker: 'end' })
      })
    },
    fertig: (): Zeichnung => ({ breite: BREITE, hoehe: blattHoehe, inhalt: teile.join(''), masse }),
  }
  return b
}

/**
 * Kettenmaß an einem Riss: Hinweislinie winkelrecht von der Oberkante weg, daran entlang das Maß
 * ab Traufpunkt. Ein Pfeil an der Kante zeigt, aus welcher Richtung gemessen wird.
 */
function lageAn(b: ReturnType<typeof blatt>, p: Punkt, neigungGrad: number, wert: number, seite: 0 | 1 | -1 = 0, name = 'ab Traufpunkt', unten = false): void {
  const r = (neigungGrad * Math.PI) / 180
  const [x, y] = b.px(p)
  // n = von der Kante weg, u = die Kante bergauf (Zeichnungseinheiten, y nach unten)
  // unten = Hinweislinie unter der Kante statt darüber
  const n: Punkt = unten ? [Math.sin(r), Math.cos(r)] : [-Math.sin(r), -Math.cos(r)]
  const u: Punkt = [Math.cos(r), -Math.sin(r)]
  const lang = 58
  const auf = (weg: number, laengs: number): Punkt => [x + n[0] * weg + u[0] * laengs, y + n[1] * weg + u[1] * laengs]
  const linie = (ps: Punkt[], stil: string): void => b.roh(`<path ${stil} d="M${ps.map(([px_, py]) => `${f1(px_)},${f1(py)}`).join(' L')}"/>`)
  linie([auf(0, 0), auf(lang, 0)], 'fill="none" stroke="#000" stroke-width="0.5"')
  // Messrichtung: Pfeil entlang der Kante von der Traufe her
  if (seite !== 1) {
    linie([auf(6, -26), auf(6, -3)], 'fill="none" stroke="#000" stroke-width="0.5"')
    linie([auf(4, -8), auf(6, -3), auf(8, -8)], 'fill="none" stroke="#000" stroke-width="0.5" stroke-linejoin="round"')
  }
  // seite 0: Zahl bergauf, Text bergab der Linie; stehen zwei Linien dicht beieinander, schreibt jede nur auf ihre Außenseite
  const drehung = 90 - neigungGrad
  const [zx, zy] = auf(lang / 2 + 7, seite === -1 ? -6 : 6)
  b.mass({ x: zx, y: zy, wert, art: 'len', drehung })
  const [tx, ty] = auf(lang / 2 + 7, seite === 0 ? -5.5 : 16 * seite)
  b.mass({ x: tx, y: ty, wert: 0, art: 'len', text: name, drehung, klein: true })
}

/** Waagerechte von der Kerve nach rechts; die Neigung steht darunter, wo nichts anderes liegt. */
function waagUndWinkel(b: ReturnType<typeof blatt>, sattel: number, pf: number, xb: number, neigung: number): void {
  b.zug([[Math.max(sattel, pf), 0], [xb, 0]], HILF)
  const [x, y] = b.px([(Math.max(sattel, pf) + xb) / 2, 0])
  b.mass({ x, y: y + 9, wert: neigung, art: 'ang', klein: true })
}

/** Nullpunkt ist die Kervenecke an der Außenkante der Fußpfette; ohne Kerve liegt er auf der Sparrenunterkante. */
export interface SparrenBild {
  grundmass: number
  ueberstand: number
  neigung: number
  sparrenhoehe: number
  kerve: number
  traufe?: 'senkel' | 'winkel' | 'kombi'
  stirn?: number
  /** traufseitige Kante der Mittelpfette, waagerecht ab Außenkante Fußpfette */
  mittelpfette?: number
  /** Breite der Firstpfette */
  firstpfette?: number
  /** Pultdach: Breite des oberen Auflagers; es beginnt an der „Mittelpfette“ und endet an seiner Außenkante */
  auflagerOben?: number
  /** Kennungen der Eingabefelder für antippbare Maße, falls sie vom Sparren-Rechner abweichen */
  feld?: { ue?: string; g?: string; mp?: string; a?: string; b?: string; uh?: string }
  /** gestrichelte Bezugslinien parallel zur Oberkante, lotrecht um „tiefe“ darunter (Abgratungs- bzw. Kehllinie) */
  bezugslinien?: number[]
  /** Schnitt an der Traufe als Winkel zur Oberkante (Hexenschnitt am Grat); ohne Angabe lotrecht */
  traufWinkel?: number
  /** Pultdach: Außenkante des oberen Auflagers – steht in der unteren Maßkette statt der Auflagerkante */
  aussenOben?: number
}

/**
 * Seitenansicht des Sparrens mit Traufabschnitt, Kerven und Pfetten.
 * Nullpunkt ist die Kervenecke an der Außenkante der Fußpfette.
 */
export function zeichneSparren(e: SparrenBild): Zeichnung | undefined {
  const { grundmass, ueberstand, sparrenhoehe, kerve } = e
  const rad = (e.neigung * Math.PI) / 180
  const t = Math.tan(rad)
  const lot = sparrenhoehe / Math.cos(rad)
  if (!gueltig(grundmass, ueberstand, t, lot, kerve)) return undefined
  // Die Unterkante liegt um das Kervenlot unter der Kervenecke
  const kLot = kerve / Math.cos(rad)
  const kSattel = kerve > 0 ? kerve / Math.sin(rad) : 0
  const unten = (x: number): number => x * t - kLot
  const oben = (x: number): Punkt => [x, unten(x) + lot]
  const xFirst = e.firstpfette ? grundmass - e.firstpfette / 2 : undefined
  // Traufabschnitt, in Umlaufrichtung nach der oberen Ecke
  const profil = ueberstand > 0 ? (e.traufe ?? 'senkel') : 'senkel'
  const [tx, ty] = oben(-ueberstand)
  let anfang: Punkt[] = [[-ueberstand, unten(-ueberstand)]]
  if (profil === 'winkel') anfang = [[tx + sparrenhoehe * Math.sin(rad), ty - sparrenhoehe * Math.cos(rad)]]
  if (e.traufWinkel !== undefined && ueberstand > 0) {
    // Schnitt unter dem angegebenen Winkel zur Oberkante bis auf die Unterkante
    const tw = (e.traufWinkel * Math.PI) / 180
    const lang = sparrenhoehe / Math.sin(tw)
    const fuss: Punkt = [tx + lang * Math.cos(rad - tw), ty + lang * Math.sin(rad - tw)]
    if (gueltig(fuss[0], fuss[1]) && fuss[0] < -1e-9) anfang = [fuss]
  }
  if (profil === 'kombi' && gueltig(e.stirn ?? NaN) && (e.stirn as number) < lot) anfang = [[tx, ty - (e.stirn as number)], [tx + (lot - (e.stirn as number)) / t, ty - (e.stirn as number)]]
  // Kerve an der Stelle x: Wange hoch zur Ecke, Waagriss zurück auf die Unterkante (am First höchstens bis zum Firstschnitt)
  const kerbe = (x: number): Punkt[] => (kerve > 0 ? [[x, unten(x)], [x, x * t], [Math.min(x + kSattel, grundmass), x * t]] : [])
  const firstUnten: Punkt = xFirst !== undefined && kerve > 0 && xFirst + kSattel >= grundmass ? [grundmass, xFirst * t] : [grundmass, unten(grundmass)]
  const sparren: Punkt[] = [
    ...anfang,
    ...kerbe(0),
    ...(e.mittelpfette ? kerbe(e.mittelpfette) : []),
    ...(xFirst !== undefined ? kerbe(xFirst) : []),
    firstUnten,
    oben(grundmass),
    [tx, ty],
  ]
  // Pfetten: Maße nicht bekannt, deshalb nur angedeutet; die Firstpfette in ihrer Breite
  const pf = Math.max(kSattel, sparrenhoehe * 0.6)
  const kasten = (x: number, breit: number): Punkt[] => [
    [x, x * t],
    [x + breit, x * t],
    [x + breit, x * t - pf],
    [x, x * t - pf],
  ]
  const pfetten = [kasten(0, pf), ...(e.mittelpfette ? [kasten(e.mittelpfette, e.auflagerOben ?? pf)] : []), ...(xFirst !== undefined ? [kasten(xFirst, e.firstpfette as number)] : [])]
  const mitFuss = ueberstand > 0 || kerve > 0
  const b = blatt([...sparren, ...pfetten.flat(), [grundmass, 0]], { l: 32, r: 30, o: 44, u: 38 })
  b.zug([[0, 0], [grundmass, 0], [grundmass, unten(grundmass)]], HILF)
  if (mitFuss) b.zug([[0, 0], oben(0)], HILF)
  for (const p of pfetten) {
    b.zug(p, SCHNITT, true)
    kreuz(b, p)
  }
  b.zug(sparren, FLAECHE, true)
  for (const tiefe of e.bezugslinien ?? []) if (tiefe > 0 && tiefe < lot) b.zug([[tx, ty - tiefe], [grundmass, unten(grundmass) + lot - tiefe]], HILF)
  // unten die Grundmaße, rechts die Firsthöhe, am Sparren die Anrisslagen und die Gesamtlänge
  const fid = e.feld ?? { ue: 'ue', g: 'g', mp: 'mp', a: 'a' }
  const xs = [-ueberstand, 0, ...(e.mittelpfette ? [e.mittelpfette] : []), ...(xFirst !== undefined ? [xFirst] : []), grundmass].filter((x, i, a) => i === 0 || x - a[i - 1] > 1e-9)
  const feldVon = (von: number, bis: number): string | undefined =>
    von < -1e-9 && Math.abs(bis) < 1e-9 ? fid.ue : Math.abs(von) < 1e-9 && bis === grundmass ? fid.g : Math.abs(von) < 1e-9 && bis === e.mittelpfette ? fid.mp : undefined
  if (e.aussenOben !== undefined) {
    // Pultdach: Überstand unten, Breite zwischen den Außenkanten der Auflager, Überstand oben
    const xp = [-ueberstand, 0, e.aussenOben, grundmass].filter((x, i, a) => i === 0 || x - a[i - 1] > 1e-9)
    b.kette(xp.map((x): Punkt => [x, 0]), { h: b.kante.unten + KETTE_1 }, { feld: xp.slice(1).map((x, i) => (xp[i] < -1e-9 ? fid.ue : Math.abs(xp[i]) < 1e-9 ? fid.b : fid.uh)) })
  } else {
    b.kette(xs.map((x): Punkt => [x, 0]), { h: b.kante.unten + KETTE_1 }, { feld: xs.slice(1).map((x, i) => feldVon(xs[i], x)) })
  }
  b.kette([[grundmass, 0], [grundmass, grundmass * t]], { v: b.kante.rechts + KETTE_1 })
  const risse = (mitFuss ? xs : [xs[0], xs[xs.length - 1]]).map(oben)
  b.kette(risse, { p: KETTE_1 })
  if (risse.length > 2) b.kette([risse[0], risse[risse.length - 1]], { p: KETTE_2 })
  // Neigung im Dreieck, dort wo zwischen Grundlinie und Sparren Platz ist
  b.anPunkt([grundmass * 0.6, 0], e.neigung, 0, -8, { art: 'ang', feld: fid.a })
  return b.fertig()
}

/** Traufabschnitt vergrößert. Nullpunkt ist der Traufpunkt an der Oberkante. */
export function zeichneTraufe(neigungGrad: number, sparrenhoehe: number, profil: 'senkel' | 'winkel' | 'kombi', stirn = 0, waagVorgegeben = false): Zeichnung | undefined {
  const rad = (neigungGrad * Math.PI) / 180
  if (!gueltig(rad, sparrenhoehe, stirn) || !(sparrenhoehe > 0)) return undefined
  const [sin, cos, t] = [Math.sin(rad), Math.cos(rad), Math.tan(rad)]
  const lot = sparrenhoehe / cos
  const xe = 2.4 * sparrenhoehe * cos + (profil === 'kombi' ? (lot - stirn) / t : 0)
  const ende: Punkt[] = [
    [xe, xe * t - lot],
    [xe, xe * t],
    [0, 0],
  ]
  const ecke: Punkt = [sparrenhoehe * sin, -sparrenhoehe * cos]
  const waag = (lot - stirn) / t
  const anfang: Punkt[] = profil === 'winkel' ? [ecke] : profil === 'kombi' ? [[0, -stirn], [waag, -stirn]] : [[0, -lot]]
  const b = blatt([...anfang, ...ende, [0, -lot]], { l: 50, r: 22, o: 22, u: 40 })
  // weggeschnittenes Holz bis zum Senkel bzw. zur vollen Ecke, gestrichelt
  if (profil === 'kombi') b.zug([[0, -stirn], [0, -lot], [waag, -stirn]], HILF)
  if (profil === 'winkel') b.zug([[0, 0], [0, -lot], ecke], HILF)
  b.zug([...anfang, ...ende], FLAECHE, true)
  text(b, [0, 0], -3, -9, 'Traufpunkt', { anker: 'end' })
  if (profil === 'senkel') {
    b.kette([[0, -lot], [0, 0]], { v: b.kante.links - KETTE_1 })
  } else if (profil === 'winkel') {
    // Abschnitt winkelrecht: Sparrenhöhe am Schnitt, unten der Vorsprung der Unterkante
    b.kette([[0, 0], ecke], { p: -13 }, { werte: [sparrenhoehe], feld: ['h'] })
    b.kette([[0, -lot], [ecke[0], -lot]], { h: b.kante.unten + KETTE_1 }, { kurz: true })
  } else {
    // antippbar ist das Maß, das vorgegeben wurde; das andere ergibt sich
    b.kette([[0, -stirn], [0, 0]], { v: b.kante.links - KETTE_1 }, { feld: [waagVorgegeben ? undefined : 'ts'] })
    b.kette([[0, -stirn], [waag, -stirn]], { h: b.kante.unten + KETTE_1 }, { feld: [waagVorgegeben ? 'tw' : undefined] })
  }
  // Sparrenhöhe winkelrecht am Ende des Ausschnitts
  const p: Punkt = [xe * 0.86, xe * 0.86 * t - lot]
  if (profil !== 'winkel') b.kette([p, [p[0] - sparrenhoehe * sin, p[1] + sparrenhoehe * cos]], { p: -13 }, { werte: [sparrenhoehe], feld: ['h'] })
  return b.fertig()
}

/**
 * Firstpunkt vergrößert: Senkelschnitt in Firstmitte, mit Firstpfette auch deren Kerve.
 * Nullpunkt ist der Firstpunkt an der Oberkante.
 */
export function zeichneFirst(neigungGrad: number, sparrenhoehe: number, kerve: number, firstpfette = 0, lageFirst?: number, lageKerve?: number, gegensparren = true, bezugslinien: number[] = []): Zeichnung | undefined {
  const rad = (neigungGrad * Math.PI) / 180
  if (!gueltig(rad, sparrenhoehe, kerve, firstpfette) || !(sparrenhoehe > kerve)) return undefined
  const [sin, cos, t] = [Math.sin(rad), Math.cos(rad), Math.tan(rad)]
  const lot = sparrenhoehe / cos
  const kLot = kerve / cos
  const kSattel = kerve > 0 ? kerve / sin : 0
  const xk = -firstpfette / 2
  const xa = xk - 1.7 * sparrenhoehe * cos
  const unten = (x: number): number => x * t - lot
  // Höhe der Pfettenoberkante = Kervenecke
  const yk = unten(xk) + kLot
  const mitKerve = firstpfette > 0 && kerve > 0
  const bisFirst = mitKerve && xk + kSattel >= 0
  const fussFirst: Punkt = bisFirst ? [0, yk] : [0, -lot]
  const sparren: Punkt[] = [
    [xa, unten(xa)],
    ...(mitKerve ? ([[xk, unten(xk)], [xk, yk], ...(bisFirst ? [] : [[xk + kSattel, yk]])] as Punkt[]) : []),
    fussFirst,
    [0, 0],
    [xa, xa * t],
  ]
  const pfette: Punkt[] = [
    [xk, yk],
    [-xk, yk],
    [-xk, yk - firstpfette],
    [xk, yk - firstpfette],
  ]
  const b = blatt([...sparren, ...(firstpfette > 0 ? pfette : []), [sparrenhoehe * 1.2 * cos, 0]], { l: 46, r: 40, o: 66, u: 36 })
  if (firstpfette > 0) {
    b.zug(pfette, SCHNITT, true)
    kreuz(b, pfette)
    text(b, [0, yk - firstpfette * 0.82], 0, 0, 'Firstpfette')
  }
  // Gegensparren nur angedeutet
  if (gegensparren) b.zug([[0, 0], [-xa * 0.45, xa * 0.45 * t]], HILF)
  b.zug(sparren, FLAECHE, true)
  // Abgratungs- bzw. Kehllinie: parallel zur Oberkante, lotrecht darunter
  for (const [i, tiefe] of bezugslinien.entries()) {
    if (!(tiefe > 0 && tiefe < lot)) continue
    b.zug([[xa, xa * t - tiefe], [0, -tiefe]], HILF)
    if (i === 0) text(b, [xa * 0.55, xa * 0.55 * t - tiefe], 0, 8, 'Abgratungslinie', { drehung: -neigungGrad })
  }
  // rechts der Firstschnitt, unten die Auflage, links Wange und Obholz an der Kerve
  b.kette([fussFirst, [0, 0]], { v: b.kante.rechts + KETTE_1 })
  if (firstpfette > 0) {
    const pts: Punkt[] = mitKerve && !bisFirst ? [[xk, 0], [xk + kSattel, 0], [0, 0]] : [[xk, 0], [0, 0]]
    b.kette(pts, { h: b.kante.unten + KETTE_1 }, { kurz: true })
  }
  if (mitKerve) b.kette([[xk, unten(xk)], [xk, yk], [xk, xk * t]], { v: b.kante.links - KETTE_1 }, { kurz: true })
  else {
    const p: Punkt = [xa * 0.5, unten(xa * 0.5)]
    b.kette([p, [p[0] - sparrenhoehe * sin, p[1] + sparrenhoehe * cos]], { p: 13 }, { werte: [sparrenhoehe], feld: ['h'] })
  }
  if (mitKerve) b.zug([[xk, yk], [xk, xk * t]], HILF)
  const zwei = lageKerve !== undefined && firstpfette > 0
  if (lageFirst !== undefined) lageAn(b, [0, 0], neigungGrad, lageFirst, zwei ? 1 : 0)
  if (lageKerve !== undefined && firstpfette > 0) lageAn(b, [xk, xk * t], neigungGrad, lageKerve, -1)
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
  const b = blatt(dach, { l: 36, r: 14, o: 14, u: 30 })
  b.zug([[0, 0], [weite, 0]], HILF)
  b.zug(dach, LINIE)
  b.zug(balken, FLAECHE, true)
  b.kette([[0, 0], [weite, 0]], { h: b.kante.unten + KETTE_1 }, { feld: ['w'] })
  // links die Höhen: Bezugslinie – Unterkante Kehlbalken – Spitze
  b.kette([[0, 0], balken[0], dach[1]], { v: b.kante.links - KETTE_1 }, { feld: ['h'] })
  // Längen des Kehlbalkens direkt an seinen Kanten
  // Längen des Kehlbalkens: Unterkante darunter, Oberkante darüber – sofern im Dreieck Platz ist
  const [, yUnten] = b.px(balken[0])
  const [, yOben] = b.px(balken[3])
  if (b.px([0, 0])[1] - yUnten > 26) b.kette([balken[0], balken[1]], { h: yUnten + 13 })
  else b.kette([balken[0], balken[1]], { h: b.kante.unten + KETTE_2 }, { kurz: true })
  // Breite des Dreiecks auf Höhe der Maßzahl über dem Balken
  const frei = (yOben - 23 - b.px(dach[1])[1]) * (2 / t)
  if (frei > 40) b.kette([balken[3], balken[2]], { h: yOben - 11 })
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
  b.kette([[0, 0], [0, x]], { v: b.kante.links - (mitNummern ? KETTE_1 + 9 : KETTE_1) }, { feld: ['x'] })
  // Grundriss: am Grat steht das Gratgrundmaß, nicht die wahre Länge
  b.aufStrecke([0, 0], [w, x], Math.hypot(w, x))
  return b.fertig()
}

/**
 * Stäbe auf einer Strecke, von oben gesehen. Oben die Kette am ersten Feld (Stab, lichtes Maß,
 * Achsmaß), unten die fortlaufenden Achsmaße ab dem gewählten Ende und das Gesamtmaß.
 */
export function zeichneEinteilung(breite: number, staerke: number, kanten: number[], von: 'links' | 'rechts' = 'links', feldBreite?: string): Zeichnung | undefined {
  if (!gueltig(breite, staerke) || kanten.length > 80) return undefined
  const tiefe = breite * 0.14
  const b = blatt(
    [
      [0, 0],
      [breite, tiefe],
    ],
    { l: 34, r: 34, o: 52, u: 78 }
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
    // Achse jedes Stabes
    b.zug([[k + staerke / 2, -tiefe * 0.12], [k + staerke / 2, tiefe * 1.12]], ACHSE)
  }
  if (kanten.length >= 2) {
    // Kette am ersten Feld auf der Seite, von der gemessen wird
    const sortiert = [...kanten].sort((x, y) => x - y)
    const [a, e] = von === 'links' ? [sortiert[0], sortiert[1]] : [sortiert[sortiert.length - 2], sortiert[sortiert.length - 1]]
    // ist das Feld in der Zeichnung zu schmal für Stab und lichtes Maß, steht nur das Achsmaß
    if (b.px([e, 0])[0] - b.px([a + staerke, 0])[0] > 34) {
      b.kette([[a, tiefe], [a + staerke, tiefe], [e, tiefe], [e + staerke, tiefe]], { h: b.kante.oben - KETTE_1 })
      b.kette([[a + staerke / 2, tiefe], [e + staerke / 2, tiefe]], { h: b.kante.oben - KETTE_2 })
    } else {
      b.kette([[a + staerke / 2, tiefe], [e + staerke / 2, tiefe]], { h: b.kante.oben - KETTE_1 })
    }
  }
  // fortlaufend: Null am gewählten Ende, dann jede Achse
  const null_ = von === 'links' ? 0 : breite
  const achsen = kanten.map((k) => k + staerke / 2).sort((x, y) => (von === 'links' ? x - y : y - x))
  b.laufkette([[null_, 0], ...achsen.map((x): Punkt => [x, 0])], b.kante.unten + 12, [0, ...achsen.map((x) => Math.abs(x - null_))])
  b.kette([[0, 0], [breite, 0]], { h: b.kante.unten + 66 }, { kurz: true, feld: [feldBreite] })
  return b.fertig()
}

/** Dreieck mit c als Grundseite, α links, β rechts. */
export interface DreieckWahl {
  /** Feldkennungen der sechs Größen; damit werden sie in der Zeichnung antippbar */
  feld?: { a?: string; b?: string; c?: string; alpha?: string; beta?: string; gamma?: string }
  /** Kennungen der Felder, die der Nutzer ausgefüllt hat */
  gegeben?: string[]
  /** angezeigte Werte, wenn sie nicht aus der gezeichneten Form stammen (Eingabebild: leer = NaN) */
  werte?: { a: number; b: number; c: number; alpha: number; beta: number; gamma: number }
}

/** Dreieck mit Seiten und Winkeln; α liegt bei A (links unten) gegenüber von a. */
export function zeichneDreieck(a: number, b_: number, c: number, alphaGrad: number, wahl: DreieckWahl = {}): Zeichnung | undefined {
  if (!gueltig(a, b_, c, alphaGrad)) return undefined
  const rad = (alphaGrad * Math.PI) / 180
  const A: Punkt = [0, 0]
  const B: Punkt = [c, 0]
  const C: Punkt = [b_ * Math.cos(rad), b_ * Math.sin(rad)]
  const b = blatt([A, B, C], { l: 40, r: 40, o: 34, u: 30 })
  b.zug([A, B, C], FLAECHE, true)
  const f = wahl.feld ?? {}
  const eingabe = wahl.feld !== undefined
  const offen = (id: string | undefined): boolean | undefined => (id === undefined ? undefined : !(wahl.gegeben ?? []).includes(id))
  const w = wahl.werte
  // Maßketten immer auf der Außenseite: bei überhängender Spitze wechselt die Seite
  b.kette([A, B], { h: b.kante.unten + KETTE_1 }, { werte: [w ? w.c : c], vor: ['c = '], feld: [f.c], berechnet: [offen(f.c)] })
  b.kette([A, C], { p: C[0] >= 0 ? 14 : -14 }, { werte: [w ? w.b : b_], vor: ['b = '], feld: [f.b], berechnet: [offen(f.b)] })
  b.kette([B, C], { p: C[0] <= c ? 14 : -14 }, { werte: [w ? w.a : a], vor: ['a = '], feld: [f.a], berechnet: [offen(f.a)] })
  // Winkel innen an der Ecke, auf der Winkelhalbierenden
  const winkel = (ecke: Punkt, p: Punkt, q: Punkt, name: string, feld: string | undefined, wert: number | undefined): void => {
    const [e, p1, q1] = [b.px(ecke), b.px(p), b.px(q)]
    const [l1, l2] = [Math.hypot(p1[0] - e[0], p1[1] - e[1]), Math.hypot(q1[0] - e[0], q1[1] - e[1])]
    const u: Punkt = [(p1[0] - e[0]) / l1, (p1[1] - e[1]) / l1]
    const v: Punkt = [(q1[0] - e[0]) / l2, (q1[1] - e[1]) / l2]
    const halb = Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1]))) / 2
    const bl = Math.hypot(u[0] + v[0], u[1] + v[1]) || 1
    // liegt die Winkelhalbierende waagerecht, steht die Zahl längs im Keil, sonst quer
    const quer = Math.abs((u[0] + v[0]) / bl)
    const breit = eingabe ? 8 : 0
    let abstand = Math.max(18, quer * (16 + breit + 7 / Math.tan(halb)) + (1 - quer) * (7 + (19 + breit) / Math.tan(halb)))
    // ohne Eingabe entfällt der Winkel, wenn die Ecke zu eng ist; zum Eintragen muss er erreichbar bleiben
    if (abstand > 0.5 * Math.min(l1, l2)) {
      if (!eingabe) return
      abstand = 0.5 * Math.min(l1, l2)
    }
    b.mass({ x: e[0] + ((u[0] + v[0]) / bl) * abstand, y: e[1] + ((u[1] + v[1]) / bl) * abstand, wert: wert ?? (halb * 360) / Math.PI, art: 'ang', klein: true, vor: eingabe ? `${name} = ` : undefined, feld, berechnet: offen(feld) })
  }
  winkel(A, B, C, 'α', f.alpha, w?.alpha)
  winkel(B, A, C, 'β', f.beta, w?.beta)
  winkel(C, A, B, 'γ', f.gamma, w?.gamma)
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
  b.kette([[a[0], 0], [0, 0], [breite, 0], [e[0], 0]], { h: b.kante.unten + KETTE_1 }, { feld: ['ut', 'b', 'uh'] })
  b.kette([[breite, 0], [breite, breite * t]], { v: b.kante.rechts + KETTE_1 })
  b.kette([a, e], { p: KETTE_1 })
  b.anPunkt([breite * 0.6, 0], neigungGrad, 0, -8, { art: 'ang', feld: 'a' })
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
  b.zug([[0, 0], [0, hoeheFront], oben], 'fill="#f4eddc" stroke="#111" stroke-width="1.3" stroke-linejoin="round"')
  b.kette([[0, 0], [lauf, 0]], { h: b.kante.unten + KETTE_1 })
  b.kette([[0, 0], [0, hoeheFront]], { v: b.px([0, 0])[0] - KETTE_1 }, { feld: ['h'] })
  b.kette([[0, hoeheFront], oben], { p: KETTE_1 })
  // Anschlusslänge auf dem Hauptdach: direkt auf der Linie, eine Kette läge im Gaubenkörper
  b.aufStrecke([0, 0], oben, lauf / Math.cos((neigungHaupt * Math.PI) / 180), {}, -9)
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
  b.kette([ecken[0], ecken[1]], { h: b.kante.unten + KETTE_1 }, { werte: [seitenlaenge], feld: ['a'] })
  b.aufStrecke([0, 0], ecken[1], gratGrund, {}, 8)
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
  b.kette([[-h, 0], [h, 0]], { h: b.kante.unten + KETTE_1 }, { feld: ['b'] })
  // links: Trauflänge und der Rest bis zum Firstende; rechts: Walm-Grundmaß und First
  b.kette([[-h, 0], [-h, trauflaenge], [0, firstEnde]], { v: b.kante.links - KETTE_1 })
  b.kette(walmGrund > 0 ? [[h, 0], [0, walmGrund], [0, firstEnde]] : [[h, 0], [0, firstEnde]], { v: b.kante.rechts + KETTE_1 })
  b.aufStrecke([h, trauflaenge], [0, firstEnde], kehlGrund, {}, 8)
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
    { l: 16, r: 36, o: 52, u: 14 }
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
  b.kette([[s, oben], [fx, oben], [fx + fensterbreite, oben], [s + wechsellaenge, oben]], { h: b.kante.oben - KETTE_1 }, { feld: [undefined, 'fb'] })
  b.kette([[s, oben], [s + wechsellaenge, oben]], { h: b.kante.oben - KETTE_2 })
  const rechts = wechsellaenge + 2 * s
  b.kette([[rechts, 0], [rechts, fy], [rechts, fy + fensterhoehe], [rechts, wechselabstand]], { v: b.kante.rechts + KETTE_1 }, { feld: [undefined, 'fh'] })
  return b.fertig()
}

/**
 * Vergrößertes Detail der Kerve: Sattel, Wange, Obholz, Kerventiefe und Sparrenhöhe.
 * Die Fußpfette ist nur angedeutet, ihre Maße sind nicht bekannt.
 */
export function zeichneKerve(neigungGrad: number, sparrenhoehe: number, kerve: number, name = 'Fußpfette', lage?: number): Zeichnung | undefined {
  const rad = (neigungGrad * Math.PI) / 180
  if (!gueltig(rad, sparrenhoehe, kerve) || !(kerve > 0) || !(sparrenhoehe > kerve)) return undefined
  const [sin, cos, t] = [Math.sin(rad), Math.cos(rad), Math.tan(rad)]
  const lot = sparrenhoehe / cos
  const kLot = kerve / cos
  const kSattel = kerve / sin
  const unten = (x: number): number => x * t - kLot
  // Ausschnitt um die Kervenecke
  const xa = -1.1 * sparrenhoehe * cos
  const xb = kSattel + 1.5 * sparrenhoehe * cos
  const sparren: Punkt[] = [
    [xa, unten(xa)],
    [0, unten(0)],
    [0, 0],
    [kSattel, 0],
    [xb, unten(xb)],
    [xb, unten(xb) + lot],
    [xa, unten(xa) + lot],
  ]
  const pf = Math.max(kSattel * 1.15, sparrenhoehe * 0.95)
  const pfette: Punkt[] = [
    [0, 0],
    [pf, 0],
    [pf, -pf],
    [0, -pf],
  ]
  const b = blatt([...sparren, ...pfette], { l: 46, r: 40, o: lage === undefined ? 20 : 66, u: 34 })
  b.zug(pfette, SCHNITT, true)
  kreuz(b, pfette)
  b.zug(sparren, FLAECHE, true)
  // Senkelriss durch die Kervenecke bis zur Oberkante
  const oben: Punkt = [0, unten(0) + lot]
  b.zug([[0, 0], oben], HILF)
  b.mass({ ...(() => { const [x, y] = b.px([pf / 2, -pf * 0.8]); return { x, y } })(), wert: 0, art: 'len', text: name, klein: true })
  // unten: Sattel; links: Wange und Obholz auf dem Senkelriss
  b.kette([[0, 0], [kSattel, 0]], { h: b.kante.unten + KETTE_1 })
  b.kette([[0, unten(0)], [0, 0], oben], { v: b.kante.links - KETTE_1 })
  // Sparrenhöhe und Kerventiefe winkelrecht zur Sparrenkante
  const p: Punkt = [xb * 0.82, unten(xb * 0.82)]
  b.kette([p, [p[0] - sparrenhoehe * sin, p[1] + sparrenhoehe * cos]], { p: -13 }, { werte: [sparrenhoehe], feld: ['h'] })
  waagUndWinkel(b, kSattel, pf, xb, neigungGrad)
  if (lage !== undefined) lageAn(b, oben, neigungGrad, lage)
  return b.fertig()
}

/** Seitenansicht des Grat- oder Kehlsparrens: Gratgrundmaß, Höhe, wahre Länge und Neigung. */
export function zeichneGratSeite(gratGrund: number, hoehe: number, gratNeigung: number, unten = 'Traufe', oben = 'Anfallspunkt'): Zeichnung | undefined {
  if (!gueltig(gratGrund, hoehe, gratNeigung)) return undefined
  const fuss: Punkt = [0, 0]
  const spitze: Punkt = [gratGrund, hoehe]
  const b = blatt([fuss, spitze, [gratGrund, 0]], { l: 20, r: 64, o: 34, u: 30 })
  b.zug([fuss, [gratGrund, 0], spitze], HILF)
  b.zug([fuss, spitze], DICK)
  b.kette([fuss, [gratGrund, 0]], { h: b.kante.unten + KETTE_1 })
  b.kette([[gratGrund, 0], spitze], { v: b.kante.rechts + KETTE_1 })
  b.kette([fuss, spitze], { p: KETTE_1 })
  b.anPunkt([gratGrund * 0.55, 0], gratNeigung, 0, -8, { art: 'ang' })
  b.mass({ ...ort(b, fuss, 4, 9), wert: 0, art: 'len', text: unten, klein: true, anker: 'start' })
  b.mass({ ...ort(b, spitze, 5, -11), wert: 0, art: 'len', text: oben, klein: true, anker: 'start' })
  return b.fertig()
}

const ort = (b: ReturnType<typeof blatt>, p: Punkt, dx: number, dy: number): { x: number; y: number } => {
  const [x, y] = b.px(p)
  return { x: x + dx, y: y + dy }
}

/**
 * Querschnitt durch den Gratsparren, lotrecht geschnitten, Blick vom Fuß zum Anfallspunkt:
 * links die Hauptdachseite, rechts die Walmseite. Der Sparren sitzt mittig auf der Gratlinie.
 * Die Sparrenhöhe ist nicht bekannt, der untere Teil ist deshalb nur angedeutet.
 */
export function zeichneGratQuerschnitt(breite: number, abgratungHaupt: number, abgratungWalm: number): Zeichnung | undefined {
  if (!gueltig(breite, abgratungHaupt, abgratungWalm) || !(breite > 0)) return undefined
  const h2 = breite / 2
  const tief = Math.max(abgratungHaupt, abgratungWalm)
  const koerper = Math.max(breite * 0.9, tief * 1.6)
  const profil: Punkt[] = [
    [-h2, -koerper],
    [-h2, -abgratungHaupt],
    [0, 0],
    [h2, -abgratungWalm],
    [h2, -koerper],
  ]
  const b = blatt([...profil, [0, 0]], { l: 60, r: 60, o: 54, u: 22 })
  b.zug(profil, 'fill="#f4eddc" stroke="none"', true)
  b.zug(profil, LINIE)
  // unbearbeitete Oberkante als Bezug für die Abgratung
  b.zug([[-h2, -abgratungHaupt], [-h2, 0], [h2, 0], [h2, -abgratungWalm]], HILF)
  b.zug([[0, 0], [0, -koerper]], ACHSE)
  b.kette([[-h2, 0], [0, 0], [h2, 0]], { h: b.kante.oben - KETTE_1 })
  b.kette([[-h2, 0], [h2, 0]], { h: b.kante.oben - KETTE_2 }, { feld: ['b'] })
  b.kette([[-h2, -abgratungHaupt], [-h2, 0]], { v: b.kante.links - KETTE_1 })
  b.kette([[h2, -abgratungWalm], [h2, 0]], { v: b.kante.rechts + KETTE_1 })
  b.mass({ ...ort(b, [-h2, -koerper], -6, -4), wert: 0, art: 'len', text: 'Hauptdach', klein: true, anker: 'end' })
  b.mass({ ...ort(b, [h2, -koerper], 6, -4), wert: 0, art: 'len', text: 'Walm', klein: true, anker: 'start' })
  return b.fertig()
}

/**
 * Grundriss am Gratfuß, vergrößert: Sparrenbreite, die beiden Traufen und der Verstich –
 * das Maß in Gratrichtung, um das die Sparrenkante an der Traufe hinter der Ecke zurückliegt.
 */
export function zeichneGratFuss(grundHaupt: number, grundWalm: number, breite: number, winkelHaupt: number, winkelWalm: number): Zeichnung | undefined {
  if (!gueltig(grundHaupt, grundWalm, breite, winkelHaupt, winkelWalm) || !(breite > 0)) return undefined
  const g = Math.hypot(grundWalm, grundHaupt)
  // u = Gratrichtung im Grundriss, n = quer dazu zur Hauptdachseite
  const u: Punkt = [grundWalm / g, grundHaupt / g]
  const n: Punkt = [grundHaupt / g, -grundWalm / g]
  const h2 = breite / 2
  const vH = (h2 * grundWalm) / grundHaupt
  const vW = (h2 * grundHaupt) / grundWalm
  const lang = Math.max(vH, vW) + breite * 1.6
  const auf = (t: number, quer: number): Punkt => [u[0] * t + n[0] * quer, u[1] * t + n[1] * quer]
  const eH = auf(vH, h2)
  const eW = auf(vW, -h2)
  const sparren: Punkt[] = [[0, 0], eH, auf(lang, h2), auf(lang, -h2), eW]
  const weit = lang * 1.05
  // Traufen so lang, dass Beschriftung und Winkel daneben Platz haben
  const [tx, ty] = [Math.max(weit * u[0] + breite, lang * 0.95), Math.max(weit * u[1] + breite, lang * 0.95)]
  const b = blatt([[0, 0], [tx, 0], [0, ty], ...sparren], { l: 40, r: 30, o: 30, u: 36 })
  b.zug([[tx, 0], [0, 0], [0, ty]], LINIE)
  b.zug(sparren, FLAECHE, true)
  b.zug([[0, 0], auf(lang * 1.05, 0)], ACHSE)
  // Verstich je Seite: von der Ecke entlang der Achse bis auf Höhe des Punktes, an dem die Kante die Traufe trifft
  b.zug([auf(vH, 0), eH], HILF)
  b.zug([auf(vW, 0), eW], HILF)
  const halbPx = Math.hypot(b.px(auf(0, h2))[0] - b.px([0, 0])[0], b.px(auf(0, h2))[1] - b.px([0, 0])[1])
  b.kette([[0, 0], auf(vH, 0)], { p: -(halbPx + 13) }, { werte: [vH] })
  b.kette([[0, 0], auf(vW, 0)], { p: halbPx + 13 }, { werte: [vW] })
  // Sparrenbreite quer am Ende des Ausschnitts
  b.kette([auf(lang, -h2), auf(lang, h2)], { p: 12 }, { werte: [breite], feld: ['b'] })
  // Winkel außen im freien Keil zwischen Traufe und Sparrenkante, so weit von der Spitze, dass die Zahl hineinpasst
  const keil = (spitze: Punkt, winkel: number, mitte: number, traufeQuer: number): void => {
    const a = (winkel * Math.PI) / 180
    const kante = Math.atan2(u[1], u[0])
    const noetig = Math.max(traufeQuer, 16 * Math.abs(Math.sin(kante)) + 5 * Math.abs(Math.cos(kante)) + 2)
    const r = noetig / Math.sin(a / 2)
    const [x, y] = b.px(spitze)
    b.mass({ x: x + Math.cos(mitte) * r, y: y - Math.sin(mitte) * r, wert: winkel, art: 'ang', klein: true })
  }
  keil(eH, winkelHaupt, ((winkelHaupt / 2) * Math.PI) / 180, 7)
  keil(eW, winkelWalm, Math.PI / 2 - ((winkelWalm / 2) * Math.PI) / 180, 19)
  b.mass({ ...ort(b, [tx, 0], 0, 9), wert: 0, art: 'len', text: 'Traufe Hauptdach', klein: true, anker: 'end' })
  b.mass({ ...ort(b, [0, ty], -7, 2), wert: 0, art: 'len', text: 'Traufe Walm', klein: true, anker: 'end', drehung: -90 })
  return b.fertig()
}

const text = (b: ReturnType<typeof blatt>, p: Punkt, dx: number, dy: number, t: string, mehr: Partial<Mass> = {}): void => b.mass({ ...ort(b, p, dx, dy), wert: 0, art: 'len', text: t, klein: true, ...mehr })

/**
 * Hexenschnitt an einer Seitenfläche des Gratsparrens, Blick auf die Fläche: der Schnitt läuft
 * vom Traufpunkt an der Oberkante schräg nach unten. Zum Vergleich der Senkelriss.
 * dickeLot = lotrechte Höhe der Seitenfläche; ohne Angabe ist die Sparrenhöhe nur angedeutet.
 */
export function zeichneHexenschnitt(gratNeigung: number, hexe: number, dickeLot?: number, abgratung = 0): Zeichnung | undefined {
  const g = (gratNeigung * Math.PI) / 180
  // Winkel der Schnittlinie unter der Waagerechten
  const d = ((hexe - gratNeigung) * Math.PI) / 180
  if (!gueltig(g, d) || !(hexe > gratNeigung) || !(hexe < 180)) return undefined
  const mitMass = dickeLot !== undefined && dickeLot > 0
  const dick = mitMass ? (dickeLot as number) : 1
  const lang = dick * 3.2
  const unten = (x: number): number => x * Math.tan(g) - dick
  // Schnittpunkt der Schnittlinie mit der Unterkante
  const xc = d >= Math.PI / 2 - 1e-9 ? 0 : dick / (Math.tan(g) + Math.tan(d))
  const fuss: Punkt = [xc, unten(xc)]
  const ende = lang * Math.cos(g)
  const flaeche_: Punkt[] = [[0, 0], fuss, [ende, unten(ende)], [ende, ende * Math.tan(g)]]
  // weggeschnittener Teil vor dem Schnitt, gestrichelt
  const vorn: Punkt[] = [[0, 0], [-dick * 0.5 * Math.cos(g), -dick * 0.5 * Math.sin(g)], [-dick * 0.5 * Math.cos(g), unten(-dick * 0.5 * Math.cos(g))], fuss]
  // Gratlinie: liegt um die Abgratung lotrecht über der Kante der Seitenfläche
  const mitGrat = mitMass && abgratung > 0
  const b = blatt([...flaeche_, ...vorn, [0, -dick], ...(mitGrat ? ([[ende, ende * Math.tan(g) + abgratung]] as Punkt[]) : [])], { l: 56, r: 20, o: 30, u: 40 })
  b.zug(vorn, HILF)
  b.zug(flaeche_, FLAECHE, true)
  if (mitGrat) {
    b.zug([[0, abgratung], [ende, ende * Math.tan(g) + abgratung]], HILF)
    text(b, [ende * 0.62, ende * 0.62 * Math.tan(g) + abgratung], 0, -7, 'Gratlinie', { drehung: -gratNeigung })
  }
  b.zug([[0, 0], fuss], DICK)
  // Senkelriss durch den Traufpunkt zum Vergleich
  b.zug([[0, 0], [0, unten(0)]], HILF)
  // Winkel im Holz, auf der Winkelhalbierenden zwischen Oberkante und Schnitt
  const halb = (g - d) / 2
  const r = Math.max(30, 19 / Math.sin((g + d) / 2))
  b.anPunkt([0, 0], hexe, Math.cos(halb) * r, -Math.sin(halb) * r, { art: 'ang', klein: true })
  text(b, [0, 0], -3, -10, 'Traufpunkt', { anker: 'end' })
  text(b, vorn[2], -4, 4, 'Senkelriss', { anker: 'end' })
  if (mitMass) {
    // an der Unterkante: vom Senkelriss bis zum Hexenschnitt
    b.kette([[0, unten(0)], fuss], { p: -KETTE_1 })
    b.kette([[ende, unten(ende)], [ende, ende * Math.tan(g)]], { v: b.kante.rechts + 14 })
  }
  return b.fertig()
}

/** Grundriss am Anfallspunkt: die beiden lotrechten Backen und ihr Rücksprung an den Seitenflächen. */
export function zeichneGratAnfall(grundHaupt: number, grundWalm: number, breite: number, planHaupt: number, planWalm: number): Zeichnung | undefined {
  if (!gueltig(grundHaupt, grundWalm, breite, planHaupt, planWalm) || !(breite > 0)) return undefined
  const g = Math.hypot(grundWalm, grundHaupt)
  // Anfallspunkt im Nullpunkt; der Grat kommt von links unten
  const u: Punkt = [grundWalm / g, grundHaupt / g]
  const n: Punkt = [grundHaupt / g, -grundWalm / g]
  const h2 = breite / 2
  const rH = (h2 * grundHaupt) / grundWalm
  const rW = (h2 * grundWalm) / grundHaupt
  const lang = Math.max(rH, rW) + breite * 1.5
  const auf = (t: number, quer: number): Punkt => [-u[0] * t + n[0] * quer, -u[1] * t + n[1] * quer]
  const eH = auf(rH, h2)
  const eW = auf(rW, -h2)
  const sparren: Punkt[] = [[0, 0], eH, auf(lang, h2), auf(lang, -h2), eW]
  const weit = breite * 1.6
  const b = blatt([...sparren, [weit, 0], [0, -weit * 0.2]], { l: 36, r: 40, o: 46, u: 40 })
  b.zug([[0, 0], [weit, 0]], ACHSE)
  b.zug([[0, 0], auf(lang * 1.05, 0)], ACHSE)
  b.zug(sparren, FLAECHE, true)
  b.zug([eH, [0, 0], eW], DICK)
  b.zug([auf(rH, 0), eH], HILF)
  b.zug([auf(rW, 0), eW], HILF)
  const halbPx = Math.hypot(b.px(auf(0, h2))[0] - b.px([0, 0])[0], b.px(auf(0, h2))[1] - b.px([0, 0])[1])
  b.kette([auf(rH, 0), [0, 0]], { p: -(halbPx + 13) }, { werte: [rH] })
  b.kette([auf(rW, 0), [0, 0]], { p: halbPx + 13 }, { werte: [rW] })
  b.kette([auf(lang, -h2), auf(lang, h2)], { p: -12 }, { werte: [breite], feld: ['b'] })
  text(b, [weit, 0], 0, -8, 'First', { anker: 'end' })
  text(b, [0, 0], 8, -8, 'Anfallspunkt', { anker: 'start' })
  return b.fertig()
}

/**
 * Kerve an einer Seitenfläche des Gratsparrens, Blick auf die Fläche. Nullpunkt ist die Kervenecke
 * an dieser Fläche; der Senkel durch die Pfettenecke (Achse) liegt um den Verstich davor.
 */
export function zeichneGratKerve(gratNeigung: number, verstich: number, wange: number, sattel: number, obholz: number, lage?: number, abgratung = 0): Zeichnung | undefined {
  const g = (gratNeigung * Math.PI) / 180
  if (!gueltig(g, verstich, wange, sattel, obholz) || !(wange > 0) || !(obholz > 0)) return undefined
  const t = Math.tan(g)
  const lot = wange + obholz
  const unten = (x: number): number => x * t - wange
  const xa = -verstich - lot * 0.8
  const xb = sattel + lot * 0.9
  const flaeche_: Punkt[] = [
    [xa, unten(xa)],
    [0, unten(0)],
    [0, 0],
    [sattel, 0],
    [xb, unten(xb)],
    [xb, unten(xb) + lot],
    [xa, unten(xa) + lot],
  ]
  const pf = Math.max(sattel * 1.1, lot * 0.8)
  const pfette: Punkt[] = [
    [0, 0],
    [pf, 0],
    [pf, -pf * 0.7],
    [0, -pf * 0.7],
  ]
  const b = blatt([...flaeche_, ...pfette, ...(abgratung > 0 ? ([[xb, unten(xb) + lot + abgratung]] as Punkt[]) : [])], { l: 46, r: 20, o: lage === undefined ? 16 : 66, u: 36 })
  b.zug(pfette, SCHNITT, true)
  kreuz(b, pfette)
  b.zug(flaeche_, FLAECHE, true)
  // Gratlinie: um die Abgratung lotrecht über der Kante dieser Seitenfläche
  if (abgratung > 0) {
    b.zug([[xa, unten(xa) + lot + abgratung], [xb, unten(xb) + lot + abgratung]], HILF)
    text(b, [xb * 0.7, unten(xb * 0.7) + lot + abgratung], 0, -7, 'Gratlinie', { drehung: -gratNeigung })
  }
  const oben: Punkt = [0, unten(0) + lot]
  b.zug([[0, 0], oben], HILF)
  // Senkel durch die Pfettenecke auf der Gratachse
  b.zug([[-verstich, unten(-verstich)], [-verstich, unten(-verstich) + lot]], ACHSE)
  text(b, [pf / 2, -pf * 0.35], 0, 0, 'Fußpfette')
  b.kette([[-verstich, 0], [0, 0], [sattel, 0]], { h: b.kante.unten + KETTE_1 })
  b.kette([[0, unten(0)], [0, 0], oben], { v: b.kante.links - KETTE_1 })
  waagUndWinkel(b, sattel, pf, xb, gratNeigung)
  if (lage !== undefined) lageAn(b, oben, gratNeigung, lage)
  return b.fertig()
}

/**
 * Anschluss des Kehlbalkens an die Sparrenunterkante, linkes Ende. Nullpunkt ist der Punkt,
 * an dem die Unterkante des Kehlbalkens die Sparrenunterkante trifft.
 */
export function zeichneKehlbalkenAnschluss(neigungGrad: number, balkenhoehe: number, rissSparren: number): Zeichnung | undefined {
  const rad = (neigungGrad * Math.PI) / 180
  if (!gueltig(rad, balkenhoehe, rissSparren) || !(balkenhoehe > 0)) return undefined
  const [sin, cos, t] = [Math.sin(rad), Math.cos(rad), Math.tan(rad)]
  const v = balkenhoehe / t
  const lang = v + 2.6 * balkenhoehe
  const balken: Punkt[] = [[0, 0], [lang, 0], [lang, balkenhoehe], [v, balkenhoehe]]
  // Sparren nur angedeutet: seine Höhe ist hier nicht bekannt
  const d = balkenhoehe * 0.8
  const [a, e_] = [-1.3 * balkenhoehe, balkenhoehe / sin + 1.3 * balkenhoehe]
  const auf = (weit: number, quer: number): Punkt => [weit * cos - quer * sin, weit * sin + quer * cos]
  const sparren: Punkt[] = [auf(a, 0), auf(e_, 0), auf(e_, d), auf(a, d)]
  const b = blatt([...balken, ...sparren, [0, -balkenhoehe * 1.6]], { l: 30, r: 40, o: 40, u: 30 })
  b.zug(sparren, SCHNITT, true)
  b.zug([auf(a, 0), auf(e_, 0)], LINIE)
  b.zug(balken, FLAECHE, true)
  b.zug([[0, 0], [v, balkenhoehe]], DICK)
  text(b, auf(e_ * 0.92, d / 2), 0, 0, 'Sparren', { drehung: -neigungGrad })
  // oben: Versatz zwischen Unter- und Oberkante; rechts: Balkenhöhe
  b.kette([[0, balkenhoehe], [v, balkenhoehe]], { h: b.kante.oben - 4 }, { kurz: true })
  b.kette([[lang, 0], [lang, balkenhoehe]], { v: b.kante.rechts + KETTE_1 }, { feld: ['hk'] })
  // Abschnittwinkel im Balken an der unteren Ecke
  const r = Math.max(28, 17 / Math.sin(rad / 2))
  b.anPunkt([0, 0], neigungGrad, Math.cos(rad / 2) * r, -Math.sin(rad / 2) * r, { art: 'ang', klein: true })
  lageAn(b, [0, 0], neigungGrad, rissSparren, 0, 'ab Bezugslinie', true)
  return b.fertig()
}

/** Kehlbalken als Werkstück, in der Mitte gekürzt dargestellt: beide Längen, Höhe und Abschnitt. */
export function zeichneKehlbalkenStueck(laengeUnten: number, laengeOben: number, balkenhoehe: number, neigungGrad: number): Zeichnung | undefined {
  if (!gueltig(laengeUnten, laengeOben, balkenhoehe, neigungGrad) || !(laengeOben > 0)) return undefined
  const v = (laengeUnten - laengeOben) / 2
  // gezeichnete Länge: Enden maßstäblich, die Mitte herausgebrochen
  const mitte = Math.min(laengeOben, 2.5 * balkenhoehe)
  const lang = 2 * v + mitte
  const bruch = lang / 2
  const z = balkenhoehe * 0.12
  const halb = (spiegel: 1 | -1): Punkt[] => {
    const x = (wert: number): number => (spiegel === 1 ? wert : lang - wert)
    return [[x(0), 0], [x(bruch - z), 0], [x(bruch + z * 0.4), balkenhoehe * 0.5], [x(bruch - z), balkenhoehe], [x(v), balkenhoehe]]
  }
  const b = blatt([[0, 0], [lang, balkenhoehe]], { l: 20, r: 36, o: 36, u: 36 })
  const gekuerzt = mitte < laengeOben
  if (gekuerzt) {
    b.zug(halb(1), FLAECHE, true)
    b.zug(halb(-1), FLAECHE, true)
  } else {
    b.zug([[0, 0], [lang, 0], [lang - v, balkenhoehe], [v, balkenhoehe]], FLAECHE, true)
  }
  b.kette([[0, 0], [lang, 0]], { h: b.kante.unten + KETTE_1 }, { werte: [laengeUnten] })
  b.kette([[0, balkenhoehe], [v, balkenhoehe], [lang - v, balkenhoehe], [lang, balkenhoehe]], { h: b.kante.oben - KETTE_1 }, { werte: [v, laengeOben, v], kurz: true })
  b.kette([[lang, 0], [lang, balkenhoehe]], { v: b.kante.rechts + KETTE_1 }, { feld: ['hk'], kurz: true })
  const rad = (neigungGrad * Math.PI) / 180
  const r = Math.max(26, 16 / Math.sin(rad / 2))
  b.anPunkt([0, 0], neigungGrad, Math.cos(rad / 2) * r, -Math.sin(rad / 2) * r, { art: 'ang', klein: true })
  return b.fertig()
}

/** Dreieckige Dachfläche in wahrer Größe: Traufe unten, Grate als Schenkel, Mittelsparren als Höhe. */
export function zeichneDachflaeche(traufe: number, sparren: number, grat: number, winkel: number, feldTraufe?: string): Zeichnung | undefined {
  if (!gueltig(traufe, sparren, grat, winkel) || !(traufe > 0) || !(sparren > 0)) return undefined
  const ecken: Punkt[] = [[0, 0], [traufe, 0], [traufe / 2, sparren]]
  const b = blatt(ecken, { l: 40, r: 40, o: 16, u: 30 })
  b.zug(ecken, FLAECHE, true)
  b.zug([[traufe / 2, 0], [traufe / 2, sparren]], HILF)
  b.kette([[0, 0], [traufe, 0]], { h: b.kante.unten + KETTE_1 }, { feld: [feldTraufe] })
  b.kette([[0, 0], [traufe / 2, sparren]], { p: 14 }, { werte: [grat] })
  b.aufStrecke([traufe / 2, 0], [traufe / 2, sparren], sparren, {}, -8)
  // Winkel zwischen Traufe und Grat, innen an der Ecke
  const halb = (winkel * Math.PI) / 360
  const r = 16 + 7 / Math.tan(halb)
  if (r < 0.45 * (b.px([traufe, 0])[0] - b.px([0, 0])[0])) b.anPunkt([0, 0], winkel, Math.cos(halb) * r, -Math.sin(halb) * r, { art: 'ang', klein: true })
  return b.fertig()
}

/**
 * Oberes Ende des Gaubensparrens auf dem Hauptdach. Nullpunkt ist der Punkt, an dem die
 * Oberkante des Gaubensparrens die Hauptdachfläche trifft. Ohne Sparrenhöhe nur angedeutet.
 */
export function zeichneGaubeAnschluss(neigungHaupt: number, neigungGaube: number, sparrenhoehe?: number): Zeichnung | undefined {
  const [ah, ag] = [(neigungHaupt * Math.PI) / 180, (neigungGaube * Math.PI) / 180]
  const d = ah - ag
  if (!gueltig(ah, ag) || !(d > 0)) return undefined
  const mitMass = sparrenhoehe !== undefined && sparrenhoehe > 0
  const h = mitMass ? (sparrenhoehe as number) : 1
  const schnitt = h / Math.sin(d)
  const lang = schnitt * Math.cos(d) + 2.4 * h
  const obenAnfang: Punkt = [-lang * Math.cos(ag), -lang * Math.sin(ag)]
  const q: Punkt = [-schnitt * Math.cos(ah), -schnitt * Math.sin(ah)]
  const untenAnfang: Punkt = [obenAnfang[0] + h * Math.sin(ag), obenAnfang[1] - h * Math.cos(ag)]
  const sparren: Punkt[] = [obenAnfang, [0, 0], q, untenAnfang]
  const haupt: Punkt[] = [[-(schnitt + 1.2 * h) * Math.cos(ah), -(schnitt + 1.2 * h) * Math.sin(ah)], [1.3 * h * Math.cos(ah), 1.3 * h * Math.sin(ah)]]
  const b = blatt([...sparren, ...haupt], { l: 24, r: 44, o: 22, u: 40 })
  b.zug(haupt, LINIE)
  b.zug(sparren, FLAECHE, true)
  b.zug([[0, 0], q], DICK)
  text(b, haupt[1], -7, -3, 'Hauptdach', { anker: 'end' })
  // Winkel im Holz zwischen Oberkante und Schnitt
  const mitte = Math.PI + (ah + ag) / 2
  const r = Math.max(34, 19 / Math.sin(d / 2))
  b.anPunkt([0, 0], neigungHaupt - neigungGaube, Math.cos(mitte) * r, -Math.sin(mitte) * r, { art: 'ang', klein: true })
  if (mitMass) {
    b.kette([q, [0, 0]], { p: -14 }, { werte: [schnitt] })
    const p: Punkt = [obenAnfang[0] * 0.8, obenAnfang[1] * 0.8]
    b.kette([[p[0] + h * Math.sin(ag), p[1] - h * Math.cos(ag)], p], { p: 13 }, { werte: [h], feld: ['hs'] })
  }
  return b.fertig()
}

/** Querschnitt der Sattelgaube: Breite, Firsthöhe über der Traufe, Sparrenlänge und Neigung. */
export function zeichneGaubeQuer(breite: number, first: number, sparren: number, neigung: number): Zeichnung | undefined {
  if (!gueltig(breite, first, sparren, neigung) || !(breite > 0)) return undefined
  const h = breite / 2
  const ecken: Punkt[] = [[-h, 0], [0, first], [h, 0]]
  const b = blatt(ecken, { l: 30, r: 36, o: 34, u: 30 })
  b.zug([[-h, 0], [h, 0]], HILF)
  b.zug([[0, 0], [0, first]], ACHSE)
  b.zug(ecken, LINIE)
  b.kette([[-h, 0], [h, 0]], { h: b.kante.unten + KETTE_1 }, { feld: ['b'] })
  b.kette([[h, 0], [0, first]], { v: b.kante.rechts + KETTE_1 })
  b.kette([[-h, 0], [0, first]], { p: KETTE_1 }, { werte: [sparren] })
  const halb = (neigung * Math.PI) / 360
  const r = 16 + 7 / Math.tan(halb)
  if (r < 0.8 * (b.px([0, 0])[0] - b.px([-h, 0])[0])) b.anPunkt([-h, 0], neigung, Math.cos(halb) * r, -Math.sin(halb) * r, { art: 'ang', klein: true })
  return b.fertig()
}

/**
 * Längsschnitt der Gaube: Front links, Hauptdach steigt nach rechts. Gaubentraufe und Gaubenfirst
 * laufen waagerecht, bis das Hauptdach sie erreicht. walmGrund > 0 zeichnet den Walm an der Front.
 */
export function zeichneGaubeLaengs(neigungHaupt: number, hoeheTraufe: number, firstUeberTraufe: number, trauflaenge: number, walmGrund = 0): Zeichnung | undefined {
  const t = Math.tan((neigungHaupt * Math.PI) / 180)
  if (!gueltig(t, hoeheTraufe, firstUeberTraufe, trauflaenge, walmGrund) || !(t > 0)) return undefined
  const hoch = hoeheTraufe + firstUeberTraufe
  const first = hoch / t
  const haupt: Punkt[] = [[-0.12 * first, -0.12 * first * t], [1.12 * first, 1.12 * first * t]]
  const b = blatt([...haupt, [0, hoch]], { l: 36, r: 16, o: 40, u: 34 })
  b.zug(haupt, LINIE)
  b.zug([[0, 0], [first, 0], [first, hoch]], HILF)
  b.zug([[trauflaenge, 0], [trauflaenge, hoeheTraufe]], HILF)
  // Front, Traufe, First; beim Walm der Grat von der Traufecke zum Anfallspunkt
  b.zug(walmGrund > 0 ? [[0, 0], [0, hoeheTraufe], [walmGrund, hoch], [first, hoch]] : [[0, 0], [0, hoch], [first, hoch]], DICK)
  b.zug([[0, hoeheTraufe], [trauflaenge, hoeheTraufe]], LINIE)
  b.kette([[0, 0], [trauflaenge, 0], [first, 0]], { h: b.kante.unten + KETTE_1 })
  b.kette([[0, 0], [0, hoeheTraufe], [0, hoch]], { v: b.kante.links - KETTE_1 }, { feld: [hoeheTraufe > 0 ? 'h' : undefined] })
  b.kette(walmGrund > 0 ? [[0, hoch], [walmGrund, hoch], [first, hoch]] : [[0, hoch], [first, hoch]], { h: b.kante.oben - KETTE_1 })
  b.anPunkt([first * 0.72, 0], neigungHaupt, 0, -8, { art: 'ang', feld: 'ah' })
  return b.fertig()
}

/**
 * Lattung auf dem Sparren, in die Waagerechte gedreht: Traufkante links, First rechts.
 * Jede Latte liegt mit ihrer Oberkante am angegebenen Maß. Darunter die fortlaufenden Maße
 * ab Traufkante zum Antragen mit dem Bandmaß.
 */
export function zeichneLattung(sparrenlaenge: number, positionen: number[]): Zeichnung | undefined {
  if (!gueltig(sparrenlaenge, ...positionen) || positionen.length < 2 || positionen.length > 120 || !(sparrenlaenge > 0)) return undefined
  const weite = positionen[1] - positionen[0]
  // Lattenquerschnitt nur angedeutet
  const [lb, lh] = [Math.min(weite * 0.16, sparrenlaenge * 0.012 + weite * 0.05), weite * 0.1]
  const dicke = sparrenlaenge * 0.03
  const b = blatt([[0, -dicke], [sparrenlaenge, lh]], { l: 26, r: 26, o: 54, u: 80 })
  b.zug([[0, 0], [sparrenlaenge, 0], [sparrenlaenge, -dicke], [0, -dicke]], FLAECHE, true)
  for (const p of positionen) b.zug([[p - lb, 0], [p, 0], [p, lh], [p - lb, lh]], 'fill="#111" stroke="#111" stroke-width="0.4"', true)
  const letzte = positionen[positionen.length - 1]
  // oben: Abstand an der Traufe, Lattweite am ersten Feld (wenn dafür Platz ist), Abstand am First
  const platz = b.px([positionen[1], 0])[0] - b.px([positionen[0], 0])[0]
  if (platz > 26) b.kette([[0, lh], [positionen[0], lh], [positionen[1], lh]], { h: b.kante.oben - KETTE_1 }, { feld: ['t'] })
  else {
    b.kette([[0, lh], [positionen[0], lh]], { h: b.kante.oben - KETTE_1 }, { feld: ['t'] })
    // Felder zu eng für eine Maßkette: die Lattweite steht als Angabe in der Mitte
    const [mx, my] = b.px([sparrenlaenge / 2, lh])
    b.mass({ x: mx, y: my - 14, wert: weite, art: 'len', name: 'Lattweite' })
  }
  if (sparrenlaenge - letzte > 1e-9) b.kette([[letzte, lh], [sparrenlaenge, lh]], { h: b.kante.oben - KETTE_1 }, { feld: ['f'] })
  text(b, [0, lh], 0, -42, 'Traufe', { anker: 'start' })
  text(b, [sparrenlaenge, lh], 0, -42, 'First', { anker: 'end' })
  b.laufkette([[0, -dicke], ...positionen.map((p): Punkt => [p, -dicke])], b.kante.unten + 12, [0, ...positionen])
  b.kette([[0, -dicke], [sparrenlaenge, -dicke]], { h: b.kante.unten + 66 }, { kurz: true, feld: ['sl'] })
  return b.fertig()
}

/**
 * Mindestabstände von vier Verbindungsmitteln am Holzende, Faser waagerecht, Hirnholz links.
 * Der Kraftpfeil zeigt zum beanspruchten Hirnholzende und zum beanspruchten Rand (unten).
 * Alle Maße in Millimetern, maßstäblich.
 */
export function zeichneAbstaende(d: number, winkelGrad: number, a: { a1: number; a2: number; a3t: number; a4t: number; a4c: number }): Zeichnung | undefined {
  if (!gueltig(d, winkelGrad, a.a1, a.a2, a.a3t, a.a4t, a.a4c) || !(d > 0)) return undefined
  const hoch = a.a4t + a.a2 + a.a4c
  const frei = Math.max(a.a1 * 1.4, hoch * 0.8)
  const lang = a.a3t + a.a1 + frei
  // Bruchkante rechts: das Holz läuft weiter
  const zack = hoch * 0.06
  const holz: Punkt[] = [[0, 0], [lang, 0], [lang - zack, hoch * 0.3], [lang + zack, hoch * 0.5], [lang - zack, hoch * 0.7], [lang, hoch], [0, hoch]]
  const b = blatt([[0, 0], [lang + zack, hoch]], { l: 62, r: 14, o: 26, u: 56 })
  b.zug(holz, FLAECHE, true)
  // Faserrichtung als feine Linien
  for (const y of [0.18, 0.36, 0.64, 0.82]) b.zug([[lang * 0.03, hoch * y], [lang * 0.97, hoch * y]], 'fill="none" stroke="#111" stroke-width="0.2" stroke-opacity="0.45"')
  const stifte: Punkt[] = [[a.a3t, a.a4t], [a.a3t + a.a1, a.a4t], [a.a3t, a.a4t + a.a2], [a.a3t + a.a1, a.a4t + a.a2]]
  const proMm = b.px([1, 0])[0] - b.px([0, 0])[0]
  for (const p of stifte) {
    const [x, y] = b.px(p)
    b.roh(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(Math.max(1.6, (d / 2) * proMm))}" fill="#fff" stroke="#111" stroke-width="0.8"/><path ${MASS} d="M${f1(x - 4)},${f1(y)} H${f1(x + 4)} M${f1(x)},${f1(y - 4)} V${f1(y + 4)}"/>`)
  }
  // Kraft: Pfeil im freien Teil rechts, zeigt zum Hirnholzende und zum unteren Rand
  const w = (winkelGrad * Math.PI) / 180
  const pfeil = Math.min(frei * 0.3, hoch * 0.45)
  const start: Punkt = [a.a3t + a.a1 + frei * 0.92, hoch * 0.5 + (pfeil * Math.sin(w)) / 2]
  const spitze: Punkt = [start[0] - pfeil * Math.cos(w), start[1] - pfeil * Math.sin(w)]
  const [[sx, sy], [ex, ey]] = [b.px(start), b.px(spitze)]
  const [ux, uy] = [(ex - sx) / (Math.hypot(ex - sx, ey - sy) || 1), (ey - sy) / (Math.hypot(ex - sx, ey - sy) || 1)]
  b.roh(`<path fill="none" stroke="#000" stroke-width="1.2" stroke-linejoin="round" d="M${f1(sx)},${f1(sy)} L${f1(ex)},${f1(ey)} M${f1(ex - ux * 6 + uy * 3)},${f1(ey - uy * 6 - ux * 3)} L${f1(ex)},${f1(ey)} L${f1(ex - ux * 6 - uy * 3)},${f1(ey - uy * 6 + ux * 3)}"/>`)
  b.mass({ x: sx, y: Math.min(sy, ey) - 8, wert: 0, art: 'len', text: 'Kraft', klein: true, anker: 'end' })
  // unten: Hirnholzabstand und Abstand in Faserrichtung; links: Randabstände und Abstand quer zur Faser
  const rund = (x: number): number => Math.ceil(x - 1e-9)
  b.kette([[0, 0], [a.a3t, 0], [a.a3t + a.a1, 0]], { h: b.kante.unten + KETTE_1 }, { werte: [rund(a.a3t), rund(a.a1)], vor: ['a3,t = ', 'a1 = '] })
  b.kette([[0, 0], [0, a.a4t]], { v: b.kante.links - KETTE_1 }, { werte: [rund(a.a4t)], vor: ['a4,t = '] })
  b.kette([[0, a.a4t + a.a2], [0, hoch]], { v: b.kante.links - KETTE_1 }, { werte: [rund(a.a4c)], vor: ['a4,c = '] })
  // Abstand quer zur Faser direkt neben der Gruppe, damit die Randabstände links Platz haben
  b.kette([stifte[1], stifte[3]], { v: b.px(stifte[1])[0] + Math.max(1.6, (d / 2) * proMm) + 20 }, { werte: [rund(a.a2)], vor: ['a2 = '] })
  text(b, [lang / 2, 0], 0, 44, 'beanspruchter Rand unten, Hirnholzende links')
  text(b, [lang / 2, hoch], 0, -10, 'Faserrichtung ↔')
  const z = b.fertig()
  // Maße als ganze Millimeter
  for (const m of z.masse ?? []) if (!m.text) m.art = 'int'
  return { ...z, einheit: 'mm' }
}

/**
 * Rechteck mit beiden Diagonalen zur Diagonalkontrolle. Alle vier Maße sind antippbar;
 * „gegeben“ nennt die ausgefüllten Felder. Ohne gültige Länge und Breite eine feste Beispielform.
 */
export function zeichneDiagonale(laenge: number, breite: number, d1: number, d2: number, gegeben: string[], soll?: number): Zeichnung | undefined {
  // Form aus dem, was schon eingetragen ist; das fehlende Maß im Verhältnis 8 : 5 dazu
  const [lOk, bOk] = [gueltig(laenge) && laenge > 0, gueltig(breite) && breite > 0]
  const l = lOk ? laenge : bOk ? breite * 1.6 : 16
  const h = bOk ? breite : l / 1.6
  const ecken: Punkt[] = [[0, 0], [l, 0], [l, h], [0, h]]
  const b = blatt(ecken, { l: 16, r: 40, o: soll === undefined ? 16 : 30, u: 34 })
  b.zug(ecken, FLAECHE, true)
  b.zug([[0, 0], [l, h]], HILF)
  b.zug([[0, h], [l, 0]], HILF)
  const offen = (id: string): boolean => !gegeben.includes(id)
  b.kette([[0, 0], [l, 0]], { h: b.kante.unten + KETTE_1 }, { werte: [laenge], vor: ['L = '], feld: ['l'], berechnet: [offen('l')] })
  b.kette([[l, 0], [l, h]], { v: b.kante.rechts + KETTE_1 }, { werte: [breite], vor: ['B = '], feld: ['b'], berechnet: [offen('b')] })
  // gemessene Diagonalen: je am unteren Drittel ihrer Linie, damit sie sich in der Mitte nicht treffen
  b.aufStrecke([0, 0], [l * 0.62, h * 0.62], d1, { vor: 'd1 = ', feld: 'd1', berechnet: offen('d1') }, 8)
  b.aufStrecke([l * 0.38, h * 0.62], [l, 0], d2, { vor: 'd2 = ', feld: 'd2', berechnet: offen('d2') }, 8)
  if (soll !== undefined) b.mass({ ...ort(b, [l / 2, h], 0, -12), wert: soll, art: 'len', name: 'Diagonale Soll' })
  return b.fertig()
}

/** Stichbogen über der Sehne: Spannweite und Stich antippbar, im Ergebnis mit Radius. */
export function zeichneBogen(sehne: number, stich: number, gegeben: string[], radius?: number): Zeichnung | undefined {
  // Form aus dem, was schon eingetragen ist; der Stich höchstens bis zum Halbkreis
  const [sOk, hOk] = [gueltig(sehne) && sehne > 0, gueltig(stich) && stich > 0]
  const s_ = sOk ? sehne : hOk ? stich * 4 : 20
  const h = Math.min(hOk ? stich : s_ / 4, s_ / 2)
  const r = (s_ * s_) / (8 * h) + h / 2
  const b = blatt([[0, 0], [s_, 0], [s_ / 2, h]], { l: 16, r: 44, o: radius === undefined ? 16 : 30, u: 34 })
  const [[x0, y0], [x1, y1]] = [b.px([0, 0]), b.px([s_, 0])]
  const rpx = (r * (x1 - x0)) / s_
  b.roh(`<path fill="#f4eddc" stroke="#111" stroke-width="1.2" d="M${f1(x0)},${f1(y0)} A${f1(rpx)},${f1(rpx)} 0 0 1 ${f1(x1)},${f1(y1)} Z"/>`)
  b.zug([[s_ / 2, 0], [s_ / 2, h]], HILF)
  b.zug([[s_ / 2, h], [s_, h]], MASS)
  const offen = (id: string): boolean => !gegeben.includes(id)
  b.kette([[0, 0], [s_, 0]], { h: b.kante.unten + KETTE_1 }, { werte: [sehne], vor: ['s = '], feld: ['s'], berechnet: [offen('s')] })
  b.kette([[s_, 0], [s_, h]], { v: b.kante.rechts + KETTE_1 }, { werte: [stich], vor: ['h = '], feld: ['h'], berechnet: [offen('h')] })
  if (radius !== undefined) b.mass({ ...ort(b, [s_ / 2, h], 0, -12), wert: radius, art: 'len', name: 'Radius' })
  return b.fertig()
}

/**
 * Querschnitt des Satteldachs: Gebäudebreite unten, First über der Stelle, an der sich beide
 * Dachseiten treffen (bei ungleichen Neigungen außermittig), Überstände an beiden Traufen.
 */
export function zeichneSatteldach(breite: number, firstAb: number, firsthoehe: number, ueberstand: number, neigung1: number, neigung2: number, sparren1: number, sparren2: number): Zeichnung | undefined {
  if (!gueltig(breite, firstAb, firsthoehe, ueberstand, neigung1, neigung2) || !(breite > 0) || !(firsthoehe > 0)) return undefined
  const [t1, t2] = [Math.tan((neigung1 * Math.PI) / 180), Math.tan((neigung2 * Math.PI) / 180)]
  const first: Punkt = [firstAb, firsthoehe]
  const links: Punkt = [-ueberstand, -ueberstand * t1]
  const rechts: Punkt = [breite + ueberstand, -ueberstand * t2]
  const gleich = Math.abs(neigung1 - neigung2) < 1e-9
  // Gebäude nur angedeutet: Traufhöhe als Bezugslinie, Wände darunter
  const wand = Math.max(firsthoehe * 0.35, breite * 0.08)
  const b = blatt([links, first, rechts, [0, -wand], [breite, 0]], { l: 30, r: 40, o: 40, u: 38 })
  b.zug([[0, 0], [0, -wand]], HILF)
  b.zug([[breite, 0], [breite, -wand]], HILF)
  b.zug([[0, 0], [breite, 0]], HILF)
  b.zug([first, [firstAb, 0]], HILF)
  b.zug([links, first, rechts], DICK)
  const unten: Punkt[] = gleich ? [[-ueberstand, 0], [0, 0], [breite, 0], [breite + ueberstand, 0]] : [[-ueberstand, 0], [0, 0], [firstAb, 0], [breite, 0], [breite + ueberstand, 0]]
  b.kette(unten.filter((p, i, a) => i === 0 || p[0] - a[i - 1][0] > 1e-9), { h: b.kante.unten + KETTE_1 }, { feld: ueberstand > 0 ? (gleich ? ['ut', 'b', undefined] : ['ut']) : gleich ? ['b'] : [] })
  b.kette([[breite + ueberstand, 0], [breite + ueberstand, firsthoehe]], { v: b.kante.rechts + KETTE_1 }, { kurz: true })
  b.kette([links, first], { p: 14 }, { werte: [sparren1] })
  if (!gleich) b.kette([first, rechts], { p: 14 }, { werte: [sparren2] })
  // Neigungen im Dreieck über der Traufhöhe
  const winkel = (x: number, n: number, feld: string, anker: 'start' | 'end'): void => b.anPunkt([x, 0], n, anker === 'start' ? 22 : -22, -7, { art: 'ang', klein: true, feld, anker })
  winkel(0, neigung1, 'a', 'start')
  winkel(breite, neigung2, gleich ? 'a' : 'a2', 'end')
  return b.fertig()
}

/** Grundriss des Satteldachs mit Überständen: Trauflänge unten, Breite links, First als Achse. */
export function zeichneDachGrundriss(laenge: number, breite: number, ueberstandTraufe: number, ueberstandOrtgang: number, firstAb: number): Zeichnung | undefined {
  if (!gueltig(laenge, breite, ueberstandTraufe, ueberstandOrtgang, firstAb) || !(laenge > 0) || !(breite > 0)) return undefined
  const [ut, uo] = [ueberstandTraufe, ueberstandOrtgang]
  const dach: Punkt[] = [[-uo, -ut], [laenge + uo, -ut], [laenge + uo, breite + ut], [-uo, breite + ut]]
  const haus: Punkt[] = [[0, 0], [laenge, 0], [laenge, breite], [0, breite]]
  const b = blatt(dach, { l: 40, r: 16, o: 16, u: 38 })
  b.zug(dach, FLAECHE, true)
  b.zug(haus, HILF, true)
  b.zug([[-uo, firstAb], [laenge + uo, firstAb]], ACHSE)
  text(b, [laenge / 2, firstAb], 0, -7, 'First')
  const fx = (ps: Punkt[]): Punkt[] => ps.filter((p, i, a) => i === 0 || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 1e-9)
  // jeden Überstand nur einmal bemaßen – unten links und links oben –, damit sich die Maße an den Ecken nicht treffen
  b.kette(fx([[-uo, -ut], [0, -ut], [laenge, -ut]]), { h: b.kante.unten + KETTE_1 }, { feld: uo > 0 ? ['uo', 'l'] : ['l'] })
  b.kette(fx([[-uo, 0], [-uo, breite], [-uo, breite + ut]]), { v: b.kante.links - KETTE_1 }, { feld: ['b', ut > 0 ? 'ut' : undefined] })
  return b.fertig()
}

/**
 * Treppe im Schnitt: Stufen von der unteren zur oberen Fertigfußbodenhöhe. Die letzte Steigung
 * endet auf dem oberen Boden, deshalb gibt es einen Auftritt weniger als Steigungen.
 */
export function zeichneTreppe(steigungen: number, steigung: number, auftritt: number, feldAuftritt = false): Zeichnung | undefined {
  if (!gueltig(steigungen, steigung, auftritt) || steigungen < 1 || steigungen > 60 || !(steigung > 0) || !(auftritt > 0)) return undefined
  const [lauf, hoch] = [(steigungen - 1) * auftritt, steigungen * steigung]
  const stufen: Punkt[] = [[0, 0]]
  for (let i = 0; i < steigungen; i++) {
    stufen.push([i * auftritt, (i + 1) * steigung])
    if (i < steigungen - 1) stufen.push([(i + 1) * auftritt, (i + 1) * steigung])
  }
  const vor = Math.max(auftritt * 1.2, lauf * 0.12)
  const b = blatt([[-vor, 0], [lauf + vor, hoch]], { l: 34, r: 40, o: 36, u: 38 })
  // Körper unter den Stufen leicht getönt, Böden als dickere Linien
  b.zug([...stufen, [lauf + vor, hoch], [lauf + vor, hoch - steigung * 0.9], [lauf, hoch - steigung * 0.9], [0, -steigung * 0.9], [-vor * 0, -steigung * 0.9]], 'fill="#f4eddc" stroke="none"', true)
  b.zug([[-vor, 0], [0, 0]], DICK)
  b.zug([[lauf, hoch], [lauf + vor, hoch]], DICK)
  b.zug(stufen, LINIE)
  // Lauflinie über die Stufenvorderkanten
  if (steigungen > 1) b.zug([[0, steigung], [lauf, hoch]], HILF)
  b.kette([[0, 0], [lauf, 0]], { h: b.kante.unten + KETTE_1 }, { kurz: true })
  b.kette([[lauf + vor, 0], [lauf + vor, hoch]], { v: b.kante.rechts + KETTE_1 }, { feld: ['h'], kurz: true })
  // eine Stufe oben bemaßt: Auftritt und Steigung
  if (steigungen > 1) {
    const i = steigungen - 2
    b.kette([[i * auftritt, hoch], [(i + 1) * auftritt, hoch]], { h: b.kante.oben - KETTE_1 }, { feld: [feldAuftritt ? 'au' : undefined], kurz: true })
    b.kette([[-vor, 0], [-vor, steigung]], { v: b.px([-vor, 0])[0] - 10 }, { kurz: true })
  }
  return b.fertig()
}
