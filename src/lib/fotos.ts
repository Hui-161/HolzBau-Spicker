import type { Bild } from './pdf'

/**
 * Fotos als Notiz im Projekt. Sie liegen in der IndexedDB des Browsers, weil der einfache
 * Speicher (localStorage) dafür zu klein ist. Wie alles andere bleiben sie auf dem Gerät.
 */
export interface ProjektFoto extends Bild {
  id: number
  projekt: string
  titel: string
}

export const MAX_FOTOS_JE_PROJEKT = 24
/** Gesamtgrenze über alle Projekte – so groß, dass eine Sicherung noch eingespielt werden kann */
export const MAX_FOTOS_GESAMT = 200
export const MAX_ZEICHEN_JE_FOTO = 1_500_000

let offen: Promise<IDBDatabase> | undefined

function db(): Promise<IDBDatabase> {
  offen ??= new Promise((ja, nein) => {
    const anfrage = indexedDB.open('holzbau-fotos', 1)
    anfrage.onupgradeneeded = () => {
      const lager = anfrage.result.createObjectStore('fotos', { keyPath: 'id', autoIncrement: true })
      lager.createIndex('projekt', 'projekt')
    }
    anfrage.onsuccess = () => ja(anfrage.result)
    anfrage.onerror = () => {
      offen = undefined
      nein(anfrage.error ?? new Error('IndexedDB nicht verfügbar'))
    }
  })
  return offen
}

/** Führt eine Anfrage im Lager aus und wartet, bis die Transaktion abgeschlossen ist. */
async function lager<T>(modus: IDBTransactionMode, tun: (l: IDBObjectStore) => IDBRequest<T> | undefined): Promise<T | undefined> {
  const d = await db()
  return new Promise((ja, nein) => {
    const tx = d.transaction('fotos', modus)
    const anfrage = tun(tx.objectStore('fotos'))
    tx.oncomplete = () => ja(anfrage?.result)
    tx.onerror = () => nein(tx.error ?? new Error('Speichern fehlgeschlagen'))
    tx.onabort = () => nein(tx.error ?? new Error('Speichern abgebrochen'))
  })
}

export async function fotosVon(projekt: string): Promise<ProjektFoto[]> {
  return ((await lager('readonly', (l) => l.index('projekt').getAll(projekt))) as ProjektFoto[] | undefined) ?? []
}

export async function alleFotos(): Promise<ProjektFoto[]> {
  return ((await lager('readonly', (l) => l.getAll())) as ProjektFoto[] | undefined) ?? []
}

export async function anzahlFotos(): Promise<number> {
  return ((await lager('readonly', (l) => l.count())) as number | undefined) ?? 0
}

export async function fotoDazu(projekt: string, bild: Bild): Promise<ProjektFoto> {
  if (bild.daten.length > MAX_ZEICHEN_JE_FOTO) throw new Error('Foto zu groß')
  const neu = { projekt, titel: '', daten: bild.daten, breite: bild.breite, hoehe: bild.hoehe }
  const id = (await lager('readwrite', (l) => l.add(neu))) as number
  return { ...neu, id }
}

export async function fotoAendern(foto: ProjektFoto): Promise<void> {
  await lager('readwrite', (l) => l.put({ id: foto.id, projekt: foto.projekt, titel: foto.titel.slice(0, 120), daten: foto.daten, breite: foto.breite, hoehe: foto.hoehe }))
}

export async function fotoWeg(id: number): Promise<void> {
  await lager('readwrite', (l) => l.delete(id))
}

export async function fotosWegVon(projekt: string): Promise<void> {
  for (const f of await fotosVon(projekt)) await fotoWeg(f.id)
}

/** Prüft Fotos aus einer Sicherungsdatei: nur JPEG-Daten, nur für vorhandene Projekte, begrenzte Größe. */
export function pruefeFotos(roh: unknown, projekte: Set<string>): Omit<ProjektFoto, 'id'>[] {
  if (!Array.isArray(roh)) return []
  const gut: Omit<ProjektFoto, 'id'>[] = []
  for (const x of roh.slice(0, MAX_FOTOS_GESAMT)) {
    if (typeof x !== 'object' || x === null) continue
    const f = x as Record<string, unknown>
    if (typeof f.projekt !== 'string' || !projekte.has(f.projekt)) continue
    if (typeof f.daten !== 'string' || !f.daten.startsWith('data:image/jpeg;base64,') || f.daten.length > MAX_ZEICHEN_JE_FOTO) continue
    // Maße eines verkleinerten Fotos; alles andere ließe den Projektbericht scheitern
    if (typeof f.breite !== 'number' || typeof f.hoehe !== 'number' || !(f.breite >= 1 && f.breite <= 10000) || !(f.hoehe >= 1 && f.hoehe <= 10000)) continue
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(f.daten.slice(23))) continue
    if (gut.filter((g) => g.projekt === f.projekt).length >= MAX_FOTOS_JE_PROJEKT) continue
    gut.push({ projekt: f.projekt, daten: f.daten, breite: f.breite, hoehe: f.hoehe, titel: typeof f.titel === 'string' ? f.titel.slice(0, 120) : '' })
  }
  return gut
}

/** Ersetzt alle gespeicherten Fotos (beim Einspielen einer Sicherung). */
export async function ersetzeFotos(fotos: Omit<ProjektFoto, 'id'>[]): Promise<void> {
  await lager('readwrite', (l) => l.clear())
  for (const f of fotos) await lager('readwrite', (l) => l.add(f))
}
