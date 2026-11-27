import { describe, expect, it } from 'vitest'
import { gaubenSparrenliste, grat, gratAnfall, gratKerve, sattelgaube, sparren, walmgaube } from './dach'
import { leseStueckliste, zuschnitt } from './stueckliste'
import { leseTeile, verschnitt } from './sonstiges'
import { mindestabstaendeStift, mindestholzdicke } from './verbindung'

const nah = (ist: number, soll: number, stellen = 6) => expect(ist).toBeCloseTo(soll, stellen)

describe('Walmgaube', () => {
  const e = { neigungHaupt: 45, neigungGaube: 40, breite: 240, hoeheTraufe: 100, neigungWalm: 50, gratbreite: 8 }
  it('Walm verkürzt den First um sein Grundmaß; Anfallspunkt liegt auf allen drei Gaubenflächen', () => {
    const w = walmgaube(e)
    const s = sattelgaube(e)
    const tG = Math.tan((40 * Math.PI) / 180)
    const tW = Math.tan((50 * Math.PI) / 180)
    // Höhe des Firsts über der Gaubentraufe = halbe Breite · tan αG = Walm-Grundmaß · tan αW
    nah(120 * tG, w.walmGrund * tW)
    nah(w.firstlaenge, s.firstlaenge - w.walmGrund)
    nah(w.walmsparren, Math.hypot(w.walmGrund, 120 * tG))
    // Grat: von der Traufecke (seitlich 120, vorn 0) zum Anfallspunkt
    nah(w.grat.gratLaenge, Math.hypot(120, w.walmGrund, 120 * tG))
    expect(w.grat).toEqual(grat({ neigungHaupt: 40, neigungWalm: 50, grundmassHaupt: 120, breite: 8 }))
  })
  it('Fläche: Satteldachfläche minus zwei Gratdreiecke plus Walmdreieck', () => {
    const w = walmgaube(e)
    const s = sattelgaube(e)
    // je Seite fällt ein Dreieck mit Grundlinie Walm-Grundmaß und Höhe Gaubensparren weg
    nah(w.flaeche, s.flaeche - 2 * ((w.walmGrund * s.sparren) / 2) + (240 * w.walmsparren) / 2)
  })
  it('zu flacher Walm wird abgelehnt', () => {
    expect(() => walmgaube({ ...e, neigungWalm: 8 })).toThrow()
  })
})

describe('Stückliste mit Querschnitt und Bezeichnung', () => {
  it('liest alle Schreibweisen', () => {
    expect(leseStueckliste('240 x 3\nSparren: 480 x 12 @ 8/18\nPfosten: 250 @ 12 x 12; 95,5@8 / 18')).toEqual([
      { laenge: 240, anzahl: 3, querschnitt: '', bezeichnung: '' },
      { laenge: 480, anzahl: 12, querschnitt: '8/18', bezeichnung: 'Sparren' },
      { laenge: 250, anzahl: 1, querschnitt: '12/12', bezeichnung: 'Pfosten' },
      { laenge: 95.5, anzahl: 1, querschnitt: '8/18', bezeichnung: '' },
    ])
    for (const falsch of ['abc', 'Sparren:', '240 @', '240 x 3 x 2', '']) expect(() => leseStueckliste(falsch), falsch).toThrow()
  })
  it('verteilt je Querschnitt getrennt und behält die Bezeichnungen', () => {
    const teile = leseStueckliste('Sparren: 480 x 3 @ 8/18\nWechsel: 100 x 2 @ 8/18\nPfosten: 250 x 2 @ 12/12')
    const r = zuschnitt([600, 500], 0, teile)
    expect(r.gruppen.map((g) => g.querschnitt)).toEqual(['8/18', '12/12'])
    expect(r.teile).toBe(7)
    // 8/18: 3 Stangen für die Sparren (zwei davon mit je einem Wechsel), 12/12: eine 500er für beide Pfosten
    expect(r.gruppen[0].stangen.every((s) => s.namen.includes('Sparren'))).toBe(true)
    expect(r.gruppen[0].stangen.filter((s) => s.namen.includes('Wechsel'))).toHaveLength(2)
    expect(r.gruppen[1].stangen).toEqual([{ laenge: 500, teile: [250, 250], rest: 0, namen: ['Pfosten'] }])
    expect(r.bedarf.find((b) => b.querschnitt === '12/12')).toEqual({ querschnitt: '12/12', laenge: 500, anzahl: 1 })
    expect(r.anzahl).toBe(r.bedarf.reduce((a, b) => a + b.anzahl, 0))
    const material = r.gruppen.flatMap((g) => g.stangen).reduce((a, s) => a + s.laenge, 0)
    nah(r.ausnutzung, ((3 * 480 + 200 + 500) / material) * 100)
    nah(r.rest, material - (3 * 480 + 200 + 500))
  })
})

