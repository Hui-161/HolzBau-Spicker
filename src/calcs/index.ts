import { dachfensterWechsel, dachflaecheSattel, gaubenSparrenliste, grat, gratAnfall, gratKerve, sattelgaube, walmgaube, pultdach, schleppgaube, zeltdach, kehlbalken, lattung, schifter, neigungAusGrad, neigungAusMass, neigungAusProzent, sparren } from '../core/dach'
import { bogen, diagonale, dreieck, dreiVierFuenf, rechtwinklig, stern } from '../core/dreieck'
import { einteilung, laufmasse, sparrenEinteilung, stabAnzahl, type EinteilArt } from '../core/einteilung'
import { holzmenge, leseLaengen, massstab, treppe } from '../core/sonstiges'
import { leseStueckliste, zuschnitt } from '../core/stueckliste'
import { mindestabstaende, mindestabstaendeStift, mindestholzdicke, type Vorbohrung } from '../core/verbindung'
import { zeichneFirst, zeichneTraufe, zeichneDachfenster, zeichneDreieck, zeichneGratAnfall, zeichneGratKerve, zeichneHexenschnitt, zeichneGratFuss, zeichneGratQuerschnitt, zeichneGratSeite, zeichneKerve, zeichneEinteilung, zeichneGaube, zeichneSattelgaube, zeichneGrat, zeichneKehlbalken, zeichnePultdach, zeichneSparren, zeichneStern, zeichneZeltdach } from './zeichnung'
import { opt, zahl, type Ausgabe, type Feld, type Liste, type Rechner, type Werte, type Zeichnung } from './types'

const L = (label: string, wert: number, wichtig = false): Ausgabe => ({ label, wert, art: 'len', wichtig })
const W = (label: string, wert: number, wichtig = false): Ausgabe => ({ label, wert, art: 'ang', wichtig })

const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"'
const T = 'fill="currentColor" stroke="none" font-size="12" font-family="inherit"'
const D = 'fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"'

/** Fläche in m² aus zwei Längen in der gewählten Einheit */
const qm = (a: number, b: number, jeCm: number): number => (a / jeCm / 100) * (b / jeCm / 100)

/** Wo ein Gaubensparren oben und unten endet */
const ENDET = { voll: 'Traufe und First', kehle: 'Kehle und First', grat: 'Traufe und Grat', beides: 'Kehle und Grat' }

/** Auswahl, von welchem Ende das Bandmaß angelegt wird */
const VON: Feld = {
  id: 'von',
  label: 'Bandmaß anlegen',
  art: 'select',
  vorgabe: 'links',
  optionen: [
    { wert: 'links', label: 'von links' },
    { wert: 'rechts', label: 'von rechts' },
  ],
}
const seite = (w: Werte): 'links' | 'rechts' => (w.von === 'rechts' ? 'rechts' : 'links')

/** Anrissliste mit fortlaufenden Maßen ab dem gewählten Ende */
const laufListe = (was: string, m: { kante: number; achse: number; ferneKante: number }[], von: 'links' | 'rechts'): Liste => ({
  titel: von === 'links' ? 'Anriss fortlaufend von links' : 'Anriss fortlaufend von rechts',
  kopf: [was, 'nahe Kante', 'Achse', 'ferne Kante'],
  arten: ['int', 'len', 'len', 'len'],
  zeilen: m.map((x, i) => [i + 1, x.kante, x.achse, x.ferneKante]),
})

const detail = (titel: string, z: Zeichnung | undefined): { titel: string; zeichnung: Zeichnung }[] => (z ? [{ titel, zeichnung: z }] : [])

export const GRUPPEN = ['Dach', 'Einteilung', 'Winkel & Maßkontrolle', 'Sonstiges', 'Dokumente']

