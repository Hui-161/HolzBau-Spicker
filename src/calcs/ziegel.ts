/**
 * Decklängen ausgewählter Dachziegel und Dachsteine, in cm.
 * Quelle sind Produktdatenblätter und Verlegeanleitungen der Hersteller (abgerufen 11/2026).
 * Die Werte sind Richtwerte: Hersteller ändern Modelle, und die Decklänge ist an der gelieferten
 * Ware auszumitteln. Produktnamen dienen nur der Zuordnung.
 */
export interface Ziegel {
  id: string
  name: string
  /** kleinste und größte Decklänge in cm */
  min: number
  max: number
  /** Regeldachneigung in Grad: darunter verlangt der Hersteller Zusatzmaßnahmen */
  regel?: number
  /** kleinere größte Decklänge bei flacher Neigung: gilt bis einschließlich „bis“ Grad */
  stufen?: { bis: number; max: number }[]
}

/** Größte Decklänge in cm bei der angegebenen Dachneigung */
export function maxBeiNeigung(z: Ziegel, neigung: number): number {
  const stufe = [...(z.stufen ?? [])].sort((a, b) => a.bis - b.bis).find((s) => neigung <= s.bis)
  return stufe ? Math.min(stufe.max, z.max) : z.max
}

export const ZIEGEL: Ziegel[] = [
  { id: 'braas-frankfurter', name: 'Braas Frankfurter Pfanne', min: 31.2, max: 34.5, regel: 22 },
  { id: 'braas-tegalit', name: 'Braas Tegalit', min: 31.2, max: 34.0, regel: 25 },
  { id: 'braas-rubin13v', name: 'Braas Rubin 13V', min: 33.0, max: 36.0, regel: 16 },
  { id: 'creaton-futura', name: 'Creaton Futura', min: 36.0, max: 38.8 },
  { id: 'erlus-e58sl', name: 'Erlus E 58 SL', min: 32.5, max: 35.5 },
  { id: 'jacobi-j11v', name: 'Jacobi J11v (30,4 × 44,5 cm)', min: 33.3, max: 36.5 },
  { id: 'nelskamp-f12sued', name: 'Nelskamp F 12 Ü Süd', min: 32.7, max: 36.3 },
  // laut Prospekt: über 30° bis 34,5 cm, bei 22–30° nur bis 33,5 cm
  { id: 'nelskamp-finkenberger', name: 'Nelskamp Finkenberger Pfanne', min: 31.4, max: 34.5, regel: 22, stufen: [{ bis: 30, max: 33.5 }] },
]

/**
 * Vom Nutzer gespeicherte Ziegel (z. B. aus einem Datenblatt gelesen). Die Liste wird vom
 * Zustand der App befüllt; die Rechner-Definition liest sie beim Anzeigen.
 */
let eigene: Ziegel[] = []
export const eigeneZiegel = (): Ziegel[] => eigene
export function setzeEigeneZiegel(liste: Ziegel[]): void {
  eigene = liste
}
/** hinterlegte und eigene Ziegel zusammen; eigene zuerst */
export const alleZiegel = (): Ziegel[] => [...eigene, ...ZIEGEL]