describe('Mindestholzdicke ohne Vorbohren (EC5 8.3.1.2)', () => {
  it('Gleichung 8.18', () => {
    nah(mindestholzdicke(3, 350, false), 21) // max(21; 7,9)
    nah(mindestholzdicke(6, 420, false), 50.4) // max(42; 50,4)
  })
  it('Gleichung 8.19 für spaltempfindliches Holz', () => {
    nah(mindestholzdicke(3, 350, true), 42) // max(42; 15,75)
    nah(mindestholzdicke(6, 420, true), 100.8)
  })
})

describe('Befunde des zweiten Prüflaufs', () => {
  it('Stabdübel: a3,c ist bis 30° zur Faser fest 3·d (EC5 Tab. 8.5)', () => {
    expect(mindestabstaendeStift(8, 20, 'stabduebel').a3c).toBe(24)
    expect(mindestabstaendeStift(12, 30, 'stabduebel').a3c).toBe(36)
    expect(mindestabstaendeStift(16, 28, 'stabduebel').a3c).toBe(48)
    // darüber die Sinus-Formel, an der Grenze ohne Sprung nach unten
    nah(mindestabstaendeStift(12, 45, 'stabduebel').a3c, 84 * Math.SQRT1_2)
    nah(mindestabstaendeStift(12, 90, 'stabduebel').a3c, 84)
    // Bolzen bleiben stetig: (1 + 6·sin 30°)·d = 4·d
    nah(mindestabstaendeStift(12, 30, 'bolzen').a3c, 48)
  })
  it('Zuschnitt: mehr Auswahl ist nie schlechter als die beste Einzellänge', () => {
    const r = verschnitt([400, 340], 0, [{ laenge: 150, anzahl: 2 }, { laenge: 50, anzahl: 1 }])
    expect(r.stangen).toEqual([{ laenge: 400, teile: [150, 150, 50], rest: 50 }])
    nah(r.ausnutzung, 87.5)
    // Zufallsvergleich mit festem Startwert
    let saat = 12345
    const zufall = (): number => ((saat = (saat * 1103515245 + 12345) % 2147483648), saat / 2147483648)
    for (let lauf = 0; lauf < 300; lauf++) {
      const laengen = [600, 300 + Math.floor(zufall() * 250), 200 + Math.floor(zufall() * 90)]
      const teile = Array.from({ length: 3 + Math.floor(zufall() * 8) }, () => ({ laenge: 20 + Math.floor(zufall() * 180), anzahl: 1 + Math.floor(zufall() * 3) }))
      const schnitt = Math.floor(zufall() * 3) * 0.2
      const material = (l: number[]): number => verschnitt(l, schnitt, teile).stangen.reduce((a, s) => a + s.laenge, 0)
      const gemischt = material(laengen)
      for (const l of laengen) if (teile.every((t) => t.laenge <= l)) expect(gemischt).toBeLessThanOrEqual(material([l]) + 1e-9)
    }
  })
  it('Zuschnitt: doppelte Stangenlängen und leere Liste', () => {
    expect(verschnitt([500, 500], 0, [{ laenge: 250, anzahl: 3 }]).bedarf).toEqual([{ laenge: 500, anzahl: 2 }])
    expect(() => verschnitt(500, 0, [])).toThrow('mindestens ein Teil')
    expect(leseTeile('250 x 3')).toHaveLength(1)
  })
})

