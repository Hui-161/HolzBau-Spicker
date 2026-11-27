import { describe, expect, it } from 'vitest'
import { rechnerNachId } from '../calcs'
import { berechne } from './werte'

const rechner = (id: string) => rechnerNachId(id)!

describe('Ergebnis aus gespeicherten Eingaben', () => {
  it('rechnet mit vollständigen Eingaben und füllt Vorgaben auf', () => {
    expect(berechne(rechner('diagonale'), { l: '800', b: '600' }, 1)?.ausgaben[0].wert).toBeCloseTo(1000)
    // Dachneigung fehlt in den gespeicherten Eingaben → Vorgabe des Feldes
    expect(berechne(rechner('sparren'), { g: '400', h: '18' }, 1)).toBeDefined()
  })
  it('liefert nichts, wenn ein Pflichtfeld fehlt', () => {
    expect(berechne(rechner('diagonale'), { l: '800' }, 1)).toBeUndefined()
  })
  it('liefert nichts, wenn ein freiwilliges Feld unlesbar ausgefüllt ist – wie der Rechner selbst', () => {
    expect(berechne(rechner('diagonale'), { l: '338', b: '257', d1: '431', d2: '1e3' }, 1)).toBeUndefined()
    expect(berechne(rechner('treppe'), { h: '270', s: '18,5,0' }, 1)).toBeUndefined()
    expect(berechne(rechner('treppe'), { h: '270', s: '' }, 1)).toBeDefined()
  })
  it('ausgeblendete Felder zählen nicht', () => {
    // Prozent-Feld ist bei „Grad“ ausgeblendet und darf Unsinn enthalten
    expect(berechne(rechner('neigung'), { von: 'grad', grad: '30', proz: 'abc' }, 1)).toBeDefined()
  })
})
