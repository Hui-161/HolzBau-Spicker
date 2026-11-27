import { atan, cos, pruefe, pruefeNeigung, sin, tan } from './trig'

/* ---------- Sparren (Pfettendach) ---------- */

export interface SparrenEingabe {
  /** Grundmaß: waagerecht von Außenkante Fußpfette bis Firstmitte */
  grundmass: number
  neigung: number
  /** Dachüberstand waagerecht, ab Außenkante Fußpfette */
  ueberstand: number
  sparrenhoehe: number
  /** Kerventiefe, winkelrecht zur Sparrenunterkante */
  kerve: number
}

export function sparren(e: SparrenEingabe) {
  pruefeNeigung(e.neigung)
  pruefe(e.grundmass > 0, 'Grundmaß muss größer als 0 sein.')
  pruefe(e.ueberstand >= 0, 'Dachüberstand darf nicht negativ sein.')
  pruefe(e.kerve >= 0 && e.kerve < e.sparrenhoehe, 'Kerventiefe muss kleiner als die Sparrenhöhe sein.')
  const c = cos(e.neigung)
  const s = sin(e.neigung)
  const laengeGrund = e.grundmass / c
  const laengeUeberstand = e.ueberstand / c
  return {
    laengeGrund,
    laengeUeberstand,
    laengeGesamt: laengeGrund + laengeUeberstand,
    firsthoehe: e.grundmass * tan(e.neigung),
    /** lotrechte Sparrenhöhe (Senkelschnitt) */
    lotschnitt: e.sparrenhoehe / c,
    /** Länge des waagerechten Schnitts */
    waagschnitt: e.sparrenhoehe / s,
    /** Obholz lotrecht über der Kerve */
    obholz: (e.sparrenhoehe - e.kerve) / c,
    /** waagerechte Auflagefläche der Kerve */
    kervenSattel: e.kerve / s,
    /** lotrechte Kervenwange */
    kervenLot: e.kerve / c,
    /**
     * Anriss am Sparren. Alle Lagen entlang der Sparrenkante gemessen, ab dem Senkelriss an der Traufe.
     * Weil alle Senkelrisse parallel sind, gelten die Maße an Ober- und Unterkante gleich –
     * jeweils ab dem Punkt, an dem der Traufsenkel diese Kante trifft.
     */
    anriss: {
      /** Senkelriss durch die Kervenecke (Außenkante Fußpfette) */
      kerveSenkel: laengeUeberstand,
      /** an der Unterkante: dort läuft der Waagriss der Kerve aus */
      kerveEnde: laengeUeberstand + e.kerve / (s * c),
      /** Senkelriss am First */
      first: laengeGrund + laengeUeberstand,
      /** auf dem Kervensenkel von der Oberkante herunter bis zur Kervenecke */
      obholz: (e.sparrenhoehe - e.kerve) / c,
      /** Winkel der Risse zur Sparrenkante */
      winkelSenkel: 90 - e.neigung,
      winkelWaage: e.neigung,
      /** Versatz eines Risses über die Sparrenhöhe, entlang der Kante gemessen (Anriss ohne Winkel) */
      versatzSenkel: e.sparrenhoehe * tan(e.neigung),
      versatzWaage: e.sparrenhoehe / tan(e.neigung),
    },
  }
}

/* ---------- Grat / Kehle (Walmdach, auch ungleiche Neigungen) ---------- */

export interface GratEingabe {
  neigungHaupt: number
  neigungWalm: number
  /** Grundmaß Hauptdach: waagerecht von Traufe bis First */
  grundmassHaupt: number
  /** Breite des Grat- bzw. Kehlsparrens (0 = ohne Abgratung) */
  breite: number
  /** Traufabschnitt der Sparren, gemessen zur Sparrenoberkante (90 = winkelrecht) */
  abschnittHaupt?: number
  abschnittWalm?: number
}