describe('Befunde des dritten Prüflaufs', () => {
  it('Stückliste: Querschnitt mit Doppelpunkt, Anzahl hinter dem @, Zahl als Name', () => {
    expect(leseStueckliste('Sparren: 480 @ 8:18')[0]).toMatchObject({ bezeichnung: 'Sparren', laenge: 480, querschnitt: '8/18' })
    expect(leseStueckliste('240 @ 8:18')[0]).toMatchObject({ bezeichnung: '', laenge: 240, querschnitt: '8/18' })
    expect(leseStueckliste('Sparren x-Achse: 240')[0]).toMatchObject({ bezeichnung: 'Sparren x-Achse', laenge: 240 })
    expect(() => leseStueckliste('240 @ 8/18 x 3')).toThrow('vor das')
    expect(() => leseStueckliste('12:30')).toThrow()
  })
  it('riesige Stückzahlen werden sofort abgelehnt', () => {
    const start = Date.now()
    expect(() => leseStueckliste('240 x 99999999999')).toThrow('Zu viele Teile')
    expect(() => verschnitt(500, 0, [{ laenge: 240, anzahl: 30000000 }])).toThrow('Zu viele Teile')
    expect(() => zuschnitt([500], 0, [{ laenge: 240, anzahl: 1500, querschnitt: 'a', bezeichnung: '' }, { laenge: 240, anzahl: 1500, querschnitt: 'b', bezeichnung: '' }])).toThrow('Zu viele Teile')
    expect(Date.now() - start).toBeLessThan(500)
  })
})

describe('Sparrenliste der Gaube', () => {
  const e = { neigungHaupt: 48, neigungGaube: 30, breite: 240, hoeheTraufe: 90 }
  const tH = Math.tan((48 * Math.PI) / 180)
  const tG = Math.tan((30 * Math.PI) / 180)
  const cG = Math.cos((30 * Math.PI) / 180)
  // x = seitlich ab Gaubenmitte, y = ab Front nach hinten, z = Höhe über dem Hauptdach an der Front
  const gaube = (x: number) => 90 + (120 - x) * tG
  const haupt = (y: number) => y * tH
  it('Giebelfront: volle Sparren bis zum Traufende, dahinter enden sie auf der Kehle', () => {
    const s = sattelgaube(e)
    const liste = gaubenSparrenliste(e, 20)
    expect(liste.length).toBe(Math.ceil(s.firstlaenge / 20 - 1e-9) - 1)
    for (const z of liste) {
      const aussen = z.laenge * cG // seitliche Ausladung ab First
      if (z.art === 'voll') {
        expect(z.lage).toBeLessThanOrEqual(s.trauflaenge + 1e-9)
        nah(aussen, 120)
      } else {
        expect(z.art).toBe('kehle')
        // das äußere Ende liegt auf Gaubendach UND Hauptdach
        nah(gaube(aussen), haupt(z.lage))
      }
    }
  })
  it('Walmfront: vor dem Anfallspunkt enden die Sparren oben am Grat', () => {
    const tW = Math.tan((55 * Math.PI) / 180)
    const w = walmgaube({ ...e, neigungWalm: 55, gratbreite: 0 })
    const walm = (y: number) => 90 + y * tW
    const liste = gaubenSparrenliste(e, 15, w.walmGrund)
    expect(liste.some((z) => z.art === 'grat')).toBe(true)
    for (const z of liste.filter((x) => x.art === 'grat')) {
      const innen = 120 - z.laenge * cG // seitliche Lage des oberen Endes
      nah(gaube(innen), walm(z.lage))
    }
    // hinter Anfallspunkt und vor Traufende wieder volle Länge
    for (const z of liste.filter((x) => x.art === 'voll')) nah(z.laenge, 120 / cG)
  })
  it('kurze Traufe: hinter dem Traufende und vor dem Anfallspunkt liegen Sparren zwischen Kehle und Grat', () => {
    const kurz = { neigungHaupt: 50, neigungGaube: 45, breite: 240, hoeheTraufe: 20 }
    const w = walmgaube({ ...kurz, neigungWalm: 52, gratbreite: 0 })
    expect(w.walmGrund).toBeGreaterThan(w.trauflaenge)
    const liste = gaubenSparrenliste(kurz, 10, w.walmGrund)
    const beide = liste.filter((z) => z.art === 'beides')
    expect(beide.length).toBeGreaterThan(0)
    const t50 = Math.tan((50 * Math.PI) / 180)
    const t52 = Math.tan((52 * Math.PI) / 180)
    for (const z of beide) {
      // äußeres Ende auf dem Hauptdach, inneres auf dem Walm; Gaubenneigung 45° → Höhe = seitlicher Abstand
      const aussen = 120 - (z.lage * t50 - 20) // aus Gaubendach = Hauptdach
      const innen = 120 - z.lage * t52 // aus Gaubendach = Walm
      nah(z.laenge, (aussen - innen) * Math.SQRT2)
    }
  })
})

