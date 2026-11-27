/**
 * Werkzeuge, mit denen ein KI-Modell die Rechner bedient. Das Modell rechnet nicht selbst:
 * es wählt einen Rechner und nennt die Eingaben, gerechnet wird vom Rechenkern der App.
 * Diese Datei kennt das Modell nicht – sie prüft nur, was hereinkommt, und liefert Text zurück.
 */
import { RECHNER, rechnerNachId } from '../calcs'
import type { Feld, Rechner } from '../calcs/types'
import { EingabeFehler } from '../core/trig'
import { werteAus } from './werte'
import { einheitVon, formatiere, JE_CM, zustand } from './zustand.svelte'

/** Eingaben, die das Modell für einen Rechner vorschlägt; übernommen wird erst nach Bestätigung */
export interface Vorschlag {
  rechner: string
  titel: string
  werte: Record<string, string>
}

export interface WerkzeugAntwort {
  text: string
  fehler: boolean
  vorschlag?: Vorschlag
}

/** Rechner, die sich über Felder bedienen lassen (ohne Sensor und Dokumentvorlagen) */
const bedienbar = (): Rechner[] => RECHNER.filter((r) => !r.eigen)

const feldZeile = (f: Feld): string => {
  const art = f.art === 'len' ? `Länge in ${zustand.einheit}` : f.art === 'ang' ? 'Winkel in Grad' : f.art === 'int' ? 'ganze Zahl' : f.art === 'num' ? `Zahl${f.einheit ? ` in ${f.einheit}` : ''}` : f.art === 'liste' ? 'mehrzeiliger Text' : `Auswahl: ${(f.optionen ?? []).map((o) => `${o.wert} = ${o.label}`).join('; ')}`
  return `  - ${f.id}: ${f.label} (${art}${f.optional ? ', freiwillig' : ''}${f.vorgabe !== undefined ? `, Vorgabe ${f.vorgabe}` : ''})${f.hinweis ? ` – ${f.hinweis}` : ''}`
}

/** Verzeichnis aller Rechner mit ihren Feldern, als Text für die Systemanweisung */
export function rechnerKatalog(): string {
  return bedienbar()
    .map((r) => `${r.id} – ${r.titel}${r.kurz ? `: ${r.kurz}` : ''}\n${r.felder.map(feldZeile).join('\n')}`)
    .join('\n\n')
}

const istObjekt = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

/** Zahl oder Text aus dem Modell → Text, wie er in einem Eingabefeld stünde (mit Punkt als Dezimalzeichen) */
const alsText = (x: unknown): string | undefined => (typeof x === 'number' && Number.isFinite(x) ? String(x) : typeof x === 'string' ? x.trim().slice(0, 2000) : undefined)

/**
 * Werkzeug „rechne“: prüft Rechner und Felder, rechnet und liefert die Ergebnisse als Text.
 * Bei Erfolg entsteht ein Vorschlag, den der Nutzer in den Rechner übernehmen kann.
 */
