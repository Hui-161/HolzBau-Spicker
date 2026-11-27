import { describe, expect, it } from 'vitest'
import { dachfensterWechsel, dachflaecheSattel, grat, sattelgaube, pultdach, schleppgaube, zeltdach, kehlbalken, schifter, lattung, neigungAusGrad, neigungAusMass, neigungAusProzent, sparren } from './dach'
import { bogen, diagonale, dreieck, dreiVierFuenf, rechtwinklig } from './dreieck'
import { einteilung, sparrenEinteilung, stabAnzahl } from './einteilung'
import { neigungAusSchwerkraft } from './sensor'
import { holzmenge, leseLaengen, leseTeile, massstab, treppe, verschnitt } from './sonstiges'
import { mindestabstaende, mindestabstaendeStift } from './verbindung'

const nah = (ist: number, soll: number, stellen = 6) => expect(ist).toBeCloseTo(soll, stellen)

describe('Sparren', () => {
  it('45°: Länge = Grundmaß · √2', () => {
    const r = sparren({ grundmass: 4, neigung: 45, ueberstand: 0.5, sparrenhoehe: 0.2, kerve: 0.03 })
    nah(r.laengeGrund, 4 * Math.SQRT2)
    nah(r.laengeGesamt, 4.5 * Math.SQRT2)
    nah(r.firsthoehe, 4)
    nah(r.lotschnitt, 0.2 * Math.SQRT2)
    nah(r.obholz, 0.17 * Math.SQRT2)
    nah(r.kervenSattel, 0.03 * Math.SQRT2)
  })
  it('30°: Kerve – Sattel und Lot bilden die Kerventiefe', () => {
    const r = sparren({ grundmass: 5, neigung: 30, ueberstand: 0, sparrenhoehe: 18, kerve: 3 })
    nah(r.kervenSattel, 6)
    // Fläche des Kervendreiecks auf zwei Wegen
    nah((r.kervenSattel * r.kervenLot) / 2, (Math.hypot(r.kervenSattel, r.kervenLot) * 3) / 2)
  })
  it('lehnt unsinnige Eingaben ab', () => {
    expect(() => sparren({ grundmass: 4, neigung: 90, ueberstand: 0, sparrenhoehe: 20, kerve: 3 })).toThrow()
    expect(() => sparren({ grundmass: 4, neigung: 30, ueberstand: 0, sparrenhoehe: 20, kerve: 20 })).toThrow()
  })
})

describe('Grat', () => {
  it('gleiche Neigung 45°: Gratneigung 35,264°', () => {
    const r = grat({ neigungHaupt: 45, neigungWalm: 45, grundmassHaupt: 4, breite: 0.12 })
    nah(r.grundmassWalm, 4)
    nah(r.gratGrund, 4 * Math.SQRT2)
    nah(r.gratNeigung, 35.264389682754654)
    nah(r.gratLaenge, 4 * Math.sqrt(3))
    nah(r.winkelHaupt, 45)
    nah(r.verstichHaupt, 0.06)
    nah(r.abgratungHaupt, r.abgratungWalm)
  })
  it('ungleiche Neigung: stimmt mit der Raumgeometrie überein', () => {
    const e = { neigungHaupt: 38, neigungWalm: 52, grundmassHaupt: 5.2, breite: 0.14 }
    const r = grat(e)
    const h = 5.2 * Math.tan((38 * Math.PI) / 180)
    const w = h / Math.tan((52 * Math.PI) / 180)
    nah(r.grundmassWalm, w)
    nah(r.gratLaenge, Math.sqrt(5.2 ** 2 + w ** 2 + h ** 2))
    nah(r.winkelHaupt + r.winkelWalm, 90)
    // Gratneigung über cot²: tan γ = 1 / √(cot²αH + cot²αW)
    const cot = (g: number) => 1 / Math.tan((g * Math.PI) / 180)
    nah(Math.tan((r.gratNeigung * Math.PI) / 180), 1 / Math.sqrt(cot(38) ** 2 + cot(52) ** 2))
    // Abgratung: Höhenverlust der Dachfläche an der Sparrenkante (Ebenengleichung)
    const nx = Math.cos((r.winkelHaupt * Math.PI) / 180)
    nah(r.abgratungHaupt, 0.07 * nx * Math.tan((38 * Math.PI) / 180))
  })
})

