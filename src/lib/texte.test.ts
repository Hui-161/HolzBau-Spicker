import { describe, expect, it } from 'vitest'
// @ts-expect-error – Hilfsskript ohne Typen
import { sammleTexte } from '../../scripts/texte.mjs'
import { EN } from './en'

describe('Übersetzung', () => {
  it('jeder sichtbare Text hat eine englische Fassung', () => {
    const texte: string[] = sammleTexte()
    expect(texte.length).toBeGreaterThan(300)
    expect(texte.filter((t) => EN[t] === undefined)).toEqual([])
  })
  it('enthält keine verwaisten Einträge', () => {
    const texte = new Set<string>(sammleTexte())
    expect(Object.keys(EN).filter((t) => !texte.has(t))).toEqual([])
  })
})
