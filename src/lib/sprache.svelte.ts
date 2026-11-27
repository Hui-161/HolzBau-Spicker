import { EN } from './en'
import { zustand } from './zustand.svelte'

/**
 * Übersetzung: Deutsch ist die Quellsprache, der deutsche Text ist der Schlüssel.
 * Fehlt eine Übersetzung, bleibt der deutsche Text stehen und landet in `fehlend`.
 */
export const fehlend = new Set<string>()

export function t(text: string): string {
  if (zustand.sprache === 'de') return text
  const u = EN[text]
  if (u === undefined) {
    fehlend.add(text)
    return text
  }
  return u
}

/** Beschriftungen in statischen Skizzen übersetzen (<text …>Inhalt</text>). */
export const tSkizze = (svg: string): string => svg.replace(/(<text[^>]*>)([^<]+)(<\/text>)/g, (_, a: string, inhalt: string, z: string) => a + t(inhalt) + z)

// für die Vollständigkeitsprüfung der Übersetzung im Browsertest
;(globalThis as Record<string, unknown>).__fehlend = fehlend