export function grat(e: GratEingabe) {
  pruefeNeigung(e.neigungHaupt, 'Neigung Hauptdach')
  pruefeNeigung(e.neigungWalm, 'Neigung Walm')
  pruefe(e.grundmassHaupt > 0, 'Grundmaß muss größer als 0 sein.')
  pruefe(e.breite >= 0, 'Breite darf nicht negativ sein.')
  const x = e.grundmassHaupt
  const hoehe = x * tan(e.neigungHaupt)
  const w = hoehe / tan(e.neigungWalm)
  const gratGrund = Math.hypot(x, w)
  const gratNeigung = atan(hoehe / gratGrund)
  // Grundrisswinkel zwischen Grat und der jeweiligen Traufe
  const winkelHaupt = atan(x / w)
  const winkelWalm = 90 - winkelHaupt
  const b2 = e.breite / 2
  const aH = e.abschnittHaupt ?? 90
  const aW = e.abschnittWalm ?? 90
  pruefe(Math.abs(aH - e.neigungHaupt) < 90 && Math.abs(aW - e.neigungWalm) < 90, 'Mit diesem Traufabschnitt ist kein Hexenschnitt möglich.')
  return {
    hoehe,
    grundmassWalm: w,
    gratGrund,
    gratNeigung,
    gratLaenge: Math.hypot(gratGrund, hoehe),
    winkelHaupt,
    winkelWalm,
    /** Winkel Grat–Traufe in der Dachfläche (Schifter-Anriss) */
    schmiegeHaupt: atan(x / cos(e.neigungHaupt) / w),
    schmiegeWalm: atan(w / cos(e.neigungWalm) / x),
    /** Abgratung lotrecht gemessen, je Dachseite */
    abgratungHaupt: b2 * cos(winkelHaupt) * tan(e.neigungHaupt),
    abgratungWalm: b2 * cos(winkelWalm) * tan(e.neigungWalm),
    /** Verstich: Versatz der Sparrenkante gegenüber der Achse an der Traufe */
    verstichHaupt: b2 / tan(winkelHaupt),
    verstichWalm: b2 / tan(winkelWalm),
    ...gratverschiebung(e.breite, winkelHaupt, winkelWalm, e.neigungHaupt, e.neigungWalm),
    /**
     * Hexenschnitt: Winkel zwischen Gratoberkante und der Schnittlinie, in der die
     * Traufabschnitt-Ebene der Sparren die Seitenfläche des Gratsparrens trifft.
     */
    hexeHaupt: gratNeigung + atan(sin(winkelHaupt) * tan(aH - e.neigungHaupt)),
    hexeWalm: gratNeigung + atan(sin(winkelWalm) * tan(aW - e.neigungWalm)),
  }
}

/**
 * Gratverschiebung bei ungleichen Neigungen: Der Gratsparren wird im Grundriss quer zur Gratlinie
 * versetzt, bis beide Kanten gleich tief unter der Gratlinie liegen – dann sind beide Abgratungen
 * gleich hoch. Je Seite fällt die Dachfläche quer zum Grat um k = cos(Grundwinkel) · tan(Neigung).
 */
function gratverschiebung(breite: number, winkelHaupt: number, winkelWalm: number, neigungHaupt: number, neigungWalm: number) {
  const kH = cos(winkelHaupt) * tan(neigungHaupt)
  const kW = cos(winkelWalm) * tan(neigungWalm)
  return {
    /** Versatz der Sparrenachse im Grundriss; positiv = zur Walmseite, negativ = zur Hauptdachseite */
    verschiebung: ((breite / 2) * (kH - kW)) / (kH + kW),
    /** lotrechte Abgratung beider Seiten nach der Verschiebung */
    abgratungGleich: (breite * kH * kW) / (kH + kW),
  }
}

/**
 * Schifter am Grat: Länge der Schifterachse in der Dachfläche, ab Traufe.
 * Das Raster zählt wahlweise ab dem Gratfuß (Gebäudeecke) oder ab dem Anfallspunkt (Firstende).
 */
