import { pruefe } from './trig'

/**
 * Faustformeln zur Vorbemessung von Holzbauteilen: Querschnittshöhe als Bruchteil der Spannweite.
 * Das ist KEINE Bemessung – kein Nachweis von Tragfähigkeit, Durchbiegung, Schwingung oder Brandschutz.
 * Lasten, Holzgüte und Auflager gehen nicht ein. Den Querschnitt legt die Tragwerksplanung fest.
 *
 * Quelle der festen Formeln: Skript „Vordimensionierung“ (Tragwerkslehre, Hochschule Ostwestfalen-Lippe),
 * Abschnitte 13.3 Ideelle Stützweite, 13.4 Holzdächer und 13.5.9 Holzbalkendecke. Alle Maße in cm.
 */
export type Faustbauteil = 'frei' | 'decke' | 'flachLeicht' | 'flachMittel' | 'flachSchwer' | 'sparrenSparrendach' | 'sparrenKehlbalkendach' | 'sparrenPfettendach' | 'kehlbalken' | 'pfette45' | 'pfette15' | 'pfetteSpitzboden' | 'dreieckStrebenBinder' | 'bshEinfeld'

interface Regel {
  /** Höhe ≈ Spannweite / teiler + zuschlag (+ a / aDurch bei Pfetten) */
  teiler: number
  zuschlag: number
  /** Formel als Bereich: Höhe bis Spannweite / teilerBis */
  teilerBis?: number
  /** Obergrenze der Höhe laut Quelle */
  hoechstens?: number
  /** Spannweiten, für die die Quelle die Formel nennt (cm) */
  bereich?: [number, number]
  /** Träger, für die die Trägerart (ideelle Stützweite) wählbar ist */
  traegerart?: boolean
  /** Sparren im Pfettendach: Grat- oder Kehlsparren ≈ 1,5 × Höhe des Normalsparrens */
  gratFaktor?: number
  /** Pfetten: zusätzlich das Maß a (bzw. a1 + a2) geteilt durch diesen Wert */
  aDurch?: number
  /** Pfetten mit ausgebautem Spitzboden: a ist die Summe a1 + a2 */
  zweiMasse?: boolean
  /** Breite als Anteil der Höhe (von–bis) mit Mindestmaß, oder als Bruchteil des Achsabstands */
  breite?: { vonHoehe?: [number, number]; achsabstandDurch?: number; mindestens?: number; spannweiteDurch?: number; aDurch?: number }
}

export const FAUSTREGELN: Record<Exclude<Faustbauteil, 'frei'>, Regel> = {
  // 13.5.9: d ≈ l/20, b ≈ 1/2 bis 2/3 d ≥ 10 cm (Eigenlast ca. 2 kN/m², Verkehrslast 2 kN/m²)
  decke: { teiler: 20, zuschlag: 0, traegerart: true, breite: { vonHoehe: [1 / 2, 2 / 3], mindestens: 10 } },
  // 13.4 Holzbalkenflachdach: d ≈ l/24 (leicht), l/20 (mittel), l/16 (schwer), b > 0,5 d; l < 5 m mit Vollholz, darüber BSH
  flachLeicht: { teiler: 24, zuschlag: 0, traegerart: true, breite: { vonHoehe: [0.5, 0.5] } },
  flachMittel: { teiler: 20, zuschlag: 0, traegerart: true, breite: { vonHoehe: [0.5, 0.5] } },
  flachSchwer: { teiler: 16, zuschlag: 0, traegerart: true, breite: { vonHoehe: [0.5, 0.5] } },
  // 13.4.2 Sparrendach: d ≈ s/24 + 2 cm, b ≈ e/10 ≥ 8 cm
  sparrenSparrendach: { teiler: 24, zuschlag: 2, breite: { achsabstandDurch: 10, mindestens: 8 } },
  // 13.4.3 verschiebliches Kehlbalkendach: d ≈ max s/24 + 4 cm; Sparrenbreite b ≈ e/8 ≥ 8 cm
  sparrenKehlbalkendach: { teiler: 24, zuschlag: 4, breite: { achsabstandDurch: 8, mindestens: 8 } },
  // 13.4.4 Pfettendach: d ≈ max s/24, b ≈ e/10 ≥ 8 cm; Grat- oder Kehlsparren d ≈ 1,5 d Normalsparren
  sparrenPfettendach: { teiler: 24, zuschlag: 0, gratFaktor: 1.5, breite: { achsabstandDurch: 10, mindestens: 8 } },
  // 13.4.3 Kehlbalken: d ≈ l/20 (mit Spitzbodenlast), b ≈ e/8 (einteilig)
  kehlbalken: { teiler: 20, zuschlag: 0, breite: { achsabstandDurch: 8 } },
  // 13.4.4 Pfetten, Last nur aus Dach: d ≈ l/24 + a/30 (Neigung etwa 45°) bzw. l/24 + a/50 (etwa 15°);
  // Breite b ≈ l/40 + a/50 bzw. 0,5 bis 0,7 d
  pfette45: { teiler: 24, zuschlag: 0, aDurch: 30, breite: { spannweiteDurch: 40, aDurch: 50, vonHoehe: [0.5, 0.7] } },
  pfette15: { teiler: 24, zuschlag: 0, aDurch: 50, breite: { spannweiteDurch: 40, aDurch: 50, vonHoehe: [0.5, 0.7] } },
  // Last aus Dach und ausgebautem Spitzboden: d ≈ l/24 + (a1 + a2)/30, b ≈ l/24 + (a1 + a2)/50
  // 13.4.4 Flachdächer, Dreieck-Streben-Binder o. ä.: d ≈ l/20 bis l/15, d ≤ 75 cm, l ≈ 5 bis 10 m
  dreieckStrebenBinder: { teiler: 20, teilerBis: 15, zuschlag: 0, hoechstens: 75, bereich: [500, 1000] },
  // 13.4.5 Weitgespannte Dachtragwerke (Tabelle aus Informationsdienst Holz): Brettschichtträger, Einfeldträger parallel, l/17 bei 10 bis 35 m
  bshEinfeld: { teiler: 17, zuschlag: 0, bereich: [1000, 3500] },
  pfetteSpitzboden: { teiler: 24, zuschlag: 0, aDurch: 30, zweiMasse: true, breite: { spannweiteDurch: 24, aDurch: 50 } },
}

