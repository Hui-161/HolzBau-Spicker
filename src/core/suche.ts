/**
 * Schlagwortsuche: findet Funktionen über Titel, Beschreibung und Schlagworte –
 * unabhängig von Groß-/Kleinschreibung, Umlaut-Schreibweise und kleinen Tippfehlern.
 */

export interface Suchbar {
  id: string
  /** Titel in allen Sprachen */
  titel: string[]
  /** Beschreibung, Gruppe usw. */
  text: string[]
  stichworte: string[]
}

export interface Treffer {
  id: string
  /** Schlagwort, über das gefunden wurde, wenn der Titel selbst nicht passt */
  ueber?: string
}

/** „Maß“, „Mass“ und „MASS“ ergeben dasselbe; ebenso „Länge“ und „Laenge“. */
export function normiere(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9²³:]+/g, ' ')
    .trim()
}

/** Editierabstand, abgebrochen sobald er die Grenze überschreitet. */
function abstand(a: string, b: string, grenze: number): number {
  if (Math.abs(a.length - b.length) > grenze) return grenze + 1
  let zeile = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const neu = [i]
    let klein = i
    for (let j = 1; j <= b.length; j++) {
      neu[j] = Math.min(zeile[j] + 1, neu[j - 1] + 1, zeile[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      klein = Math.min(klein, neu[j])
    }
    if (klein > grenze) return grenze + 1
    zeile = neu
  }
  return zeile[b.length]
}

/** Erlaubte Tippfehler je nach Wortlänge: kurze Wörter müssen genau passen. */
const toleranz = (wort: string): number => (wort.length >= 8 ? 2 : wort.length >= 5 ? 1 : 0)

/** 0 = kein Treffer, 3 = Wortanfang, 2 = im Wort, 1 = mit Tippfehler */
function passt(suchwort: string, text: string): number {
  if (text.includes(suchwort)) return text.split(' ').some((w) => w.startsWith(suchwort)) ? 3 : 2
  const tol = toleranz(suchwort)
  if (tol === 0) return 0
  // Tippfehler: gegen den Anfang jedes Wortes vergleichen, damit auch unvollständige Eingaben passen
  for (const w of text.split(' ')) {
    for (const l of [suchwort.length - 1, suchwort.length, suchwort.length + 1]) {
      if (l > 0 && l <= w.length && abstand(suchwort, w.slice(0, l), tol) <= tol) return 1
    }
  }
  return 0
}

export function suche(anfrage: string, eintraege: Suchbar[]): Treffer[] {
  const woerter = normiere(anfrage).split(' ').filter((w) => w !== '')
  if (woerter.length === 0) return eintraege.map((e) => ({ id: e.id }))
  const gefunden: { treffer: Treffer; wert: number; platz: number }[] = []
  eintraege.forEach((e, platz) => {
    const titel = e.titel.map(normiere)
    const text = e.text.map(normiere).join(' ')
    const stich = e.stichworte.map(normiere)
    let wert = 0
    let ueber: string | undefined
    for (const w of woerter) {
      const imTitel = Math.max(...titel.map((t) => passt(w, t)))
      const imStichwort = stich.map((s) => passt(w, s))
      const besterStich = Math.max(0, ...imStichwort)
      const imText = passt(w, text)
      const bester = Math.max(imTitel, besterStich, imText)
      // jedes Suchwort muss irgendwo vorkommen
      if (bester === 0) return
      // Titel zählt am meisten, dann Schlagwort, dann Beschreibung
      wert += imTitel > 0 ? 20 + imTitel : besterStich > 0 ? 10 + besterStich : imText
      if (imTitel === 0 && besterStich > 0 && !ueber) ueber = e.stichworte[imStichwort.indexOf(besterStich)]
    }
    gefunden.push({ treffer: { id: e.id, ueber }, wert, platz })
  })
  return gefunden.sort((a, b) => b.wert - a.wert || a.platz - b.platz).map((g) => g.treffer)
}
