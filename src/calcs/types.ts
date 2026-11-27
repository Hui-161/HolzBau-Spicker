/**
 * Ein Rechner wird vollständig durch Daten beschrieben: Felder + compute().
 * Die Oberfläche (CalcView) ist für alle Rechner dieselbe.
 */

/** len = Länge in der gewählten Einheit · area = Fläche dazu · ang = Grad */
/** wort = fester Text, der übersetzt wird; text = Eingabe des Nutzers, bleibt wie sie ist */
export type Art = 'len' | 'area' | 'ang' | 'num' | 'int' | 'text' | 'wort'

export interface Feld {
  id: string
  label: string
  /** liste = mehrzeiliger Text, z. B. eine Stückliste */
  art: 'len' | 'ang' | 'num' | 'int' | 'select' | 'liste'
  /** feste Einheit (überschreibt die globale Längeneinheit in der Anzeige) */
  einheit?: string
  vorgabe?: number | string
  optionen?: { wert: string; label: string }[]
  optional?: boolean
  hinweis?: string
  /** Feld nur anzeigen, wenn die Bedingung erfüllt ist */
  wenn?: (w: Werte) => boolean
}

/** Zahlenfelder liefern number (leer = NaN), Auswahl- und Listenfelder string */
export type Werte = Record<string, number | string>

export interface Ausgabe {
  label: string
  wert: number | string
  art: Art
  einheit?: string
  wichtig?: boolean
  stellen?: number
}

export interface Liste {
  titel: string
  kopf: string[]
  arten: Art[]
  /** Zelle als Zahl, Text oder Zahlenreihe (wird mit „+“ verbunden) */
  zeilen: (number | string | number[])[][]
}

/** Maßzahl in einer Zeichnung: Position in Zeichnungskoordinaten, formatiert wird in der Anzeige. */
export interface Mass {
  x: number
  y: number
  wert: number
  art: 'len' | 'ang' | 'int'
  /** Drehung in Grad um die Position (Schrift parallel zur Strecke) */
  drehung?: number
  anker?: 'start' | 'middle' | 'end'
  /** fester Vorsatz wie „Ø “ oder „a = “ */
  vor?: string
  /** Bezeichnung, wird übersetzt (z. B. „Achsmaß“) */
  name?: string
  /** Beschriftung statt einer Zahl, wird übersetzt (z. B. „Fußpfette“) */
  text?: string
  /** deckend hinterlegen, wenn die Zahl über Linien liegt */
  hinterlegt?: boolean
  /** kleinere Schrift für Nummern */
  klein?: boolean
}

export interface Zeichnung {
  breite: number
  hoehe: number
  /** SVG-Inhalt, nutzt currentColor */
  inhalt: string
  masse?: Mass[]
}

export interface Ergebnis {
  ausgaben: Ausgabe[]
  /** maßstäbliche Zeichnung zum Ergebnis */
  zeichnung?: Zeichnung
  /** weitere Zeichnungen, z. B. vergrößerte Details */
  details?: { titel: string; zeichnung: Zeichnung }[]
  liste?: Liste
  /** weitere Listen unter der ersten */
  listen?: Liste[]
  hinweise?: string[]
}

export interface Kontext {
  /** Wie viele Einheiten der gewählten Längeneinheit ergeben 1 cm */
  jeCm: number
}

export interface Rechner {
  id: string
  titel: string
  gruppe: string
  kurz: string
  /** Erklärung unter dem Rechner */
  info?: string
  /** Inline-SVG (viewBox 0 0 240 120), nutzt currentColor */
  skizze?: string
  /** eigene Ansicht statt Felder + Ergebnis (z. B. Sensor) */
  /** 'dokument' = Vorlage aus core/dokumente.ts mit derselben ID */
  eigen?: 'neigungsmesser' | 'dokument'
  felder: Feld[]
  rechne: (w: Werte, k: Kontext) => Ergebnis
}

export const zahl = (w: Werte, id: string): number => w[id] as number
export const opt = (w: Werte, id: string): number | undefined => {
  const x = w[id] as number
  return Number.isFinite(x) ? x : undefined
}