describe('Lattung', () => {
  it('teilt gleichmäßig innerhalb der Decklängen', () => {
    const r = lattung({ sparrenlaenge: 600, traufe: 32, first: 4, deckMin: 33, deckMax: 36 })
    nah(r.strecke, 564)
    expect(r.reihen).toBe(16)
    nah(r.lattweite, 35.25)
    expect(r.passt).toBe(true)
    expect(r.positionen).toHaveLength(17)
    nah(r.positionen[16], 596)
  })
  it('meldet, wenn die Lattweite unter die min. Decklänge fällt', () => {
    const r = lattung({ sparrenlaenge: 100, traufe: 0, first: 0, deckMin: 34, deckMax: 36 })
    expect(r.reihen).toBe(3)
    expect(r.passt).toBe(false)
  })
})

describe('Dachfläche und Neigung', () => {
  it('Satteldach', () => {
    const r = dachflaecheSattel({ laenge: 10, breite: 8, neigung: 45, ueberstandTraufe: 0.5, ueberstandOrtgang: 0.3 })
    nah(r.sparrenlaenge, 4.5 * Math.SQRT2)
    nah(r.flaeche, 2 * 4.5 * Math.SQRT2 * 10.6)
  })
  it('Satteldach mit ungleichen Neigungen: First dort, wo beide Seiten gleich hoch sind', () => {
    const r = dachflaecheSattel({ laenge: 10, breite: 8, neigung: 30, neigung2: 50, ueberstandTraufe: 0.5, ueberstandOrtgang: 0 })
    const rad = (g: number) => (g * Math.PI) / 180
    // gleiche Höhe von beiden Traufwänden aus
    nah(r.firstAb * Math.tan(rad(30)), (8 - r.firstAb) * Math.tan(rad(50)))
    nah(r.firsthoehe, r.firstAb * Math.tan(rad(30)))
    // Sparrenlängen als Strecke Traufpunkt – First
    nah(r.sparrenlaenge, Math.hypot(r.firstAb + 0.5, (r.firstAb + 0.5) * Math.tan(rad(30))))
    nah(r.sparrenlaenge2, Math.hypot(8 - r.firstAb + 0.5, (8 - r.firstAb + 0.5) * Math.tan(rad(50))))
    nah(r.flaeche, (r.sparrenlaenge + r.sparrenlaenge2) * 10)
    // gleiche Neigungen: First mittig, beide Seiten gleich
    const g = dachflaecheSattel({ laenge: 10, breite: 8, neigung: 35, neigung2: 35, ueberstandTraufe: 0, ueberstandOrtgang: 0 })
    nah(g.firstAb, 4)
    nah(g.sparrenlaenge, g.sparrenlaenge2)
  })
  it('Neigungsumrechnung ist in sich stimmig', () => {
    nah(neigungAusGrad(45).prozent, 100)
    nah(neigungAusProzent(100).grad, 45)
    nah(neigungAusMass(1, 1).grad, 45)
    nah(neigungAusGrad(30).prozent, 57.735026919)
    nah(neigungAusProzent(neigungAusGrad(22.5).prozent).grad, 22.5)
  })
})

describe('Einteilung', () => {
  it('Außenmaß: Stäbe an beiden Enden', () => {
    const r = einteilung(300, 6, 6, 'aussen')
    nah(r.feldbreite, (300 - 36) / 5)
    nah(r.achsmass, 58.8)
    nah(r.positionen[0], 0)
    nah(r.positionen[5] + 6, 300)
  })
  it('Innenmaß: Felder an beiden Enden', () => {
    const r = einteilung(300, 6, 4, 'innen')
    nah(r.feldbreite, (300 - 24) / 5)
    nah(r.positionen[3] + 6 + r.feldbreite, 300)
  })
  it('Eckmaß: letzter Stab schließt bündig ab', () => {
    const r = einteilung(300, 6, 5, 'ecke')
    nah(r.positionen[4] + 6, 300)
  })
  it('Anzahl aus max. Achsmaß hält das Achsmaß ein', () => {
    for (const art of ['aussen', 'ecke', 'innen'] as const) {
      const n = stabAnzahl(487, 6, 62.5, art)
      expect(einteilung(487, 6, n, art).achsmass).toBeLessThanOrEqual(62.5 + 1e-9)
      if (n > 2) expect(einteilung(487, 6, n - 1, art).achsmass).toBeGreaterThan(62.5)
    }
  })
  it('Sparreneinteilung', () => {
    const r = sparrenEinteilung({ laenge: 1000, sparrenbreite: 8, randabstand: 0, maxAchs: 80 })
    expect(r.felder).toBe(13)
    expect(r.anzahl).toBe(14)
    nah(r.achsmass, 992 / 13)
    nah(r.sparren[13].kante + 8, 1000)
  })
})