export function schifter(e: GratEingabe, abstand: number, rasterAb: 'fuss' | 'anfall' = 'fuss') {
  pruefe(abstand > 0, 'Sparrenabstand muss größer als 0 sein.')
  const g = grat(e)
  const liste = (traufe: number, grund: number, neigung: number, winkel: number) => {
    const zeilen: { abstand: number; achse: number; kante: number }[] = []
    // Abzug für die halbe Gratbreite, im Grundriss in Sparrenrichtung gemessen
    const abzug = e.breite / 2 / cos(winkel)
    pruefe(traufe / abstand <= 200, 'Der Sparrenabstand ist für die Schifterliste zu klein.')
    for (let i = 1; i * abstand < traufe - 1e-9; i++) {
      // Lage an der Traufe, immer ab Gratfuß gemessen
      const ort = rasterAb === 'fuss' ? i * abstand : traufe - i * abstand
      const lauf = (ort * grund) / traufe
      zeilen.push({ abstand: ort, achse: lauf / cos(neigung), kante: Math.max(0, lauf - abzug) / cos(neigung) })
    }
    // Liste immer vom Gratfuß aus, kürzester Schifter zuerst
    return zeilen.sort((a, b) => a.abstand - b.abstand)
  }
  return {
    // Hauptdach: Schifter stehen entlang der Hauptdach-Traufe (Länge = Grundmaß Walm)
    haupt: liste(g.grundmassWalm, e.grundmassHaupt, e.neigungHaupt, g.winkelHaupt),
    walm: liste(e.grundmassHaupt, g.grundmassWalm, e.neigungWalm, g.winkelWalm),
  }
}

/* ---------- Kehlbalken / Zange ---------- */

export interface KehlbalkenEingabe {
  /** lichte Weite zwischen den Sparrenunterkanten auf Höhe der Bezugslinie */
  weite: number
  neigung: number
  /** Unterkante Kehlbalken über der Bezugslinie */
  hoeheUnten: number
  balkenhoehe: number
}

export function kehlbalken(e: KehlbalkenEingabe) {
  pruefeNeigung(e.neigung)
  pruefe(e.weite > 0, 'Weite muss größer als 0 sein.')
  pruefe(e.hoeheUnten >= 0 && e.balkenhoehe > 0, 'Höhen müssen größer als 0 sein.')
  const t = tan(e.neigung)
  const first = (e.weite / 2) * t
  const unten = e.weite - (2 * e.hoeheUnten) / t
  const oben = e.weite - (2 * (e.hoeheUnten + e.balkenhoehe)) / t
  pruefe(oben > 0, 'Der Kehlbalken liegt über dem First.')
  return {
    laengeUnten: unten,
    laengeOben: oben,
    /** Abschnitt an beiden Enden, gemessen zur Balkenlängskante */
    abschnitt: e.neigung,
    /** Sparrenunterkante: von der Bezugslinie schräg bis UK Kehlbalken */
    rissSparren: e.hoeheUnten / sin(e.neigung),
    firstUeberBezug: first,
    restBisFirst: first - e.hoeheUnten - e.balkenhoehe,
  }
}

/* ---------- Lattung / Ziegeleinteilung ---------- */

export interface LattungEingabe {
  /** Sparrenlänge von Traufkante bis Firstpunkt (inkl. Aufbau) */
  sparrenlaenge: number
  /** Traufkante bis Oberkante erste Latte */
  traufe: number
  /** Oberkante letzte Latte bis Firstpunkt (LAF) */
  first: number
  deckMin: number
  deckMax: number
}

export function lattung(e: LattungEingabe) {
  pruefe(e.deckMax > 0 && e.deckMin > 0, 'Decklängen müssen größer als 0 sein.')
  pruefe(e.deckMin <= e.deckMax, 'Min. Decklänge darf nicht größer als max. Decklänge sein.')
  const strecke = e.sparrenlaenge - e.traufe - e.first
  pruefe(strecke > 0, 'Die Sparrenlänge ist kürzer als Trauf- und Firstabstand zusammen.')
  // kleinste Reihenzahl, bei der die Lattweite die max. Decklänge nicht überschreitet
  // reihen = Anzahl der Lattabstände; Latten (und damit Ziegelreihen) gibt es eine mehr
  const reihen = Math.ceil(strecke / e.deckMax - 1e-9)
  const lattweite = strecke / reihen
  const positionen: number[] = []
  for (let i = 0; i <= reihen; i++) positionen.push(e.traufe + i * lattweite)
  return {
    strecke,
    reihen,
    latten: reihen + 1,
    lattweite,
    passt: lattweite >= e.deckMin - 1e-9,
    positionen,
  }
}

/* ---------- Dachfläche Satteldach ---------- */

