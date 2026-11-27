import type { Mass, Zeichnung } from './types'

/**
 * Maßstäbliche Zeichnungen als SVG. Der Inhalt entsteht nur aus Zahlen – es fließt kein frei
 * eingegebener Text in das Markup. Maßzahlen werden als Daten (Position + Wert) geliefert und
 * erst in der Anzeige formatiert, damit sie Einheit und Sprache folgen.
 */

const BREITE = 240
const MAX_HOEHE = 200

const LINIE = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"'
const HILF = 'fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"'
const FLAECHE = 'fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"'

type Punkt = [number, number]
interface Rand {
  l: number
  r: number
  o: number
  u: number
}

/** Bildet Bauteil-Koordinaten (y nach oben) maßstäblich in die Zeichenfläche ab. */
function flaeche(punkte: Punkt[], rand: Rand) {
  const xs = punkte.map((p) => p[0])
  const ys = punkte.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const dx = x1 - x0 || 1
  const dy = y1 - y0 || 1
  const platz = BREITE - rand.l - rand.r
  const s = Math.min(platz / dx, (MAX_HOEHE - rand.o - rand.u) / dy)
  const links = rand.l + (platz - dx * s) / 2
  const px = ([x, y]: Punkt): Punkt => [links + (x - x0) * s, rand.o + (y1 - y) * s]
  const f1 = (n: number): string => n.toFixed(1)
  return {
    hoehe: dy * s + rand.o + rand.u,
    px,
    zug: (ps: Punkt[], stil: string, zu = false): string =>
      `<path ${stil} d="M${ps
        .map(px)
        .map(([x, y]) => `${f1(x)},${f1(y)}`)
        .join(' L')}${zu ? ' Z' : ''}"/>`,
    /**
     * Maßzahl an der Strecke p–q, parallel dazu. abstand > 0: oberhalb bzw. links der Strecke,
     * abstand < 0: unterhalb bzw. rechts (in Pixeln).
     */
    anStrecke: (p: Punkt, q: Punkt, wert: number, abstand: number, mehr: Partial<Mass> = {}): Mass => {
      let [a, b] = [px(p), px(q)]
      // so drehen, dass die Schrift von links bzw. von unten lesbar ist
      if (a[0] > b[0] + 1e-6 || (Math.abs(a[0] - b[0]) <= 1e-6 && a[1] < b[1])) [a, b] = [b, a]
      const [ex, ey] = [b[0] - a[0], b[1] - a[1]]
      const len = Math.hypot(ex, ey) || 1
      return {
        x: (a[0] + b[0]) / 2 + (ey / len) * abstand,
        y: (a[1] + b[1]) / 2 - (ex / len) * abstand,
        drehung: (Math.atan2(ey, ex) * 180) / Math.PI,
        wert,
        art: 'len',
        ...mehr,
      }
    },
    /** Maßzahl an einem Punkt, um (dx, dy) Pixel versetzt. */
    anPunkt: (p: Punkt, wert: number, dxPx: number, dyPx: number, mehr: Partial<Mass> = {}): Mass => {
      const [x, y] = px(p)
      return { x: x + dxPx, y: y + dyPx, wert, art: 'len', ...mehr }
    },
  }
}