describe('Dreiecke', () => {
  it('rechtwinklig 3-4-5 aus allen Eingabepaaren', () => {
    const faelle = [{ a: 3, b: 4 }, { a: 3, c: 5 }, { b: 4, c: 5 }, { a: 3, alpha: 36.86989764584402 }, { c: 5, beta: 53.13010235415598 }]
    for (const f of faelle) {
      const r = rechtwinklig(f)
      nah(r.a, 3)
      nah(r.b, 4)
      nah(r.c, 5)
      nah(r.flaeche, 6)
      nah(r.hoeheC, 2.4)
    }
    expect(() => rechtwinklig({ alpha: 30 })).toThrow()
    expect(() => rechtwinklig({ a: 5, c: 3 })).toThrow()
  })
  it('allgemein: SSS, SWS, WSW und SSW liefern dasselbe Dreieck', () => {
    const basis = dreieck({ a: 7, b: 9, c: 12 })
    nah(basis.alpha + basis.beta + basis.gamma, 180)
    nah(basis.flaeche, Math.sqrt(14 * 7 * 5 * 2))
    nah(basis.umkreis, (7 * 9 * 12) / (4 * basis.flaeche))
    const sws = dreieck({ a: 7, b: 9, gamma: basis.gamma })
    nah(sws.c, 12)
    const wsw = dreieck({ c: 12, alpha: basis.alpha, beta: basis.beta })
    nah(wsw.a, 7)
    nah(wsw.b, 9)
    const ssw = dreieck({ b: 9, c: 12, gamma: basis.gamma })
    nah(ssw.a, 7)
    expect(ssw.hinweis).toBeUndefined()
  })
  it('allgemein: Fehlerfälle', () => {
    expect(() => dreieck({ a: 1, b: 2, c: 5 })).toThrow()
    expect(() => dreieck({ alpha: 60, beta: 60, gamma: 60 })).toThrow()
    expect(() => dreieck({ a: 1, alpha: 100, beta: 90 })).toThrow()
    expect(dreieck({ a: 5, b: 8, alpha: 30 }).hinweis).toBeDefined()
  })
  it('Maßkontrollen', () => {
    expect(dreiVierFuenf(2.4, 'lang')).toEqual({ kurz: 1.7999999999999998, lang: 2.4, diagonale: 3 })
    const d = diagonale(8, 6, 10.01, 9.99)
    nah(d.soll, 10)
    nah(d.abweichung1 as number, 0.01)
    nah(d.differenz as number, 0.02)
    const b = bogen(2, 1)
    nah(b.radius, 1)
    nah(b.bogenlaenge, Math.PI)
    nah(bogen(4, 0.5).radius, 4.25)
  })
})

describe('Sonstiges', () => {
  it('Treppe nach Schrittmaßregel', () => {
    const r = treppe(280)
    expect(r.steigungen).toBe(16)
    nah(r.steigung, 17.5)
    nah(r.auftritt, 28)
    nah(r.lauflaenge, 420)
    nah(2 * r.steigung + r.auftritt, 63)
  })
  it('Holzmenge', () => {
    const r = holzmenge(8, 16, 5, 10, 470)
    nah(r.volumen, 0.64)
    nah(r.laufmeter, 50)
    nah(r.gewicht, 300.8)
    nah(r.oberflaeche, 24)
  })
  it('Maßstab', () => {
    nah(massstab(2.5, 50, 'planZuReal'), 125)
    nah(massstab(125, 50, 'realZuPlan'), 2.5)
  })
})

