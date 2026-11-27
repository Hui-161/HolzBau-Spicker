import type { Ergebnis, Rechner, Werte } from '../calcs/types'
import { leseZahl } from './zustand.svelte'

/** Gespeicherte Eingaben (Text) → Werte für die Rechenfunktion; fehlende Felder bekommen ihre Vorgabe. */
export function werteAus(rechner: Rechner, roh: Record<string, string>): Werte {
  return Object.fromEntries(
    rechner.felder.map((f) => {
      const text = roh[f.id] ?? (f.vorgabe === undefined ? '' : String(f.vorgabe))
      return [f.id, f.art === 'select' || f.art === 'liste' ? text : leseZahl(text)]
    })
  )
}

/** Ergebnis aus gespeicherten Eingaben; undefined, wenn sie unvollständig oder nicht berechenbar sind. */
export function berechne(rechner: Rechner, roh: Record<string, string>, jeCm: number): Ergebnis | undefined {
  const werte = werteAus(rechner, roh)
  for (const f of rechner.felder) {
    if (f.wenn && !f.wenn(werte)) continue
    const w = werte[f.id]
    const leer = typeof w === 'number' ? Number.isNaN(w) : w.trim() === ''
    // wie im Rechner: ein freiwilliges Feld darf leer sein, aber nicht unlesbar ausgefüllt
    const unlesbar = typeof w === 'number' && Number.isNaN(w) && (roh[f.id] ?? '').trim() !== ''
    if (unlesbar || (leer && !f.optional)) return undefined
  }
  try {
    return rechner.rechne(werte, { jeCm })
  } catch {
    return undefined
  }
}
