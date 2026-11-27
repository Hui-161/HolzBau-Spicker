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
  /** Traufabschnitt: lotrecht, winkelrecht zur Sparrenkante oder Senkel- mit Waagschnitt (Vorgabe: lotrecht) */
  traufe?: 'senkel' | 'winkel' | 'kombi'
  /** nur bei „kombi“: Höhe des Senkelschnitts, lotrecht ab Oberkante */
  stirn?: number
  /** nur bei „kombi“, statt der Höhe: Länge des Waagschnitts (z. B. Breite der Untersichtschalung) */
  waagTraufe?: number
  /** Mittelpfette: waagerecht von Außenkante Fußpfette bis zur traufseitigen Kante der Mittelpfette */
  mittelpfette?: number
  /** Breite der Firstpfette; sie liegt mittig unter dem First */
  firstpfette?: number
}

/** Kerve an einer Pfette; alle Kerven haben dieselbe Tiefe, der Sparren liegt gerade durch. */
export interface PfettenKerve {
  /** waagerecht ab Außenkante Fußpfette bis zur traufseitigen Kante dieser Pfette */
  grund: number
  /** Senkelriss der Kerve: Lage entlang der Sparrenkante ab dem Traufpunkt */
  senkel: number
  /** an der Unterkante: Ende des Waagrisses */
  ende: number
  /** waagerechte Auflage auf der Pfette */
  auflage: number
  /** Oberkante dieser Pfette über Oberkante Fußpfette */
  hoehe: number
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
  const t = tan(e.neigung)
  const lot = e.sparrenhoehe / c
  const sattel = e.kerve / s
  const pfette = (grund: number, platz = Infinity): PfettenKerve => ({
    grund,
    senkel: (e.ueberstand + grund) / c,
    ende: (e.ueberstand + grund) / c + Math.min(sattel, platz) / c,
    auflage: Math.min(sattel, platz),
    hoehe: grund * t,
  })
  // Firstpfette: Kerve an ihrer traufseitigen Kante; der Waagriss endet spätestens am Firstschnitt
  let first: PfettenKerve | undefined
  if (e.firstpfette !== undefined) {
    pruefe(e.firstpfette > 0, 'Die Breite der Firstpfette muss größer als 0 sein.')
    pruefe(e.firstpfette / 2 < e.grundmass, 'Die Firstpfette ist breiter als das Dach.')
    first = pfette(e.grundmass - e.firstpfette / 2, e.firstpfette / 2)
  }
  let mittel: PfettenKerve | undefined
  if (e.mittelpfette !== undefined) {
    pruefe(e.mittelpfette > 0, 'Das Grundmaß bis zur Mittelpfette muss größer als 0 sein.')
    pruefe(e.mittelpfette + sattel <= (first ? first.grund : e.grundmass), 'Die Mittelpfette liegt nicht zwischen Fußpfette und First.')
    pruefe(e.kerve === 0 || e.mittelpfette >= sattel, 'Die Mittelpfette liegt in der Kerve der Fußpfette.')
    mittel = pfette(e.mittelpfette)
  }
  // Traufabschnitt; Bezug ist immer der Traufpunkt an der Oberkante
  const profil = e.ueberstand > 0 ? (e.traufe ?? 'senkel') : 'senkel'
  /** an der Unterkante entlang der Kante: so weit hinter dem Senkel durch den Traufpunkt beginnt das Holz */
  let anfangUnten = 0
  let traufe: { profil: 'senkel' | 'winkel' | 'kombi'; vorsprung: number; stirn: number; waag: number; waagEnde: number }
  if (profil === 'winkel') {
    pruefe(e.sparrenhoehe * s <= e.ueberstand, 'Der Dachüberstand ist für einen winkelrechten Traufabschnitt zu kurz.')
    anfangUnten = e.sparrenhoehe * t
    traufe = { profil, vorsprung: e.sparrenhoehe * s, stirn: e.sparrenhoehe, waag: 0, waagEnde: 0 }
  } else if (profil === 'kombi') {
    if (e.waagTraufe !== undefined) {
      pruefe(e.waagTraufe > 0, 'Die Länge des Waagschnitts an der Traufe muss größer als 0 sein.')
      pruefe(e.waagTraufe * t < lot, 'Der Waagschnitt an der Traufe ist länger, als der Sparren hoch ist – dann bleibt kein Senkelschnitt.')
    }
    const stirn = e.waagTraufe !== undefined ? lot - e.waagTraufe * t : (e.stirn ?? NaN)
    pruefe(stirn > 0, 'Die Höhe des Senkelschnitts an der Traufe muss größer als 0 sein.')
    pruefe(stirn < lot, 'Der Senkelschnitt an der Traufe ist höher als der Sparren – dann ist es ein reiner Senkelschnitt.')
    const waag = (lot - stirn) / t
    pruefe(waag <= e.ueberstand, 'Der Waagschnitt an der Traufe reicht bis über die Fußpfette – Senkelschnitt höher wählen.')
    anfangUnten = (lot - stirn) / s
    traufe = { profil, vorsprung: 0, stirn, waag, waagEnde: (lot - stirn) / s }
  } else {
    traufe = { profil: 'senkel', vorsprung: 0, stirn: lot, waag: 0, waagEnde: 0 }
  }
  return {
    /** Traufabschnitt: Vorsprung der Unterkante (winkelrecht), Höhe Senkelschnitt, Länge Waagschnitt, dessen Ende an der Unterkante ab Traufsenkel */
    traufe,
    /** Kerven an Mittel- und Firstpfette, soweit angegeben */
    mittelpfette: mittel,
    firstpfette: first,
    /**
     * kürzeste Holzlänge, aus der sich der Sparren schneiden lässt: Oberkante von Traufpunkt bis First,
     * dazu das Stück, um das die Unterkante an der Traufe hinter dem Traufpunkt beginnt.
     */
    rohlaenge: laengeGrund + laengeUeberstand + Math.max(0, e.sparrenhoehe * t - anfangUnten),
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
  // genau lotrechter Traufabschnitt (90° + Dachneigung) ist zulässig: die Schnittebene steht dann senkrecht
  pruefe(Math.abs(aH - e.neigungHaupt) <= 90 + 1e-9 && Math.abs(aW - e.neigungWalm) <= 90 + 1e-9, 'Mit diesem Traufabschnitt ist kein Hexenschnitt möglich.')
  // Hexenschnitt an der Seitenfläche; bei lotrechter Schnittebene wird er zum Senkelschnitt am Grat (Grenzwert der Formel)
  const hexe = (winkel: number, ab: number): number => gratNeigung + (Math.abs(Math.abs(ab) - 90) < 1e-9 ? Math.sign(ab) * 90 : atan(sin(winkel) * tan(ab)))
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
    hexeHaupt: hexe(winkelHaupt, aH - e.neigungHaupt),
    hexeWalm: hexe(winkelWalm, aW - e.neigungWalm),
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
    /** dasselbe bis Oberkante Kehlbalken */
    rissSparrenOben: (e.hoeheUnten + e.balkenhoehe) / sin(e.neigung),
    /** um so viel ist die Oberkante an jedem Ende kürzer als die Unterkante */
    versatz: e.balkenhoehe / t,
    /** Länge der Schnittfläche am Balkenende, entlang der Sparrenunterkante */
    schnittlaenge: e.balkenhoehe / sin(e.neigung),
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
  /** Neigung der zweiten Dachseite; ohne Angabe gleich der ersten */
  neigung2?: number
  ueberstandTraufe: number
  ueberstandOrtgang: number
}

/**
 * Satteldach über rechteckigem Grundriss, beide Traufen auf gleicher Höhe. Bei ungleichen Neigungen
 * liegt der First außermittig: dort, wo beide Dachseiten dieselbe Höhe erreichen.
 */
export function dachflaecheSattel(e: DachflaecheEingabe) {
  pruefeNeigung(e.neigung)
  const neigung2 = e.neigung2 ?? e.neigung
  pruefeNeigung(neigung2, 'Dachneigung zweite Seite')
  pruefe(e.laenge > 0 && e.breite > 0, 'Länge und Breite müssen größer als 0 sein.')
  pruefe(e.ueberstandTraufe >= 0 && e.ueberstandOrtgang >= 0, 'Dachüberstand darf nicht negativ sein.')
  const [t1, t2] = [tan(e.neigung), tan(neigung2)]
  // waagerecht von der Traufwand der ersten Seite bis unter den First
  const firstAb = (e.breite * t2) / (t1 + t2)
  const sparren = (firstAb + e.ueberstandTraufe) / cos(e.neigung)
  const sparren2 = (e.breite - firstAb + e.ueberstandTraufe) / cos(neigung2)
  const traufe = e.laenge + 2 * e.ueberstandOrtgang
  return {
    sparrenlaenge: sparren,
    sparrenlaenge2: sparren2,
    trauflaenge: traufe,
    flaecheSeite: sparren * traufe,
    flaecheSeite2: sparren2 * traufe,
    flaeche: (sparren + sparren2) * traufe,
    firsthoehe: firstAb * t1,
    firstAb,
    neigung2,
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
    /** Grundmaß des Mittelsparrens: Traufmitte bis unter die Spitze */
    inkreis,
    /** eine Dachfläche in wahrer Größe: Winkel zwischen Traufe und Grat, und der Winkel an der Spitze */
    winkelFlaeche: atan(sparren / (seitenlaenge / 2)),
    winkelSpitze: 180 - 2 * atan(sparren / (seitenlaenge / 2)),
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
  /** Höhe des Gaubensparrens, für den Anschnitt auf dem Hauptdach */
  sparrenhoehe?: number
}

export function schleppgaube(e: GaubeEingabe) {
  pruefeNeigung(e.neigungHaupt, 'Neigung Hauptdach')
  pruefe(e.neigungGaube >= 0 && e.neigungGaube < e.neigungHaupt, 'Die Gaube muss flacher sein als das Hauptdach.')
  pruefe(e.hoeheFront > 0, 'Fronthöhe muss größer als 0 sein.')
  // Beide Dachflächen laufen ab der Front nach hinten, bis sie sich treffen
  const lauf = e.hoeheFront / (tan(e.neigungHaupt) - tan(e.neigungGaube))
  if (e.sparrenhoehe !== undefined) pruefe(e.sparrenhoehe > 0, 'Die Höhe des Gaubensparrens muss größer als 0 sein.')
  return {
    /** Schmiege am oberen Ende des Gaubensparrens: Länge der Schnittfläche, die auf dem Hauptdach aufliegt */
    anschnitt: e.sparrenhoehe === undefined ? undefined : e.sparrenhoehe / sin(e.neigungHaupt - e.neigungGaube),
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

/* ---------- Gratsparren: Anfallspunkt und Kerve ---------- */

/**
 * Anfallspunkt: Der Gratsparren endet mit zwei lotrechten Backen, die sich auf der Achse treffen –
 * eine parallel zum First (liegt am Walm-Mittelsparren bzw. First an), eine rechtwinklig dazu
 * (liegt am Anfallssparren des Hauptdachs an). Gerechnet bis zum Anfallspunkt; halbe Holzstärken
 * der anschließenden Hölzer sind selbst abzuziehen.
 */
export function gratAnfall(e: GratEingabe) {
  const g = grat(e)
  const b2 = e.breite / 2
  const c = cos(g.gratNeigung)
  return {
    /** Winkel der Backe zur Gratachse im Grundriss */
    planHaupt: g.winkelWalm,
    planWalm: g.winkelHaupt,
    /** Backenschmiege: Winkel des Risses zur Gratachse auf der (nicht abgegrateten) Oberseite */
    schmiegeHaupt: atan(tan(g.winkelWalm) * c),
    schmiegeWalm: atan(tan(g.winkelHaupt) * c),
    /** um so viel liegt der Senkelriss der Backe an der Seitenfläche hinter dem Anfallspunkt (Grundriss, in Gratrichtung) */
    rueckHaupt: b2 * tan(g.winkelHaupt),
    rueckWalm: b2 * tan(g.winkelWalm),
    /** dasselbe an der Sparrenkante gemessen */
    rueckHauptKante: (b2 * tan(g.winkelHaupt)) / c,
    rueckWalmKante: (b2 * tan(g.winkelWalm)) / c,
  }
}

/**
 * Kerve am Gratsparren über der Ecke der Fußpfetten. Bezug ist die Außenecke der Pfetten: dort
 * liegt die Gratlinie um das lotrechte Obholz der Sparren über der Pfettenoberkante.
 * An jeder Seitenfläche sitzt der Senkelriss der Kerve um den Verstich weiter innen, und das
 * Obholz gilt dort ab der abgegrateten Kante.
 */
export function gratKerve(e: GratEingabe, hoeheGrat: number, obholz: number) {
  pruefe(hoeheGrat > 0, 'Die Höhe des Gratsparrens muss größer als 0 sein.')
  pruefe(obholz > 0, 'Das Obholz muss größer als 0 sein.')
  const g = grat(e)
  const c = cos(g.gratNeigung)
  const t = tan(g.gratNeigung)
  const lot = hoeheGrat / c
  pruefe(lot > obholz, 'Das Obholz ist größer als die lotrechte Höhe des Gratsparrens.')
  const seite = (abgratung: number, verstich: number) => {
    const wange = lot - abgratung - obholz
    pruefe(wange > 0, 'Das Obholz ist größer als die Höhe des Gratsparrens an der Kante.')
    return {
      verstich,
      /** Versatz des Kervensenkels gegenüber dem Senkel durch die Pfettenecke, an der Sparrenkante gemessen */
      verstichKante: verstich / c,
      /** lotrechte Höhe der Seitenfläche unter der abgegrateten Kante */
      flaecheLot: lot - abgratung,
      /** lotrechte Wange der Kerve an dieser Seitenfläche */
      wange,
      /** Länge des Waagrisses an dieser Seitenfläche, waagerecht in Gratrichtung */
      sattel: wange / t,
    }
  }
  return {
    lot,
    /** auf der Achse, an der Pfettenecke */
    wangeAchse: lot - obholz,
    haupt: seite(g.abgratungHaupt, g.verstichHaupt),
    walm: seite(g.abgratungWalm, g.verstichWalm),
  }
}

/**
 * Anriss am Gratsparren, entsprechend dem Anriss am Sparren: alle Lagen entlang der Kante gemessen,
 * ab dem Senkel durch den Traufpunkt auf der Gratachse. Weil alle Senkelrisse parallel sind, gelten
 * die Maße an Achse, Ober- und Unterkante gleich. An den Seitenflächen sitzt jeder Riss um den
 * Verstich weiter innen (Fuß, Kerve) bzw. um den Rücksprung früher (Anfallspunkt).
 *
 * grundmassHaupt zählt hier ab Außenkante Fußpfette, ueberstand ist der waagerechte Dachüberstand
 * des Hauptdachs davor. Beide Traufen liegen auf gleicher Höhe.
 */
export function gratAnriss(e: GratEingabe, ueberstand: number, hoeheGrat?: number, obholz?: number) {
  pruefe(ueberstand >= 0, 'Dachüberstand darf nicht negativ sein.')
  const g = grat(e)
  const c = cos(g.gratNeigung)
  // der Grat läuft im Grundriss schräg: sein Überstand ist um das Verhältnis Gratgrund : Grundmaß länger
  const ueGrund = (ueberstand * g.gratGrund) / e.grundmassHaupt
  const laengeUeberstand = ueGrund / c
  const laengeGesamt = laengeUeberstand + g.gratLaenge
  const kv = hoeheGrat !== undefined && obholz !== undefined ? gratKerve(e, hoeheGrat, obholz) : undefined
  const an = e.breite > 0 ? gratAnfall(e) : undefined
  return {
    /** Überstand des Grats im Grundriss, in Gratrichtung */
    ueGrund,
    laengeUeberstand,
    laengeGesamt,
    /** Überstand des Walms, damit seine Traufe auf gleicher Höhe liegt */
    ueberstandWalm: (ueberstand * tan(e.neigungHaupt)) / tan(e.neigungWalm),
    /** Winkel der Risse zur Sparrenkante */
    winkelSenkel: 90 - g.gratNeigung,
    winkelWaage: g.gratNeigung,
    /** an den Seitenflächen beginnt die Traufe (Hexenschnitt) um den Verstich hinter dem Traufpunkt */
    traufeHaupt: g.verstichHaupt / c,
    traufeWalm: g.verstichWalm / c,
    /** Kerve über der Pfettenecke: Senkelriss an der Achse und an den Seitenflächen, Ende des Waagrisses an der Unterkante */
    kerve: kv
      ? {
          achse: laengeUeberstand,
          haupt: laengeUeberstand + kv.haupt.verstichKante,
          walm: laengeUeberstand + kv.walm.verstichKante,
          hauptEnde: laengeUeberstand + kv.haupt.verstichKante + kv.haupt.sattel / c,
          walmEnde: laengeUeberstand + kv.walm.verstichKante + kv.walm.sattel / c,
          /** Kerventiefe winkelrecht zur Unterkante, auf der Achse */
          tiefeAchse: kv.wangeAchse * c,
        }
      : undefined,
    /** Anfallspunkt auf der Achse; an den Seitenflächen liegt der Senkelriss der Backe um den Rücksprung davor */
    anfallAchse: laengeGesamt,
    anfallHaupt: an ? laengeGesamt - an.rueckHauptKante : undefined,
    anfallWalm: an ? laengeGesamt - an.rueckWalmKante : undefined,
  }
}