export const RECHNER: Rechner[] = [
  /* ============ Dach ============ */
  {
    id: 'sparren',
    titel: 'Sparren',
    gruppe: 'Dach',
    kurz: 'Länge, Kerve, Obholz, Schnitte',
    info: 'Grundmaß und Überstand waagerecht messen, ab Außenkante Fußpfette. Die Kerventiefe wird winkelrecht zur Sparrenunterkante gemessen. Mittel- und Firstpfette bekommen dieselbe Kerventiefe wie die Fußpfette; ihre Oberkanten liegen dann um die angegebene Höhe über der Fußpfette. Anriss: Alle Lagen gelten entlang der Sparrenkante ab dem Senkel durch den Traufpunkt, an Ober- und Unterkante gleich – auch wenn die Traufe winkelrecht oder mit Waagschnitt abgeschnitten wird. Auf dem Kervensenkel das Obholz von der Oberkante herunter messen, das ergibt die Kervenecke; von dort läuft der Waagriss zur Unterkante. Am Alphawinkel die Dachneigung einstellen: Der Waagriss liegt im Winkel der Dachneigung zur Sparrenkante, der Senkelriss rechtwinklig dazu. Die Skala des eigenen Winkels vorher an einem bekannten Riss prüfen.',
    skizze: `<path ${S} d="M20 100 L150 22 L150 100"/><path ${D} d="M20 100 H150"/><text ${T} x="72" y="114">Grundmaß</text><text ${T} x="156" y="66">Firsthöhe</text><text ${T} text-anchor="middle" x="80" y="52" transform="rotate(-31 80 52)">Sparrenlänge</text><text ${T} x="44" y="96">α</text>`,
    felder: [
      { id: 'g', label: 'Grundmaß', art: 'len', hinweis: 'Außenkante Fußpfette bis Firstmitte' },
      { id: 'a', label: 'Dachneigung', art: 'ang', vorgabe: 35 },
      { id: 'ue', label: 'Dachüberstand (waagerecht)', art: 'len', vorgabe: 0, hinweis: 'bis zum Traufpunkt an der Sparrenoberkante' },
      { id: 'h', label: 'Sparrenhöhe', art: 'len' },
      { id: 'k', label: 'Kerventiefe', art: 'len', vorgabe: 0, hinweis: 'gilt für alle Pfetten' },
      {
        id: 'tr',
        label: 'Traufabschnitt',
        art: 'select',
        vorgabe: 'senkel',
        optionen: [
          { wert: 'senkel', label: 'lotrecht (Senkelschnitt)' },
          { wert: 'winkel', label: 'winkelrecht zur Sparrenkante' },
          { wert: 'kombi', label: 'Senkelschnitt mit Waagschnitt' },
        ],
      },
      {
        id: 'tv',
        label: 'Vorgabe am Traufabschnitt',
        art: 'select',
        vorgabe: 'hoehe',
        wenn: (w) => w.tr === 'kombi',
        optionen: [
          { wert: 'hoehe', label: 'Höhe des Senkelschnitts' },
          { wert: 'waag', label: 'Länge des Waagschnitts' },
        ],
      },
      { id: 'ts', label: 'Höhe Senkelschnitt an der Traufe', art: 'len', hinweis: 'lotrecht ab Oberkante, z. B. Höhe des Stirnbretts', wenn: (w) => w.tr === 'kombi' && w.tv !== 'waag' },
      { id: 'tw', label: 'Länge Waagschnitt an der Traufe', art: 'len', hinweis: 'waagerecht, z. B. Breite der Untersichtschalung', wenn: (w) => w.tr === 'kombi' && w.tv === 'waag' },
      { id: 'mp', label: 'Grundmaß bis Mittelpfette', art: 'len', optional: true, hinweis: 'waagerecht ab Außenkante Fußpfette bis zur traufseitigen Kante der Mittelpfette' },
      { id: 'fp', label: 'Breite Firstpfette', art: 'len', optional: true, hinweis: 'leer = ohne Firstpfette' },
    ],
    rechne: (w) => {
      const profil = w.tr === 'winkel' || w.tr === 'kombi' ? w.tr : 'senkel'
      const eingabe = {
        grundmass: zahl(w, 'g'),
        neigung: zahl(w, 'a'),
        ueberstand: zahl(w, 'ue'),
        sparrenhoehe: zahl(w, 'h'),
        kerve: zahl(w, 'k'),
        traufe: profil,
        stirn: profil === 'kombi' && w.tv !== 'waag' ? zahl(w, 'ts') : undefined,
        waagTraufe: profil === 'kombi' && w.tv === 'waag' ? zahl(w, 'tw') : undefined,
        mittelpfette: opt(w, 'mp'),
        firstpfette: opt(w, 'fp'),
      } as const
      const r = sparren(eingabe)
      const [mitUe, mitKerve] = [eingabe.ueberstand > 0, eingabe.kerve > 0]
      const tp = r.traufe.profil
      // Anrissliste in der Reihenfolge entlang des Sparrens
      const risse: [string, number][] = [
        [tp === 'winkel' ? 'Traufe: Winkelriss am Traufpunkt (Oberkante)' : 'Traufe: Senkelriss', 0],
        ...(tp === 'kombi' ? ([['Traufe: Ende des Waagschnitts an der Unterkante', r.traufe.waagEnde]] as [string, number][]) : []),
        ...(mitUe || mitKerve ? ([['Kerve: Senkelriss an Außenkante Fußpfette', r.anriss.kerveSenkel]] as [string, number][]) : []),
        ...(mitKerve ? ([['Kerve: Ende des Waagrisses an der Unterkante', r.anriss.kerveEnde]] as [string, number][]) : []),
        ...(r.mittelpfette ? ([['Mittelpfette: Senkelriss an der traufseitigen Kante', r.mittelpfette.senkel]] as [string, number][]) : []),
        ...(r.mittelpfette && mitKerve ? ([['Mittelpfette: Ende des Waagrisses an der Unterkante', r.mittelpfette.ende]] as [string, number][]) : []),
        ...(r.firstpfette ? ([['Firstpfette: Senkelriss an der traufseitigen Kante', r.firstpfette.senkel]] as [string, number][]) : []),
        ['First: Senkelriss', r.anriss.first],
      ]
      return {
        zeichnung: zeichneSparren(eingabe),
        details: [
          ...(mitUe ? detail(tp === 'senkel' ? 'Detail Traufe: Senkelschnitt' : tp === 'winkel' ? 'Detail Traufe: winkelrechter Abschnitt' : 'Detail Traufe: Senkelschnitt mit Waagschnitt', zeichneTraufe(eingabe.neigung, eingabe.sparrenhoehe, tp, r.traufe.stirn, w.tv === 'waag')) : []),
          ...detail('Detail Kerve Fußpfette', zeichneKerve(eingabe.neigung, eingabe.sparrenhoehe, eingabe.kerve, 'Fußpfette', r.anriss.kerveSenkel)),
          ...(r.mittelpfette ? detail('Detail Kerve Mittelpfette', zeichneKerve(eingabe.neigung, eingabe.sparrenhoehe, eingabe.kerve, 'Mittelpfette', r.mittelpfette.senkel)) : []),
          ...detail(r.firstpfette ? 'Detail First mit Firstpfette' : 'Detail First: Senkelschnitt', zeichneFirst(eingabe.neigung, eingabe.sparrenhoehe, eingabe.kerve, eingabe.firstpfette ?? 0, r.anriss.first, r.firstpfette?.senkel)),
        ],
        ausgaben: [
          L('Sparrenlänge gesamt', r.laengeGesamt, true),
          L('davon Fußpfette bis First', r.laengeGrund),
          L('davon Überstand', r.laengeUeberstand),
          L('Holzlänge mindestens (mit Schnittschrägen)', r.rohlaenge),
          L('Firsthöhe über Auflager', r.firsthoehe),
          L('Lotschnitt (Senkel)', r.lotschnitt),
          L('Waagschnitt', r.waagschnitt),
          L('Obholz lotrecht', r.obholz),
          L('Kerve: Auflage waagerecht', r.kervenSattel),
          L('Kerve: Wange lotrecht', r.kervenLot),
          ...(tp === 'winkel' ? [L('Traufe: Unterkante steht waagerecht vor', r.traufe.vorsprung)] : []),
          ...(tp === 'kombi' ? [L('Traufe: Höhe des Senkelschnitts', r.traufe.stirn), L('Traufe: Länge des Waagschnitts', r.traufe.waag)] : []),
          ...(r.mittelpfette ? [L('Mittelpfette: Oberkante über Oberkante Fußpfette', r.mittelpfette.hoehe)] : []),
          ...(r.firstpfette ? [L('Firstpfette: Oberkante über Oberkante Fußpfette', r.firstpfette.hoehe), ...(mitKerve ? [L('Firstpfette: Auflage waagerecht', r.firstpfette.auflage)] : [])] : []),
          W('Anriss: Senkelriss zur Sparrenkante', r.anriss.winkelSenkel, true),
          W('Anriss: Waagriss zur Sparrenkante', r.anriss.winkelWaage, true),
          L('Versatz Senkelriss über die Sparrenhöhe', r.anriss.versatzSenkel),
          L('Versatz Waagriss über die Sparrenhöhe', r.anriss.versatzWaage),
        ],
        liste: {
          titel: 'Anriss am Sparren, ab Traufpunkt entlang der Kante',
          kopf: ['Nr.', 'Riss', 'Lage'],
          arten: ['int', 'wort', 'len'],
          zeilen: risse.map((z, i) => [i + 1, z[0], z[1]]),
        },
      }
    },
  },
  {
    id: 'grat',
    titel: 'Grat- und Kehlsparren',
    gruppe: 'Dach',
    kurz: 'Gratlänge, Gratneigung, Abgratung',
    info: 'Gilt für Grat und Kehle, auch bei ungleichen Dachneigungen. Die Abgratung ist lotrecht gemessen. Die Gratverschiebung ist ein Grundrissmaß quer zur Gratlinie. Der Verstich ist ein Grundrissmaß in Gratrichtung: der Versatz der Sparrenkante gegenüber der Achse an der Traufe. Der Hexenschnitt wird an der Seitenfläche zur Gratoberkante angerissen. Am Anfallspunkt endet der Grat mit zwei lotrechten Backen, die sich auf der Achse treffen; gerechnet ist bis zum Anfallspunkt, halbe Holzstärken der anschließenden Hölzer selbst abziehen. Die Kerve bezieht sich auf die Außenecke der Fußpfetten: An jeder Seitenfläche sitzt ihr Senkelriss um den Verstich weiter innen, das Obholz gilt dort ab der abgegrateten Kante. Die Details 4 bis 6 gelten für den Grat, nicht für die Kehle. Die Schifterliste gilt für den Grat: Länge der Schifterachse in der Dachfläche ab Traufe, ohne Überstand. Die Lage ist immer ab Gratfuß angegeben, auch wenn das Raster am Anfallspunkt beginnt.',
    skizze: `<path ${S} d="M20 100 H200 V25"/><path ${S} d="M200 100 L110 25 H200"/><path ${D} d="M110 25 V100"/><text ${T} text-anchor="end" x="200" y="16">Grundmaß Walm</text><text ${T} x="20" y="66">Grundmaß HD</text><text ${T} x="160" y="52">Grat</text><text ${T} x="20" y="115">Traufe Hauptdach</text>`,
    felder: [
      { id: 'ah', label: 'Neigung Hauptdach', art: 'ang', vorgabe: 35 },
      { id: 'aw', label: 'Neigung Walm', art: 'ang', vorgabe: 35 },
      { id: 'x', label: 'Grundmaß Hauptdach', art: 'len', hinweis: 'waagerecht von Traufe bis First' },
      { id: 'b', label: 'Breite Grat-/Kehlsparren', art: 'len', vorgabe: 0 },
      { id: 'e', label: 'Sparrenabstand für Schifterliste', art: 'len', optional: true },
      {
        id: 'ra',
        label: 'Schifterraster ab',
        art: 'select',
        vorgabe: 'fuss',
        optionen: [
          { wert: 'fuss', label: 'Gratfuß (Ecke)' },
          { wert: 'anfall', label: 'Anfallspunkt (First)' },
        ],
      },
      { id: 'th', label: 'Traufabschnitt Hauptdach', art: 'ang', vorgabe: 90, hinweis: 'zur Sparrenoberkante: 90° = winkelrecht, 90° + Dachneigung = lotrecht' },
      { id: 'tw', label: 'Traufabschnitt Walm', art: 'ang', vorgabe: 90 },
      { id: 'hg', label: 'Höhe Grat-/Kehlsparren', art: 'len', optional: true, hinweis: 'für Hexenschnitt und Kerve' },
      { id: 'ob', label: 'Obholz lotrecht der Sparren', art: 'len', optional: true, hinweis: 'für die Kerve; Wert aus dem Sparren-Rechner' },
    ],
    rechne: (w) => {
      const eingabe = { neigungHaupt: zahl(w, 'ah'), neigungWalm: zahl(w, 'aw'), grundmassHaupt: zahl(w, 'x'), breite: zahl(w, 'b'), abschnittHaupt: zahl(w, 'th'), abschnittWalm: zahl(w, 'tw') }
      const r = grat(eingabe)
      const mitBreite = zahl(w, 'b') > 0
      const abstand = opt(w, 'e')
      const s = abstand ? schifter(eingabe, abstand, w.ra === 'anfall' ? 'anfall' : 'fuss') : undefined
      const ungleich = mitBreite && Math.abs(zahl(w, 'ah') - zahl(w, 'aw')) > 1e-9
      const hg = opt(w, 'hg')
      const ob = opt(w, 'ob')
      const an = mitBreite ? gratAnfall(eingabe) : undefined
      const kerve = mitBreite && hg && ob ? gratKerve(eingabe, hg, ob) : undefined
      const lotGrat = hg ? hg / Math.cos((r.gratNeigung * Math.PI) / 180) : undefined
      const hexeGleich = Math.abs(r.hexeHaupt - r.hexeWalm) < 1e-9 && Math.abs(r.abgratungHaupt - r.abgratungWalm) < 1e-9
      const schifterListe = (titel: string, z: { abstand: number; achse: number; kante: number }[]): Liste => ({
        titel,
        kopf: ['Nr.', 'ab Gratfuß', 'bis Gratachse', 'bis Gratkante'],
        arten: ['int', 'len', 'len', 'len'],
        zeilen: z.map((x, i) => [i + 1, x.abstand, x.achse, x.kante]),
      })
      return {
        zeichnung: zeichneGrat(zahl(w, 'x'), r.grundmassWalm, s?.haupt.map((z) => z.abstand) ?? [], s?.walm.map((z) => z.abstand) ?? []),
        details: [
          ...detail('Detail 1: Seitenansicht mit wahrer Länge', zeichneGratSeite(r.gratGrund, r.hoehe, r.gratNeigung)),
          ...(mitBreite
            ? [
                ...detail('Detail 2: Grundriss am Gratfuß mit Verstich', zeichneGratFuss(zahl(w, 'x'), r.grundmassWalm, zahl(w, 'b'), r.winkelHaupt, r.winkelWalm)),
                ...detail('Detail 3: Querschnitt mit Abgratung, lotrecht geschnitten', zeichneGratQuerschnitt(zahl(w, 'b'), r.abgratungHaupt, r.abgratungWalm)),
              ]
            : []),
          ...(hexeGleich
            ? detail('Detail 4: Hexenschnitt am Fuß, beide Seiten gleich', zeichneHexenschnitt(r.gratNeigung, r.hexeHaupt, lotGrat ? lotGrat - r.abgratungHaupt : undefined))
            : [
                ...detail('Detail 4: Hexenschnitt am Fuß, Hauptdachseite', zeichneHexenschnitt(r.gratNeigung, r.hexeHaupt, lotGrat ? lotGrat - r.abgratungHaupt : undefined)),
                ...detail('Detail 4: Hexenschnitt am Fuß, Walmseite', zeichneHexenschnitt(r.gratNeigung, r.hexeWalm, lotGrat ? lotGrat - r.abgratungWalm : undefined)),
              ]),
          ...(an ? detail('Detail 5: Grundriss am Anfallspunkt mit den Backen', zeichneGratAnfall(zahl(w, 'x'), r.grundmassWalm, zahl(w, 'b'), an.planHaupt, an.planWalm)) : []),
          ...(kerve
            ? [
                ...detail('Detail 6: Kerve, Ansicht der Hauptdachseite – Strichpunktlinie: Senkel durch die Pfettenecke', zeichneGratKerve(r.gratNeigung, kerve.haupt.verstich, kerve.haupt.wange, kerve.haupt.sattel, ob as number)),
                ...detail('Detail 6: Kerve, Ansicht der Walmseite – Strichpunktlinie: Senkel durch die Pfettenecke', zeichneGratKerve(r.gratNeigung, kerve.walm.verstich, kerve.walm.wange, kerve.walm.sattel, ob as number)),
              ]
            : []),
        ],
        ausgaben: [
          L('Gratsparrenlänge', r.gratLaenge, true),
          W('Gratneigung', r.gratNeigung, true),
          L('Gratgrundmaß', r.gratGrund),
          L('Grundmaß Walm', r.grundmassWalm),
          L('Firsthöhe', r.hoehe),
          W('Grundwinkel zur Hauptdach-Traufe', r.winkelHaupt),
          W('Grundwinkel zur Walm-Traufe', r.winkelWalm),
          W('Schifterwinkel in der Fläche (Hauptdach)', r.schmiegeHaupt),
          W('Schifterwinkel in der Fläche (Walm)', r.schmiegeWalm),
          W('Hexenschnitt (Hauptdach)', r.hexeHaupt),
          W('Hexenschnitt (Walm)', r.hexeWalm),
          ...(mitBreite
            ? [
                L('Abgratung lotrecht (Hauptdach)', r.abgratungHaupt),
                L('Abgratung lotrecht (Walm)', r.abgratungWalm),
                L('Verstich im Grundriss (Hauptdach)', r.verstichHaupt),
                L('Verstich im Grundriss (Walm)', r.verstichWalm),
                ...(ungleich
                  ? [L(r.verschiebung > 0 ? 'Gratverschiebung zur Walmseite' : 'Gratverschiebung zur Hauptdachseite', Math.abs(r.verschiebung)), L('Abgratung lotrecht nach Verschiebung (beide Seiten)', r.abgratungGleich)]
                  : []),
              ]
            : []),
          ...(an
            ? [
                W('Anfallspunkt: Backenschmiege oben (Hauptdachseite)', an.schmiegeHaupt),
                W('Anfallspunkt: Backenschmiege oben (Walmseite)', an.schmiegeWalm),
                L('Anfallspunkt: Rücksprung an der Kante (Hauptdachseite)', an.rueckHauptKante),
                L('Anfallspunkt: Rücksprung an der Kante (Walmseite)', an.rueckWalmKante),
              ]
            : []),
          ...(kerve
            ? [
                L('Kerve: Wange lotrecht (Hauptdachseite)', kerve.haupt.wange),
                L('Kerve: Wange lotrecht (Walmseite)', kerve.walm.wange),
                L('Kerve: Waagriss in Gratrichtung (Hauptdachseite)', kerve.haupt.sattel),
                L('Kerve: Waagriss in Gratrichtung (Walmseite)', kerve.walm.sattel),
                L('Kerve: Versatz des Senkels an der Kante (Hauptdachseite)', kerve.haupt.verstichKante),
                L('Kerve: Versatz des Senkels an der Kante (Walmseite)', kerve.walm.verstichKante),
              ]
            : []),
        ],
        hinweise: !mitBreite ? [] : ungleich ? ['Ungleiche Neigungen: Mittig auf der Gratlinie sind die Abgratungen verschieden hoch. Mit der Gratverschiebung werden sie gleich. Schifterlängen und Verstich gelten für den mittigen Grat.'] : [],
        listen: s ? [schifterListe('Schifter Hauptdach', s.haupt), schifterListe('Schifter Walm', s.walm)] : [],
      }
    },
  },
  {
    id: 'kehlbalken',
    titel: 'Kehlbalken / Zange',
    gruppe: 'Dach',
    kurz: 'Länge und Abschnitt zwischen den Sparren',
    info: 'Bezugslinie ist die Höhe, auf der die lichte Weite zwischen den Sparrenunterkanten gemessen wird (z. B. Oberkante Fußpfette oder Decke). Der Kehlbalken sitzt stumpf zwischen den Sparren; für Zangen die Sparrenbreiten selbst zugeben.',
    skizze: `<path ${S} d="M20 98 L120 13 L220 98"/><path ${S} d="M67 58 H173 M79 48 H161"/><path ${D} d="M20 98 H220"/><text ${T} text-anchor="middle" x="120" y="113">lichte Weite</text><text ${T} text-anchor="middle" x="120" y="74">Kehlbalken</text>`,
    felder: [
      { id: 'w', label: 'Lichte Weite auf der Bezugslinie', art: 'len' },
      { id: 'a', label: 'Dachneigung', art: 'ang', vorgabe: 35 },
      { id: 'h', label: 'UK Kehlbalken über Bezugslinie', art: 'len' },
      { id: 'hk', label: 'Höhe Kehlbalken', art: 'len' },
    ],
    rechne: (w) => {
      const r = kehlbalken({ weite: zahl(w, 'w'), neigung: zahl(w, 'a'), hoeheUnten: zahl(w, 'h'), balkenhoehe: zahl(w, 'hk') })
      return {
        zeichnung: zeichneKehlbalken(zahl(w, 'w'), zahl(w, 'a'), zahl(w, 'h'), zahl(w, 'hk')),
        ausgaben: [
          L('Länge Unterkante', r.laengeUnten, true),
          L('Länge Oberkante', r.laengeOben, true),
          W('Abschnitt an beiden Enden', r.abschnitt),
          L('Riss am Sparren ab Bezugslinie', r.rissSparren),
          L('Spitze der Sparrenunterkanten über Bezugslinie', r.firstUeberBezug),
          L('OK Kehlbalken bis zu dieser Spitze', r.restBisFirst),
        ],
      }
    },
  },
  {
    id: 'lattung',
    titel: 'Lattung / Ziegel',
    gruppe: 'Dach',
    kurz: 'Lattweite und Reihen aus der Decklänge',
    info: 'Die Decklängen und der Lattenabstand zum First (LAF) stehen im Datenblatt des Ziegels. Positionen sind ab Traufkante bis Oberkante Latte gemessen.',
    felder: [
      { id: 'sl', label: 'Sparrenlänge', art: 'len', hinweis: 'Traufkante bis Firstpunkt, auf der Konterlatte gemessen' },
      { id: 't', label: 'Traufkante bis OK erste Latte', art: 'len' },
      { id: 'f', label: 'OK letzte Latte bis First (LAF)', art: 'len', vorgabe: 0 },
      { id: 'min', label: 'Decklänge min.', art: 'len' },
      { id: 'max', label: 'Decklänge max.', art: 'len' },
    ],
    rechne: (w) => {
      const r = lattung({ sparrenlaenge: zahl(w, 'sl'), traufe: zahl(w, 't'), first: zahl(w, 'f'), deckMin: zahl(w, 'min'), deckMax: zahl(w, 'max') })
      return {
        ausgaben: [
          L('Lattweite', r.lattweite, true),
          { label: 'Ziegelreihen (= Lattenreihen)', wert: r.latten, art: 'int', wichtig: true },
          { label: 'Lattabstände', wert: r.reihen, art: 'int' },
          L('Einzuteilende Strecke', r.strecke),
        ],
        hinweise: r.passt ? [] : ['Die Lattweite liegt unter der min. Decklänge. Trauf- oder Firstabstand anpassen.'],
        liste: {
          titel: 'Lattenpositionen ab Traufkante',
          kopf: ['Latte', 'Oberkante'],
          arten: ['int', 'len'],
          zeilen: r.positionen.map((p, i) => [i + 1, p]),
        },
      }
    },
  },
  {
    id: 'pultdach',
    titel: 'Pultdach',
    gruppe: 'Dach',
    kurz: 'Sparrenlänge und Höhenunterschied',
    info: 'Breite und Überstände waagerecht messen, zwischen den Außenkanten der beiden Auflager.',
    skizze: `<path ${S} d="M30 95 L210 35"/><path ${D} d="M50 88 H190 V42"/><text ${T} x="98" y="104">Breite</text><text ${T} x="196" y="70">Höhe</text><text ${T} x="84" y="58">Sparren</text>`,
    felder: [
      { id: 'b', label: 'Breite zwischen den Auflagern', art: 'len' },
      { id: 'a', label: 'Dachneigung', art: 'ang', vorgabe: 10 },
      { id: 'ut', label: 'Überstand unten (waagerecht)', art: 'len', vorgabe: 0 },
      { id: 'uh', label: 'Überstand oben (waagerecht)', art: 'len', vorgabe: 0 },
      { id: 'l', label: 'Trauflänge für die Fläche', art: 'len', optional: true },
    ],
    rechne: (w, k) => {
      const r = pultdach({ breite: zahl(w, 'b'), neigung: zahl(w, 'a'), ueberstandTief: zahl(w, 'ut'), ueberstandHoch: zahl(w, 'uh') })
      const l = opt(w, 'l')
      return {
        zeichnung: zeichnePultdach(zahl(w, 'b'), zahl(w, 'ut'), zahl(w, 'uh'), zahl(w, 'a')),
        ausgaben: [
          L('Sparrenlänge gesamt', r.sparrenlaenge, true),
          L('davon zwischen den Auflagern', r.laengeAuflager),
          L('Höhenunterschied der Auflager', r.hoehe, true),
          L('Höhenunterschied Traufe bis First', r.hoeheGesamt),
          ...(l ? [{ label: 'Dachfläche', wert: qm(r.sparrenlaenge, l, k.jeCm), art: 'num', einheit: 'm²', stellen: 2 } as Ausgabe] : []),
        ],
      }
    },
  },
  {
    id: 'zeltdach',
    titel: 'Zelt- und Turmdach',
    gruppe: 'Dach',
    kurz: 'Grate und Fläche über dem Vieleck',
    info: 'Für Dächer über einem regelmäßigen Vieleck, bei denen alle Grate in einer Spitze zusammenlaufen. Vier Seiten ergeben das Zeltdach über dem Quadrat.',
    felder: [
      { id: 'n', label: 'Anzahl Seiten', art: 'int', vorgabe: 4 },
      { id: 'a', label: 'Seitenlänge (Traufe)', art: 'len' },
      { id: 'w', label: 'Dachneigung', art: 'ang', vorgabe: 35 },
    ],
    rechne: (w, k) => {
      const r = zeltdach(zahl(w, 'n'), zahl(w, 'a'), zahl(w, 'w'))
      return {
        zeichnung: zeichneZeltdach(zahl(w, 'n'), zahl(w, 'a'), r.gratGrund),
        ausgaben: [
          L('Gratsparrenlänge', r.gratLaenge, true),
          W('Gratneigung', r.gratNeigung, true),
          L('Mittelsparren (Traufmitte bis Spitze)', r.sparrenlaenge),
          L('Höhe der Spitze', r.hoehe),
          L('Gratgrundmaß', r.gratGrund),
          W('Grundwinkel Grat zur Traufe', r.grundwinkel),
          { label: 'Dachfläche gesamt', wert: qm(zahl(w, 'n') * zahl(w, 'a'), r.sparrenlaenge / 2, k.jeCm), art: 'num', einheit: 'm²', stellen: 2 },
        ],
      }
    },
  },
  {
    id: 'gaube',
    titel: 'Schleppgaube',
    gruppe: 'Dach',
    kurz: 'Gaubensparren und Anschluss am Hauptdach',
    info: 'Die Fronthöhe ist lotrecht gemessen, von der Hauptdachfläche bis zur Gaubendachfläche an der Gaubenfront. Alle Längen ohne Dachüberstand und ohne Holzstärken.',
    skizze: `<path ${S} d="M20 105 L200 15"/><path ${S} d="M70 80 V45 L150 40"/><path ${D} d="M70 80 H150 V40"/><text ${T} text-anchor="end" x="64" y="66">Fronthöhe</text><text ${T} x="96" y="94">Lauf</text><text ${T} x="92" y="34">Gaube</text><text ${T} x="160" y="64">Hauptdach</text>`,
    felder: [
      { id: 'ah', label: 'Neigung Hauptdach', art: 'ang', vorgabe: 45 },
      { id: 'ag', label: 'Neigung Gaube', art: 'ang', vorgabe: 15 },
      { id: 'h', label: 'Fronthöhe', art: 'len' },
      { id: 'b', label: 'Gaubenbreite für die Fläche', art: 'len', optional: true },
    ],
    rechne: (w, k) => {
      const r = schleppgaube({ neigungHaupt: zahl(w, 'ah'), neigungGaube: zahl(w, 'ag'), hoeheFront: zahl(w, 'h') })
      const b = opt(w, 'b')
      return {
        zeichnung: zeichneGaube(zahl(w, 'ah'), zahl(w, 'ag'), zahl(w, 'h'), r.lauf),
        ausgaben: [
          L('Gaubensparren', r.sparrenGaube, true),
          L('Anschlusslänge auf dem Hauptdach', r.anschlussHaupt, true),
          L('Lauf (waagerecht)', r.lauf),
          W('Winkel Gaubensparren zum Hauptdach', r.anschlusswinkel),
          { label: 'Wangenfläche je Seite', wert: qm(zahl(w, 'h'), r.lauf / 2, k.jeCm), art: 'num', einheit: 'm²', stellen: 2 },
          ...(b ? [{ label: 'Dachfläche Gaube', wert: qm(r.sparrenGaube, b, k.jeCm), art: 'num', einheit: 'm²', stellen: 2 } as Ausgabe] : []),
        ],
      }
    },
  },
  {
    id: 'sattelgaube',
    titel: 'Sattel- und Walmgaube',
    gruppe: 'Dach',
    kurz: 'First, Kehle, Sparren und Walm der Gaube',
    info: 'Die Traufhöhe ist lotrecht gemessen, von der Hauptdachfläche bis zur Gaubentraufe an der Gaubenfront. Trauf- und Firstlänge sind waagerecht von der Front bis zum Hauptdach gemessen. Alle Längen ohne Dachüberstand und ohne Holzstärken. Bei der Walmgaube zählt die Firstlänge ab dem Anfallspunkt des Walms. Die Sparrenliste zählt im Raster ab der Front, ohne den Sparren an der Front selbst, und gibt die Länge bis zur Achse von First, Kehle und Grat an. Die Schifter im Walm sind für den mittig sitzenden Grat gerechnet. Die Zeichnung zeigt den Grundriss mit der Front unten.',
    felder: [
      { id: 'ah', label: 'Neigung Hauptdach', art: 'ang', vorgabe: 45 },
      { id: 'ag', label: 'Neigung Gaube', art: 'ang', vorgabe: 45 },
      { id: 'b', label: 'Gaubenbreite (Traufe bis Traufe)', art: 'len' },
      { id: 'h', label: 'Traufhöhe über dem Hauptdach an der Front', art: 'len' },
      {
        id: 'f',
        label: 'Front',
        art: 'select',
        vorgabe: 'giebel',
        optionen: [
          { wert: 'giebel', label: 'Giebel (Satteldachgaube)' },
          { wert: 'walm', label: 'Walm (Walmgaube)' },
        ],
      },
      { id: 'aw', label: 'Neigung Walm', art: 'ang', vorgabe: 45, wenn: (w) => w.f === 'walm' },
      { id: 'gb', label: 'Breite Gratsparren', art: 'len', vorgabe: 0, wenn: (w) => w.f === 'walm' },
      { id: 'e', label: 'Sparrenabstand für die Sparrenliste', art: 'len', optional: true },
    ],
    rechne: (w, k) => {
      const eingabe = { neigungHaupt: zahl(w, 'ah'), neigungGaube: zahl(w, 'ag'), breite: zahl(w, 'b'), hoeheTraufe: zahl(w, 'h') }
      const wg = w.f === 'walm' ? walmgaube({ ...eingabe, neigungWalm: zahl(w, 'aw'), gratbreite: zahl(w, 'gb') }) : undefined
      const r = wg ?? sattelgaube(eingabe)
      const raster = opt(w, 'e')
      return {
        zeichnung: zeichneSattelgaube(zahl(w, 'b'), r.trauflaenge, r.trauflaenge + r.kehlGrund * Math.cos((r.kehlWinkel * Math.PI) / 180), r.kehlGrund, wg?.walmGrund ?? 0),
        ausgaben: [
          L('Kehlsparrenlänge', r.kehlLaenge, true),
          W('Kehlneigung', r.kehlNeigung, true),
          L('Gaubensparren', r.sparren, true),
          L(wg ? 'Firstlänge (Anfallspunkt bis Hauptdach)' : 'Firstlänge (Front bis Hauptdach)', r.firstlaenge),
          L('Trauflänge (Front bis Hauptdach)', r.trauflaenge),
          L('First über Gaubentraufe', r.firstUeberTraufe),
          L('Kehlgrundmaß', r.kehlGrund),
          W('Grundwinkel Kehle zum Gaubenfirst', r.kehlWinkel),
          ...(wg
            ? [
                L('Walm: Gratsparrenlänge', wg.grat.gratLaenge),
                W('Walm: Gratneigung', wg.grat.gratNeigung),
                L('Walm: Mittelsparren', wg.walmsparren),
                L('Walm: Grundmaß (Front bis Anfallspunkt)', wg.walmGrund),
                ...(zahl(w, 'gb') > 0 ? [L('Walm: Abgratung lotrecht nach Verschiebung', wg.grat.abgratungGleich)] : []),
              ]
            : []),
          { label: 'Dachfläche Gaube', wert: r.flaeche / (k.jeCm * 100) ** 2, art: 'num', einheit: 'm²', stellen: 2 },
        ],
        listen: [
          ...(raster
            ? [
                {
                  titel: 'Sparren je Gaubenseite',
                  kopf: ['Nr.', 'ab Front', 'Länge', 'endet an'],
                  arten: ['int', 'len', 'len', 'wort'] as Liste['arten'],
                  zeilen: gaubenSparrenliste(eingabe, raster, wg?.walmGrund ?? 0).map((z, i) => [i + 1, z.lage, z.laenge, ENDET[z.art]]),
                },
              ]
            : []),
          ...(raster && wg ? [{ titel: 'Schifter im Walm (Front)', kopf: ['Nr.', 'ab Ecke', 'bis Gratachse', 'bis Gratkante'], arten: ['int', 'len', 'len', 'len'] as Liste['arten'], zeilen: schifter({ neigungHaupt: zahl(w, 'ag'), neigungWalm: zahl(w, 'aw'), grundmassHaupt: zahl(w, 'b') / 2, breite: zahl(w, 'gb') }, raster).walm.map((z, i) => [i + 1, z.abstand, z.achse, z.kante]) }] : []),
        ],
      }
    },
  },
  {
    id: 'dachfenster',
    titel: 'Wechsel am Dachfenster',
    gruppe: 'Dach',
    kurz: 'Passt das Fenster ins Sparrenfeld?',
    info: 'Die Einbauluft steht in der Einbauanleitung des Fensterherstellers. Müssen Sparren gekappt werden, ist die Auswechslung statisch zu klären.',
    felder: [
      { id: 'fb', label: 'Fensterbreite (Blendrahmen außen)', art: 'len' },
      { id: 'fh', label: 'Fensterhöhe (Blendrahmen außen)', art: 'len' },
      { id: 'ls', label: 'Einbauluft je Seite', art: 'len' },
      { id: 'lh', label: 'Einbauluft oben und unten zusammen', art: 'len' },
      { id: 'e', label: 'Achsmaß der Sparren', art: 'len' },
      { id: 's', label: 'Sparrenbreite', art: 'len' },
    ],
    rechne: (w) => {
      const r = dachfensterWechsel({ fensterbreite: zahl(w, 'fb'), fensterhoehe: zahl(w, 'fh'), luftSeite: zahl(w, 'ls'), luftHoehe: zahl(w, 'lh'), achsmass: zahl(w, 'e'), sparrenbreite: zahl(w, 's') })
      return {
        zeichnung: zeichneDachfenster(zahl(w, 'fb'), zahl(w, 'fh'), zahl(w, 'e'), zahl(w, 's'), r.gekappt, r.wechsellaenge, r.wechselabstand),
        ausgaben: [
          { label: 'Sparren kappen', wert: r.gekappt, art: 'int', wichtig: true },
          L('Wechsellänge (licht zwischen den Sparren)', r.wechsellaenge, true),
          L('Lichter Abstand der Wechsel', r.wechselabstand, true),
          L('Benötigte lichte Breite', r.bedarf),
          L('Rest je Seite bei mittigem Einbau', r.restJeSeite),
        ],
        hinweise: r.gekappt > 0 ? ['Sparren werden gekappt – Wechsel und Nachbarsparren statisch nachweisen lassen.'] : [],
      }
    },
  },
  {
    id: 'dachflaeche',
    titel: 'Dachfläche Satteldach',
    gruppe: 'Dach',
    kurz: 'Fläche aus Grundriss und Neigung',
    felder: [
      { id: 'l', label: 'Gebäudelänge (Traufseite)', art: 'num', einheit: 'm' },
      { id: 'b', label: 'Gebäudebreite (Giebelseite)', art: 'num', einheit: 'm' },
      { id: 'a', label: 'Dachneigung', art: 'ang', vorgabe: 35 },
      { id: 'ut', label: 'Überstand Traufe (waagerecht)', art: 'num', einheit: 'm', vorgabe: 0 },
      { id: 'uo', label: 'Überstand Ortgang', art: 'num', einheit: 'm', vorgabe: 0 },
    ],
    rechne: (w) => {
      const r = dachflaecheSattel({ laenge: zahl(w, 'l'), breite: zahl(w, 'b'), neigung: zahl(w, 'a'), ueberstandTraufe: zahl(w, 'ut'), ueberstandOrtgang: zahl(w, 'uo') })
      const m = (label: string, wert: number, einheit: string, wichtig = false): Ausgabe => ({ label, wert, art: 'num', einheit, wichtig, stellen: 2 })
      return {
        ausgaben: [
          m('Dachfläche gesamt', r.flaeche, 'm²', true),
          m('je Dachseite', r.flaecheSeite, 'm²'),
          m('Sparrenlänge', r.sparrenlaenge, 'm'),
          m('Trauflänge', r.trauflaenge, 'm'),
          m('Firsthöhe', r.firsthoehe, 'm'),
        ],
      }
    },
  },
  {
    id: 'neigung',
    titel: 'Neigung umrechnen',
    gruppe: 'Dach',
    kurz: 'Grad, Prozent, cm je Meter',
    felder: [
      {
        id: 'von',
        label: 'Gegeben',
        art: 'select',
        vorgabe: 'grad',
        optionen: [
          { wert: 'grad', label: 'Grad' },
          { wert: 'prozent', label: 'Prozent' },
          { wert: 'mass', label: 'Höhe und Länge' },
        ],
      },
      { id: 'grad', label: 'Neigung', art: 'ang', wenn: (w) => w.von === 'grad' },
      { id: 'proz', label: 'Neigung', art: 'num', einheit: '%', wenn: (w) => w.von === 'prozent' },
      { id: 'h', label: 'Höhe', art: 'len', wenn: (w) => w.von === 'mass' },
      { id: 'l', label: 'Länge (waagerecht)', art: 'len', wenn: (w) => w.von === 'mass' },
    ],
    rechne: (w) => {
      const r = w.von === 'grad' ? neigungAusGrad(zahl(w, 'grad')) : w.von === 'prozent' ? neigungAusProzent(zahl(w, 'proz')) : neigungAusMass(zahl(w, 'h'), zahl(w, 'l'))
      return {
        ausgaben: [
          W('Neigung', r.grad, true),
          { label: 'Neigung', wert: r.prozent, art: 'num', einheit: '%', wichtig: true, stellen: 2 },
          { label: 'Steigung je Meter', wert: r.cmProMeter, art: 'num', einheit: 'cm', stellen: 1 },
          { label: 'Verhältnis 1 :', wert: r.verhaeltnis, art: 'num', stellen: 2 },
        ],
      }
    },
  },

  /* ============ Einteilung ============ */
  {
    id: 'einteilung',
    titel: 'Einteilung',
    gruppe: 'Einteilung',
    kurz: 'Stäbe, Latten, Pfosten gleichmäßig verteilen',
    info: 'Außenmaß: ein Stab an jedem Ende. Eckmaß: Stab nur am Ende. Innenmaß: an beiden Enden ein Feld. Die Anrissliste ist fortlaufend: Das Bandmaß bleibt am gewählten Ende eingehängt, jedes Maß zählt ab dort. „Nahe Kante“ ist die Stabkante, die dem Bandanfang zugewandt ist.',
    felder: [
      {
        id: 'art',
        label: 'Art der Einteilung',
        art: 'select',
        vorgabe: 'aussen',
        optionen: [
          { wert: 'aussen', label: 'Außenmaß' },
          { wert: 'ecke', label: 'Eckmaß' },
          { wert: 'innen', label: 'Innenmaß' },
        ],
      },
      { id: 'b', label: 'Breite', art: 'len' },
      { id: 't', label: 'Materialstärke', art: 'len' },
      {
        id: 'modus',
        label: 'Vorgabe',
        art: 'select',
        vorgabe: 'achs',
        optionen: [
          { wert: 'achs', label: 'max. Achsmaß' },
          { wert: 'anzahl', label: 'Anzahl Stäbe' },
        ],
      },
      { id: 'amax', label: 'max. Achsmaß', art: 'len', wenn: (w) => w.modus === 'achs' },
      { id: 'n', label: 'Anzahl Stäbe', art: 'int', wenn: (w) => w.modus === 'anzahl' },
      VON,
    ],
    rechne: (w) => {
      const art = w.art as EinteilArt
      const n = w.modus === 'achs' ? stabAnzahl(zahl(w, 'b'), zahl(w, 't'), zahl(w, 'amax'), art) : zahl(w, 'n')
      const r = einteilung(zahl(w, 'b'), zahl(w, 't'), n, art)
      return {
        zeichnung: zeichneEinteilung(zahl(w, 'b'), zahl(w, 't'), r.positionen, seite(w), 'b'),
        ausgaben: [
          L('Lichtes Maß (Feld)', r.feldbreite, true),
          L('Achsmaß', r.achsmass, true),
          { label: 'Anzahl Stäbe', wert: r.anzahl, art: 'int' },
          { label: 'Anzahl Felder', wert: r.felder, art: 'int' },
        ],
        liste: laufListe('Stab', laufmasse(r.positionen, zahl(w, 't'), zahl(w, 'b'), seite(w)), seite(w)),
      }
    },
  },
  {
    id: 'sparreneinteilung',
    titel: 'Sparreneinteilung',
    gruppe: 'Einteilung',
    kurz: 'Achsmaß und Anriss auf der Pfette',
    info: 'Gemessen ab Außenkante Giebel. Der erste und der letzte Sparren sitzen im Randabstand zur Giebelkante. Die Anrissliste ist fortlaufend: Das Bandmaß bleibt am gewählten Giebel eingehängt, jedes Maß zählt ab dort.',
    felder: [
      { id: 'l', label: 'Länge Giebel bis Giebel (außen)', art: 'len' },
      { id: 's', label: 'Sparrenbreite', art: 'len' },
      { id: 'r', label: 'Randabstand', art: 'len', vorgabe: 0, hinweis: 'Giebelkante bis Außenkante erster Sparren' },
      { id: 'a', label: 'max. Achsmaß', art: 'len' },
      VON,
    ],
    rechne: (w) => {
      const r = sparrenEinteilung({ laenge: zahl(w, 'l'), sparrenbreite: zahl(w, 's'), randabstand: zahl(w, 'r'), maxAchs: zahl(w, 'a') })
      return {
        zeichnung: zeichneEinteilung(zahl(w, 'l'), zahl(w, 's'), r.sparren.map((p) => p.kante), seite(w), 'l'),
        ausgaben: [
          L('Achsmaß', r.achsmass, true),
          { label: 'Anzahl Sparren', wert: r.anzahl, art: 'int', wichtig: true },
          L('Lichtes Maß', r.lichtesMass),
          { label: 'Anzahl Felder', wert: r.felder, art: 'int' },
        ],
        liste: laufListe('Sparren', laufmasse(r.sparren.map((p) => p.kante), zahl(w, 's'), zahl(w, 'l'), seite(w)), seite(w)),
      }
    },
  },

  /* ============ Winkel & Maßkontrolle ============ */
  {
    id: 'diagonale',
    titel: 'Diagonalkontrolle',
    gruppe: 'Winkel & Maßkontrolle',
    kurz: 'Ist das Rechteck im Winkel?',
    info: 'Sind beide Diagonalen gleich lang, ist das Rechteck im Winkel. Die gemessenen Diagonalen sind freiwillig.',
    skizze: `<rect ${S} x="20" y="20" width="170" height="80"/><path ${D} d="M20 100 L190 20 M20 20 L190 100"/><text ${T} text-anchor="middle" x="105" y="114">Länge</text><text ${T} x="196" y="64">Breite</text>`,
    felder: [
      { id: 'l', label: 'Länge', art: 'len' },
      { id: 'b', label: 'Breite', art: 'len' },
      { id: 'd1', label: 'Diagonale 1 gemessen', art: 'len', optional: true },
      { id: 'd2', label: 'Diagonale 2 gemessen', art: 'len', optional: true },
    ],
    rechne: (w) => {
      const r = diagonale(zahl(w, 'l'), zahl(w, 'b'), opt(w, 'd1'), opt(w, 'd2'))
      const aus: Ausgabe[] = [L('Diagonale Soll', r.soll, true), W('Winkel Diagonale zur Länge', r.winkel)]
      if (r.abweichung1 !== undefined) aus.push(L('Abweichung Diagonale 1', r.abweichung1))
      if (r.abweichung2 !== undefined) aus.push(L('Abweichung Diagonale 2', r.abweichung2))
      if (r.differenz !== undefined) aus.push(L('Unterschied der Diagonalen', r.differenz, true))
      return { ausgaben: aus }
    },
  },
  {
    id: '345',
    titel: 'Rechter Winkel 3-4-5',
    gruppe: 'Winkel & Maßkontrolle',
    kurz: 'Winkel anlegen mit Maßband',
    info: 'Ein Dreieck mit den Seiten 3 : 4 : 5 hat immer einen rechten Winkel. Je größer die Maße, desto genauer der Winkel.',
    // jede Seite ist mit ihrer Beschriftung antippbar und wählt die gegebene Seite
    skizze:
      `<path ${D} d="M168 96 V84 H180"/>` +
      `<g data-feld="seite" data-wert="lang"><path ${S} d="M50 96 H180"/><text ${T} text-anchor="middle" x="115" y="113">lang (4)</text></g>` +
      `<g data-feld="seite" data-wert="kurz"><path ${S} d="M180 96 V24"/><text ${T} x="187" y="64">kurz (3)</text></g>` +
      `<g data-feld="seite" data-wert="diagonale"><path ${S} d="M50 96 L180 24"/><text ${T} text-anchor="middle" x="110" y="51" transform="rotate(-29 110 51)">Diagonale (5)</text></g>`,
    felder: [
      {
        id: 'seite',
        label: 'Gegebene Seite',
        art: 'select',
        vorgabe: 'lang',
        inSkizze: true,
        optionen: [
          { wert: 'kurz', label: 'kurze Seite (3)' },
          { wert: 'lang', label: 'lange Seite (4)' },
          { wert: 'diagonale', label: 'Diagonale (5)' },
        ],
      },
      { id: 'x', label: 'Maß', art: 'len' },
    ],
    rechne: (w) => {
      const r = dreiVierFuenf(zahl(w, 'x'), w.seite as 'kurz' | 'lang' | 'diagonale')
      return { ausgaben: [L('kurze Seite', r.kurz, w.seite !== 'kurz'), L('lange Seite', r.lang, w.seite !== 'lang'), L('Diagonale', r.diagonale, w.seite !== 'diagonale')] }
    },
  },
  {
    id: 'rechtwinklig',
    titel: 'Rechtwinkliges Dreieck',
    gruppe: 'Winkel & Maßkontrolle',
    kurz: 'Zwei Werte eingeben, Rest berechnen',
    info: 'Zwei Felder ausfüllen, davon mindestens eine Seite. c ist die Hypotenuse, α liegt gegenüber von a.',
    skizze: `<path ${S} d="M30 100 H200 V25 Z"/><path ${S} d="M188 100 V88 H200"/><text ${T} x="110" y="114">b</text><text ${T} x="206" y="66">a</text><text ${T} x="100" y="54">c</text><text ${T} x="58" y="96">α</text><text ${T} x="184" y="50">β</text>`,
    felder: [
      { id: 'a', label: 'Seite a', art: 'len', optional: true },
      { id: 'b', label: 'Seite b', art: 'len', optional: true },
      { id: 'c', label: 'Seite c (Hypotenuse)', art: 'len', optional: true },
      { id: 'alpha', label: 'Winkel α', art: 'ang', optional: true },
      { id: 'beta', label: 'Winkel β', art: 'ang', optional: true },
    ],
    rechne: (w) => {
      const r = rechtwinklig({ a: opt(w, 'a'), b: opt(w, 'b'), c: opt(w, 'c'), alpha: opt(w, 'alpha'), beta: opt(w, 'beta') })
      return {
        ausgaben: [L('a', r.a), L('b', r.b), L('c', r.c, true), W('α', r.alpha, true), W('β', r.beta), { label: 'Fläche', wert: r.flaeche, art: 'area' }, L('Umfang', r.umfang), L('Höhe auf c', r.hoeheC)],
      }
    },
  },
  {
    id: 'dreieck',
    titel: 'Allgemeines Dreieck',
    gruppe: 'Winkel & Maßkontrolle',
    kurz: 'Drei Werte eingeben, Rest berechnen',
    info: 'Drei Felder ausfüllen, davon mindestens eine Seite. Jeder Winkel liegt der gleichnamigen Seite gegenüber (α gegenüber a).',
    skizze: `<path ${S} d="M25 100 H215 L150 22 Z"/><text ${T} x="116" y="114">c</text><text ${T} x="76" y="56">b</text><text ${T} x="190" y="58">a</text><text ${T} x="48" y="96">α</text><text ${T} x="192" y="96">β</text><text ${T} x="146" y="44">γ</text>`,
    felder: [
      { id: 'a', label: 'Seite a', art: 'len', optional: true },
      { id: 'b', label: 'Seite b', art: 'len', optional: true },
      { id: 'c', label: 'Seite c', art: 'len', optional: true },
      { id: 'alpha', label: 'Winkel α', art: 'ang', optional: true },
      { id: 'beta', label: 'Winkel β', art: 'ang', optional: true },
      { id: 'gamma', label: 'Winkel γ', art: 'ang', optional: true },
    ],
    rechne: (w) => {
      const r = dreieck({ a: opt(w, 'a'), b: opt(w, 'b'), c: opt(w, 'c'), alpha: opt(w, 'alpha'), beta: opt(w, 'beta'), gamma: opt(w, 'gamma') })
      return {
        zeichnung: zeichneDreieck(r.a, r.b, r.c, r.alpha),
        ausgaben: [
          L('a', r.a),
          L('b', r.b),
          L('c', r.c),
          W('α', r.alpha),
          W('β', r.beta),
          W('γ', r.gamma),
          { label: 'Fläche', wert: r.flaeche, art: 'area' },
          L('Umfang', r.umfang),
          L('Höhe auf a', r.hoeheA),
          L('Höhe auf b', r.hoeheB),
          L('Höhe auf c', r.hoeheC),
          L('Umkreisradius', r.umkreis),
          L('Inkreisradius', r.inkreis),
        ],
        hinweise: r.hinweis ? [r.hinweis] : [],
      }
    },
  },
  {
    id: 'bogen',
    titel: 'Stichbogen',
    gruppe: 'Winkel & Maßkontrolle',
    kurz: 'Radius aus Spannweite und Stich',
    skizze: `<path ${S} d="M30 95 Q120 -5 210 95"/><path ${D} d="M30 95 H210 M120 45 V95"/><text ${T} x="92" y="112">Spannweite</text><text ${T} x="126" y="76">Stich</text>`,
    felder: [
      { id: 's', label: 'Spannweite (Sehne)', art: 'len' },
      { id: 'h', label: 'Stichhöhe', art: 'len' },
    ],
    rechne: (w) => {
      const r = bogen(zahl(w, 's'), zahl(w, 'h'))
      return { ausgaben: [L('Radius', r.radius, true), L('Bogenlänge', r.bogenlaenge), W('Öffnungswinkel', r.winkel)] }
    },
  },

  {
    id: 'neigungsmesser',
    titel: 'Neigungsmesser',
    gruppe: 'Winkel & Maßkontrolle',
    kurz: 'Neigung mit dem Lagesensor des Handys',
    eigen: 'neigungsmesser',
    felder: [],
    rechne: () => ({ ausgaben: [] }),
  },

  /* ============ Sonstiges ============ */
  {
    id: 'treppe',
    titel: 'Treppe',
    gruppe: 'Sonstiges',
    kurz: 'Steigung und Auftritt nach Schrittmaß',
    info: 'Schrittmaßregel: 2 × Steigung + Auftritt = 63 cm. Bequem ist eine Treppe bei Auftritt − Steigung ≈ 12 cm, sicher bei Auftritt + Steigung ≈ 46 cm. Bauordnung und DIN 18065 gehen vor.',
    felder: [
      { id: 'h', label: 'Geschosshöhe (OKFF bis OKFF)', art: 'len' },
      { id: 's', label: 'Wunsch-Steigung', art: 'len', optional: true, hinweis: 'leer = 18 cm' },
    ],
    rechne: (w, k) => {
      const r = treppe(zahl(w, 'h') / k.jeCm, (opt(w, 's') ?? 18 * k.jeCm) / k.jeCm)
      const cm = (label: string, wert: number, wichtig = false): Ausgabe => L(label, wert * k.jeCm, wichtig)
      return {
        ausgaben: [
          { label: 'Anzahl Steigungen', wert: r.steigungen, art: 'int', wichtig: true },
          cm('Steigung', r.steigung, true),
          cm('Auftritt', r.auftritt, true),
          { label: 'Anzahl Auftritte', wert: r.auftritte, art: 'int' },
          cm('Lauflänge', r.lauflaenge),
          W('Treppenneigung', r.neigung),
          cm('Bequemlichkeit: Auftritt − Steigung', r.bequem),
          cm('Sicherheit: Auftritt + Steigung', r.sicher),
        ],
        hinweise: r.steigung > 20 || r.auftritt < 23 ? ['Steigung über 20 cm oder Auftritt unter 23 cm – für Wohngebäude meist nicht zulässig.'] : [],
      }
    },
  },
  {
    id: 'holz',
    titel: 'Holzmenge',
    gruppe: 'Sonstiges',
    kurz: 'Kubikmeter, Laufmeter, Gewicht',
    info: 'Rohdichte als Richtwert: Fichte/Tanne ca. 470 kg/m³, Kiefer ca. 520, Lärche ca. 600, Douglasie ca. 530, Eiche ca. 700, BSH ca. 450. Frisches Holz ist deutlich schwerer.',
    felder: [
      { id: 'b', label: 'Breite', art: 'num', einheit: 'cm' },
      { id: 'h', label: 'Höhe', art: 'num', einheit: 'cm' },
      { id: 'l', label: 'Länge', art: 'num', einheit: 'm' },
      { id: 'n', label: 'Stückzahl', art: 'int', vorgabe: 1 },
      { id: 'd', label: 'Rohdichte', art: 'num', einheit: 'kg/m³', vorgabe: 470 },
    ],
    rechne: (w) => {
      const r = holzmenge(zahl(w, 'b'), zahl(w, 'h'), zahl(w, 'l'), zahl(w, 'n'), zahl(w, 'd'))
      return {
        ausgaben: [
          { label: 'Volumen', wert: r.volumen, art: 'num', einheit: 'm³', wichtig: true, stellen: 3 },
          { label: 'Gewicht', wert: r.gewicht, art: 'num', einheit: 'kg', wichtig: true, stellen: 1 },
          { label: 'Laufmeter', wert: r.laufmeter, art: 'num', einheit: 'm', stellen: 2 },
          { label: 'Oberfläche (4 Seiten)', wert: r.oberflaeche, art: 'num', einheit: 'm²', stellen: 2 },
        ],
      }
    },
  },
  {
    id: 'massstab',
    titel: 'Maßstab',
    gruppe: 'Sonstiges',
    kurz: 'Planmaß und wirkliches Maß umrechnen',
    felder: [
      {
        id: 'r',
        label: 'Richtung',
        art: 'select',
        vorgabe: 'planZuReal',
        optionen: [
          { wert: 'planZuReal', label: 'Plan → Wirklichkeit' },
          { wert: 'realZuPlan', label: 'Wirklichkeit → Plan' },
        ],
      },
      { id: 'x', label: 'Maß', art: 'len' },
      { id: 'm', label: 'Maßstab 1 :', art: 'num', vorgabe: 50 },
    ],
    rechne: (w) => ({
      ausgaben: [L(w.r === 'planZuReal' ? 'Wirkliches Maß' : 'Maß im Plan', massstab(zahl(w, 'x'), zahl(w, 'm'), w.r as 'planZuReal' | 'realZuPlan'), true)],
    }),
  },
  {
    id: 'stern',
    titel: 'Holzstern',
    gruppe: 'Sonstiges',
    kurz: 'Stablänge und Gehrungen für Sterne',
    info: 'Die Stablänge ist die Außenkante von Spitze zu Innenecke. Gehrungen sind zur Stabkante gemessen.',
    felder: [
      { id: 'n', label: 'Anzahl Zacken', art: 'int', vorgabe: 5 },
      { id: 'd', label: 'Durchmesser über die Spitzen', art: 'len' },
      { id: 'w', label: 'Winkel an der Spitze', art: 'ang', vorgabe: 36 },
    ],
    rechne: (w) => {
      const r = stern(zahl(w, 'n'), zahl(w, 'd') / 2, zahl(w, 'w'))
      return {
        zeichnung: zeichneStern(zahl(w, 'n'), zahl(w, 'd') / 2, r.innenradius, r.kante),
        ausgaben: [
          L('Stablänge (Außenkante)', r.kante, true),
          { label: 'Anzahl Stäbe', wert: r.kanten, art: 'int', wichtig: true },
          W('Gehrung an der Spitze', r.gehrungSpitze),
          W('Gehrung an der Innenecke', r.gehrungInnen),
          L('Durchmesser Innenecken', 2 * r.innenradius),
        ],
      }
    },
  },
  {
    id: 'verschnitt',
    titel: 'Zuschnitt und Verschnitt',
    gruppe: 'Sonstiges',
    kurz: 'Teile auf Stangen verteilen',
    info: 'Je Zeile ein Teil: „Länge“ oder „Länge x Anzahl“. Davor kann ein Name mit Doppelpunkt stehen, dahinter „@“ und der Querschnitt, zum Beispiel „Sparren: 480 x 12 @ 8/18“. Teile werden je Querschnitt getrennt verteilt. Stehen mehrere Stangenlängen zur Wahl, werden mehrere Aufteilungen verglichen und die mit dem geringsten Materialeinsatz genommen. Das ist ein Näherungsverfahren und garantiert nicht den kleinsten Verschnitt. Anschnitt und Fehlstellen selbst zugeben.',
    felder: [
      { id: 'l', label: 'Stangenlängen', art: 'liste', hinweis: 'eine Länge je Zeile, zum Beispiel 500 und darunter 400' },
      { id: 's', label: 'Schnittbreite (Sägeblatt)', art: 'len', vorgabe: 0 },
      { id: 't', label: 'Stückliste', art: 'liste', hinweis: 'zum Beispiel: 240 x 3 oder Sparren: 480 x 12 @ 8/18' },
    ],
    rechne: (w) => {
      const r = zuschnitt(leseLaengen(String(w.l)), zahl(w, 's'), leseStueckliste(String(w.t)))
      // Spalten für Querschnitt und Bezeichnung nur zeigen, wenn die Liste sie enthält
      const mitQ = r.gruppen.some((g) => g.querschnitt !== '')
      const mitNamen = r.gruppen.some((g) => g.stangen.some((x) => x.namen.length > 0))
      const q = (text: string): string[] => (mitQ ? [text || '–'] : [])
      let nr = 0
      return {
        ausgaben: [
          { label: 'Stangen', wert: r.anzahl, art: 'int', wichtig: true },
          L('Rest gesamt', r.rest, true),
          { label: 'Ausnutzung', wert: r.ausnutzung, art: 'num', einheit: '%', stellen: 1 },
          { label: 'Anzahl Teile', wert: r.teile, art: 'int' },
        ],
        liste: {
          titel: 'Bedarf',
          kopf: [...(mitQ ? ['Querschnitt'] : []), 'Stangenlänge', 'Anzahl'],
          arten: [...(mitQ ? (['text'] as const) : []), 'len', 'int'],
          zeilen: r.bedarf.map((b) => [...q(b.querschnitt), b.laenge, b.anzahl]),
        },
        listen: [
          {
            titel: 'Schnittplan',
            kopf: ['Stange', ...(mitQ ? ['Querschnitt'] : []), 'Stangenlänge', 'Teillängen', ...(mitNamen ? ['Für'] : []), 'Rest'],
            arten: ['int', ...(mitQ ? (['text'] as const) : []), 'len', 'text', ...(mitNamen ? (['text'] as const) : []), 'len'],
            zeilen: r.gruppen.flatMap((g) => g.stangen.map((x) => [++nr, ...q(g.querschnitt), x.laenge, x.teile, ...(mitNamen ? [x.namen.join(', ')] : []), x.rest])),
          },
        ],
      }
    },
  },
  {
    id: 'abstaende',
    titel: 'Abstände Verbindungsmittel',
    gruppe: 'Sonstiges',
    kurz: 'Mindestabstände nach Eurocode 5',
    info: 'Nachschlagehilfe nach EN 1995-1-1: Tabelle 8.2 für Nägel und Schrauben bis 6 mm, Tabelle 8.4 für Bolzen und Schrauben über 6 mm, Tabelle 8.5 für Stabdübel. Maßgebend sind die Norm mit nationalem Anhang und bei Schrauben die Zulassung (ETA) des Herstellers. Kein Ersatz für die Bemessung der Verbindung.',
    felder: [
      {
        id: 'a',
        label: 'Verbindungsmittel',
        art: 'select',
        vorgabe: 'nagel',
        optionen: [
          { wert: 'nagel', label: 'Nagel oder Schraube bis 6 mm' },
          { wert: 'bolzen', label: 'Bolzen oder Schraube über 6 mm' },
          { wert: 'stabduebel', label: 'Stabdübel' },
        ],
      },
      { id: 'd', label: 'Durchmesser', art: 'num', einheit: 'mm' },
      { id: 'w', label: 'Winkel Kraft zur Faser', art: 'ang', vorgabe: 0 },
      {
        id: 'v',
        label: 'Holz und Vorbohrung',
        art: 'select',
        vorgabe: 'ohne',
        wenn: (w) => (w.a ?? 'nagel') === 'nagel',
        optionen: [
          { wert: 'ohne', label: 'nicht vorgebohrt, Rohdichte bis 420 kg/m³' },
          { wert: 'ohneDicht', label: 'nicht vorgebohrt, Rohdichte 420 bis 500 kg/m³' },
          { wert: 'vorgebohrt', label: 'vorgebohrt' },
        ],
      },
      { id: 'rho', label: 'Rohdichte für die Mindestholzdicke', art: 'num', einheit: 'kg/m³', vorgabe: 350, optional: true, hinweis: 'charakteristischer Wert, C24: 350', wenn: (w) => (w.a ?? 'nagel') === 'nagel' && w.v !== 'vorgebohrt' },
    ],
    rechne: (w) => {
      const ohneVorbohren = w.a !== 'bolzen' && w.a !== 'stabduebel' && w.v !== 'vorgebohrt'
      const rho = opt(w, 'rho')
      const r = w.a === 'bolzen' || w.a === 'stabduebel' ? mindestabstaendeStift(zahl(w, 'd'), zahl(w, 'w'), w.a) : mindestabstaende(zahl(w, 'd'), zahl(w, 'w'), w.v as Vorbohrung)
      const mm = (label: string, wert: number): Ausgabe => ({ label, wert, art: 'num', einheit: 'mm', stellen: 0 })
      return {
        ausgaben: [
          mm('a1 – untereinander in Faserrichtung', Math.ceil(r.a1 - 1e-9)),
          mm('a2 – untereinander quer zur Faser', Math.ceil(r.a2 - 1e-9)),
          mm('a3,t – zum beanspruchten Hirnholzende', Math.ceil(r.a3t - 1e-9)),
          mm('a3,c – zum unbeanspruchten Hirnholzende', Math.ceil(r.a3c - 1e-9)),
          mm('a4,t – zum beanspruchten Rand', Math.ceil(r.a4t - 1e-9)),
          mm('a4,c – zum unbeanspruchten Rand', Math.ceil(r.a4c - 1e-9)),
          ...(ohneVorbohren && rho && rho <= 500
            ? [mm('Mindestholzdicke ohne Vorbohren', Math.ceil(mindestholzdicke(zahl(w, 'd'), rho, false) - 1e-9)), mm('… bei spaltempfindlichem Holz (siehe nationaler Anhang)', Math.ceil(mindestholzdicke(zahl(w, 'd'), rho, true) - 1e-9))]
            : []),
        ],
        hinweise: [
          ...(ohneVorbohren && rho && rho > 500 ? ['Über 500 kg/m³ Rohdichte ist immer vorzubohren.'] : []),
          ...(ohneVorbohren && rho && ((w.v === 'ohne' && rho > 420) || (w.v === 'ohneDicht' && rho <= 420)) ? ['Die Rohdichte passt nicht zur Auswahl bei „Holz und Vorbohrung“. Die Abstände gelten für die Auswahl, die Mindestholzdicke für die eingetragene Rohdichte.'] : []),
        ],
      }
    },
  },

  /* ============ Dokumente ============ */
  {
    id: 'behinderung',
    titel: 'Behinderungsanzeige',
    gruppe: 'Dokumente',
    kurz: 'Vorlage mit Unterschrift, Fotos und PDF',
    eigen: 'dokument',
    felder: [],
    rechne: () => ({ ausgaben: [] }),
  },
  {
    id: 'bedenken',
    titel: 'Bedenkenanzeige',
    gruppe: 'Dokumente',
    kurz: 'Bedenken anmelden, mit Unterschrift, Fotos und PDF',
    eigen: 'dokument',
    felder: [],
    rechne: () => ({ ausgaben: [] }),
  },
  {
    id: 'stundenzettel',
    titel: 'Stundenzettel',
    gruppe: 'Dokumente',
    kurz: 'Stundenlohnarbeiten mit Gegenzeichnung des Auftraggebers',
    eigen: 'dokument',
    felder: [],
    rechne: () => ({ ausgaben: [] }),
  },
  {
    id: 'aufmass',
    titel: 'Aufmaßblatt',
    gruppe: 'Dokumente',
    kurz: 'Mengen aufnehmen, summieren und gemeinsam unterschreiben',
    eigen: 'dokument',
    felder: [],
    rechne: () => ({ ausgaben: [] }),
  },
  {
    id: 'abnahme',
    titel: 'Abnahmeprotokoll',
    gruppe: 'Dokumente',
    kurz: 'Abnahme mit Mängelliste und beiden Unterschriften',
    eigen: 'dokument',
    felder: [],
    rechne: () => ({ ausgaben: [] }),
  },
  {
    id: 'bautagebuch',
    titel: 'Bautagesbericht',
    gruppe: 'Dokumente',
    kurz: 'Wetter, Personal, Arbeiten und Besonderheiten des Tages',
    eigen: 'dokument',
    felder: [],
    rechne: () => ({ ausgaben: [] }),
  },
]

export const rechnerNachId = (id: string): Rechner | undefined => RECHNER.find((r) => r.id === id)
