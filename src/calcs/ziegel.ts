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
}

export const ZIEGEL: Ziegel[] = [
  { id: 'braas-frankfurter', name: 'Braas Frankfurter Pfanne', min: 31.2, max: 34.5 },
  { id: 'braas-tegalit', name: 'Braas Tegalit', min: 31.2, max: 34.0 },
  { id: 'braas-rubin13v', name: 'Braas Rubin 13V', min: 33.0, max: 36.0 },
  { id: 'creaton-futura', name: 'Creaton Futura', min: 36.0, max: 38.8 },
  { id: 'erlus-e58sl', name: 'Erlus E 58 SL', min: 32.5, max: 35.5 },
  { id: 'jacobi-j11v', name: 'Jacobi J11v (30,4 × 44,5 cm)', min: 33.3, max: 36.5 },
  { id: 'nelskamp-f12sued', name: 'Nelskamp F 12 Ü Süd', min: 32.7, max: 36.3 },
  { id: 'nelskamp-finkenberger', name: 'Nelskamp Finkenberger Pfanne, über 30°', min: 31.4, max: 34.5 },
  { id: 'nelskamp-finkenberger-flach', name: 'Nelskamp Finkenberger Pfanne, 22–30°', min: 31.4, max: 33.5 },
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