export interface DachflaecheEingabe {
  laenge: number
  breite: number
  neigung: number
  ueberstandTraufe: number
  ueberstandOrtgang: number
}

export function dachflaecheSattel(e: DachflaecheEingabe) {
  pruefeNeigung(e.neigung)
  pruefe(e.laenge > 0 && e.breite > 0, 'Länge und Breite müssen größer als 0 sein.')
  const sparren = (e.breite / 2 + e.ueberstandTraufe) / cos(e.neigung)
  const traufe = e.laenge + 2 * e.ueberstandOrtgang
  return {
    sparrenlaenge: sparren,
    trauflaenge: traufe,
    flaecheSeite: sparren * traufe,
    flaeche: 2 * sparren * traufe,
    firsthoehe: (e.breite / 2) * tan(e.neigung),
  }
}

/* ---------- Neigung umrechnen ---------- */

export function neigungAusGrad(grad: number) {
  pruefe(grad >= 0 && grad < 90, 'Neigung muss zwischen 0° und 90° liegen.')
  const prozent = tan(grad) * 100
  return { grad, prozent, cmProMeter: prozent, verhaeltnis: prozent > 0 ? 100 / prozent : Infinity }
}

export function neigungAusProzent(prozent: number) {
  pruefe(prozent >= 0, 'Neigung darf nicht negativ sein.')
  return neigungAusGrad(atan(prozent / 100))
}

export function neigungAusMass(hoehe: number, laenge: number) {
  pruefe(laenge > 0, 'Länge muss größer als 0 sein.')
  pruefe(hoehe >= 0, 'Höhe darf nicht negativ sein.')
  return neigungAusGrad(atan(hoehe / laenge))
}

/* ---------- Pultdach ---------- */

export interface PultdachEingabe {
  /** waagerecht zwischen den Außenkanten der beiden Auflager */
  breite: number
  neigung: number
  ueberstandTief: number
  ueberstandHoch: number
}

export function pultdach(e: PultdachEingabe) {
  pruefeNeigung(e.neigung)
  pruefe(e.breite > 0, 'Breite muss größer als 0 sein.')
  pruefe(e.ueberstandTief >= 0 && e.ueberstandHoch >= 0, 'Dachüberstand darf nicht negativ sein.')
  const c = cos(e.neigung)
  return {
    sparrenlaenge: (e.breite + e.ueberstandTief + e.ueberstandHoch) / c,
    laengeAuflager: e.breite / c,
    /** Höhenunterschied zwischen den beiden Auflagern */
    hoehe: e.breite * tan(e.neigung),
    hoeheGesamt: (e.breite + e.ueberstandTief + e.ueberstandHoch) * tan(e.neigung),
  }
}

/* ---------- Zeltdach / Turmdach über regelmäßigem Vieleck ---------- */

export function zeltdach(seiten: number, seitenlaenge: number, neigung: number) {
  pruefeNeigung(neigung)
  pruefe(Number.isInteger(seiten) && seiten >= 3 && seiten <= 24, 'Anzahl der Seiten: 3 bis 24.')
  pruefe(seitenlaenge > 0, 'Seitenlänge muss größer als 0 sein.')
  const halb = 180 / seiten
  const inkreis = seitenlaenge / (2 * tan(halb))
  const umkreis = seitenlaenge / (2 * sin(halb))
  const hoehe = inkreis * tan(neigung)
  const sparren = inkreis / cos(neigung)
  return {
    hoehe,
    /** Mittelsparren: von Traufmitte zur Spitze */
    sparrenlaenge: sparren,
    gratGrund: umkreis,
    gratLaenge: Math.hypot(umkreis, hoehe),
    gratNeigung: atan(hoehe / umkreis),
    /** Winkel zwischen Grat und Traufe im Grundriss */
    grundwinkel: 90 - halb,
    flaecheSeite: (seitenlaenge * sparren) / 2,
    flaeche: (seiten * seitenlaenge * sparren) / 2,
  }
}

/* ---------- Schleppgaube ---------- */

export interface GaubeEingabe {
  neigungHaupt: number
  neigungGaube: number
  /** lotrechte Höhe der Gaubenfront: Hauptdachfläche bis Gaubendachfläche */
  hoeheFront: number
}