const gueltig = (...z: number[]): boolean => z.every((x) => Number.isFinite(x))

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
  // Fußpfette nur angedeutet, ihre Maße sind nicht bekannt
  const pf = Math.max(kSattel, sparrenhoehe * 0.6)
  const pfette: Punkt[] = [
    [0, 0],
    [pf, 0],
    [pf, -pf],
    [0, -pf],
  ]
  const hilf: Punkt[] = [
    [0, 0],
    [grundmass, 0],
    [grundmass, grundmass * t],
  ]
  const f = flaeche([...sparren, ...hilf, ...pfette], { l: 30, r: 50, o: 22, u: 24 })
  // Dachüberstand: waagerecht unter dem Sparrenfuß, bis zur Außenkante Fußpfette
  const fuss = Math.min(unten(-ueberstand), -pf)
  const mitUeberstand = ueberstand > 0
  // Nummern der Risse wie in der Anrissliste: Traufe, Kervensenkel, Ende des Waagrisses, First
  const kerveOben: Punkt = [0, unten(0) + lot]
  const rissNummern: Mass[] = []
  let nr = 0
  const nummer = (p: Punkt, dy: number): void => void rissNummern.push(f.anPunkt(p, ++nr, 0, dy, { art: 'int', klein: true, hinterlegt: true }))
  nummer(obenLinks, -8)
  if (ueberstand > 0 || kerve > 0) nummer(kerveOben, -8)
  if (kerve > 0) nummer([kSattel, 0], 9)
  nummer(obenRechts, -8)
  const kerveSenkel = ueberstand > 0 || kerve > 0 ? f.zug([[0, 0], kerveOben], HILF) : ''
  return {
    breite: BREITE,
    hoehe: f.hoehe,
    inhalt: kerveSenkel + f.zug(hilf, HILF) + f.zug(pfette, HILF, true) + (mitUeberstand ? f.zug([[-ueberstand, unten(-ueberstand)], [-ueberstand, fuss], [0, fuss]], HILF) : '') + f.zug(sparren, FLAECHE, true),
    masse: [
      ...(mitUeberstand ? [f.anPunkt([0, fuss], ueberstand, -3, 10, { anker: 'end' as const })] : []),
      f.anStrecke([0, 0], [grundmass, 0], grundmass, -10),
      f.anStrecke(obenLinks, obenRechts, (grundmass + ueberstand) / Math.cos(rad), 9),
      ...rissNummern,
      f.anPunkt([grundmass, (grundmass * t) / 2], grundmass * t, 5, 0, { anker: 'start' }),
      // steiles Dach: Winkel im Zwickel am Fuß; flaches Dach: darunter, sonst läge er auf dem Sparren
      // Neigung im Dreieck, dort wo zwischen Grundlinie und Sparren Platz ist
      f.anPunkt([grundmass * 0.62, 0], neigungGrad, 0, -8, { art: 'ang' }),
    ],
  }
}