/**
 * 13.3 Ideelle Stützweite l_i = Faktor · l (etwa der Abstand der Momentennullpunkte), laut Quelle
 * „maßgebend für die Wahl der Bauteildicke“. Die Quelle nennt sie allgemein, nicht eigens für Holz.
 */
export const TRAEGERARTEN = { einfeld: 1, endfeld09: 0.9, endfeld08: 0.8, mittelfeld: 0.6, kragarm: 2.4 } as const
export type Traegerart = keyof typeof TRAEGERARTEN

/** a, a2: Maße der Pfettenformeln laut Skizze der Quelle (waagerechte Abstände zu den benachbarten Auflagerlinien) */
export function vorbemessung(bauteil: Faustbauteil, spannweite: number, eigenerTeiler?: number, achsabstand?: number, a?: number, a2?: number, traegerart: Traegerart = 'einfeld') {
  pruefe(spannweite > 0, 'Die Spannweite muss größer als 0 sein.')
  const regel: Regel = bauteil === 'frei' ? { teiler: eigenerTeiler ?? NaN, zuschlag: 0, traegerart: true } : FAUSTREGELN[bauteil]
  pruefe(Number.isFinite(regel.teiler) && regel.teiler >= 5 && regel.teiler <= 60, 'Der Teiler muss zwischen 5 und 60 liegen.')
  if (achsabstand !== undefined) pruefe(achsabstand > 0, 'Der Achsabstand muss größer als 0 sein.')
  let aSumme = 0
  if (regel.aDurch) {
    pruefe(a !== undefined && a > 0, 'Das Maß a muss größer als 0 sein.')
    if (regel.zweiMasse) pruefe(a2 !== undefined && a2 > 0, 'Das Maß a2 muss größer als 0 sein.')
    aSumme = (a as number) + (regel.zweiMasse ? (a2 as number) : 0)
  }
  pruefe(traegerart in TRAEGERARTEN, 'Unbekannte Trägerart.')
  // die Trägerart gilt nur für Bauteile, bei denen sie wählbar ist; sonst wird mit der vollen Spannweite gerechnet
  const faktor = regel.traegerart ? TRAEGERARTEN[traegerart] : 1
  const ideell = spannweite * faktor
  const begrenzt = (h: number) => (regel.hoechstens ? Math.min(h, regel.hoechstens) : h)
  const hoehe = begrenzt(ideell / regel.teiler + regel.zuschlag + (regel.aDurch ? aSumme / regel.aDurch : 0))
  const hoeheBis = regel.teilerBis ? begrenzt(ideell / regel.teilerBis + regel.zuschlag) : undefined
  const ausserhalb = !!regel.bereich && (spannweite < regel.bereich[0] || spannweite > regel.bereich[1])
  const b = regel.breite
  const mind = b?.mindestens ?? 0
  let breiteVon: number | undefined
  let breiteBis: number | undefined
  if (b?.vonHoehe) [breiteVon, breiteBis] = [Math.max(hoehe * b.vonHoehe[0], mind), Math.max(hoehe * b.vonHoehe[1], mind)]
  else if (b?.achsabstandDurch && achsabstand !== undefined) breiteVon = breiteBis = Math.max(achsabstand / b.achsabstandDurch, mind)
  // Pfetten: Breite aus eigener Formel; der Bereich als Anteil der Höhe steht daneben
  const breiteFormel = b?.spannweiteDurch ? spannweite / b.spannweiteDurch + aSumme / (b.aDurch ?? Infinity) : undefined
  return { hoehe, hoeheBis, teilerBis: regel.teilerBis, hoechstens: regel.hoechstens, faktor, ideell, ausserhalb, gratHoehe: regel.gratFaktor ? hoehe * regel.gratFaktor : undefined, teiler: regel.teiler, zuschlag: regel.zuschlag, anteilA: regel.aDurch ? aSumme / regel.aDurch : 0, breiteVon, breiteBis, breiteFormel, brauchtAchsabstand: !!b?.achsabstandDurch }
}