export function schleppgaube(e: GaubeEingabe) {
  pruefeNeigung(e.neigungHaupt, 'Neigung Hauptdach')
  pruefe(e.neigungGaube >= 0 && e.neigungGaube < e.neigungHaupt, 'Die Gaube muss flacher sein als das Hauptdach.')
  pruefe(e.hoeheFront > 0, 'Fronthöhe muss größer als 0 sein.')
  // Beide Dachflächen laufen ab der Front nach hinten, bis sie sich treffen
  const lauf = e.hoeheFront / (tan(e.neigungHaupt) - tan(e.neigungGaube))
  return {
    lauf,
    sparrenGaube: lauf / cos(e.neigungGaube),
    /** Länge der Wange auf dem Hauptdach, in der Dachfläche gemessen */
    anschlussHaupt: lauf / cos(e.neigungHaupt),
    /** Winkel zwischen Gaubensparren und Hauptdachfläche am Anschluss */
    anschlusswinkel: e.neigungHaupt - e.neigungGaube,
    wangenflaeche: (e.hoeheFront * lauf) / 2,
  }
}

/* ---------- Wechsel am Dachfenster ---------- */

export interface DachfensterEingabe {
  fensterbreite: number
  fensterhoehe: number
  /** Einbauluft je Seite */
  luftSeite: number
  /** Einbauluft oben und unten zusammen */
  luftHoehe: number
  achsmass: number
  sparrenbreite: number
}

export function dachfensterWechsel(e: DachfensterEingabe) {
  pruefe(e.fensterbreite > 0 && e.fensterhoehe > 0, 'Fenstermaße müssen größer als 0 sein.')
  pruefe(e.luftSeite >= 0 && e.luftHoehe >= 0, 'Einbauluft darf nicht negativ sein.')
  pruefe(e.sparrenbreite > 0 && e.achsmass > e.sparrenbreite, 'Das Achsmaß muss größer als die Sparrenbreite sein.')
  const bedarf = e.fensterbreite + 2 * e.luftSeite
  // k gekappte Sparren öffnen (k + 1) Felder abzüglich einer Sparrenbreite
  let gekappt = 0
  while ((gekappt + 1) * e.achsmass - e.sparrenbreite < bedarf - 1e-9) {
    gekappt++
    pruefe(gekappt <= 10, 'Das Fenster ist für diese Sparrenlage zu breit.')
  }
  const oeffnung = (gekappt + 1) * e.achsmass - e.sparrenbreite
  return {
    bedarf,
    gekappt,
    /** lichtes Maß zwischen den durchlaufenden Sparren = Länge der Wechsel */
    wechsellaenge: oeffnung,
    /** Rest je Seite bei mittigem Einbau (Füllholz / Hilfssparren) */
    restJeSeite: (oeffnung - bedarf) / 2,
    /** lichtes Maß zwischen oberem und unterem Wechsel, in der Dachfläche */
    wechselabstand: e.fensterhoehe + e.luftHoehe,
  }
}

/* ---------- Satteldachgaube (Giebelgaube) ---------- */

export interface SattelgaubeEingabe {
  neigungHaupt: number
  neigungGaube: number
  /** Gaubenbreite von Traufe zu Traufe */
  breite: number
  /** lotrechte Höhe der Gaubentraufe über der Hauptdachfläche an der Gaubenfront */
  hoeheTraufe: number
}

export function sattelgaube(e: SattelgaubeEingabe) {
  pruefeNeigung(e.neigungHaupt, 'Neigung Hauptdach')
  pruefeNeigung(e.neigungGaube, 'Neigung Gaube')
  pruefe(e.breite > 0, 'Breite muss größer als 0 sein.')
  pruefe(e.hoeheTraufe >= 0, 'Höhe darf nicht negativ sein.')
  const tH = tan(e.neigungHaupt)
  const tG = tan(e.neigungGaube)
  const halb = e.breite / 2
  const firstUeberTraufe = halb * tG
  // Gaubentraufe und Gaubenfirst laufen waagerecht nach hinten, bis das Hauptdach sie erreicht
  const traufe = e.hoeheTraufe / tH
  const first = (e.hoeheTraufe + firstUeberTraufe) / tH
  // Kehle: vom Ende der Traufe (seitlich halb) zum Ende des Firsts (Mitte)
  const kehlGrund = Math.hypot(first - traufe, halb)
  return {
    firstUeberTraufe,
    sparren: halb / cos(e.neigungGaube),
    trauflaenge: traufe,
    firstlaenge: first,
    kehlGrund,
    kehlLaenge: Math.hypot(kehlGrund, firstUeberTraufe),
    kehlNeigung: atan(firstUeberTraufe / kehlGrund),
    /** Winkel zwischen Kehle und Gaubenfirst im Grundriss */
    kehlWinkel: atan(halb / (first - traufe)),
    /** Dachfläche beider Gaubenseiten: je ein Trapez aus Trauf- und Firstlänge */
    flaeche: (traufe + first) * (halb / cos(e.neigungGaube)),
  }
}

