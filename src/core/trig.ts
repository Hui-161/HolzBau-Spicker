/** Winkelfunktionen in Grad – Zimmerer rechnen in Grad, nicht in Bogenmaß. */
const RAD = Math.PI / 180

export const sin = (deg: number): number => Math.sin(deg * RAD)
export const cos = (deg: number): number => Math.cos(deg * RAD)
export const tan = (deg: number): number => Math.tan(deg * RAD)
export const asin = (x: number): number => Math.asin(x) / RAD
export const acos = (x: number): number => Math.acos(x) / RAD
export const atan = (x: number): number => Math.atan(x) / RAD
export const atan2 = (y: number, x: number): number => Math.atan2(y, x) / RAD

/** Fehler mit Text, der dem Nutzer direkt angezeigt wird. */
export class EingabeFehler extends Error {}

export function pruefe(bedingung: boolean, text: string): asserts bedingung {
  if (!bedingung) throw new EingabeFehler(text)
}

export function pruefeNeigung(grad: number, name = 'Dachneigung'): void {
  pruefe(grad > 0 && grad < 90, `${name} muss zwischen 0° und 90° liegen.`)
}
