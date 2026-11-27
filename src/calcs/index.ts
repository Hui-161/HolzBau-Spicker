import { dachfensterWechsel, dachflaecheSattel, gaubenSparrenliste, grat, gratAnfall, gratAnriss, gratKerve, sattelgaube, walmgaube, pultdach, schleppgaube, zeltdach, kehlbalken, lattung, schifter, neigungAusGrad, neigungAusMass, neigungAusProzent, sparren } from '../core/dach'
import { bogen, diagonale, dreieck, dreiVierFuenf, rechtwinklig } from '../core/dreieck'
import { einteilung, laufmasse, sparrenEinteilung, stabAnzahl, type EinteilArt } from '../core/einteilung'
import { holzmenge, leseLaengen, massstab, treppe } from '../core/sonstiges'
import { leseStueckliste, stosse, zuschnitt } from '../core/stueckliste'
import { mindestabstaende, mindestabstaendeStift, mindestholzdicke, type Vorbohrung } from '../core/verbindung'
import { zeichneDachGrundriss, zeichneSatteldach, zeichneBogen, zeichneDiagonale, zeichneAbstaende, zeichneLattung, zeichneFirst, zeichneTraufe, zeichneDachflaeche, zeichneGaubeAnschluss, zeichneGaubeLaengs, zeichneGaubeQuer, zeichneKehlbalkenAnschluss, zeichneKehlbalkenStueck, zeichneDachfenster, zeichneDreieck, zeichneGratAnfall, zeichneGratKerve, zeichneHexenschnitt, zeichneGratFuss, zeichneGratQuerschnitt, zeichneGratSeite, zeichneKerve, zeichneEinteilung, zeichneGaube, zeichneSattelgaube, zeichneGrat, zeichneKehlbalken, zeichnePultdach, zeichneSparren, zeichneZeltdach } from './zeichnung'
import { alleZiegel, maxBeiNeigung } from './ziegel'
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

/** Kennungen der Felder, die der Nutzer ausgefüllt hat */
const gegeben = (w: Werte, ids: string[]): string[] => ids.filter((id) => Number.isFinite(w[id] as number))
const oderNaN = (w: Werte, id: string): number => opt(w, id) ?? NaN

export const GRUPPEN = ['Dach', 'Einteilung', 'Winkel & Maßkontrolle', 'Sonstiges', 'Dokumente']