describe('Hexenschnitt, Schifter, Kehlbalken', () => {
  const rad = (g: number) => (g * Math.PI) / 180
  const kreuz = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const winkel = (a: number[], b: number[]) => (Math.acos(Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(...a) * Math.hypot(...b))) * 180) / Math.PI

  it('Hexenschnitt stimmt mit dem Ebenenschnitt im Raum überein', () => {
    for (const [aH, aW] of [[45, 45], [38, 52], [25, 60]]) {
      const r = grat({ neigungHaupt: aH, neigungWalm: aW, grundmassHaupt: 4, breite: 0.1 })
      // Traufe Hauptdach = x-Achse, Dach steigt in y. Abschnittebene: enthält x und die Dachnormale.
      const normale = [0, -Math.sin(rad(aH)), Math.cos(rad(aH))]
      const ebene = kreuz([1, 0, 0], normale)
      // Seitenfläche des Grats: lotrecht, enthält die Gratrichtung
      const gratRichtung = [r.grundmassWalm, 4, r.hoehe]
      const seite = kreuz(gratRichtung, [0, 0, 1])
      const schnitt = kreuz(ebene, seite)
      nah(Math.min(r.hexeHaupt, 180 - r.hexeHaupt), winkel(schnitt, gratRichtung), 6) // winkel() liefert den spitzen Winkel
    }
  })
  it('Hexenschnitt 45°/45°: 35,26° + 35,26°', () => {
    const r = grat({ neigungHaupt: 45, neigungWalm: 45, grundmassHaupt: 4, breite: 0 })
    nah(r.hexeHaupt, 2 * 35.264389682754654)
    nah(r.hexeHaupt, r.hexeWalm)
  })
  it('Schifterliste: Längen wachsen gleichmäßig und enden vor dem First', () => {
    const e = { neigungHaupt: 45, neigungWalm: 45, grundmassHaupt: 400, breite: 12 }
    const s = schifter(e, 80)
    expect(s.haupt).toHaveLength(4)
    nah(s.haupt[0].achse, 80 * Math.SQRT2)
    nah(s.haupt[3].achse, 320 * Math.SQRT2)
    nah(s.haupt[0].kante, (80 - 6 * Math.SQRT2) * Math.SQRT2)
    expect(s.walm).toHaveLength(4)
  })
  it('Kehlbalken', () => {
    const r = kehlbalken({ weite: 800, neigung: 45, hoeheUnten: 250, balkenhoehe: 16 })
    nah(r.laengeUnten, 300)
    nah(r.laengeOben, 268)
    nah(r.firstUeberBezug, 400)
    nah(r.restBisFirst, 134)
    nah(r.rissSparren, 250 * Math.SQRT2)
    expect(() => kehlbalken({ weite: 800, neigung: 45, hoeheUnten: 390, balkenhoehe: 16 })).toThrow()
  })
})

describe('Neigungsmesser', () => {
  const g = 9.81
  const r = (grad: number) => (grad * Math.PI) / 180
  it('auf der Kante: Winkel zur nächsten Kante', () => {
    nah(neigungAusSchwerkraft(0, g, 0)!.winkel, 0)
    nah(neigungAusSchwerkraft(g * Math.sin(r(12)), g * Math.cos(r(12)), 0)!.winkel, 12)
    // quer gehalten, 5° geneigt
    nah(neigungAusSchwerkraft(g * Math.cos(r(5)), -g * Math.sin(r(5)), 0)!.winkel, 5)
    expect(neigungAusSchwerkraft(0, g, 0)!.lage).toBe('kante')
  })
  it('flach aufgelegt: Neigung der Auflagefläche', () => {
    const m = neigungAusSchwerkraft(0, g * Math.sin(r(20)), g * Math.cos(r(20)))!
    expect(m.lage).toBe('flach')
    nah(m.winkel, 20)
  })
  it('ohne brauchbare Werte: kein Ergebnis', () => {
    expect(neigungAusSchwerkraft(0, 0, 0)).toBeUndefined()
  })
})

