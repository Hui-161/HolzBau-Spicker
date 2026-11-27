import { acos, asin, atan, cos, pruefe, sin, tan } from './trig'

const ok = (x: number | undefined): x is number => x !== undefined && Number.isFinite(x)

/* ---------- Rechtwinkliges Dreieck (γ = 90°, c = Hypotenuse) ---------- */

export interface RwEingabe {
  a?: number
  b?: number
  c?: number
  /** Winkel gegenüber a */
  alpha?: number
  /** Winkel gegenüber b */
  beta?: number
}

export function rechtwinklig(e: RwEingabe) {
  // Mehr als zwei Angaben können sich widersprechen – dann lieber nachfragen als still eine ignorieren
  pruefe([e.a, e.b, e.c, e.alpha, e.beta].filter(ok).length <= 2, 'Bitte genau zwei Werte eingeben – weitere Felder leeren.')
  let { a, b, c } = e
  for (const s of [a, b, c]) if (ok(s)) pruefe(s > 0, 'Seiten müssen größer als 0 sein.')
  // jeden eingetragenen Winkel für sich prüfen – auch β, wenn α schon da ist
  for (const winkel of [e.alpha, e.beta]) if (ok(winkel)) pruefe(winkel > 0 && winkel < 90, 'Winkel müssen zwischen 0° und 90° liegen.')
  if (ok(e.alpha) && ok(e.beta)) pruefe(Math.abs(e.alpha + e.beta - 90) < 1e-6, 'α und β müssen zusammen 90° ergeben.')
  let alpha = ok(e.alpha) ? e.alpha : ok(e.beta) ? 90 - e.beta : undefined

  if (ok(a) && ok(b)) {
    c = Math.hypot(a, b)
  } else if (ok(a) && ok(c)) {
    pruefe(c > a, 'Die Hypotenuse c muss die längste Seite sein.')
    b = Math.sqrt(c * c - a * a)
  } else if (ok(b) && ok(c)) {
    pruefe(c > b, 'Die Hypotenuse c muss die längste Seite sein.')
    a = Math.sqrt(c * c - b * b)
  } else if (ok(alpha) && ok(a)) {
    b = a / tan(alpha)
    c = a / sin(alpha)
  } else if (ok(alpha) && ok(b)) {
    a = b * tan(alpha)
    c = b / cos(alpha)
  } else if (ok(alpha) && ok(c)) {
    a = c * sin(alpha)
    b = c * cos(alpha)
  } else {
    pruefe(false, 'Bitte zwei Werte eingeben, davon mindestens eine Seite.')
  }
  const A = a as number
  const B = b as number
  const C = c as number
  alpha = atan(A / B)
  return {
    a: A,
    b: B,
    c: C,
    alpha,
    beta: 90 - alpha,
    flaeche: (A * B) / 2,
    umfang: A + B + C,
    hoeheC: (A * B) / C,
  }
}

/* ---------- Allgemeines Dreieck ---------- */

export interface DreieckEingabe {
  a?: number
  b?: number
  c?: number
  alpha?: number
  beta?: number
  gamma?: number
}