export function zeichneKehlbalken(weite: number, neigungGrad: number, hoeheUnten: number, balkenhoehe: number): Zeichnung | undefined {
  const t = Math.tan((neigungGrad * Math.PI) / 180)
  if (!gueltig(weite, t, hoeheUnten, balkenhoehe)) return undefined
  const dach: Punkt[] = [
    [0, 0],
    [weite / 2, (weite / 2) * t],
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
  // Höhenmaß links der Mitte, damit es die Längenmaße nicht trifft
  const xh = weite / 2 - (weite - 2 * xu) * 0.32
  const basis: Punkt[] = [
    [0, 0],
    [weite, 0],
  ]
  const f = flaeche(dach, { l: 14, r: 14, o: 14, u: 24 })
  return {
    breite: BREITE,
    hoehe: f.hoehe,
    inhalt: f.zug(basis, HILF) + f.zug([[xh, 0], [xh, hoeheUnten]], HILF) + f.zug(dach, LINIE) + f.zug(balken, FLAECHE, true),
    masse: [
      f.anStrecke(basis[0], basis[1], weite, -10),
      f.anStrecke(balken[0], balken[1], weite - 2 * xu, -9),
      f.anStrecke(balken[3], balken[2], weite - 2 * xo, 9),
      ...(hoeheUnten > 0 ? [f.anPunkt([xh, hoeheUnten / 2], hoeheUnten, 4, 0, { anker: 'start' as const })] : []),
    ],
  }
}

/** Nummern an den Schiftern; bei dichter Folge nur jede k-te, damit sie lesbar bleiben. */
function nummern(abstaende: number[], ort: (d: number) => Punkt, dx: number, dy: number): Mass[] {
  const sichtbar = abstaende.slice(0, 60)
  if (sichtbar.length === 0) return []
  const [a, b] = [ort(sichtbar[0]), ort(sichtbar[1] ?? sichtbar[0] * 2)]
  const schritt = Math.max(1, Math.ceil(11 / (Math.hypot(b[0] - a[0], b[1] - a[1]) || 11)))
  return sichtbar.flatMap((d, i) => {
    if ((i + 1) % schritt !== 0) return []
    const [x, y] = ort(d)
    return [{ x: x + dx, y: y + dy, wert: i + 1, art: 'int' as const, klein: true }]
  })
}

/** Grundriss der Walmecke mit Grat und Schiftern. */
export function zeichneGrat(grundHaupt: number, grundWalm: number, schifterHaupt: number[], schifterWalm: number[]): Zeichnung | undefined {
  if (!gueltig(grundHaupt, grundWalm)) return undefined
  const x = grundHaupt
  const w = grundWalm
  const first = w * 0.45
  const f = flaeche(
    [
      [0, 0],
      [w + first, x],
    ],
    { l: 40, r: 14, o: 14, u: 38 }
  )
  const traufe: Punkt[] = [
    [w + first, 0],
    [0, 0],
    [0, x],
  ]
  let inhalt = f.zug(traufe, LINIE)
  for (const d of schifterHaupt.slice(0, 60)) inhalt += f.zug([[d, 0], [d, (d * x) / w]], HILF)
  for (const d of schifterWalm.slice(0, 60)) inhalt += f.zug([[0, d], [(d * w) / x, d]], HILF)
  inhalt += f.zug([[w, 0], [w, x]], HILF)
  inhalt += f.zug([[w, x], [w + first, x]], LINIE)
  inhalt += f.zug([[0, 0], [w, x]], 'fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"')
  return {
    breite: BREITE,
    hoehe: f.hoehe,
    inhalt,
    masse: [
      // Schifter tragen die Nummer aus der Liste, außen an der Traufe
      ...nummern(schifterHaupt, (d) => f.px([d, 0]), 0, 9),
      ...nummern(schifterWalm, (d) => f.px([0, d]), -9, 0),
      f.anStrecke([0, 0], [w, 0], w, -24),
      f.anStrecke([0, 0], [0, x], x, 24),
      // Grundriss: am Grat steht das Gratgrundmaß, nicht die wahre Länge
      f.anStrecke([0, 0], [w, x], Math.hypot(w, x), 0, { hinterlegt: true }),
    ],
  }
}

/** Stäbe auf einer Strecke, von oben gesehen. */
export function zeichneEinteilung(breite: number, staerke: number, kanten: number[]): Zeichnung | undefined {
  if (!gueltig(breite, staerke) || kanten.length > 80) return undefined
  const tiefe = breite * 0.16
  const f = flaeche(
    [
      [0, 0],
      [breite, tiefe],
    ],
    { l: 14, r: 14, o: 24, u: 36 }
  )
  let inhalt = f.zug(
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
    inhalt += f.zug(
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
  const masse: Mass[] = [f.anStrecke([0, 0], [breite, 0], breite, -24)]
  if (kanten.length >= 2) {
    const [a, b] = kanten
    // am ersten Feld: oben das Achsmaß, unten das lichte Maß
    const links = f.px([a, 0])[0] < 60 ? ('start' as const) : ('middle' as const)
    const mitte: Punkt = links === 'start' ? [a, 0] : [(a + b) / 2, 0]
    masse.push(
      { ...f.anPunkt([mitte[0], tiefe], b - a, 0, -10), anker: links, name: 'Achsmaß' },
      { ...f.anPunkt(mitte, b - a - staerke, 0, 10), anker: links, name: 'Lichtes Maß' }
    )
  }
  return { breite: BREITE, hoehe: f.hoehe, inhalt, masse }
}

export function zeichneStern(zacken: number, aussen: number, innen: number, kante: number): Zeichnung | undefined {
  if (!gueltig(zacken, aussen, innen, kante)) return undefined
  const punkte: Punkt[] = []
  for (let i = 0; i < 2 * zacken; i++) {
    const r = i % 2 === 0 ? aussen : innen
    const w = Math.PI / 2 + (i * Math.PI) / zacken
    punkte.push([r * Math.cos(w), r * Math.sin(w)])
  }
  const f = flaeche(
    [
      [-aussen, -aussen],
      [aussen, aussen],
    ],
    { l: 16, r: 16, o: 14, u: 26 }
  )
  return {
    breite: BREITE,
    hoehe: f.hoehe,
    inhalt:
      `<circle cx="${f.px([0, 0])[0].toFixed(1)}" cy="${f.px([0, 0])[1].toFixed(1)}" r="${(f.px([aussen, 0])[0] - f.px([0, 0])[0]).toFixed(1)}" ${HILF}/>` + f.zug(punkte, FLAECHE, true),
    masse: [f.anStrecke(punkte[1], punkte[0], kante, 9), f.anPunkt([0, -aussen], 2 * aussen, 0, 14, { vor: 'Ø ' })],
  }
}

/** Dreieck mit c als Grundseite, α links, β rechts. */
export function zeichneDreieck(a: number, b: number, c: number, alphaGrad: number): Zeichnung | undefined {
  if (!gueltig(a, b, c, alphaGrad)) return undefined
  const rad = (alphaGrad * Math.PI) / 180
  const A: Punkt = [0, 0]
  const B: Punkt = [c, 0]
  const C: Punkt = [b * Math.cos(rad), b * Math.sin(rad)]
  const f = flaeche([A, B, C], { l: 30, r: 30, o: 22, u: 24 })
  // Beschriftung immer auf der Außenseite: bei überhängender Spitze wechselt die Seite
  const aussenB = C[0] >= 0 ? 10 : -10
  const aussenA = C[0] <= c ? 10 : -10
  // Winkel innen an der Ecke, auf der Winkelhalbierenden; entfällt, wenn die Ecke dafür zu eng ist
  const winkel = (ecke: Punkt, p: Punkt, q: Punkt): Mass[] => {
    const [e, p1, q1] = [f.px(ecke), f.px(p), f.px(q)]
    const [l1, l2] = [Math.hypot(p1[0] - e[0], p1[1] - e[1]), Math.hypot(q1[0] - e[0], q1[1] - e[1])]
    const u: Punkt = [(p1[0] - e[0]) / l1, (p1[1] - e[1]) / l1]
    const v: Punkt = [(q1[0] - e[0]) / l2, (q1[1] - e[1]) / l2]
    const halb = Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1]))) / 2
    const abstand = Math.max(16, 14 / Math.sin(halb))
    if (abstand > 0.5 * Math.min(l1, l2)) return []
    const bl = Math.hypot(u[0] + v[0], u[1] + v[1]) || 1
    return [{ x: e[0] + ((u[0] + v[0]) / bl) * abstand, y: e[1] + ((u[1] + v[1]) / bl) * abstand, wert: (halb * 360) / Math.PI, art: 'ang', klein: true }]
  }
  return {
    breite: BREITE,
    hoehe: f.hoehe,
    inhalt: f.zug([A, B, C], FLAECHE, true),
    masse: [
      f.anStrecke(A, B, c, -10, { vor: 'c = ' }),
      f.anStrecke(A, C, b, aussenB, { vor: 'b = ' }),
      f.anStrecke(B, C, a, aussenA, { vor: 'a = ' }),
      ...winkel(A, B, C),
      ...winkel(B, A, C),
      ...winkel(C, A, B),
    ],
  }
}