describe('Pultdach, Zeltdach, Gaube, Dachfenster', () => {
  it('Pultdach', () => {
    const r = pultdach({ breite: 400, neigung: 45, ueberstandTief: 30, ueberstandHoch: 20 })
    nah(r.sparrenlaenge, 450 * Math.SQRT2)
    nah(r.hoehe, 400)
    nah(r.hoeheGesamt, 450)
  })
  it('Zeltdach über dem Quadrat stimmt mit dem Grat-Rechner überein', () => {
    const z = zeltdach(4, 800, 40)
    const g = grat({ neigungHaupt: 40, neigungWalm: 40, grundmassHaupt: 400, breite: 0 })
    nah(z.hoehe, g.hoehe)
    nah(z.gratLaenge, g.gratLaenge)
    nah(z.gratNeigung, g.gratNeigung)
    nah(z.grundwinkel, 45)
    // vier gleichschenklige Dreiecke
    nah(z.flaeche, 4 * (800 * z.sparrenlaenge) / 2)
  })
  it('Zeltdach über dem Sechseck', () => {
    const z = zeltdach(6, 100, 45)
    nah(z.gratGrund, 100) // Umkreisradius = Seitenlänge
    nah(z.hoehe, 50 * Math.sqrt(3))
    nah(z.grundwinkel, 60)
  })
  it('Schleppgaube', () => {
    const r = schleppgaube({ neigungHaupt: 45, neigungGaube: 26.56505117707799, hoeheFront: 100 })
    nah(r.lauf, 200)
    nah(r.sparrenGaube, Math.hypot(200, 100))
    nah(r.anschlussHaupt, 200 * Math.SQRT2)
    // Probe: Höhengewinn Hauptdach = Fronthöhe + Höhengewinn Gaube
    nah(200 * 1, 100 + 200 * 0.5)
    expect(() => schleppgaube({ neigungHaupt: 30, neigungGaube: 30, hoeheFront: 100 })).toThrow()
  })
  it('Dachfenster: passt ins Feld oder braucht einen Wechsel', () => {
    const basis = { fensterhoehe: 118, luftSeite: 2, luftHoehe: 4, achsmass: 80, sparrenbreite: 8 }
    const schmal = dachfensterWechsel({ ...basis, fensterbreite: 66 })
    expect(schmal.gekappt).toBe(0)
    nah(schmal.restJeSeite, 1)
    const breit = dachfensterWechsel({ ...basis, fensterbreite: 114 })
    expect(breit.gekappt).toBe(1)
    nah(breit.wechsellaenge, 152)
    nah(breit.restJeSeite, 17)
    nah(breit.wechselabstand, 122)
  })
})

describe('Verschnitt', () => {
  it('liest die Stückliste', () => {
    expect(leseTeile('240 x 3\n180,5\n 95*4 ; 60')).toEqual([
      { laenge: 240, anzahl: 3 },
      { laenge: 180.5, anzahl: 1 },
      { laenge: 95, anzahl: 4 },
      { laenge: 60, anzahl: 1 },
    ])
    expect(() => leseTeile('abc')).toThrow()
    expect(() => leseTeile('  ')).toThrow()
    expect(() => leseTeile('240 x 1,5')).toThrow()
  })
  it('verteilt alle Teile, keine Stange wird überfüllt', () => {
    const teile = leseTeile('240 x 3\n180 x 2\n95 x 4\n60 x 5')
    const r = verschnitt(500, 0.4, teile)
    expect(r.teile).toBe(14)
    expect(r.stangen.flatMap((s) => s.teile).sort((a, b) => a - b)).toEqual([60, 60, 60, 60, 60, 95, 95, 95, 95, 180, 180, 240, 240, 240])
    for (const s of r.stangen) {
      const belegt = s.teile.reduce((a, b) => a + b, 0) + 0.4 * (s.teile.length - 1)
      expect(belegt).toBeLessThanOrEqual(500 + 1e-9)
    }
    // Untergrenze: Gesamtlänge / Stangenlänge
    expect(r.anzahl).toBeGreaterThanOrEqual(Math.ceil((3 * 240 + 2 * 180 + 4 * 95 + 5 * 60) / 500))
    expect(r.anzahl).toBeLessThanOrEqual(5)
  })
  it('zwei halbe Stangen passen nur ohne Schnittbreite auf eine', () => {
    expect(verschnitt(500, 0, [{ laenge: 250, anzahl: 2 }]).anzahl).toBe(1)
    expect(verschnitt(500, 0.4, [{ laenge: 250, anzahl: 2 }]).anzahl).toBe(2)
    expect(() => verschnitt(500, 0, [{ laenge: 501, anzahl: 1 }])).toThrow()
  })
})

