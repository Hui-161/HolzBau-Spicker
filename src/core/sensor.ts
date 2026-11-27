import { atan2 } from './trig'

/**
 * Neigung aus dem Schwerkraftvektor des Handys (Geräteachsen: x nach rechts, y nach oben, z aus dem Bildschirm).
 * - auf einer Kante stehend: Drehung um die Bildschirmachse, auf die nächste Kante bezogen (−45° … +45°)
 * - flach aufgelegt: Winkel zwischen Bildschirm und Waagerechter (0° … 45°)
 */
export function neigungAusSchwerkraft(x: number, y: number, z: number): { winkel: number; lage: 'kante' | 'flach' } | undefined {
  const betrag = Math.hypot(x, y, z)
  if (!(betrag > 1)) return undefined
  if (Math.abs(z) > 0.75 * betrag) {
    return { winkel: atan2(Math.hypot(x, y), Math.abs(z)), lage: 'flach' }
  }
  const roll = atan2(x, y)
  // auf die nächste der vier Kanten falten
  const winkel = roll - 90 * Math.round(roll / 90)
  return { winkel, lage: 'kante' }
}
