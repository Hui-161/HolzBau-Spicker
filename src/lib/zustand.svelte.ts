import type { Art } from '../calcs/types'

/** Alles bleibt auf dem Gerät (localStorage) – es werden keine Daten übertragen. */

export type Einheit = 'm' | 'cm' | 'mm'
export type Sprache = 'de' | 'en'
type Eingaben = Record<string, Record<string, string>>

/** Angaben, die in jeder Dokumentvorlage dieses Projekts vorbelegt werden */
export interface Projektdaten {
  bauvorhaben: string
  empfaenger: string
  auftrag: string
}

/** Angaben des eigenen Betriebs, einmal hinterlegt und in allen Dokumentvorlagen vorbelegt */
export interface Stammdaten {
  absender: string
  ort: string
  unterzeichner: string
}

export interface Projekt {
  id: string
  name: string
  notiz: string
  daten: Projektdaten
  /** Eingaben je Rechner-ID */
  eingaben: Eingaben
}

interface Gespeichert {
  einheit: Einheit
  sprache: Sprache
  /** zuletzt geöffnete Funktionen in der Reihenfolge des ersten Öffnens – für die Menüleiste */
  zuletzt: string[]
  stammdaten: Stammdaten
  favoriten: string[]
  projekte: Projekt[]
  aktiv: string
}

const SCHLUESSEL = 'holzbau.v1'
const MAX_TEXT = 20000

const neueId = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
const istObjekt = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

const text = (x: unknown, max: number): string => (typeof x === 'string' ? x.slice(0, max) : '')

/** Fremde Daten (Speicher, Import-Link) nur in geprüfter Form übernehmen. */
function pruefeProjekt(x: unknown): Projekt | undefined {
  if (!istObjekt(x) || typeof x.name !== 'string') return undefined
  const eingaben: Eingaben = {}
  if (istObjekt(x.eingaben)) {
    for (const [rechner, felder] of Object.entries(x.eingaben).slice(0, 100)) {
      if (!istObjekt(felder)) continue
      const sauber: Record<string, string> = {}
      for (const [feld, wert] of Object.entries(felder).slice(0, 50)) if (typeof wert === 'string') // Tabellen der Dokumentvorlagen liegen als JSON in einem Feld und brauchen mehr Platz
        sauber[feld.slice(0, 40)] = wert.slice(0, 60000)
      eingaben[rechner.slice(0, 40)] = sauber
    }
  }
  return {
    id: typeof x.id === 'string' && /^[a-z0-9]{1,24}$/.test(x.id) ? x.id : neueId(),
    name: x.name.trim().slice(0, 60) || 'Projekt',
    notiz: typeof x.notiz === 'string' ? x.notiz.slice(0, MAX_TEXT) : '',
    daten: istObjekt(x.daten) ? { bauvorhaben: text(x.daten.bauvorhaben, 200), empfaenger: text(x.daten.empfaenger, 500), auftrag: text(x.daten.auftrag, 200) } : { bauvorhaben: '', empfaenger: '', auftrag: '' },
    eingaben,
  }
}

/** Macht aus beliebigen Daten (Speicher, Sicherungsdatei) einen gültigen Stand. */
function pruefeStand(d: Record<string, unknown>): Gespeichert {
  const projekte = (Array.isArray(d.projekte) ? d.projekte : [])
    .slice(0, 500)
    .map(pruefeProjekt)
    .filter((p): p is Projekt => !!p)
  // doppelte IDs würden Projekte aneinander koppeln
  const gesehen = new Set<string>()
  for (const p of projekte) {
    if (gesehen.has(p.id)) p.id = neueId()
    gesehen.add(p.id)
  }
  if (projekte.length === 0) projekte.push({ id: neueId(), name: 'Allgemein', notiz: '', daten: { bauvorhaben: '', empfaenger: '', auftrag: '' }, eingaben: {} })
  const st = istObjekt(d.stammdaten) ? d.stammdaten : {}
  return {
    stammdaten: { absender: text(st.absender, 500), ort: text(st.ort, 100), unterzeichner: text(st.unterzeichner, 100) },
    einheit: d.einheit === 'm' || d.einheit === 'mm' ? d.einheit : 'cm',
    // ohne gespeicherte Wahl: Sprache des Geräts, sonst Englisch
    sprache: d.sprache === 'de' || d.sprache === 'en' ? d.sprache : (globalThis.navigator?.language ?? 'de').toLowerCase().startsWith('de') ? 'de' : 'en',
    favoriten: Array.isArray(d.favoriten) ? d.favoriten.filter((x): x is string => typeof x === 'string').slice(0, 200) : [],
    zuletzt: Array.isArray(d.zuletzt) ? d.zuletzt.filter((x): x is string => typeof x === 'string').slice(0, 8) : [],
    projekte,
    aktiv: projekte.some((p) => p.id === d.aktiv) ? (d.aktiv as string) : projekte[0].id,
  }
}