export function werkzeugRechne(eingabe: unknown): WerkzeugAntwort {
  if (!istObjekt(eingabe) || typeof eingabe.rechner !== 'string') return { text: 'Eingabe unvollständig: „rechner“ fehlt.', fehler: true }
  const r = rechnerNachId(eingabe.rechner)
  if (!r || r.eigen) return { text: `Unbekannter Rechner „${eingabe.rechner}“. Erlaubt: ${bedienbar().map((x) => x.id).join(', ')}.`, fehler: true }
  if (!istObjekt(eingabe.werte)) return { text: '„werte“ muss ein Objekt aus Feldkennung und Wert sein.', fehler: true }
  const roh: Record<string, string> = {}
  for (const [id, wert] of Object.entries(eingabe.werte)) {
    const f = r.felder.find((x) => x.id === id)
    if (!f) return { text: `Der Rechner „${r.id}“ hat kein Feld „${id}“. Felder: ${r.felder.map((x) => x.id).join(', ')}.`, fehler: true }
    const text = alsText(wert)
    if (text === undefined) return { text: `Der Wert für „${id}“ ist weder Zahl noch Text.`, fehler: true }
    if (f.art === 'select' && !(f.optionen ?? []).some((o) => o.wert === text)) return { text: `„${text}“ ist für „${id}“ nicht wählbar. Möglich: ${(f.optionen ?? []).map((o) => o.wert).join(', ')}.`, fehler: true }
    roh[id] = text
  }
  const werte = werteAus(r, roh)
  const fehlend = r.felder.filter((f) => {
    if (f.wenn && !f.wenn(werte)) return false
    const w = werte[f.id]
    const leer = typeof w === 'number' ? Number.isNaN(w) : w.trim() === ''
    const unlesbar = typeof w === 'number' && Number.isNaN(w) && (roh[f.id] ?? '').trim() !== ''
    return unlesbar || (leer && !f.optional)
  })
  if (fehlend.length > 0) return { text: `Es fehlen oder sind unlesbar: ${fehlend.map((f) => `${f.id} (${f.label})`).join(', ')}. Frage den Nutzer danach, statt Werte zu schätzen.`, fehler: true }
  try {
    const e = r.rechne(werte, { jeCm: JE_CM[zustand.einheit] })
    const zeilen = e.ausgaben.map((a) => `${a.label}: ${formatiere(a.wert, a.art, a.stellen)} ${einheitVon(a.art, a.einheit)}`.trim())
    return {
      text: [`${r.titel} – Ergebnis des Rechenkerns:`, ...zeilen, ...(e.hinweise ?? []).map((h) => `Hinweis: ${h}`)].join('\n'),
      fehler: false,
      vorschlag: { rechner: r.id, titel: r.titel, werte: roh },
    }
  } catch (e) {
    return { text: e instanceof EingabeFehler ? `Mit diesen Werten nicht berechenbar: ${e.message}` : 'Mit diesen Werten ist keine Berechnung möglich.', fehler: true }
  }
}

/** Werkzeug „lies_eingaben“: die im aktuellen Projekt gespeicherten Eingaben eines Rechners */
export function werkzeugLies(eingabe: unknown, eingaben: Record<string, Record<string, string>>): WerkzeugAntwort {
  if (!istObjekt(eingabe) || typeof eingabe.rechner !== 'string') return { text: 'Eingabe unvollständig: „rechner“ fehlt.', fehler: true }
  const r = rechnerNachId(eingabe.rechner)
  if (!r || r.eigen) return { text: `Unbekannter Rechner „${eingabe.rechner}“.`, fehler: true }
  const gespeichert = Object.entries(eingaben[r.id] ?? {}).filter(([id, wert]) => wert.trim() !== '' && r.felder.some((f) => f.id === id))
  if (gespeichert.length === 0) return { text: `Für „${r.titel}“ sind in diesem Projekt keine Eingaben gespeichert.`, fehler: false }
  return { text: [`Gespeicherte Eingaben für „${r.titel}“ (Längen in ${zustand.einheit}):`, ...gespeichert.map(([id, wert]) => `${id} = ${wert}`)].join('\n'), fehler: false }
}

/** Aus einem Datenblatt gelesene Ziegelmaße, in cm; geprüft, bevor sie angezeigt werden */
export interface Ziegelfund {
  name: string
  min: number
  max: number
  deckbreite?: number
  laf?: number
  fundstelle: string
  hinweis: string
}

const zahl = (x: unknown): number | undefined => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : undefined)

/** Antwort des Modells auf ein Datenblatt prüfen; undefined, wenn keine brauchbare Decklänge darin steht */
export function pruefeZiegelfund(x: unknown): Ziegelfund | undefined {
  if (!istObjekt(x)) return undefined
  const [min, max] = [zahl(x.decklaenge_min_cm), zahl(x.decklaenge_max_cm)]
  // Decklängen von Dachziegeln und -steinen liegen im Bereich einiger Dezimeter
  if (min === undefined || max === undefined || min > max || min < 5 || max > 150) return undefined
  const text = (y: unknown, lang: number): string => (typeof y === 'string' ? y.trim().slice(0, lang) : '')
  return {
    name: [text(x.hersteller, 40), text(x.modell, 60)].filter((s) => s !== '').join(' ') || 'Ziegel',
    min,
    max,
    deckbreite: zahl(x.deckbreite_cm),
    laf: zahl(x.laf_cm),
    fundstelle: text(x.fundstelle, 300),
    hinweis: text(x.hinweis, 300),
  }
}