export function dreieck(e: DreieckEingabe) {
  const s: (number | undefined)[] = [e.a, e.b, e.c]
  const w: (number | undefined)[] = [e.alpha, e.beta, e.gamma]
  let hinweis: string | undefined
  for (const x of s) if (ok(x)) pruefe(x > 0, 'Seiten müssen größer als 0 sein.')
  for (const x of w) if (ok(x)) pruefe(x > 0 && x < 180, 'Winkel müssen zwischen 0° und 180° liegen.')

  const idx = [0, 1, 2]
  const ks = idx.filter((i) => ok(s[i]))
  let ka = idx.filter((i) => ok(w[i]))
  // Mehr als drei Angaben können sich widersprechen – dann lieber nachfragen als still eine ignorieren
  pruefe(ks.length + ka.length <= 3, 'Bitte genau drei Werte eingeben – weitere Felder leeren.')
  if (ka.length === 2) {
    const k = idx.find((i) => !ok(w[i])) as number
    w[k] = 180 - (w[ka[0]] as number) - (w[ka[1]] as number)
    pruefe((w[k] as number) > 0, 'Die Winkelsumme muss kleiner als 180° sein.')
    ka = idx
  }

  if (ks.length === 3) {
    // SSS – Winkel folgen unten aus dem Kosinussatz
  } else if (ks.length === 2 && ka.length >= 1) {
    const k = idx.find((i) => !ok(s[i])) as number
    const [i, j] = ks
    if (ok(w[k])) {
      // SWS: eingeschlossener Winkel bekannt
      const si = s[i] as number
      const sj = s[j] as number
      s[k] = Math.sqrt(si * si + sj * sj - 2 * si * sj * cos(w[k] as number))
    } else {
      // SSW: Winkel liegt einer bekannten Seite gegenüber
      const p = ok(w[i]) ? i : j
      const q = p === i ? j : i
      const sp = s[p] as number
      const sq = s[q] as number
      const sinQ = (sq * sin(w[p] as number)) / sp
      pruefe(sinQ <= 1 + 1e-12, 'Mit diesen Werten ergibt sich kein Dreieck.')
      const wq = asin(Math.min(1, sinQ))
      if (sq > sp + 1e-12 && sinQ < 1 - 1e-12) {
        hinweis = 'Diese Angaben sind zweideutig – gezeigt wird die Lösung mit dem spitzen Winkel.'
      }
      const wk = 180 - (w[p] as number) - wq
      pruefe(wk > 0, 'Mit diesen Werten ergibt sich kein Dreieck.')
      s[k] = (sp * sin(wk)) / sin(w[p] as number)
    }
  } else if (ks.length === 1 && ka.length === 3) {
    // WSW / SWW: Sinussatz
    const i = ks[0]
    const f = (s[i] as number) / sin(w[i] as number)
    for (const j of idx) s[j] = f * sin(w[j] as number)
  } else {
    pruefe(false, 'Bitte drei Werte eingeben, davon mindestens eine Seite.')
  }

  const [a, b, c] = s as number[]
  pruefe(a + b > c && a + c > b && b + c > a, 'Zwei Seiten zusammen müssen länger sein als die dritte.')
  const alpha = acos((b * b + c * c - a * a) / (2 * b * c))
  const beta = acos((a * a + c * c - b * b) / (2 * a * c))
  const gamma = 180 - alpha - beta
  const u = a + b + c
  const h = u / 2
  const flaeche = Math.sqrt(h * (h - a) * (h - b) * (h - c))
  return {
    a,
    b,
    c,
    alpha,
    beta,
    gamma,
    umfang: u,
    flaeche,
    hoeheA: (2 * flaeche) / a,
    hoeheB: (2 * flaeche) / b,
    hoeheC: (2 * flaeche) / c,
    umkreis: (a * b * c) / (4 * flaeche),
    inkreis: flaeche / h,
    hinweis,
  }
}

/* ---------- Maßkontrollen ---------- */

/** Rechter Winkel nach 3-4-5: eine Seite gegeben, die anderen im Verhältnis. */
export function dreiVierFuenf(wert: number, seite: 'kurz' | 'lang' | 'diagonale') {
  pruefe(wert > 0, 'Das Maß muss größer als 0 sein.')
  const teil = wert / (seite === 'kurz' ? 3 : seite === 'lang' ? 4 : 5)
  return { kurz: 3 * teil, lang: 4 * teil, diagonale: 5 * teil }
}

/** Diagonalkontrolle am Rechteck; d1/d2 sind optional gemessene Diagonalen. */
export function diagonale(laenge: number, breite: number, d1?: number, d2?: number) {
  pruefe(laenge > 0 && breite > 0, 'Länge und Breite müssen größer als 0 sein.')
  const soll = Math.hypot(laenge, breite)
  return {
    soll,
    winkel: atan(breite / laenge),
    abweichung1: ok(d1) ? d1 - soll : undefined,
    abweichung2: ok(d2) ? d2 - soll : undefined,
    differenz: ok(d1) && ok(d2) ? Math.abs(d1 - d2) : undefined,
  }
}

/** Kreis-/Stichbogen aus Sehne (Spannweite) und Stichhöhe. */
export function bogen(sehne: number, stich: number) {
  pruefe(sehne > 0 && stich > 0, 'Sehne und Stich müssen größer als 0 sein.')
  pruefe(stich <= sehne / 2 + 1e-9, 'Der Stich darf höchstens die halbe Sehne betragen (Halbkreis).')
  const radius = (sehne * sehne) / (8 * stich) + stich / 2
  const winkel = 4 * atan((2 * stich) / sehne)
  return { radius, winkel, bogenlaenge: (radius * winkel * Math.PI) / 180 }
}

/** Stern mit n Zacken: Außenradius und Winkel an der Spitze. */
export function stern(zacken: number, aussenradius: number, spitzenwinkel: number) {
  pruefe(Number.isInteger(zacken) && zacken >= 3 && zacken <= 24, 'Anzahl der Zacken: 3 bis 24.')
  pruefe(aussenradius > 0, 'Radius muss größer als 0 sein.')
  const halb = spitzenwinkel / 2
  const mitte = 180 / zacken
  // Dreieck Mitte – Spitze – Innenecke
  const innenwinkel = 180 - mitte - halb
  pruefe(halb > 0 && innenwinkel > 90, 'Der Winkel an der Spitze ist für diese Zackenzahl zu groß.')
  return {
    innenradius: (aussenradius * sin(halb)) / sin(innenwinkel),
    kante: (aussenradius * sin(mitte)) / sin(innenwinkel),
    kanten: 2 * zacken,
    /** Gehrung an der Spitze, zur Stabkante gemessen */
    gehrungSpitze: halb,
    /** Gehrung an der Innenecke, zur Stabkante gemessen */
    gehrungInnen: 180 - innenwinkel,
    durchmesser: 2 * aussenradius,
  }
}