describe('Anriss am Sparren', () => {
  it('Lagen entlang der Kante stimmen mit den Koordinaten der Risse überein', () => {
    const e = { grundmass: 400, neigung: 35, ueberstand: 50, sparrenhoehe: 18, kerve: 3 }
    const r = sparren(e)
    const a = (35 * Math.PI) / 180
    // Richtung der Sparrenkante und der Senkelrisse im Schnitt (x waagerecht, y lotrecht)
    const entlang = (x: number) => x / Math.cos(a) // waagerechter Abstand → Länge auf der Kante
    nah(r.anriss.kerveSenkel, entlang(50))
    nah(r.anriss.first, entlang(450))
    nah(r.anriss.first, r.laengeGesamt)
    // Kerve: Ecke bei (0,0); Unterkante liegt um das Kervenlot tiefer: y = x·tan a − k/cos a
    const kLot = 3 / Math.cos(a)
    const xEnde = kLot / Math.tan(a) // Waagriss y = 0 trifft die Unterkante
    nah(r.anriss.kerveEnde - r.anriss.kerveSenkel, entlang(xEnde))
    nah(xEnde, r.kervenSattel)
    // Obholz: Oberkante über der Kervenecke, lotrecht
    nah(r.anriss.obholz, 18 / Math.cos(a) - kLot)
    nah(r.anriss.obholz, r.obholz)
  })
  it('Winkel und Versatz der Risse', () => {
    const r = sparren({ grundmass: 400, neigung: 35, ueberstand: 0, sparrenhoehe: 18, kerve: 0 })
    nah(r.anriss.winkelSenkel, 55)
    nah(r.anriss.winkelWaage, 35)
    // Senkelriss: läuft über die Sparrenhöhe um h·tan α entlang der Kante weiter
    nah(r.anriss.versatzSenkel, 18 * Math.tan((35 * Math.PI) / 180))
    nah(Math.atan(18 / r.anriss.versatzSenkel) * (180 / Math.PI), r.anriss.winkelSenkel)
    nah(Math.atan(18 / r.anriss.versatzWaage) * (180 / Math.PI), r.anriss.winkelWaage)
    nah(r.anriss.kerveEnde, 0)
  })
})

describe('Laufmaße zum Antragen vom Bandmaß', () => {
  it('von links und von rechts ergeben dieselben Stäbe, gespiegelt', async () => {
    const { einteilung, laufmasse } = await import('./einteilung')
    const r = einteilung(300, 6, 6, 'aussen')
    const links = laufmasse(r.positionen, 6, 300, 'links')
    const rechts = laufmasse(r.positionen, 6, 300, 'rechts')
    expect(links.map((x) => x.kante)).toEqual(r.positionen)
    nah(links[1].achse, 58.8 + 3)
    nah(links[1].ferneKante, 58.8 + 6)
    // symmetrische Einteilung: von rechts dieselben Zahlen
    rechts.forEach((x, i) => nah(x.kante, links[i].kante))
    // unsymmetrisch (Eckmaß): der Stab am rechten Ende liegt von rechts bei 0
    const ecke = einteilung(300, 6, 5, 'ecke')
    const vonRechts = laufmasse(ecke.positionen, 6, 300, 'rechts')
    nah(vonRechts[0].kante, 0)
    nah(vonRechts[0].achse, 3)
    nah(vonRechts[4].ferneKante, 300 - ecke.positionen[0])
    // jedes Maß von links plus das zugehörige von rechts ergibt die Gesamtlänge
    const vonLinks = laufmasse(ecke.positionen, 6, 300, 'links')
    vonLinks.forEach((x, i) => nah(x.achse + vonRechts[4 - i].achse, 300))
    expect(vonRechts.map((x) => x.kante)).toEqual([...vonRechts.map((x) => x.kante)].sort((a, b) => a - b))
  })
})