/* ---------- Walmgaube: Satteldachgaube mit abgewalmter Front ---------- */

export interface WalmgaubeEingabe extends SattelgaubeEingabe {
  /** Neigung des vorderen Walms */
  neigungWalm: number
  /** Breite der beiden Gratsparren am Walm (0 = ohne Abgratung) */
  gratbreite: number
}

export function walmgaube(e: WalmgaubeEingabe) {
  const s = sattelgaube(e)
  // Der Walm an der Front ist eine Walmecke mit der Gaubenseite als „Hauptdach“
  const g = grat({ neigungHaupt: e.neigungGaube, neigungWalm: e.neigungWalm, grundmassHaupt: e.breite / 2, breite: e.gratbreite })
  const firstRest = s.firstlaenge - g.grundmassWalm
  pruefe(firstRest > 0, 'Der Walm ist zu flach: Er läuft bis ins Hauptdach, es bleibt kein First.')
  const walmsparren = g.grundmassWalm / cos(e.neigungWalm)
  return {
    ...s,
    grat: g,
    /** waagerecht von der Front bis zum Anfallspunkt */
    walmGrund: g.grundmassWalm,
    /** Mittelsparren des Walms: Traufmitte bis Anfallspunkt */
    walmsparren,
    /** First vom Anfallspunkt bis zum Hauptdach */
    firstlaenge: firstRest,
    /** zwei Seitenflächen (Trapez, First um das Walm-Grundmaß kürzer) und das Walmdreieck */
    flaeche: (s.trauflaenge + firstRest) * s.sparren + (e.breite * walmsparren) / 2,
  }
}

/**
 * Sparrenliste einer Gaubenseite im Raster ab Front. Jeder Sparren läuft von außen (Gaubentraufe
 * oder, hinter dem Traufende, Kehle) nach innen (Gaubenfirst oder, vor dem Anfallspunkt, Walmgrat).
 * Längen in der Dachfläche, bis zur Achse von First, Kehle und Grat, ohne Überstand.
 * walmGrund = 0 bedeutet Giebelfront.
 */
export function gaubenSparrenliste(e: SattelgaubeEingabe, abstand: number, walmGrund = 0) {
  pruefe(abstand > 0, 'Sparrenabstand muss größer als 0 sein.')
  const s = sattelgaube(e)
  const halb = e.breite / 2
  const firstEnde = s.trauflaenge + (s.kehlGrund * cos(s.kehlWinkel))
  pruefe(firstEnde / abstand <= 200, 'Der Sparrenabstand ist für die Sparrenliste zu klein.')
  const zeilen: { lage: number; laenge: number; art: 'voll' | 'kehle' | 'grat' | 'beides' }[] = []
  for (let i = 1; i * abstand < firstEnde - 1e-9; i++) {
    const y = i * abstand
    // seitlicher Abstand von der Gaubenmitte, außen und innen
    const anKehle = y > s.trauflaenge + 1e-9
    const anGrat = y < walmGrund - 1e-9
    const aussen = anKehle ? (halb * (firstEnde - y)) / (firstEnde - s.trauflaenge) : halb
    const innen = anGrat ? halb * (1 - y / walmGrund) : 0
    zeilen.push({ lage: y, laenge: Math.max(0, aussen - innen) / cos(e.neigungGaube), art: anKehle && anGrat ? 'beides' : anKehle ? 'kehle' : anGrat ? 'grat' : 'voll' })
  }
  return zeilen
}