describe('Mindestabstände (EC5 Tab. 8.2)', () => {
  it('nicht vorgebohrt, Kraft in Faserrichtung, d = 4 mm', () => {
    expect(mindestabstaende(4, 0, 'ohne')).toEqual({ a1: 40, a2: 20, a3t: 60, a3c: 40, a4t: 20, a4c: 20 })
  })
  it('nicht vorgebohrt, d = 6 mm, quer zur Faser', () => {
    const r = mindestabstaende(6, 90, 'ohne')
    nah(r.a1, 30)
    nah(r.a3t, 60)
    nah(r.a4t, 60)
  })
  it('vorgebohrt und dichtes Holz', () => {
    expect(mindestabstaende(4, 0, 'vorgebohrt')).toEqual({ a1: 20, a2: 12, a3t: 48, a3c: 28, a4t: 12, a4c: 12 })
    expect(mindestabstaende(4, 0, 'ohneDicht')).toEqual({ a1: 60, a2: 28, a3t: 80, a3c: 60, a4t: 28, a4c: 28 })
    expect(() => mindestabstaende(10, 0, 'ohne')).toThrow()
  })
})

describe('Befunde der Rechenkontrolle', () => {
  it('Dreieck: widersprüchliche oder überzählige Angaben werden abgelehnt', () => {
    expect(() => dreieck({ a: 10, alpha: 60, beta: 60, gamma: 90 })).toThrow()
    expect(() => dreieck({ a: 10, b: 10, alpha: 60, beta: 80 })).toThrow()
    expect(() => dreieck({ a: 3, b: 4, c: 5, gamma: 30 })).toThrow()
    expect(() => rechtwinklig({ a: 3, b: 4, c: 6 })).toThrow()
    expect(() => rechtwinklig({ a: 3, alpha: 30, beta: 30 })).toThrow()
  })
  it('Lattung: an jeder Latte hängt eine Ziegelreihe', () => {
    const r = lattung({ sparrenlaenge: 100, traufe: 30, first: 4, deckMin: 32, deckMax: 34 })
    expect(r.positionen.map((p) => Math.round(p))).toEqual([30, 63, 96])
    expect(r.latten).toBe(3)
    expect(r.reihen).toBe(2)
  })
  it('Treppe: nimmt die Steigung, die dem Wunsch am nächsten liegt', () => {
    expect(treppe(146.76, 19.65).steigungen).toBe(8)
    expect(treppe(280, 18).steigungen).toBe(16)
    expect(treppe(10, 18).steigungen).toBe(1)
    // eigener Auftritt: Lauflänge und Schrittmaß folgen daraus, die Steigung bleibt
    const e = treppe(280, 18, 63, 27)
    expect(e.steigungen).toBe(16)
    nah(e.auftritt, 27)
    nah(e.lauflaenge, 15 * 27)
    nah(e.schrittmass, 2 * 17.5 + 27)
    nah(treppe(280).schrittmass, 63)
    expect(() => treppe(280, 18, 63, 0)).toThrow()
  })
  it('Stabzahl: meldet klar, wenn nichts passt, und liefert nie null Stäbe', () => {
    expect(() => stabAnzahl(81, 14.3, 15.14, 'ecke')).toThrow('Mit diesem Achsmaß')
    expect(stabAnzahl(100, 5, 200, 'innen')).toBe(1)
  })
  it('Mindestabstände: über 6 mm nur vorgebohrt', () => {
    expect(() => mindestabstaende(8, 0, 'ohne')).toThrow()
    expect(mindestabstaende(8, 0, 'vorgebohrt').a1).toBe(40)
  })
  it('Stückliste: drei Angaben in einer Zeile sind ein Fehler', () => {
    expect(() => leseTeile('240 x 3 x 2')).toThrow()
  })
  it('Schifterliste: zu enger Abstand wird gemeldet statt abgeschnitten', () => {
    expect(() => schifter({ neigungHaupt: 45, neigungWalm: 45, grundmassHaupt: 400, breite: 0 }, 1)).toThrow()
  })
})

