import { cos, pruefe, sin } from './trig'

/**
 * Mindestabstände für Nägel und Schrauben bis 6 mm nach EN 1995-1-1 (Eurocode 5), Tabelle 8.2.
 * Nachschlagehilfe – maßgebend sind die Norm mit nationalem Anhang und bei Schrauben die
 * Zulassung (ETA) des Herstellers.
 */
export type Vorbohrung = 'ohne' | 'ohneDicht' | 'vorgebohrt'

export function mindestabstaende(durchmesser: number, winkel: number, art: Vorbohrung) {
  pruefe(durchmesser > 0 && durchmesser <= 8, 'Durchmesser: bis 8 mm (Nägel) bzw. 6 mm (Schrauben).')
  pruefe(winkel >= 0 && winkel <= 90, 'Winkel zwischen Kraft und Faser: 0° bis 90°.')
  // EN 1995-1-1, 8.3.1.1 (2): über 6 mm ist vorzubohren
  pruefe(art === 'vorgebohrt' || durchmesser <= 6, 'Über 6 mm Durchmesser muss vorgebohrt werden.')
  const d = durchmesser
  const c = cos(winkel)
  const s = sin(winkel)
  const duenn = d < 5
  if (art === 'vorgebohrt') {
    return { a1: (4 + c) * d, a2: (3 + s) * d, a3t: (7 + 5 * c) * d, a3c: 7 * d, a4t: (duenn ? 3 + 2 * s : 3 + 4 * s) * d, a4c: 3 * d }
  }
  if (art === 'ohneDicht') {
    // 420 kg/m³ < ρk ≤ 500 kg/m³
    return { a1: (7 + 8 * c) * d, a2: 7 * d, a3t: (15 + 5 * c) * d, a3c: 15 * d, a4t: (duenn ? 7 + 2 * s : 7 + 5 * s) * d, a4c: 7 * d }
  }
  // ρk ≤ 420 kg/m³
  return { a1: (duenn ? 5 + 5 * c : 5 + 7 * c) * d, a2: 5 * d, a3t: (10 + 5 * c) * d, a3c: 10 * d, a4t: (duenn ? 5 + 2 * s : 5 + 5 * s) * d, a4c: 5 * d }
}

/**
 * Mindestabstände für Bolzen (Tabelle 8.4) und Stabdübel (Tabelle 8.5) nach EN 1995-1-1.
 * Schrauben über 6 mm gelten nach 8.7.1 (4) wie Bolzen. Winkel 0° bis 90° zwischen Kraft und Faser.
 */
export function mindestabstaendeStift(durchmesser: number, winkel: number, art: 'bolzen' | 'stabduebel') {
  pruefe(durchmesser > 6 && durchmesser <= 30, 'Durchmesser: über 6 mm bis 30 mm.')
  pruefe(winkel >= 0 && winkel <= 90, 'Winkel zwischen Kraft und Faser: 0° bis 90°.')
  const d = durchmesser
  const c = cos(winkel)
  const s = sin(winkel)
  const a3t = Math.max(7 * d, 80)
  const a4t = Math.max((2 + 2 * s) * d, 3 * d)
  if (art === 'bolzen') {
    return { a1: (4 + c) * d, a2: 4 * d, a3t, a3c: Math.max((1 + 6 * s) * d, 4 * d), a4t, a4c: 3 * d }
  }
  // Tabelle 8.5: bis 30° zur Faser gilt für das unbeanspruchte Hirnholzende fest 3·d, darüber a3,t·sin α
  return { a1: (3 + 2 * c) * d, a2: 3 * d, a3t, a3c: winkel <= 30 ? 3 * d : Math.max(a3t * s, 3 * d), a4t, a4c: 3 * d }
}

/**
 * Mindestholzdicke, ab der Nägel ohne Vorbohren eingeschlagen werden dürfen
 * (EN 1995-1-1, 8.3.1.2 (6) und (7)). Dünneres Holz ist vorzubohren.
 * spaltempfindlich: z. B. Tanne und Douglasie nach der Anmerkung zu (7).
 */
export function mindestholzdicke(durchmesser: number, rohdichte: number, spaltempfindlich: boolean): number {
  pruefe(durchmesser > 0 && durchmesser <= 8, 'Durchmesser: bis 8 mm (Nägel) bzw. 6 mm (Schrauben).')
  pruefe(rohdichte > 0 && rohdichte <= 1200, 'Rohdichte: bis 1200 kg/m³.')
  const d = durchmesser
  return spaltempfindlich ? Math.max(14 * d, ((13 * d - 30) * rohdichte) / 200) : Math.max(7 * d, ((13 * d - 30) * rohdichte) / 400)
}
