import { pruefe } from './trig'

/**
 * Faustformeln zur Vorbemessung von Holzbauteilen: Querschnittshöhe als Bruchteil der Spannweite.
 * Das ist KEINE Bemessung – kein Nachweis von Tragfähigkeit, Durchbiegung, Schwingung oder Brandschutz.
 * Lasten, Holzgüte und Auflager gehen nicht ein. Den Querschnitt legt die Tragwerksplanung fest.
 *
 * Quelle der festen Formeln: Skript „Vordimensionierung“ (Tragwerkslehre, Hochschule Ostwestfalen-Lippe),
 * Abschnitte 13.4 Holzdächer und 13.5.9 Holzbalkendecke. Alle Maße in cm.
 */
export type Faustbauteil = 'frei' | 'decke' | 'flachLeicht' | 'flachMittel' | 'flachSchwer' | 'sparrenSparrendach' | 'sparrenPfettendach' | 'kehlbalken'

interface Regel {
  /** Höhe ≈ Spannweite / teiler + zuschlag */
  teiler: number
  zuschlag: number
  /** Breite als Anteil der Höhe (von–bis) mit Mindestmaß, oder als Bruchteil des Achsabstands */
  breite?: { vonHoehe?: [number, number]; achsabstandDurch?: number; mindestens?: number }
}

export const FAUSTREGELN: Record<Exclude<Faustbauteil, 'frei'>, Regel> = {
  // 13.5.9: d ≈ l/20, b ≈ 1/2 bis 2/3 d ≥ 10 cm (Eigenlast ca. 2 kN/m², Verkehrslast 2 kN/m²)
  decke: { teiler: 20, zuschlag: 0, breite: { vonHoehe: [1 / 2, 2 / 3], mindestens: 10 } },
  // 13.4 Holzbalkenflachdach: d ≈ l/24 (leicht), l/20 (mittel), l/16 (schwer), b > 0,5 d
  flachLeicht: { teiler: 24, zuschlag: 0, breite: { vonHoehe: [0.5, 0.5] } },
  flachMittel: { teiler: 20, zuschlag: 0, breite: { vonHoehe: [0.5, 0.5] } },
  flachSchwer: { teiler: 16, zuschlag: 0, breite: { vonHoehe: [0.5, 0.5] } },
  // 13.4.2 Sparrendach: d ≈ s/24 + 2 cm, b ≈ e/10 ≥ 8 cm
  sparrenSparrendach: { teiler: 24, zuschlag: 2, breite: { achsabstandDurch: 10, mindestens: 8 } },
  // 13.4.4 Pfettendach: d ≈ max s/24, b ≈ e/10 ≥ 8 cm
  sparrenPfettendach: { teiler: 24, zuschlag: 0, breite: { achsabstandDurch: 10, mindestens: 8 } },
  // 13.4.3 Kehlbalken: d ≈ l/20 (mit Spitzbodenlast), b ≈ e/8 (einteilig)
  kehlbalken: { teiler: 20, zuschlag: 0, breite: { achsabstandDurch: 8 } },
}

export function vorbemessung(bauteil: Faustbauteil, spannweite: number, eigenerTeiler?: number, achsabstand?: number) {
  pruefe(spannweite > 0, 'Die Spannweite muss größer als 0 sein.')
  const regel: Regel = bauteil === 'frei' ? { teiler: eigenerTeiler ?? NaN, zuschlag: 0 } : FAUSTREGELN[bauteil]
  pruefe(Number.isFinite(regel.teiler) && regel.teiler >= 5 && regel.teiler <= 60, 'Der Teiler muss zwischen 5 und 60 liegen.')
  if (achsabstand !== undefined) pruefe(achsabstand > 0, 'Der Achsabstand muss größer als 0 sein.')
  const hoehe = spannweite / regel.teiler + regel.zuschlag
  const b = regel.breite
  const mind = b?.mindestens ?? 0
  let breiteVon: number | undefined
  let breiteBis: number | undefined
  if (b?.vonHoehe) [breiteVon, breiteBis] = [Math.max(hoehe * b.vonHoehe[0], mind), Math.max(hoehe * b.vonHoehe[1], mind)]
  else if (b?.achsabstandDurch && achsabstand !== undefined) breiteVon = breiteBis = Math.max(achsabstand / b.achsabstandDurch, mind)
  return { hoehe, teiler: regel.teiler, zuschlag: regel.zuschlag, breiteVon, breiteBis, brauchtAchsabstand: !!b?.achsabstandDurch }
}
