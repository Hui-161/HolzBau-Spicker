import { describe, expect, it } from 'vitest'
import { MAX_FOTOS_GESAMT, MAX_FOTOS_JE_PROJEKT, pruefeFotos } from './fotos'

const jpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
const foto = (mehr: object = {}) => ({ projekt: 'p1', titel: 'Traufe', daten: jpeg, breite: 1280, hoehe: 960, ...mehr })
const projekte = new Set(['p1', 'p2'])

describe('Fotos aus einer Sicherungsdatei', () => {
  it('übernimmt gültige Fotos und kürzt die Beschriftung', () => {
    expect(pruefeFotos([foto(), foto({ projekt: 'p2', titel: 'x'.repeat(300) })], projekte)).toEqual([foto(), foto({ projekt: 'p2', titel: 'x'.repeat(120) })])
  })
  it('verwirft alles, was kein verkleinertes JPEG eines bekannten Projekts ist', () => {
    const schlecht = [
      foto({ projekt: 'fremd' }),
      foto({ daten: 'data:image/svg+xml;base64,PHN2Zz4=' }),
      foto({ daten: 'data:image/jpeg;base64,<script>' }),
      foto({ daten: jpeg + 'A'.repeat(1_600_000) }),
      foto({ breite: 1e308 }),
      foto({ hoehe: 0 }),
      foto({ breite: '1280' }),
      'kein Objekt',
      null,
    ]
    expect(pruefeFotos(schlecht, projekte)).toEqual([])
    expect(pruefeFotos('kein Feld', projekte)).toEqual([])
  })
  it('hält die Grenzen je Projekt und insgesamt ein', () => {
    expect(pruefeFotos(Array.from({ length: 40 }, () => foto()), projekte)).toHaveLength(MAX_FOTOS_JE_PROJEKT)
    const viele = new Set(Array.from({ length: 20 }, (_, i) => `p${i}`))
    const alle = [...viele].flatMap((p) => Array.from({ length: MAX_FOTOS_JE_PROJEKT }, () => foto({ projekt: p })))
    expect(pruefeFotos(alle, viele).length).toBeLessThanOrEqual(MAX_FOTOS_GESAMT)
  })
})