describe('Gratverschiebung und Schifterraster', () => {
  it('gleiche Neigung: keine Verschiebung, Abgratung wie zuvor', () => {
    const r = grat({ neigungHaupt: 40, neigungWalm: 40, grundmassHaupt: 400, breite: 12 })
    nah(r.verschiebung, 0)
    nah(r.abgratungGleich, r.abgratungHaupt)
  })
  it('ungleiche Neigung: nach der Verschiebung liegen beide Kanten gleich tief (Ebenengleichung)', () => {
    for (const [aH, aW] of [[30, 50], [50, 30], [38, 52], [25, 60]]) {
      const b = 12
      const r = grat({ neigungHaupt: aH, neigungWalm: aW, grundmassHaupt: 400, breite: b })
      const tH = Math.tan((aH * Math.PI) / 180)
      const tW = Math.tan((aW * Math.PI) / 180)
      // Hauptdach-Traufe = x-Achse (Dach steigt in y), Walm-Traufe = y-Achse (Dach steigt in x)
      const [w, x] = [r.grundmassWalm, 400]
      const g = Math.hypot(w, x)
      // Einheitsvektor quer zum Grat, zeigt zur Hauptdachseite (kleineres y)
      const quer = [x / g, -w / g]
      const punktAufGrat = [w / 2, x / 2]
      const hoeheGrat = punktAufGrat[1] * tH
      // Sparrenachse um v zur Walmseite versetzt → Kanten bei −v ± b/2 quer zum Grat
      const kanteH = [punktAufGrat[0] + quer[0] * (b / 2 - r.verschiebung), punktAufGrat[1] + quer[1] * (b / 2 - r.verschiebung)]
      const kanteW = [punktAufGrat[0] - quer[0] * (b / 2 + r.verschiebung), punktAufGrat[1] - quer[1] * (b / 2 + r.verschiebung)]
      const tiefeH = hoeheGrat - kanteH[1] * tH
      const tiefeW = hoeheGrat - kanteW[0] * tW
      nah(tiefeH, tiefeW)
      nah(tiefeH, r.abgratungGleich)
    }
  })
  it('der Grat wandert zur flacheren Seite', () => {
    expect(grat({ neigungHaupt: 50, neigungWalm: 30, grundmassHaupt: 400, breite: 12 }).verschiebung).toBeGreaterThan(0)
    expect(grat({ neigungHaupt: 30, neigungWalm: 50, grundmassHaupt: 400, breite: 12 }).verschiebung).toBeLessThan(0)
  })
  it('Schifterraster ab Anfallspunkt', () => {
    const e = { neigungHaupt: 45, neigungWalm: 45, grundmassHaupt: 400, breite: 0 }
    const s = schifter(e, 150, 'anfall')
    expect(s.haupt.map((z) => z.abstand)).toEqual([100, 250])
    nah(s.haupt[1].achse, 250 * Math.SQRT2)
    expect(schifter(e, 150).haupt.map((z) => z.abstand)).toEqual([150, 300])
  })
})

describe('Satteldachgaube', () => {
  it('gleiche Neigung 45°: Kehle wie beim Walm, 45° im Grundriss', () => {
    const r = sattelgaube({ neigungHaupt: 45, neigungGaube: 45, breite: 200, hoeheTraufe: 100 })
    nah(r.firstUeberTraufe, 100)
    nah(r.trauflaenge, 100)
    nah(r.firstlaenge, 200)
    nah(r.kehlWinkel, 45)
    nah(r.kehlNeigung, 35.264389682754654)
    nah(r.kehlLaenge, 100 * Math.sqrt(3))
  })
  it('ungleiche Neigung: beide Kehlenden liegen auf Hauptdach und Gaubendach (Ebenengleichung)', () => {
    const e = { neigungHaupt: 48, neigungGaube: 30, breite: 240, hoeheTraufe: 90 }
    const r = sattelgaube(e)
    const tH = Math.tan((48 * Math.PI) / 180)
    const tG = Math.tan((30 * Math.PI) / 180)
    // x = Lauf nach hinten ab Front, y = seitlich ab Gaubenmitte, z = Höhe über Hauptdach an der Front
    const haupt = (x: number) => x * tH
    const gaube = (y: number) => 90 + (120 - Math.abs(y)) * tG
    nah(haupt(r.trauflaenge), gaube(120))
    nah(haupt(r.firstlaenge), gaube(0))
    // Punkt in der Mitte der Kehle liegt ebenfalls auf beiden Flächen
    nah(haupt((r.trauflaenge + r.firstlaenge) / 2), gaube(60))
    nah(r.kehlLaenge, Math.hypot(r.firstlaenge - r.trauflaenge, 120, gaube(0) - gaube(120)))
    nah(r.flaeche, 2 * ((r.trauflaenge + r.firstlaenge) / 2) * r.sparren)
  })
})