export function zeichnePultdach(breite: number, ueberstandTief: number, ueberstandHoch: number, neigungGrad: number): Zeichnung | undefined {
  const rad = (neigungGrad * Math.PI) / 180
  const t = Math.tan(rad)
  if (!gueltig(breite, ueberstandTief, ueberstandHoch, t)) return undefined
  const a: Punkt = [-ueberstandTief, -ueberstandTief * t]
  const b: Punkt = [breite + ueberstandHoch, (breite + ueberstandHoch) * t]
  const hilf: Punkt[] = [
    [0, 0],
    [breite, 0],
    [breite, breite * t],
  ]
  const f = flaeche([a, b, ...hilf], { l: 20, r: 50, o: 22, u: 24 })
  return {
    breite: BREITE,
    hoehe: f.hoehe,
    inhalt: f.zug(hilf, HILF) + f.zug([a, b], 'fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"'),
    masse: [
      f.anStrecke([0, 0], [breite, 0], breite, -10),
      f.anStrecke(a, b, (breite + ueberstandTief + ueberstandHoch) / Math.cos(rad), 10),
      f.anPunkt([breite, (breite * t) / 2], breite * t, 5, 0, { anker: 'start' }),
    ],
  }
}

/** Schnitt durch die Schleppgaube: Hauptdach, Gaubenfront und Gaubendach. */
export function zeichneGaube(neigungHaupt: number, neigungGaube: number, hoeheFront: number, lauf: number): Zeichnung | undefined {
  const tH = Math.tan((neigungHaupt * Math.PI) / 180)
  const tG = Math.tan((neigungGaube * Math.PI) / 180)
  if (!gueltig(tH, tG, hoeheFront, lauf)) return undefined
  const oben: Punkt = [lauf, lauf * tH]
  const haupt: Punkt[] = [
    [-0.3 * lauf, -0.3 * lauf * tH],
    [1.25 * lauf, 1.25 * lauf * tH],
  ]
  const f = flaeche([...haupt, [0, hoeheFront]], { l: 44, r: 20, o: 22, u: 24 })
  return {
    breite: BREITE,
    hoehe: f.hoehe,
    inhalt: f.zug([[0, 0], [lauf, 0], oben], HILF) + f.zug(haupt, LINIE) + f.zug([[0, 0], [0, hoeheFront], oben], 'fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"'),
    masse: [
      f.anPunkt([0, hoeheFront / 2], hoeheFront, -5, 0, { anker: 'end' }),
      f.anStrecke([0, 0], [lauf, 0], lauf, -10),
      f.anStrecke([0, hoeheFront], oben, lauf / Math.cos((neigungGaube * Math.PI) / 180), 10),
      f.anStrecke([0, 0], oben, lauf / Math.cos((neigungHaupt * Math.PI) / 180), 0, { hinterlegt: true }),
    ],
  }
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
  const f = flaeche(ecken, { l: 16, r: 16, o: 14, u: 26 })
  return {
    breite: BREITE,
    hoehe: f.hoehe,
    inhalt: f.zug(ecken, FLAECHE, true) + ecken.map((e) => f.zug([[0, 0], e], LINIE)).join(''),
    masse: [f.anStrecke(ecken[0], ecken[1], seitenlaenge, -10), f.anStrecke([0, 0], ecken[1], gratGrund, 0, { hinterlegt: true })],
  }
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
  const f = flaeche(umriss, { l: 30, r: 30, o: 14, u: 24 })
  const dick = 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"'
  let inhalt = f.zug(umriss, FLAECHE, true) + f.zug([[0, walmGrund], [0, firstEnde]], LINIE)
  // Kehlen zum Hauptdach
  inhalt += f.zug([[-h, trauflaenge], [0, firstEnde]], dick) + f.zug([[h, trauflaenge], [0, firstEnde]], dick)
  if (walmGrund > 0) inhalt += f.zug([[-h, 0], [0, walmGrund]], LINIE) + f.zug([[h, 0], [0, walmGrund]], LINIE)
  return {
    breite: BREITE,
    hoehe: f.hoehe,
    inhalt,
    masse: [
      f.anStrecke([-h, 0], [h, 0], breite, -10),
      ...(trauflaenge > 0 ? [f.anStrecke([-h, 0], [-h, trauflaenge], trauflaenge, 10)] : []),
      f.anStrecke([0, walmGrund], [0, firstEnde], firstEnde - walmGrund, 0, { hinterlegt: true }),
      f.anStrecke([h, trauflaenge], [0, firstEnde], kehlGrund, 0, { hinterlegt: true }),
    ],
  }
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
  const ueber = Math.max(wechselabstand * 0.35, 3 * s)
  const [unten, oben] = [-ueber - s, wechselabstand + s + ueber]
  const balken = (x: number, y0: number, y1: number): Punkt[] => [
    [x, y0],
    [x + s, y0],
    [x + s, y1],
    [x, y1],
  ]
  const f = flaeche(
    [
      [0, unten],
      [wechsellaenge + 2 * s, oben],
    ],
    { l: 16, r: 44, o: 24, u: 14 }
  )
  // durchlaufende Sparren links und rechts
  let inhalt = f.zug(balken(0, unten, oben), FLAECHE, true) + f.zug(balken(s + wechsellaenge, unten, oben), FLAECHE, true)
  // gekappte Sparren enden an den Wechseln
  for (let i = 1; i <= gekappt; i++) {
    inhalt += f.zug(balken(i * achsmass, unten, -s), FLAECHE, true) + f.zug(balken(i * achsmass, wechselabstand + s, oben), FLAECHE, true)
  }
  // Wechsel unten und oben
  const wechsel = (y: number): Punkt[] => [
    [s, y],
    [s + wechsellaenge, y],
    [s + wechsellaenge, y + s],
    [s, y + s],
  ]
  inhalt += f.zug(wechsel(-s), FLAECHE, true) + f.zug(wechsel(wechselabstand), FLAECHE, true)
  // Fenster mittig im Feld
  const fx = s + (wechsellaenge - fensterbreite) / 2
  const fy = (wechselabstand - fensterhoehe) / 2
  const fenster: Punkt[] = [
    [fx, fy],
    [fx + fensterbreite, fy],
    [fx + fensterbreite, fy + fensterhoehe],
    [fx, fy + fensterhoehe],
  ]
  inhalt += f.zug(fenster, LINIE, true) + f.zug([fenster[0], fenster[2]], HILF) + f.zug([fenster[1], fenster[3]], HILF)
  return {
    breite: BREITE,
    hoehe: f.hoehe,
    inhalt,
    masse: [
      f.anStrecke([s, wechselabstand + s], [s + wechsellaenge, wechselabstand + s], wechsellaenge, 9),
      f.anStrecke(fenster[0], fenster[1], fensterbreite, 9, { hinterlegt: true }),
      f.anPunkt([s + wechsellaenge + s, wechselabstand / 2], wechselabstand, 5, 0, { anker: 'start' }),
    ],
  }
}