function lade(): Gespeichert {
  let d: Record<string, unknown> = {}
  try {
    const roh: unknown = JSON.parse(localStorage.getItem(SCHLUESSEL) ?? '{}')
    if (istObjekt(roh)) d = roh
  } catch {
    // unlesbarer Speicher → mit leerem Stand starten
  }
  return pruefeStand(d)
}

export const zustand = $state<Gespeichert>(lade())

export function sichere(): void {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(zustand))
  } catch {
    // privater Modus o. Ä.: App läuft ohne Speichern weiter
  }
}

/* ---------- Sicherung ---------- */

const KENNUNG = 'holzbau-spicker'

/** Alle Daten als Text für eine Sicherungsdatei. */
/** fotos: die Projektfotos aus der IndexedDB, sie werden mitgesichert */
export const sicherung = (fotos: unknown[] = []): string => JSON.stringify({ kennung: KENNUNG, stand: 1, daten: $state.snapshot(zustand), fotos })

/**
 * Ersetzt alle Daten durch den Inhalt einer Sicherungsdatei.
 * Liefert die (ungeprüften) Fotos der Sicherung oder false, wenn es keine gültige Sicherung ist.
 */
export function stelleWiederHer(text: string): unknown[] | false {
  try {
    // 200 Fotos zu je höchstens 1,5 Mio. Zeichen und die übrigen Daten
    if (text.length > 320_000_000) return false
    const roh: unknown = JSON.parse(text)
    if (!istObjekt(roh) || roh.kennung !== KENNUNG || !istObjekt(roh.daten) || !Array.isArray(roh.daten.projekte)) return false
    Object.assign(zustand, pruefeStand(roh.daten))
    sichere()
    return Array.isArray(roh.fotos) ? roh.fotos : []
  } catch {
    return false
  }
}

export const aktivesProjekt = (): Projekt => zustand.projekte.find((p) => p.id === zustand.aktiv) ?? zustand.projekte[0]

export function schalteFavorit(id: string): void {
  zustand.favoriten = zustand.favoriten.includes(id) ? zustand.favoriten.filter((x) => x !== id) : [...zustand.favoriten, id]
  sichere()
}

/* ---------- Projekte ---------- */

export function neuesProjekt(name: string, vorlage?: Projekt): Projekt {
  const p: Projekt = { id: neueId(), name: name.trim().slice(0, 60) || 'Projekt', notiz: vorlage?.notiz ?? '', daten: { bauvorhaben: '', empfaenger: '', auftrag: '', ...$state.snapshot(vorlage?.daten ?? {}) }, eingaben: structuredClone($state.snapshot(vorlage?.eingaben ?? {})) }
  zustand.projekte.push(p)
  zustand.aktiv = p.id
  sichere()
  return p
}

export function loescheProjekt(id: string): void {
  if (zustand.projekte.length <= 1) return
  zustand.projekte = zustand.projekte.filter((p) => p.id !== id)
  if (zustand.aktiv === id) zustand.aktiv = zustand.projekte[0].id
  sichere()
}

/* ---------- Teilen ---------- */

