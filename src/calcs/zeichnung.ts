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
        masse.push({ x: ort[0], y: ort[1], wert, art: 'len', drehung: Math.abs(drehung) < 0.01 ? undefined : drehung, anker, vor, feld: wahl.feld?.[nr] })
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
function lageAn(b: ReturnType<typeof blatt>, p: Punkt, neigungGrad: number, wert: number, seite: 0 | 1 | -1 = 0): void {
  const r = (neigungGrad * Math.PI) / 180
  const [x, y] = b.px(p)
  // n = von der Kante weg, u = die Kante bergauf (Zeichnungseinheiten, y nach unten)
  const n: Punkt = [-Math.sin(r), -Math.cos(r)]
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
  b.mass({ x: tx, y: ty, wert: 0, art: 'len', text: 'ab Traufpunkt', drehung, klein: true })
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
  const pfetten = [kasten(0, pf), ...(e.mittelpfette ? [kasten(e.mittelpfette, pf)] : []), ...(xFirst !== undefined ? [kasten(xFirst, e.firstpfette as number)] : [])]
  const mitFuss = ueberstand > 0 || kerve > 0
  const b = blatt([...sparren, ...pfetten.flat(), [grundmass, 0]], { l: 32, r: 30, o: 44, u: 38 })
  b.zug([[0, 0], [grundmass, 0], [grundmass, unten(grundmass)]], HILF)
  if (mitFuss) b.zug([[0, 0], oben(0)], HILF)
  for (const p of pfetten) {
    b.zug(p, SCHNITT, true)
    kreuz(b, p)
  }
  b.zug(sparren, FLAECHE, true)
  // unten die Grundmaße, rechts die Firsthöhe, am Sparren die Anrisslagen und die Gesamtlänge
  const xs = [-ueberstand, 0, ...(e.mittelpfette ? [e.mittelpfette] : []), ...(xFirst !== undefined ? [xFirst] : []), grundmass].filter((x, i, a) => i === 0 || x - a[i - 1] > 1e-9)
  const feldVon = (von: number, bis: number): string | undefined =>
    von < -1e-9 && Math.abs(bis) < 1e-9 ? 'ue' : Math.abs(von) < 1e-9 && bis === grundmass ? 'g' : Math.abs(von) < 1e-9 && bis === e.mittelpfette ? 'mp' : undefined
  b.kette(xs.map((x): Punkt => [x, 0]), { h: b.kante.unten + KETTE_1 }, { feld: xs.slice(1).map((x, i) => feldVon(xs[i], x)) })
  b.kette([[grundmass, 0], [grundmass, grundmass * t]], { v: b.kante.rechts + KETTE_1 })
  const risse = (mitFuss ? xs : [xs[0], xs[xs.length - 1]]).map(oben)
  b.kette(risse, { p: KETTE_1 })
  if (risse.length > 2) b.kette([risse[0], risse[risse.length - 1]], { p: KETTE_2 })
  // Neigung im Dreieck, dort wo zwischen Grundlinie und Sparren Platz ist
  b.anPunkt([grundmass * 0.6, 0], e.neigung, 0, -8, { art: 'ang', feld: 'a' })
  return b.fertig()
}

/** Traufabschnitt vergrößert. Nullpunkt ist der Traufpunkt an der Oberkante. */
export function zeichneTraufe(neigungGrad: number, sparrenhoehe: number, profil: 'senkel' | 'winkel' | 'kombi', stirn = 0): Zeichnung | undefined {
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
    b.kette([[0, -stirn], [0, 0]], { v: b.kante.links - KETTE_1 }, { feld: ['ts'] })
    b.kette([[0, -stirn], [waag, -stirn]], { h: b.kante.unten + KETTE_1 })
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
export function zeichneFirst(neigungGrad: number, sparrenhoehe: number, kerve: number, firstpfette = 0, lageFirst?: number, lageKerve?: number): Zeichnung | undefined {
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
  b.zug([[0, 0], [-xa * 0.45, xa * 0.45 * t]], HILF)
  b.zug(sparren, FLAECHE, true)
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
    const bl0 = Math.hypot(u[0] + v[0], u[1] + v[1]) || 1
    // liegt die Winkelhalbierende waagerecht, steht die Zahl längs im Keil, sonst quer
    const quer = Math.abs((u[0] + v[0]) / bl0)
    const abstand = Math.max(18, quer * (16 + 7 / Math.tan(halb)) + (1 - quer) * (7 + 19 / Math.tan(halb)))
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
  const b = blatt([...sparren, ...pfette], { l: 46, r: 40, o: 30, u: 34 })
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
export function zeichneGratSeite(gratGrund: number, hoehe: number, gratNeigung: number): Zeichnung | undefined {
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
  b.mass({ ...ort(b, fuss, 4, 9), wert: 0, art: 'len', text: 'Traufe', klein: true, anker: 'start' })
  b.mass({ ...ort(b, spitze, 5, -11), wert: 0, art: 'len', text: 'Anfallspunkt', klein: true, anker: 'start' })
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
export function zeichneHexenschnitt(gratNeigung: number, hexe: number, dickeLot?: number): Zeichnung | undefined {
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
  const b = blatt([...flaeche_, ...vorn, [0, -dick]], { l: 56, r: 20, o: 30, u: 40 })
  b.zug(vorn, HILF)
  b.zug(flaeche_, FLAECHE, true)
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
export function zeichneGratKerve(gratNeigung: number, verstich: number, wange: number, sattel: number, obholz: number): Zeichnung | undefined {
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
  const b = blatt([...flaeche_, ...pfette], { l: 46, r: 20, o: 16, u: 36 })
  b.zug(pfette, SCHNITT, true)
  kreuz(b, pfette)
  b.zug(flaeche_, FLAECHE, true)
  const oben: Punkt = [0, unten(0) + lot]
  b.zug([[0, 0], oben], HILF)
  // Senkel durch die Pfettenecke auf der Gratachse
  b.zug([[-verstich, unten(-verstich)], [-verstich, unten(-verstich) + lot]], ACHSE)
  text(b, [pf / 2, -pf * 0.35], 0, 0, 'Fußpfette')
  b.kette([[-verstich, 0], [0, 0], [sattel, 0]], { h: b.kante.unten + KETTE_1 })
  b.kette([[0, unten(0)], [0, 0], oben], { v: b.kante.links - KETTE_1 })
  waagUndWinkel(b, sattel, pf, xb, gratNeigung)
  return b.fertig()
}