describe('Gratsparren: Anfallspunkt und Kerve', () => {
  const rad = (g: number) => (g * Math.PI) / 180
  const faelle = [
    { neigungHaupt: 45, neigungWalm: 45, grundmassHaupt: 400, breite: 14 },
    { neigungHaupt: 40, neigungWalm: 50, grundmassHaupt: 400, breite: 12 },
    { neigungHaupt: 28, neigungWalm: 55, grundmassHaupt: 520, breite: 10 },
  ]
  it('Backenschmiege: Riss der lotrechten Backe auf der geneigten Oberseite (Vektorrechnung)', () => {
    for (const e of faelle) {
      const g = grat(e)
      const a = gratAnfall(e)
      // Gratrichtung im Raum und waagerechte Querrichtung spannen die Oberseite auf
      const w = g.grundmassWalm
      const [ux, uy] = [w / g.gratGrund, e.grundmassHaupt / g.gratGrund]
      const achse = [ux * Math.cos(rad(g.gratNeigung)), uy * Math.cos(rad(g.gratNeigung)), Math.sin(rad(g.gratNeigung))]
      const quer = [uy, -ux, 0]
      // Backe rechtwinklig zum First (liegt am Anfallssparren des Hauptdachs): lotrechte Ebene mit Grundrissrichtung y
      // Rissrichtung in der Oberseite: s·achse + t·quer, deren Grundriss parallel zu (0,1) ist → x-Anteil = 0
      const tZuS = -achse[0] / quer[0]
      nah(Math.abs(Math.atan(tZuS)) * (180 / Math.PI), a.schmiegeHaupt)
      // Backe parallel zum First: Grundrissrichtung x → y-Anteil = 0
      nah(Math.abs(Math.atan(-achse[1] / quer[1])) * (180 / Math.PI), a.schmiegeWalm)
      // Rücksprung: die Backe (x = 0 bzw. y = 0 durch den Anfallspunkt) trifft die Sparrenkante
      const h2 = e.breite / 2
      nah(a.rueckHaupt, (h2 * uy) / ux) // aus −s·ux + uy·h2 = 0
      nah(a.rueckWalm, (h2 * ux) / uy)
      nah(a.rueckHauptKante, a.rueckHaupt / Math.cos(rad(g.gratNeigung)))
    }
    // gleiche Neigung: beide Backen gleich, Rücksprung = halbe Breite
    nah(gratAnfall(faelle[0]).rueckHaupt, 7)
    nah(gratAnfall(faelle[0]).schmiegeHaupt, gratAnfall(faelle[0]).schmiegeWalm)
  })
  it('Kerve: Wange aus der Höhe der Sparrenunterkante über der Pfette (ohne die Abgratung zu benutzen)', () => {
    for (const e of faelle) {
      const g = grat(e)
      const [hg, ob] = [24, 16]
      const k = gratKerve(e, hg, ob)
      const lot = hg / Math.cos(rad(g.gratNeigung))
      // Unterkante über Pfettenoberkante an der Stelle t (Grundriss, ab Pfettenecke): ob + t·tan γ − lot
      const unterkante = (t: number) => ob + t * Math.tan(rad(g.gratNeigung)) - lot
      nah(k.haupt.wange, -unterkante(g.verstichHaupt))
      nah(k.walm.wange, -unterkante(g.verstichWalm))
      nah(k.wangeAchse, -unterkante(0))
      // der Waagriss endet dort, wo die Unterkante die Pfettenoberkante erreicht
      nah(unterkante(g.verstichHaupt + k.haupt.sattel), 0)
      // an der Seitenfläche liegt die abgegratete Kante genau um das Obholz über der Pfette
      nah(k.haupt.flaecheLot - k.haupt.wange, ob)
    }
    expect(() => gratKerve(faelle[0], 10, 30)).toThrow()
  })
})