export const RECHNER: Rechner[] = [
  /* ============ Dach ============ */
  {
    id: 'sparren',
    beispiel: { g: 400, a: 35, ue: 50, h: 18, k: 3 },
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
    beispiel: { ah: 40, aw: 50, x: 400, b: 12, th: 90, tw: 90, hg: 22, ob: 16 },
    // Neigung, Grundmaß, Obholz und Traufabschnitt des Hauptdachs stehen schon im Sparren-Rechner
    uebernahme: {
      von: 'sparren',
      werte: (q) => {
        const [g, a, h, k, ue] = [q.g as number, q.a as number, q.h as number, q.k as number, q.ue as number]
        if (![g, a].every(Number.isFinite) || !(a > 0 && a < 90)) return undefined
        const obholz = Number.isFinite(h) && h > 0 ? (h - (Number.isFinite(k) ? k : 0)) / Math.cos((a * Math.PI) / 180) : undefined
        return { ah: a, x: g, th: q.tr === 'winkel' ? 90 : 90 + a, ...(obholz !== undefined && obholz > 0 ? { ob: obholz } : {}), ...(Number.isFinite(ue) && ue >= 0 ? { ue } : {}) }
      },
    },
    titel: 'Grat- und Kehlsparren',
    gruppe: 'Dach',
    kurz: 'Gratlänge, Gratneigung, Abgratung',
    info: 'Gilt für Grat und Kehle, auch bei ungleichen Dachneigungen. Die Abgratung ist lotrecht gemessen. Die Gratverschiebung ist ein Grundrissmaß quer zur Gratlinie. Der Verstich ist ein Grundrissmaß in Gratrichtung: der Versatz der Sparrenkante gegenüber der Achse an der Traufe. Der Hexenschnitt wird an der Seitenfläche zur Gratoberkante angerissen. Am Anfallspunkt endet der Grat mit zwei lotrechten Backen, die sich auf der Achse treffen; gerechnet ist bis zum Anfallspunkt, halbe Holzstärken der anschließenden Hölzer selbst abziehen. Die Kerve bezieht sich auf die Außenecke der Fußpfetten: An jeder Seitenfläche sitzt ihr Senkelriss um den Verstich weiter innen, das Obholz gilt dort ab der abgegrateten Kante. Aufbau wie beim Sparren: Das Grundmaß zählt ab Außenkante Fußpfette, der Dachüberstand kommt davor; alle Lagen der Anrissliste gelten entlang der Kante ab dem Senkel durch den Traufpunkt. Die Seitenansicht zeigt den Schnitt in der Gratachse. Gestrichelt ist die Abgratungslinie eingezeichnet: die Kante der Seitenfläche nach dem Abgraten, bei der Kehle entsprechend die Kehllinie. In den Ansichten der Seitenflächen liegt die Gratlinie gestrichelt darüber. Hexenschnitt, Kerve und Anfallspunkt gelten für den Grat, nicht für die Kehle. Die Schifterliste gilt für den Grat: Länge der Schifterachse in der Dachfläche ab Traufe, ohne Überstand. Die Lage ist immer ab Gratfuß angegeben, auch wenn das Raster am Anfallspunkt beginnt.',
    skizze: `<path ${S} d="M20 100 H200 V25"/><path ${S} d="M200 100 L110 25 H200"/><path ${D} d="M110 25 V100"/><text ${T} text-anchor="end" x="200" y="16">Grundmaß Walm</text><text ${T} x="20" y="66">Grundmaß HD</text><text ${T} x="160" y="52">Grat</text><text ${T} x="20" y="115">Traufe Hauptdach</text>`,
    felder: [
      { id: 'ah', label: 'Neigung Hauptdach', art: 'ang', vorgabe: 35 },
      { id: 'aw', label: 'Neigung Walm', art: 'ang', vorgabe: 35 },
      { id: 'x', label: 'Grundmaß Hauptdach', art: 'len', hinweis: 'waagerecht von Außenkante Fußpfette bis First, wie beim Sparren' },
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
      { id: 'hg', label: 'Höhe Grat-/Kehlsparren', art: 'len', optional: true, hinweis: 'für Seitenansicht, Hexenschnitt und Kerve' },
      { id: 'ob', label: 'Obholz lotrecht der Sparren', art: 'len', optional: true, hinweis: 'für die Kerve; Wert aus dem Sparren-Rechner' },
      { id: 'ue', label: 'Dachüberstand Hauptdach (waagerecht)', art: 'len', vorgabe: 0, hinweis: 'vor der Fußpfette, wie beim Sparren; der Grat steht entsprechend weiter über' },
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
      const kerve = hg && ob ? gratKerve(eingabe, hg, ob) : undefined
      const ue = opt(w, 'ue') ?? 0
      const anr = gratAnriss(eingabe, ue, kerve ? hg : undefined, kerve ? ob : undefined)
      const lotGrat = hg ? hg / Math.cos((r.gratNeigung * Math.PI) / 180) : undefined
      const hexeGleich = Math.abs(r.hexeHaupt - r.hexeWalm) < 1e-9 && Math.abs(r.abgratungHaupt - r.abgratungWalm) < 1e-9
      const schifterListe = (titel: string, z: { abstand: number; achse: number; kante: number }[]): Liste => ({
        titel,
        kopf: ['Nr.', 'ab Gratfuß', 'bis Gratachse', 'bis Gratkante'],
        arten: ['int', 'len', 'len', 'len'],
        zeilen: z.map((x, i) => [i + 1, x.abstand, x.achse, x.kante]),
      })
      return {
        // Seitenansicht wie beim Sparren: Schnitt in der Gratachse mit Traufschnitt, Kerve über der Pfettenecke und Anfallspunkt.
        // Ohne Sparrenhöhe ist die Holzstärke nur angedeutet.
        zeichnung: zeichneSparren({ grundmass: r.gratGrund, ueberstand: anr.ueGrund, neigung: r.gratNeigung, sparrenhoehe: hg ?? r.gratGrund * 0.035, kerve: anr.kerve?.tiefeAchse ?? 0, traufWinkel: r.hexeHaupt, feld: {}, bezugslinien: hg && mitBreite ? [...new Set([r.abgratungHaupt, r.abgratungWalm])] : [] }),
        details: [
          ...detail('Detail Grundriss mit Schiftern', zeichneGrat(zahl(w, 'x'), r.grundmassWalm, s?.haupt.map((z) => z.abstand) ?? [], s?.walm.map((z) => z.abstand) ?? [])),
          ...(mitBreite
            ? [
                ...detail('Detail Gratfuß: Grundriss mit Verstich', zeichneGratFuss(zahl(w, 'x'), r.grundmassWalm, zahl(w, 'b'), r.winkelHaupt, r.winkelWalm)),
                ...detail('Detail Abgratung: Querschnitt, lotrecht geschnitten', zeichneGratQuerschnitt(zahl(w, 'b'), r.abgratungHaupt, r.abgratungWalm)),
              ]
            : []),
          ...(hexeGleich
            ? detail('Detail Hexenschnitt am Fuß, beide Seiten gleich', zeichneHexenschnitt(r.gratNeigung, r.hexeHaupt, lotGrat ? lotGrat - r.abgratungHaupt : undefined, r.abgratungHaupt))
            : [
                ...detail('Detail Hexenschnitt am Fuß, Hauptdachseite', zeichneHexenschnitt(r.gratNeigung, r.hexeHaupt, lotGrat ? lotGrat - r.abgratungHaupt : undefined, r.abgratungHaupt)),
                ...detail('Detail Hexenschnitt am Fuß, Walmseite', zeichneHexenschnitt(r.gratNeigung, r.hexeWalm, lotGrat ? lotGrat - r.abgratungWalm : undefined, r.abgratungWalm)),
              ]),
          ...(kerve && anr.kerve
            ? [
                ...detail('Detail Kerve, Ansicht der Hauptdachseite – Strichpunktlinie: Senkel durch die Pfettenecke', zeichneGratKerve(r.gratNeigung, kerve.haupt.verstich, kerve.haupt.wange, kerve.haupt.sattel, ob as number, anr.kerve.haupt, r.abgratungHaupt)),
                ...detail('Detail Kerve, Ansicht der Walmseite – Strichpunktlinie: Senkel durch die Pfettenecke', zeichneGratKerve(r.gratNeigung, kerve.walm.verstich, kerve.walm.wange, kerve.walm.sattel, ob as number, anr.kerve.walm, r.abgratungWalm)),
              ]
            : []),
          ...(an ? detail('Detail Anfallspunkt: Grundriss mit den Backen', zeichneGratAnfall(zahl(w, 'x'), r.grundmassWalm, zahl(w, 'b'), an.planHaupt, an.planWalm)) : []),
          ...(hg ? detail('Detail Anfallspunkt: Seitenansicht mit Senkelschnitt', zeichneFirst(r.gratNeigung, hg, 0, 0, anr.anfallAchse, undefined, false, mitBreite ? [...new Set([r.abgratungHaupt, r.abgratungWalm])] : [])) : []),
        ],
        ausgaben: [
          L(ue > 0 ? 'Gratsparrenlänge gesamt' : 'Gratsparrenlänge', anr.laengeGesamt, true),
          ...(ue > 0 ? [L('davon Pfettenecke bis Anfallspunkt', r.gratLaenge), L('davon Überstand', anr.laengeUeberstand), L('Überstand des Grats im Grundriss', anr.ueGrund), L('Dachüberstand Walm bei gleicher Traufhöhe', anr.ueberstandWalm)] : []),
          W('Gratneigung', r.gratNeigung, true),
          W('Anriss: Senkelriss zur Sparrenkante', anr.winkelSenkel, true),
          W('Anriss: Waagriss zur Sparrenkante', anr.winkelWaage, true),
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
        liste: {
          titel: 'Anriss am Gratsparren, ab Traufpunkt entlang der Kante',
          kopf: ['Nr.', 'Riss', 'Lage'],
          arten: ['int', 'wort', 'len'],
          zeilen: (
            [
              ['Traufpunkt auf der Gratachse', 0],
              ...(mitBreite ? [['Traufe an der Seitenfläche (Hauptdachseite): Beginn Hexenschnitt', anr.traufeHaupt], ['Traufe an der Seitenfläche (Walmseite): Beginn Hexenschnitt', anr.traufeWalm]] : []),
              ...(anr.kerve
                ? [
                    ['Kerve: Senkel durch die Pfettenecke (Gratachse)', anr.kerve.achse],
                    ...(mitBreite ? [['Kerve: Senkelriss an der Seitenfläche (Hauptdachseite)', anr.kerve.haupt], ['Kerve: Senkelriss an der Seitenfläche (Walmseite)', anr.kerve.walm]] : []),
                    ['Kerve: Ende des Waagrisses an der Unterkante (Hauptdachseite)', anr.kerve.hauptEnde],
                    ['Kerve: Ende des Waagrisses an der Unterkante (Walmseite)', anr.kerve.walmEnde],
                  ]
                : []),
              ...(anr.anfallHaupt !== undefined && anr.anfallWalm !== undefined ? [['Anfallspunkt: Senkelriss der Backe an der Seitenfläche (Hauptdachseite)', anr.anfallHaupt], ['Anfallspunkt: Senkelriss der Backe an der Seitenfläche (Walmseite)', anr.anfallWalm]] : []),
              ['Anfallspunkt auf der Gratachse', anr.anfallAchse],
            ] as [string, number][]
          )
            .sort((p, q) => p[1] - q[1])
            .map((z, i) => [i + 1, z[0], z[1]]),
        },
        listen: [
          {
            titel: 'Arbeitsfolge am Gratsparren',
            kopf: ['Nr.', 'Schritt'],
            arten: ['int', 'wort'] as Liste['arten'],
            zeilen: [
              'Gratlinie mittig auf der Oberseite anreißen; bei Gratverschiebung um das angegebene Maß versetzt.',
              'Traufpunkt auf der Gratlinie festlegen und von dort alle Lagen der Anrissliste entlang der Kante antragen.',
              'Senkelrisse an beiden Seitenflächen anreißen: am Winkel den Senkelriss zur Sparrenkante einstellen. Waagrisse liegen im Winkel der Gratneigung zur Kante.',
              'Abgratung: an jeder Seitenfläche das lotrechte Abgratungsmaß von der Oberkante herunter anreißen und zur Gratlinie hin abhobeln.',
              'Kerve: an jeder Seitenfläche auf dem Senkelriss das Obholz ab der abgegrateten Kante herunter messen, von dort den Waagriss bis zur Unterkante ziehen, ausschneiden.',
              'Fuß: Hexenschnitt an jeder Seitenfläche unter dem angegebenen Winkel zur Oberkante anreißen, die beiden Risse über die Unterseite verbinden, schneiden.',
              'Anfallspunkt: Backenschmiegen auf der Oberseite von der Gratlinie zu den Senkelrissen der Seitenflächen anreißen und lotrecht schneiden. Halbe Holzstärken der anschließenden Hölzer vorher abziehen.',
            ].map((schritt, i) => [i + 1, schritt]),
          },
          ...(s ? [schifterListe('Schifter Hauptdach', s.haupt), schifterListe('Schifter Walm', s.walm)] : []),
        ],
      }
    },
  },
  {
    id: 'kehlbalken',
    beispiel: { w: 800, a: 45, h: 150, hk: 16 },
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
        details: [
          ...detail('Detail 1: Anschluss am Sparren', zeichneKehlbalkenAnschluss(zahl(w, 'a'), zahl(w, 'hk'), r.rissSparren)),
          ...detail('Detail 2: Kehlbalken als Werkstück', zeichneKehlbalkenStueck(r.laengeUnten, r.laengeOben, zahl(w, 'hk'), zahl(w, 'a'))),
        ],
        ausgaben: [
          L('Länge Unterkante', r.laengeUnten, true),
          L('Länge Oberkante', r.laengeOben, true),
          W('Abschnitt an beiden Enden', r.abschnitt),
          L('Oberkante je Ende kürzer um', r.versatz),
          L('Länge der Schnittfläche', r.schnittlaenge),
          L('Riss am Sparren ab Bezugslinie', r.rissSparren),
          L('Riss am Sparren bis Oberkante Kehlbalken', r.rissSparrenOben),
          L('Spitze der Sparrenunterkanten über Bezugslinie', r.firstUeberBezug),
          L('OK Kehlbalken bis zu dieser Spitze', r.restBisFirst),
        ],
      }
    },
  },
  {
    id: 'lattung',
    beispiel: { sl: 600, t: 32, f: 4, min: 33, max: 36 },
    titel: 'Lattung / Ziegel',
    gruppe: 'Dach',
    kurz: 'Lattweite und Reihen aus der Decklänge',
    // Sparren mit Latten: Abstand an der Traufe, gleiche Lattweiten, Abstand am First
    skizze:
      `<path ${S} d="M22 104 L218 38"/>` +
      [0.09, 0.26, 0.43, 0.6, 0.77, 0.93].map((u) => `<rect fill="currentColor" stroke="none" x="${(22 + 196 * u - 7).toFixed(1)}" y="${(104 - 66 * u - 6).toFixed(1)}" width="7" height="6" transform="rotate(-18.6 ${(22 + 196 * u).toFixed(1)} ${(104 - 66 * u).toFixed(1)})"/>`).join('') +
      `<path ${D} d="M103.5 61 L136.8 49.8"/>` +
      `<text ${T} text-anchor="middle" x="118" y="45" transform="rotate(-18.6 118 45)">Lattweite</text>` +
      `<text ${T} x="8" y="118">Traufe</text><text ${T} text-anchor="end" x="232" y="28">First</text>` +
      `<text ${T} x="50" y="112">Abstand Traufe</text><text ${T} text-anchor="end" x="234" y="62">LAF</text>`,
    info: 'Die Decklängen und der Lattenabstand zum First (LAF) stehen im Datenblatt des Ziegels. Die Auswahl „Ziegel / Dachstein“ trägt die Decklängen einiger verbreiteter Modelle ein; es sind Richtwerte aus Herstellerunterlagen, die sich ändern können – maßgebend sind das aktuelle Datenblatt und die ausgemittelte Decklänge der gelieferten Ware. Trauf- und Firstabstand gehören nicht dazu und sind selbst einzutragen. Positionen sind ab Traufkante bis Oberkante Latte gemessen.',
    felder: [
      {
        id: 'z',
        label: 'Ziegel / Dachstein',
        art: 'select',
        vorgabe: 'eigen',
        hinweis: 'Richtwerte aus Herstellerunterlagen, Stand 11/2026 – Decklänge an der gelieferten Ware ausmitteln',
        roheOptionen: true,
        // als Getter: die eigenen Ziegel können sich ändern, während die App läuft
        get optionen() {
          return [{ wert: 'eigen', label: 'eigene Werte' }, ...alleZiegel().map((z) => ({ wert: z.id, label: z.name }))]
        },
        get setzt() {
          return Object.fromEntries(alleZiegel().map((z) => [z.id, { min: z.min, max: z.max }]))
        },
      },
      { id: 'dn', label: 'Dachneigung', art: 'ang', optional: true, hinweis: 'bei manchen Modellen hängt die größte Decklänge von der Neigung ab' },
      { id: 'sl', label: 'Sparrenlänge', art: 'len', hinweis: 'Traufkante bis Firstpunkt, auf der Konterlatte gemessen' },
      { id: 't', label: 'Traufkante bis OK erste Latte', art: 'len' },
      { id: 'f', label: 'OK letzte Latte bis First (LAF)', art: 'len', vorgabe: 0 },
      { id: 'min', label: 'Decklänge min.', art: 'len' },
      { id: 'max', label: 'Decklänge max.', art: 'len' },
    ],
    rechne: (w, k) => {
      // gewähltes Modell: bei flacher Neigung kann eine kleinere größte Decklänge gelten
      const ziegel = alleZiegel().find((z) => z.id === w.z)
      const dn = opt(w, 'dn')
      const grenze = ziegel && dn !== undefined ? maxBeiNeigung(ziegel, dn) * k.jeCm : undefined
      const begrenzt = grenze !== undefined && grenze < zahl(w, 'max') - 1e-9
      const deckMax = begrenzt ? (grenze as number) : zahl(w, 'max')
      const r = lattung({ sparrenlaenge: zahl(w, 'sl'), traufe: zahl(w, 't'), first: zahl(w, 'f'), deckMin: zahl(w, 'min'), deckMax })
      return {
        zeichnung: zeichneLattung(zahl(w, 'sl'), r.positionen),
        ausgaben: [
          L('Lattweite', r.lattweite, true),
          ...(begrenzt ? [L('Größte Decklänge bei dieser Dachneigung', deckMax)] : []),
          { label: 'Ziegelreihen (= Lattenreihen)', wert: r.latten, art: 'int', wichtig: true },
          { label: 'Lattabstände', wert: r.reihen, art: 'int' },
          L('Einzuteilende Strecke', r.strecke),
        ],
        hinweise: [
          ...(r.passt ? [] : ['Die Lattweite liegt unter der min. Decklänge. Trauf- oder Firstabstand anpassen.']),
          ...(begrenzt ? ['Für dieses Modell gilt bei dieser Dachneigung eine kleinere größte Decklänge. Damit wurde gerechnet.'] : []),
          ...(ziegel?.regel !== undefined && dn !== undefined && dn < ziegel.regel ? ['Die Dachneigung liegt unter der Regeldachneigung dieses Modells. Zusatzmaßnahmen nach Herstellerangaben nötig.'] : []),
        ],
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
    beispiel: { b: 400, a: 10, ut: 30, uh: 20 },
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
      { id: 'h', label: 'Sparrenhöhe', art: 'len', optional: true, hinweis: 'für Anriss und Details' },
      { id: 'k', label: 'Kerventiefe', art: 'len', optional: true, hinweis: 'gilt für beide Auflager' },
      { id: 'po', label: 'Breite oberes Auflager', art: 'len', optional: true, hinweis: 'für die Kerve am oberen Auflager' },
    ],
    rechne: (w, k) => {
      const [breite, neigung, ut, uh] = [zahl(w, 'b'), zahl(w, 'a'), zahl(w, 'ut'), zahl(w, 'uh')]
      const r = pultdach({ breite, neigung, ueberstandTief: ut, ueberstandHoch: uh })
      const l = opt(w, 'l')
      const [h, kerve, po] = [opt(w, 'h'), opt(w, 'k') ?? 0, opt(w, 'po')]
      // Mit Sparrenhöhe wird der Pultsparren wie ein Sparren gerechnet: unteres Auflager = Fußpfette,
      // das obere Auflager beginnt an seiner unteren Kante, das obere Sparrenende ist ein Senkelschnitt.
      const bild = h ? { grundmass: breite + uh, neigung, ueberstand: ut, sparrenhoehe: h, kerve, mittelpfette: po ? breite - po : undefined, auflagerOben: po } : undefined
      const sp = bild ? sparren(bild) : undefined
      const risse: [string, number][] = sp
        ? [
            ['Traufe: Senkelriss', 0],
            ...(ut > 0 || kerve > 0 ? ([['Auflager unten: Senkelriss an der Außenkante', sp.anriss.kerveSenkel]] as [string, number][]) : []),
            ...(kerve > 0 ? ([['Auflager unten: Ende des Waagrisses an der Unterkante', sp.anriss.kerveEnde]] as [string, number][]) : []),
            ...(sp.mittelpfette ? ([['Auflager oben: Senkelriss an der unteren Kante', sp.mittelpfette.senkel]] as [string, number][]) : []),
            ...(sp.mittelpfette && kerve > 0 ? ([['Auflager oben: Ende des Waagrisses an der Unterkante', sp.mittelpfette.ende]] as [string, number][]) : []),
            ['Oberes Ende: Senkelriss', sp.anriss.first],
          ]
        : []
      return {
        zeichnung: bild ? zeichneSparren({ ...bild, aussenOben: breite, feld: { ue: 'ut', a: 'a', b: 'b', uh: 'uh' } }) : zeichnePultdach(breite, ut, uh, neigung),
        details: bild && sp && h
          ? [
              ...(ut > 0 ? detail('Detail Traufe: Senkelschnitt', zeichneTraufe(neigung, h, 'senkel')) : []),
              ...detail('Detail Auflager unten', zeichneKerve(neigung, h, kerve, 'Auflager', sp.anriss.kerveSenkel)),
              ...(sp.mittelpfette ? detail('Detail Auflager oben', zeichneKerve(neigung, h, kerve, 'Auflager', sp.mittelpfette.senkel)) : []),
              ...detail('Detail oberes Ende: Senkelschnitt', zeichneFirst(neigung, h, 0, 0, sp.anriss.first, undefined, false)),
            ]
          : [],
        ausgaben: [
          L('Sparrenlänge gesamt', r.sparrenlaenge, true),
          L('davon zwischen den Auflagern', r.laengeAuflager),
          L('Höhenunterschied der Auflager', r.hoehe, true),
          L('Höhenunterschied Traufe bis First', r.hoeheGesamt),
          ...(l ? [{ label: 'Dachfläche', wert: qm(r.sparrenlaenge, l, k.jeCm), art: 'num', einheit: 'm²', stellen: 2 } as Ausgabe] : []),
          ...(sp
            ? [
                L('Holzlänge mindestens (mit Schnittschrägen)', sp.rohlaenge),
                L('Lotschnitt (Senkel)', sp.lotschnitt),
                ...(kerve > 0 ? [L('Obholz lotrecht', sp.obholz), L('Kerve: Auflage waagerecht', sp.kervenSattel), L('Kerve: Wange lotrecht', sp.kervenLot)] : []),
                ...(sp.mittelpfette ? [L('Oberkante oberes Auflager über unterem', sp.mittelpfette.hoehe)] : []),
                W('Anriss: Senkelriss zur Sparrenkante', sp.anriss.winkelSenkel),
                W('Anriss: Waagriss zur Sparrenkante', sp.anriss.winkelWaage),
              ]
            : []),
        ],
        ...(sp ? { liste: { titel: 'Anriss am Sparren, ab Traufpunkt entlang der Kante', kopf: ['Nr.', 'Riss', 'Lage'], arten: ['int', 'wort', 'len'] as Liste['arten'], zeilen: risse.map((z, i) => [i + 1, z[0], z[1]]) } } : {}),
      }
    },
  },
  {
    id: 'zeltdach',
    beispiel: { n: 4, a: 800, w: 40 },
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
        details: [
          ...detail('Detail 1: Mittelsparren, Seitenansicht', zeichneGratSeite(r.inkreis, r.hoehe, zahl(w, 'w'), 'Traufmitte', 'Spitze')),
          ...detail('Detail 2: Gratsparren, Seitenansicht', zeichneGratSeite(r.gratGrund, r.hoehe, r.gratNeigung, 'Traufecke', 'Spitze')),
          ...detail('Detail 3: eine Dachfläche in wahrer Größe', zeichneDachflaeche(zahl(w, 'a'), r.sparrenlaenge, r.gratLaenge, r.winkelFlaeche, 'a')),
        ],
        ausgaben: [
          L('Gratsparrenlänge', r.gratLaenge, true),
          W('Gratneigung', r.gratNeigung, true),
          L('Mittelsparren (Traufmitte bis Spitze)', r.sparrenlaenge),
          L('Höhe der Spitze', r.hoehe),
          L('Gratgrundmaß', r.gratGrund),
          W('Grundwinkel Grat zur Traufe', r.grundwinkel),
          L('Grundmaß Mittelsparren (Traufmitte bis Spitze)', r.inkreis),
          W('Dachfläche: Winkel Grat zur Traufe', r.winkelFlaeche),
          W('Dachfläche: Winkel an der Spitze', r.winkelSpitze),
          { label: 'Dachfläche gesamt', wert: qm(zahl(w, 'n') * zahl(w, 'a'), r.sparrenlaenge / 2, k.jeCm), art: 'num', einheit: 'm²', stellen: 2 },
        ],
      }
    },
  },
  {
    id: 'gaube',
    beispiel: { ah: 45, ag: 15, h: 120 },
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
      { id: 'hs', label: 'Höhe Gaubensparren', art: 'len', optional: true, hinweis: 'für den Anschnitt auf dem Hauptdach' },
    ],
    rechne: (w, k) => {
      const r = schleppgaube({ neigungHaupt: zahl(w, 'ah'), neigungGaube: zahl(w, 'ag'), hoeheFront: zahl(w, 'h'), sparrenhoehe: opt(w, 'hs') })
      const b = opt(w, 'b')
      return {
        zeichnung: zeichneGaube(zahl(w, 'ah'), zahl(w, 'ag'), zahl(w, 'h'), r.lauf),
        details: detail(r.anschnitt ? 'Detail: Anschnitt des Gaubensparrens auf dem Hauptdach' : 'Detail: Anschluss des Gaubensparrens am Hauptdach (Sparrenhöhe eingeben für das Schnittmaß)', zeichneGaubeAnschluss(zahl(w, 'ah'), zahl(w, 'ag'), opt(w, 'hs'))),
        ausgaben: [
          L('Gaubensparren', r.sparrenGaube, true),
          L('Anschlusslänge auf dem Hauptdach', r.anschlussHaupt, true),
          L('Lauf (waagerecht)', r.lauf),
          W('Winkel Gaubensparren zum Hauptdach', r.anschlusswinkel),
          ...(r.anschnitt ? [L('Anschnitt: Länge der Schnittfläche auf dem Hauptdach', r.anschnitt)] : []),
          { label: 'Wangenfläche je Seite', wert: qm(zahl(w, 'h'), r.lauf / 2, k.jeCm), art: 'num', einheit: 'm²', stellen: 2 },
          ...(b ? [{ label: 'Dachfläche Gaube', wert: qm(r.sparrenGaube, b, k.jeCm), art: 'num', einheit: 'm²', stellen: 2 } as Ausgabe] : []),
        ],
      }
    },
  },
  {
    id: 'sattelgaube',
    beispiel: { ah: 45, ag: 45, b: 200, h: 100, aw: 45, gb: 0 },
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
        details: [
          ...detail('Detail 1: Querschnitt der Gaube', zeichneGaubeQuer(zahl(w, 'b'), r.firstUeberTraufe, r.sparren, zahl(w, 'ag'))),
          ...detail('Detail 2: Längsschnitt – Traufe und First laufen ins Hauptdach', zeichneGaubeLaengs(zahl(w, 'ah'), zahl(w, 'h'), r.firstUeberTraufe, r.trauflaenge, wg?.walmGrund ?? 0)),
          ...detail('Detail 3: Kehlsparren, Seitenansicht', zeichneGratSeite(r.kehlGrund, r.firstUeberTraufe, r.kehlNeigung, 'Gaubentraufe', 'Gaubenfirst')),
          ...(wg ? detail('Detail 4: Gratsparren am Walm, Seitenansicht', zeichneGratSeite(wg.grat.gratGrund, wg.grat.hoehe, wg.grat.gratNeigung, 'Traufecke', 'Anfallspunkt')) : []),
        ],
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
    beispiel: { fb: 114, fh: 118, ls: 2, lh: 4, e: 80, s: 8 },
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
    beispiel: { l: 1000, b: 800, a: 35, ut: 50, uo: 30 },
    titel: 'Dachfläche Satteldach',
    gruppe: 'Dach',
    kurz: 'Fläche aus Grundriss und Neigung',
    info: 'Längen in der gewählten Einheit, die Fläche in Quadratmetern. Beide Traufen liegen auf gleicher Höhe. Mit einer zweiten Dachneigung liegt der First außermittig: dort, wo beide Seiten dieselbe Höhe erreichen.',
    felder: [
      { id: 'l', label: 'Gebäudelänge (Traufseite)', art: 'len' },
      { id: 'b', label: 'Gebäudebreite (Giebelseite)', art: 'len' },
      { id: 'a', label: 'Dachneigung', art: 'ang', vorgabe: 35 },
      { id: 'ut', label: 'Überstand Traufe (waagerecht)', art: 'len', vorgabe: 0 },
      { id: 'uo', label: 'Überstand Ortgang', art: 'len', vorgabe: 0 },
      { id: 'a2', label: 'Dachneigung zweite Seite', art: 'ang', optional: true, hinweis: 'leer = beide Seiten gleich' },
    ],
    rechne: (w, k) => {
      const r = dachflaecheSattel({ laenge: zahl(w, 'l'), breite: zahl(w, 'b'), neigung: zahl(w, 'a'), neigung2: opt(w, 'a2'), ueberstandTraufe: zahl(w, 'ut'), ueberstandOrtgang: zahl(w, 'uo') })
      const gleich = Math.abs(r.neigung2 - zahl(w, 'a')) < 1e-9
      const m2 = (label: string, laenge: number, breite: number, wichtig = false): Ausgabe => ({ label, wert: qm(laenge, breite, k.jeCm), art: 'num', einheit: 'm²', wichtig, stellen: 2 })
      return {
        zeichnung: zeichneSatteldach(zahl(w, 'b'), r.firstAb, r.firsthoehe, zahl(w, 'ut'), zahl(w, 'a'), r.neigung2, r.sparrenlaenge, r.sparrenlaenge2),
        details: detail('Detail Grundriss mit Überständen', zeichneDachGrundriss(zahl(w, 'l'), zahl(w, 'b'), zahl(w, 'ut'), zahl(w, 'uo'), r.firstAb)),
        ausgaben: [
          m2('Dachfläche gesamt', r.sparrenlaenge + r.sparrenlaenge2, r.trauflaenge, true),
          ...(gleich
            ? [m2('je Dachseite', r.sparrenlaenge, r.trauflaenge), L('Sparrenlänge', r.sparrenlaenge)]
            : [
                m2('Dachseite 1', r.sparrenlaenge, r.trauflaenge),
                m2('Dachseite 2', r.sparrenlaenge2, r.trauflaenge),
                L('Sparrenlänge Seite 1', r.sparrenlaenge),
                L('Sparrenlänge Seite 2', r.sparrenlaenge2),
                L('First ab Traufwand Seite 1 (waagerecht)', r.firstAb),
              ]),
          L('Trauflänge', r.trauflaenge),
          L('Firsthöhe', r.firsthoehe),
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
    beispiel: { b: 300, t: 6, amax: 62.5, n: 5 },
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
    beispiel: { l: 1000, s: 8, r: 0, a: 80 },
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
    info: 'Sind beide Diagonalen gleich lang, ist das Rechteck im Winkel. Die gemessenen Diagonalen d1 und d2 sind freiwillig. Werte in der Liste eintragen oder in der Zeichnung antippen.',
    vorschau: (w) => zeichneDiagonale(oderNaN(w, 'l'), oderNaN(w, 'b'), oderNaN(w, 'd1'), oderNaN(w, 'd2'), gegeben(w, ['l', 'b', 'd1', 'd2'])),
    felder: [
      { id: 'l', label: 'Länge', art: 'len', inZeichnung: true },
      { id: 'b', label: 'Breite', art: 'len', inZeichnung: true },
      { id: 'd1', label: 'Diagonale 1 gemessen', art: 'len', optional: true, inZeichnung: true },
      { id: 'd2', label: 'Diagonale 2 gemessen', art: 'len', optional: true, inZeichnung: true },
    ],
    rechne: (w) => {
      const r = diagonale(zahl(w, 'l'), zahl(w, 'b'), opt(w, 'd1'), opt(w, 'd2'))
      const aus: Ausgabe[] = [L('Diagonale Soll', r.soll, true), W('Winkel Diagonale zur Länge', r.winkel)]
      if (r.abweichung1 !== undefined) aus.push(L('Abweichung Diagonale 1', r.abweichung1))
      if (r.abweichung2 !== undefined) aus.push(L('Abweichung Diagonale 2', r.abweichung2))
      if (r.differenz !== undefined) aus.push(L('Unterschied der Diagonalen', r.differenz, true))
      return { zeichnung: zeichneDiagonale(zahl(w, 'l'), zahl(w, 'b'), oderNaN(w, 'd1'), oderNaN(w, 'd2'), gegeben(w, ['l', 'b', 'd1', 'd2']), r.soll), ausgaben: aus }
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
    loese: { felder: ['a', 'b', 'c', 'alpha', 'beta'], anzahl: 2 },
    titel: 'Rechtwinkliges Dreieck',
    gruppe: 'Winkel & Maßkontrolle',
    kurz: 'Zwei Werte eingeben, Rest berechnen',
    info: 'Zwei Werte eintragen, davon mindestens eine Seite – in der Liste oder durch Antippen in der Zeichnung. Es gelten immer die zwei zuletzt eingetragenen Werte; die übrigen Felder werden geleert und zeigen das Ergebnis. c ist die Hypotenuse, α liegt gegenüber von a.',
    // Eingabebild: feste Form, die Werte stehen als antippbare Maße daran
    vorschau: (w) => {
      // Form aus dem, was schon eingetragen ist: Katheten direkt, sonst aus Winkel oder im Verhältnis 3 : 5
      const [a0, b0, al, be] = [opt(w, 'a'), opt(w, 'b'), opt(w, 'alpha'), opt(w, 'beta')]
      const winkel = al !== undefined && al > 0 && al < 90 ? al : be !== undefined && be > 0 && be < 90 ? 90 - be : undefined
      const t = winkel !== undefined ? Math.tan((winkel * Math.PI) / 180) : 0.6
      const a = a0 !== undefined && a0 > 0 ? a0 : b0 !== undefined && b0 > 0 ? b0 * t : 6
      const b = b0 !== undefined && b0 > 0 ? b0 : a / t
      return zeichneDreieck(a, b, Math.hypot(a, b), (Math.atan2(a, b) * 180) / Math.PI, {
        feld: { a: 'a', b: 'b', c: 'c', alpha: 'alpha', beta: 'beta' },
        gegeben: gegeben(w, ['a', 'b', 'c', 'alpha', 'beta']),
        werte: { a: oderNaN(w, 'a'), b: oderNaN(w, 'b'), c: oderNaN(w, 'c'), alpha: oderNaN(w, 'alpha'), beta: oderNaN(w, 'beta'), gamma: 90 },
      })
    },
    felder: [
      { id: 'a', label: 'Seite a', art: 'len', optional: true, inZeichnung: true },
      { id: 'b', label: 'Seite b', art: 'len', optional: true, inZeichnung: true },
      { id: 'c', label: 'Seite c (Hypotenuse)', art: 'len', optional: true, inZeichnung: true },
      { id: 'alpha', label: 'Winkel α', art: 'ang', optional: true, inZeichnung: true },
      { id: 'beta', label: 'Winkel β', art: 'ang', optional: true, inZeichnung: true },
    ],
    rechne: (w) => {
      const r = rechtwinklig({ a: opt(w, 'a'), b: opt(w, 'b'), c: opt(w, 'c'), alpha: opt(w, 'alpha'), beta: opt(w, 'beta') })
      return {
        berechnet: { a: r.a, b: r.b, c: r.c, alpha: r.alpha, beta: r.beta },
        zeichnung: zeichneDreieck(r.a, r.b, r.c, r.alpha, { feld: { a: 'a', b: 'b', c: 'c', alpha: 'alpha', beta: 'beta' }, gegeben: gegeben(w, ['a', 'b', 'c', 'alpha', 'beta']) }),
        ausgaben: [L('a', r.a), L('b', r.b), L('c', r.c, true), W('α', r.alpha, true), W('β', r.beta), { label: 'Fläche', wert: r.flaeche, art: 'area' }, L('Umfang', r.umfang), L('Höhe auf c', r.hoeheC)],
      }
    },
  },
  {
    id: 'dreieck',
    loese: { felder: ['a', 'b', 'c', 'alpha', 'beta', 'gamma'], anzahl: 3 },
    titel: 'Allgemeines Dreieck',
    gruppe: 'Winkel & Maßkontrolle',
    kurz: 'Drei Werte eingeben, Rest berechnen',
    info: 'Drei Werte eintragen, davon mindestens eine Seite – in der Liste oder durch Antippen in der Zeichnung. Es gelten immer die drei zuletzt eingetragenen Werte; die übrigen Felder werden geleert und zeigen das Ergebnis. Jeder Winkel liegt der gleichnamigen Seite gegenüber (α gegenüber a).',
    vorschau: (w) => {
      // Form aus den schon eingetragenen Seiten; fehlende im Verhältnis 9 : 11 : 14 dazu, solange ein Dreieck entsteht
      const gegebenS = [opt(w, 'a'), opt(w, 'b'), opt(w, 'c')].map((x) => (x !== undefined && x > 0 ? x : undefined))
      const muster = [9, 11, 14]
      const vorhanden = gegebenS.flatMap((x, i) => (x === undefined ? [] : [x / muster[i]]))
      const f = vorhanden.length > 0 ? vorhanden.reduce((p, q) => p + q, 0) / vorhanden.length : 1
      let [a, b, c] = gegebenS.map((x, i) => x ?? muster[i] * f)
      if (!(a + b > c * 1.02 && a + c > b * 1.02 && b + c > a * 1.02)) [a, b, c] = muster
      return zeichneDreieck(a, b, c, (Math.acos((b * b + c * c - a * a) / (2 * b * c)) * 180) / Math.PI, {
        feld: { a: 'a', b: 'b', c: 'c', alpha: 'alpha', beta: 'beta', gamma: 'gamma' },
        gegeben: gegeben(w, ['a', 'b', 'c', 'alpha', 'beta', 'gamma']),
        werte: { a: oderNaN(w, 'a'), b: oderNaN(w, 'b'), c: oderNaN(w, 'c'), alpha: oderNaN(w, 'alpha'), beta: oderNaN(w, 'beta'), gamma: oderNaN(w, 'gamma') },
      })
    },
    felder: [
      { id: 'a', label: 'Seite a', art: 'len', optional: true, inZeichnung: true },
      { id: 'b', label: 'Seite b', art: 'len', optional: true, inZeichnung: true },
      { id: 'c', label: 'Seite c', art: 'len', optional: true, inZeichnung: true },
      { id: 'alpha', label: 'Winkel α', art: 'ang', optional: true, inZeichnung: true },
      { id: 'beta', label: 'Winkel β', art: 'ang', optional: true, inZeichnung: true },
      { id: 'gamma', label: 'Winkel γ', art: 'ang', optional: true, inZeichnung: true },
    ],
    rechne: (w) => {
      const r = dreieck({ a: opt(w, 'a'), b: opt(w, 'b'), c: opt(w, 'c'), alpha: opt(w, 'alpha'), beta: opt(w, 'beta'), gamma: opt(w, 'gamma') })
      return {
        berechnet: { a: r.a, b: r.b, c: r.c, alpha: r.alpha, beta: r.beta, gamma: r.gamma },
        zeichnung: zeichneDreieck(r.a, r.b, r.c, r.alpha, { feld: { a: 'a', b: 'b', c: 'c', alpha: 'alpha', beta: 'beta', gamma: 'gamma' }, gegeben: gegeben(w, ['a', 'b', 'c', 'alpha', 'beta', 'gamma']) }),
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
    info: 'Spannweite s und Stichhöhe h in der Liste eintragen oder in der Zeichnung antippen.',
    vorschau: (w) => zeichneBogen(oderNaN(w, 's'), oderNaN(w, 'h'), gegeben(w, ['s', 'h'])),
    felder: [
      { id: 's', label: 'Spannweite (Sehne)', art: 'len', inZeichnung: true },
      { id: 'h', label: 'Stichhöhe', art: 'len', inZeichnung: true },
    ],
    rechne: (w) => {
      const r = bogen(zahl(w, 's'), zahl(w, 'h'))
      return { zeichnung: zeichneBogen(zahl(w, 's'), zahl(w, 'h'), gegeben(w, ['s', 'h']), r.radius), ausgaben: [L('Radius', r.radius, true), L('Bogenlänge', r.bogenlaenge), W('Öffnungswinkel', r.winkel)] }
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
    info: 'Ohne eigenen Auftritt wird er aus der Schrittmaßregel berechnet; mit eigenem Auftritt wird das Schrittmaß ausgewiesen. Schrittmaßregel: 2 × Steigung + Auftritt = 63 cm. Bequem ist eine Treppe bei Auftritt − Steigung ≈ 12 cm, sicher bei Auftritt + Steigung ≈ 46 cm. Bauordnung und DIN 18065 gehen vor.',
    felder: [
      { id: 'h', label: 'Geschosshöhe (OKFF bis OKFF)', art: 'len' },
      { id: 's', label: 'Wunsch-Steigung', art: 'len', optional: true, hinweis: 'leer = 18 cm' },
      { id: 'au', label: 'Auftritt', art: 'len', optional: true, hinweis: 'leer = aus der Schrittmaßregel berechnet' },
    ],
    rechne: (w, k) => {
      const au = opt(w, 'au')
      const r = treppe(zahl(w, 'h') / k.jeCm, (opt(w, 's') ?? 18 * k.jeCm) / k.jeCm, 63, au === undefined ? undefined : au / k.jeCm)
      const schrittAus = r.schrittmass < 59 - 1e-9 || r.schrittmass > 65 + 1e-9
      const cm = (label: string, wert: number, wichtig = false): Ausgabe => L(label, wert * k.jeCm, wichtig)
      return {
        ausgaben: [
          { label: 'Anzahl Steigungen', wert: r.steigungen, art: 'int', wichtig: true },
          cm('Steigung', r.steigung, true),
          cm('Auftritt', r.auftritt, true),
          { label: 'Anzahl Auftritte', wert: r.auftritte, art: 'int' },
          cm('Lauflänge', r.lauflaenge),
          W('Treppenneigung', r.neigung),
          cm('Schrittmaß: 2 × Steigung + Auftritt', r.schrittmass),
          cm('Bequemlichkeit: Auftritt − Steigung', r.bequem),
          cm('Sicherheit: Auftritt + Steigung', r.sicher),
        ],
        hinweise: [
          ...(r.steigung > 20 || r.auftritt < 23 ? ['Steigung über 20 cm oder Auftritt unter 23 cm – für Wohngebäude meist nicht zulässig.'] : []),
          ...(schrittAus ? ['Das Schrittmaß liegt außerhalb von 59 bis 65 cm – die Treppe läuft sich unbequem.'] : []),
        ],
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
    id: 'verschnitt',
    titel: 'Zuschnitt und Verschnitt',
    gruppe: 'Sonstiges',
    kurz: 'Teile auf Stangen verteilen',
    info: 'Je Zeile ein Teil: „Länge“ oder „Länge x Anzahl“. Davor kann ein Name mit Doppelpunkt stehen, dahinter „@“ und der Querschnitt, zum Beispiel „Sparren: 480 x 12 @ 8/18“. Teile werden je Querschnitt getrennt verteilt. Stehen mehrere Stangenlängen zur Wahl, werden mehrere Aufteilungen verglichen und die mit dem geringsten Materialeinsatz genommen. Das ist ein Näherungsverfahren und garantiert nicht den kleinsten Verschnitt. Anschnitt und Fehlstellen selbst zugeben.',
    felder: [
      { id: 'l', label: 'Stangenlängen', art: 'liste', hinweis: 'eine Länge je Zeile, zum Beispiel 500 und darunter 400' },
      { id: 's', label: 'Schnittbreite (Sägeblatt)', art: 'len', vorgabe: 0 },
      { id: 't', label: 'Stückliste', art: 'liste', hinweis: 'zum Beispiel: 240 x 3 oder Sparren: 480 x 12 @ 8/18' },
      {
        id: 'ue',
        label: 'Teile länger als die längste Stange',
        art: 'select',
        vorgabe: 'stossen',
        optionen: [
          { wert: 'stossen', label: 'aus mehreren Stangen stoßen' },
          { wert: 'fehler', label: 'nicht zulassen' },
        ],
      },
    ],
    rechne: (w) => {
      const laengen = leseLaengen(String(w.l))
      const liste = leseStueckliste(String(w.t))
      // überlange Teile in ganze Stangen und ein Reststück zerlegen, wenn gewünscht
      const gestossen = w.ue === 'fehler' || laengen.length === 0 ? { teile: liste, stoesse: 0 } : stosse(liste, Math.max(...laengen))
      const r = zuschnitt(laengen, zahl(w, 's'), gestossen.teile)
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
          { label: gestossen.stoesse > 0 ? 'Anzahl Teilstücke' : 'Anzahl Teile', wert: r.teile, art: 'int' },
          ...(gestossen.stoesse > 0 ? [{ label: 'Stöße in überlangen Teilen', wert: gestossen.stoesse, art: 'int' } as Ausgabe] : []),
        ],
        hinweise: gestossen.stoesse > 0 ? ['Mindestens ein Teil ist länger als die längste Stange und wurde aus mehreren Stangen gestoßen. Ob ein Stoß zulässig ist, wo er liegt und wie er verbunden wird, ist selbst festzulegen.'] : [],
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
    beispiel: { d: 4, w: 0 },
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
        zeichnung: zeichneAbstaende(zahl(w, 'd'), zahl(w, 'w'), r),
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
