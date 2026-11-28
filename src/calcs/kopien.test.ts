import { describe, expect, it } from 'vitest'
import { RECHNER, kopierbar, rechnerNachId } from '.'

describe('weitere Ausgaben einer Funktion', () => {
  it('liefert für „sparren~2“ den Sparrenrechner mit eigener Kennung und Nummer', () => {
    const k = rechnerNachId('sparren~2')!
    const s = rechnerNachId('sparren')!
    expect(k.id).toBe('sparren~2')
    expect(k.nummer).toBe(2)
    expect(k.titel).toBe(s.titel)
    expect(k.rechne).toBe(s.rechne)
    // immer dasselbe Objekt, damit die Oberfläche nicht neu aufbaut
    expect(rechnerNachId('sparren~2')).toBe(k)
  })
  it('lehnt unbekannte, eigene Ansichten und ungültige Nummern ab', () => {
    expect(rechnerNachId('gibtsnicht~2')).toBeUndefined()
    expect(rechnerNachId('sparren~1')).toBeUndefined()
    expect(rechnerNachId('sparren~10')).toBeUndefined()
    expect(rechnerNachId('sparren~2~2')).toBeUndefined()
    const eigen = RECHNER.find((r) => r.eigen)!
    expect(kopierbar(eigen)).toBe(false)
    expect(rechnerNachId(`${eigen.id}~2`)).toBeUndefined()
  })
})