describe('Sparren: Pfettenkerven, Traufabschnitt, Holzlänge', () => {
  const rad = (g: number) => (g * Math.PI) / 180
  const e = { grundmass: 400, neigung: 35, ueberstand: 50, sparrenhoehe: 18, kerve: 3 }
  // Unterkante des Sparrens als Gerade; Nullpunkt = Kervenecke der Fußpfette
  const lot = 18 / Math.cos(rad(35))
  const kLot = 3 / Math.cos(rad(35))
  const unten = (x: number) => x * Math.tan(rad(35)) - kLot
  it('Mittel- und Firstpfette: Lage, Höhe und Auflage aus der Geometrie der Unterkante', () => {
    const r = sparren({ ...e, mittelpfette: 200, firstpfette: 14 })
    const m = r.mittelpfette!
    // Pfettenoberkante = Kervenecke: liegt um das Kervenlot über der Unterkante
    nah(m.hoehe, unten(200) + kLot)
    // Lage entlang der Kante = Abstand der beiden Senkel durch Traufpunkt und Kervenecke
    nah(m.senkel, Math.hypot(250, 250 * Math.tan(rad(35))))
    // Waagriss endet, wo die Unterkante die Pfettenoberkante erreicht
    const xe = (m.ende - m.senkel) * Math.cos(rad(35))
    nah(unten(200 + xe), m.hoehe)
    const f = r.firstpfette!
    nah(f.grund, 393)
    nah(f.hoehe, 393 * Math.tan(rad(35)))
    // Sattel 3/sin35 = 5,23 passt auf die halbe Pfette (7): volle Auflage
    nah(f.auflage, 3 / Math.sin(rad(35)))
    // schmale Firstpfette: Auflage endet am Firstschnitt
    nah(sparren({ ...e, firstpfette: 8 }).firstpfette!.auflage, 4)
    expect(() => sparren({ ...e, mittelpfette: 399 })).toThrow()
    expect(() => sparren({ ...e, mittelpfette: 2 })).toThrow()
    expect(() => sparren({ ...e, firstpfette: 900 })).toThrow()
  })
  it('Traufabschnitt: winkelrecht und Senkel- mit Waagschnitt', () => {
    const w = sparren({ ...e, traufe: 'winkel' })
    // untere Ecke = Traufpunkt + Sparrenhöhe winkelrecht zur Kante
    nah(w.traufe.vorsprung, 18 * Math.sin(rad(35)))
    nah(w.rohlaenge, w.laengeGesamt) // rechteckiges Ende: kein Zuschlag
    const s = sparren({ ...e })
    nah(s.rohlaenge, s.laengeGesamt + 18 * Math.tan(rad(35)))
    const k = sparren({ ...e, traufe: 'kombi', stirn: 12 })
    // Waagschnitt auf Höhe 12 unter dem Traufpunkt bis zur Unterkante (die liegt am Traufsenkel um lot tiefer)
    nah(k.traufe.waag, (lot - 12) / Math.tan(rad(35)))
    nah(k.traufe.waagEnde, Math.hypot(k.traufe.waag, lot - 12))
    // hier beginnt die Unterkante erst hinter dem Traufpunkt (17,4 > 12,6): die Oberkante bestimmt die Länge
    nah(k.rohlaenge, k.laengeGesamt)
    // hoher Senkelschnitt: die Unterkante beginnt noch vor dem Traufpunkt, um den Rest wird das Holz länger
    const k2 = sparren({ ...e, traufe: 'kombi', stirn: 20 })
    nah(k2.rohlaenge, k2.laengeGesamt + 18 * Math.tan(rad(35)) - k2.traufe.waagEnde)
    // Waagschnitt vorgeben statt Höhe: dieselbe Geometrie rückwärts
    const kw = sparren({ ...e, traufe: 'kombi', waagTraufe: k.traufe.waag })
    nah(kw.traufe.stirn, 12)
    nah(kw.traufe.waag, k.traufe.waag)
    nah(kw.traufe.waagEnde, k.traufe.waagEnde)
    expect(() => sparren({ ...e, traufe: 'kombi', waagTraufe: 40 })).toThrow() // 40·tan35 > Lot
    expect(() => sparren({ ...e, traufe: 'kombi', waagTraufe: 0 })).toThrow()
    expect(() => sparren({ ...e, traufe: 'kombi', stirn: 30 })).toThrow()
    expect(() => sparren({ ...e, ueberstand: 5, traufe: 'winkel' })).toThrow()
    // ohne Überstand bleibt es beim Senkelschnitt
    expect(sparren({ ...e, ueberstand: 0, traufe: 'winkel' }).traufe.profil).toBe('senkel')
  })
})