const zuBase64 = (bytes: Uint8Array): string => {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const vonBase64 = (text: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

async function durchStrom(bytes: Uint8Array<ArrayBuffer>, strom: CompressionStream | DecompressionStream, grenze: number): Promise<Uint8Array<ArrayBuffer>> {
  const leser = new Blob([bytes]).stream().pipeThrough(strom).getReader()
  const teile: Uint8Array[] = []
  let laenge = 0
  for (;;) {
    const { done, value } = await leser.read()
    if (done) break
    laenge += value.length
    // Schutz vor präparierten Links, die sich riesig entpacken
    if (laenge > grenze) throw new Error('zu groß')
    teile.push(value)
  }
  const alles = new Uint8Array(laenge)
  let pos = 0
  for (const t of teile) {
    alles.set(t, pos)
    pos += t.length
  }
  return alles
}

const MAX_ENTPACKT = 400000

/**
 * Projekt als Text für Teilen-Link und QR-Code. Leere Felder werden weggelassen und die Daten
 * komprimiert, damit der QR-Code lesbar bleibt. Der Text steht im #-Teil des Links und wird
 * deshalb nie an einen Server gesendet.
 */
export async function verpacke(p: Projekt): Promise<string> {
  const eingaben: Eingaben = {}
  for (const [rechner, felder] of Object.entries(p.eingaben)) {
    const belegt = Object.entries(felder).filter(([, v]) => v !== '')
    if (belegt.length) eingaben[rechner] = Object.fromEntries(belegt)
  }
  const bytes = new TextEncoder().encode(JSON.stringify({ name: p.name, notiz: p.notiz, daten: p.daten, eingaben }))
  if (typeof CompressionStream === 'undefined') return zuBase64(bytes)
  return 'z.' + zuBase64(await durchStrom(bytes, new CompressionStream('deflate-raw'), MAX_ENTPACKT))
}

export async function entpacke(text: string): Promise<Projekt | undefined> {
  try {
    if (text.length > 200000) return undefined
    const bytes = text.startsWith('z.') ? await durchStrom(vonBase64(text.slice(2)), new DecompressionStream('deflate-raw'), MAX_ENTPACKT) : vonBase64(text)
    const p = pruefeProjekt(JSON.parse(new TextDecoder().decode(bytes)))
    return p ? { ...p, id: neueId() } : undefined
  } catch {
    return undefined
  }
}

/* ---------- Zahlen ---------- */

const STELLEN: Record<Einheit, number> = { m: 3, cm: 1, mm: 0 }
export const JE_CM: Record<Einheit, number> = { m: 0.01, cm: 1, mm: 10 }

/** Eingabe mit Komma oder Punkt; leer/ungültig → NaN */
export function leseZahl(text: string): number {
  const t = text.trim().replace(/\s/g, '').replace(',', '.')
  if (t === '' || !/^-?\d*\.?\d*$/.test(t)) return NaN
  return Number.parseFloat(t)
}

export function einheitVon(art: Art | 'select' | 'liste', fest?: string): string {
  if (fest) return fest
  if (art === 'len') return zustand.einheit
  if (art === 'area') return zustand.einheit + '²'
  if (art === 'ang') return '°'
  return ''
}

export function formatiere(wert: number | string | number[], art: Art, stellen?: number): string {
  if (typeof wert === 'string') return wert
  if (Array.isArray(wert)) return wert.map((x) => formatiere(x, 'len')).join(' + ')
  if (!Number.isFinite(wert)) return '–'
  const n = stellen ?? (art === 'len' || art === 'area' ? STELLEN[zustand.einheit] : art === 'ang' ? 2 : art === 'int' ? 0 : 3)
  const fest = art === 'len' || art === 'area' || art === 'ang' || stellen !== undefined
  // -0 vermeiden
  const v = Math.abs(wert) < 0.5 * 10 ** -n ? 0 : wert
  // ohne Tausendertrennung: „1.234“ wäre auf der Baustelle missverständlich
  return v.toLocaleString(zustand.sprache === 'de' ? 'de-DE' : 'en-GB', { minimumFractionDigits: fest ? n : 0, maximumFractionDigits: n, useGrouping: false })
}
