import type { Mass, Rechner, Werte, Zeichnung } from '../calcs/types'

/**
 * Zeichnung zum Eintragen, solange noch kein Ergebnis da ist: Die Form entsteht aus den schon
 * eingetragenen Werten, fehlende werden aus den Beispielwerten des Rechners ergänzt (Längen im
 * Verhältnis zu den eingetragenen). Angezeigt werden nur Werte, die der Nutzer eingetragen hat –
 * alle anderen Maße stehen als offen da, damit kein Beispielwert für ein Ergebnis gehalten wird.
 */
export function vorschauAus(rechner: Rechner, werte: Werte, jeCm: number): Zeichnung | undefined {
  const bsp = rechner.beispiel
  if (!bsp) return undefined
  const zahl = (id: string): number | undefined => {
    const w = werte[id]
    return typeof w === 'number' && Number.isFinite(w) ? w : undefined
  }
  const laengen = rechner.felder.filter((f) => f.art === 'len' && bsp[f.id] !== undefined && bsp[f.id] > 0)
  // Maßstab der Beispielwerte: Mittel der Verhältnisse aus den eingetragenen Längen
  const verhaeltnisse = laengen.flatMap((f) => {
    const w = zahl(f.id)
    return w !== undefined && w > 0 ? [w / (bsp[f.id] * jeCm)] : []
  })
  const faktor = verhaeltnisse.length > 0 ? verhaeltnisse.reduce((a, b) => a + b, 0) / verhaeltnisse.length : 1
  const ergaenzt = (mitEingaben: boolean, f: number): Werte =>
    Object.fromEntries(
      rechner.felder.map((feld) => {
        const eigen = mitEingaben ? zahl(feld.id) : undefined
        if (feld.art === 'select' || feld.art === 'liste') return [feld.id, werte[feld.id]]
        if (eigen !== undefined) return [feld.id, eigen]
        const b = bsp[feld.id]
        return [feld.id, b === undefined ? NaN : feld.art === 'len' ? b * jeCm * f : b]
      })
    )
  const zeichne = (w: Werte): Zeichnung | undefined => {
    try {
      return rechner.rechne(w, { jeCm }).zeichnung
    } catch {
      return undefined
    }
  }
  // erst mit den Eingaben; passen sie (noch) nicht zusammen, die reine Beispielform
  const z = zeichne(ergaenzt(true, faktor)) ?? zeichne(ergaenzt(false, 1))
  if (!z) return undefined
  const masse = (z.masse ?? []).flatMap((m): Mass[] => {
    if (m.text) return [m]
    const feld = m.feld ? rechner.felder.find((f) => f.id === m.feld) : undefined
    // berechnete Maße gibt es noch nicht: sie bleiben weg, bis ein Ergebnis da ist
    if (!feld) return []
    const eigen = zahl(feld.id)
    // leeres Feld: sein Name steht an der Stelle, an der das Maß eingetragen wird
    return [eigen !== undefined ? { ...m, wert: eigen, berechnet: false } : { ...m, wert: NaN, berechnet: true, platzhalter: feld.label, vor: undefined, name: undefined }]
  })
  return { ...z, masse }
}