describe('Zuschnitt mit mehreren Stangenlängen', () => {
  it('liest Stangenlängen, ohne Doppelte, längste zuerst', () => {
    expect(leseLaengen('400\n500; 400 ;300,5')).toEqual([500, 400, 300.5])
    expect(() => leseLaengen('')).toThrow()
    expect(() => leseLaengen('5 m')).toThrow()
  })
  it('wählt je Stange die Länge mit der besten Ausnutzung', () => {
    const r = verschnitt([500, 300], 0, [{ laenge: 290, anzahl: 2 }, { laenge: 240, anzahl: 2 }])
    // 2 × 300 für die 290er, 1 × 500 für beide 240er
    expect(r.bedarf).toEqual([{ laenge: 500, anzahl: 1 }, { laenge: 300, anzahl: 2 }])
    expect(r.teile).toBe(4)
    nah(r.rest, 40)
    nah(r.ausnutzung, (1060 / 1100) * 100)
  })
  it('verteilt alle Teile, keine Stange wird überfüllt', () => {
    const teile = leseTeile('240 x 3\n180 x 2\n95 x 4\n60 x 5')
    for (const laengen of [[500], [600, 400], [500, 450, 300]]) {
      const r = verschnitt(laengen, 0.4, teile)
      expect(r.stangen.flatMap((s) => s.teile).sort((a, b) => a - b)).toEqual([60, 60, 60, 60, 60, 95, 95, 95, 95, 180, 180, 240, 240, 240])
      for (const s of r.stangen) expect(s.teile.reduce((a, b) => a + b, 0) + 0.4 * (s.teile.length - 1)).toBeLessThanOrEqual(s.laenge + 1e-9)
      expect(r.bedarf.reduce((a, b) => a + b.anzahl, 0)).toBe(r.anzahl)
    }
    expect(verschnitt(500, 0.4, teile).anzahl).toBe(4)
  })
  it('mehr Auswahl macht das Ergebnis nicht schlechter als die längste Stange allein', () => {
    const teile = leseTeile('310 x 4\n150 x 6\n45 x 9')
    const eine = verschnitt([600], 0.3, teile)
    const mehrere = verschnitt([600, 450, 320], 0.3, teile)
    expect(mehrere.rest).toBeLessThanOrEqual(eine.rest + 1e-9)
  })
})

describe('Mindestabstände Bolzen und Stabdübel (EC5 Tab. 8.4 und 8.5)', () => {
  it('Bolzen M12', () => {
    expect(mindestabstaendeStift(12, 0, 'bolzen')).toEqual({ a1: 60, a2: 48, a3t: 84, a3c: 48, a4t: 36, a4c: 36 })
    const quer = mindestabstaendeStift(12, 90, 'bolzen')
    nah(quer.a1, 48)
    nah(quer.a3c, 84)
    nah(quer.a4t, 48)
  })
  it('Stabdübel 10 mm: Hirnholzabstand mindestens 80 mm', () => {
    expect(mindestabstaendeStift(10, 0, 'stabduebel')).toEqual({ a1: 50, a2: 30, a3t: 80, a3c: 30, a4t: 30, a4c: 30 })
    nah(mindestabstaendeStift(10, 90, 'stabduebel').a3c, 80)
    nah(mindestabstaendeStift(10, 90, 'stabduebel').a1, 30)
    expect(() => mindestabstaendeStift(6, 0, 'bolzen')).toThrow()
  })
})
