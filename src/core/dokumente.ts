import { baueAnzeige, datumDeutsch } from './anzeige'

/**
 * Dokumentvorlagen für die Baustelle: Formularbeschreibung und Textaufbau.
 * Reine Logik ohne Oberfläche. Die Vorlagen sind deutsche Dokumente und ersetzen keine Rechtsberatung.
 */

export interface Spalte {
  id: string
  label: string
  art: 'text' | 'zahl'
  platzhalter?: string
}

export interface DokFeld {
  id: string
  label: string
  art: 'text' | 'mehrzeilig' | 'datum' | 'auswahl' | 'haken' | 'tabelle'
  freiwillig?: boolean
  platzhalter?: string
  /** 'heute' setzt bei Datumsfeldern das aktuelle Datum; Haken: '1' = gesetzt */
  vorgabe?: string
  optionen?: { wert: string; label: string }[]
  spalten?: Spalte[]
  /** Text auf dem Knopf, der eine Tabellenzeile anlegt */
  neueZeile?: string
}

export type Zeile = Record<string, string>

/** Formularwerte: Text je Feld, bei Tabellen die Zeilen */
export interface DokWerte {
  text: Record<string, string>
  tabellen: Record<string, Zeile[]>
}

export type Block =
  | { art: 'absatz'; text: string; fett?: boolean }
  | { art: 'tabelle'; kopf: string[]; zeilen: string[][]; rechts: boolean[]; summen?: string[][] }

export interface DokInhalt {
  absender: string[]
  empfaenger: string[]
  ortDatum: string
  betreff: string
  bezug: string[]
  anrede?: string
  bloecke: Block[]
  gruss?: string
  /** Beschriftung unter jeder Unterschriftslinie, in der Reihenfolge der Unterschriftsfelder */
  unterschriften: string[]
}

export interface Vorlage {
  id: string
  hinweis: string
  felder: DokFeld[]
  /** Bezeichnung der Unterschriftsfelder im Formular */
  unterschriften: string[]
  baue: (w: DokWerte, anzahlFotos: number) => DokInhalt
  /** Widersprüche und unlesbare Zahlen, die den Export sperren (zusätzlich zu fehlenden Pflichtangaben) */
  pruefe?: (w: DokWerte) => string[]
  /** Wortstamm für den Dateinamen */
  datei: string
}

/* ---------- Hilfen ---------- */

const zeilen = (text: string): string[] =>
  text
    .split('\n')
    .map((z) => z.trim())
    .filter((z) => z !== '')

const t = (w: DokWerte, id: string): string => (w.text[id] ?? '').trim()
const an = (w: DokWerte, id: string): boolean => w.text[id] === '1'

/** Zahl aus einer Formulareingabe mit Komma oder Punkt; leer oder unlesbar → NaN */
export function leseMenge(text: string): number {
  const s = text.trim().replace(/\s/g, '').replace(',', '.')
  return /^\d+(\.\d+)?$/.test(s) ? Number.parseFloat(s) : NaN
}

export const zahlDeutsch = (x: number, stellen = 2): string => x.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: stellen, useGrouping: false })

/** Zeilen, in denen überhaupt etwas steht */
const belegt = (z: Zeile[]): Zeile[] => z.filter((r) => Object.values(r).some((v) => v.trim() !== ''))

/** Meldungen für belegte Zeilen, deren Zahl in `spalte` fehlt oder unlesbar ist */
function zahlenFehler(w: DokWerte, tabelle: string, spalte: string, name: string): string[] {
  return belegt(w.tabellen[tabelle] ?? []).flatMap((z, i) => (Number.isFinite(leseMenge(z[spalte] ?? '')) ? [] : [`${name}: Zahl in Zeile ${i + 1} fehlt oder ist nicht lesbar`]))
}

const fotos = (n: number): Block[] => (n > 0 ? [{ art: 'absatz', text: `Anlage: ${n} ${n === 1 ? 'Foto' : 'Fotos'}` }] : [])

function kopf(w: DokWerte): Pick<DokInhalt, 'absender' | 'empfaenger' | 'ortDatum' | 'bezug'> {
  const bezug = [`Bauvorhaben: ${t(w, 'bauvorhaben')}`]
  if (t(w, 'auftrag')) bezug.push(`Auftrag: ${t(w, 'auftrag')}`)
  return {
    absender: zeilen(w.text.absender ?? ''),
    empfaenger: zeilen(w.text.empfaenger ?? ''),
    ortDatum: [t(w, 'ort'), datumDeutsch(t(w, 'datum'))].filter((x) => x !== '').join(', '),
    bezug,
  }
}

/** Felder, die jede Vorlage braucht */
const KOPFFELDER: DokFeld[] = [
  { id: 'absender', label: 'Absender (Firma und Anschrift)', art: 'mehrzeilig' },
  { id: 'empfaenger', label: 'Empfänger (Auftraggeber und Anschrift)', art: 'mehrzeilig' },
  { id: 'bauvorhaben', label: 'Bauvorhaben', art: 'text' },
  { id: 'auftrag', label: 'Auftrag / Vertrag', art: 'text', freiwillig: true, platzhalter: 'z. B. Nr. und Datum' },
  { id: 'ort', label: 'Ort', art: 'text', freiwillig: true },
  { id: 'datum', label: 'Datum', art: 'datum', vorgabe: 'heute' },
]

const VERTRAG: DokFeld = {
  id: 'vertrag',
  label: 'Vertragsgrundlage',
  art: 'auswahl',
  vorgabe: 'vob',
  optionen: [
    { wert: 'vob', label: 'VOB/B-Vertrag' },
    { wert: 'bgb', label: 'BGB-Bauvertrag' },
  ],
}

/** Pflichtangaben, die noch fehlen (Bezeichnungen der Felder). */
export function fehlend(v: Vorlage, w: DokWerte): string[] {
  return v.felder
    .filter((f) => {
      if (f.freiwillig || f.art === 'haken' || f.art === 'auswahl') return false
      if (f.art === 'tabelle') return belegt(w.tabellen[f.id] ?? []).length === 0
      return t(w, f.id) === ''
    })
    .map((f) => f.label.replace(/ \(.*\)$/, ''))
}

/** Dateiname ohne Sonderzeichen, z. B. Aufmass_Neubau-Halle_2026-11-27.pdf */
export function dokDateiname(v: Vorlage, w: DokWerte): string {
  const sauber = t(w, 'bauvorhaben')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '')
  // das Datum kommt aus einem Datumsfeld; alles andere wird nicht in den Dateinamen übernommen
  const datum = /^\d{4}-\d{2}-\d{2}$/.test(t(w, 'datum')) ? t(w, 'datum') : ''
  return [v.datei, sauber, datum].filter((x) => x !== '').join('_') + '.pdf'
}

/* ---------- Bedenkenanzeige ---------- */

const GEGENSTAND: Record<string, string> = {
  ausfuehrung: 'die vorgesehene Art der Ausführung',
  stoffe: 'die Güte der vom Auftraggeber gelieferten Stoffe oder Bauteile',
  vorleistung: 'die Leistungen anderer Unternehmer',
  sicherung: 'die Sicherung gegen Unfallgefahren',
}

export const BEDENKEN: Vorlage = {
  id: 'bedenken',
  datei: 'Bedenkenanzeige',
  hinweis: 'Vorlage ohne Gewähr – sie ersetzt keine Rechtsberatung. Bedenken müssen dem Auftraggeber unverzüglich, schriftlich und möglichst vor Beginn der Arbeiten zugehen.',
  unterschriften: ['Unterschrift'],
  felder: [
    VERTRAG,
    ...KOPFFELDER,
    { id: 'leistung', label: 'Betroffene Leistung', art: 'text', freiwillig: true, platzhalter: 'z. B. Aufsparrendämmung' },
    {
      id: 'gegenstand',
      label: 'Die Bedenken richten sich gegen',
      art: 'auswahl',
      vorgabe: 'ausfuehrung',
      optionen: [
        { wert: 'ausfuehrung', label: 'die vorgesehene Art der Ausführung' },
        { wert: 'stoffe', label: 'gelieferte Stoffe oder Bauteile' },
        { wert: 'vorleistung', label: 'Leistungen anderer Unternehmer' },
        { wert: 'sicherung', label: 'die Sicherung gegen Unfallgefahren' },
      ],
    },
    { id: 'bedenken', label: 'Unsere Bedenken', art: 'mehrzeilig', platzhalter: 'Was ist vorgesehen oder vorgefunden, und warum ist das bedenklich?' },
    { id: 'folgen', label: 'Mögliche Folgen', art: 'mehrzeilig', platzhalter: 'Welche Mängel oder Schäden können entstehen?' },
    { id: 'vorschlag', label: 'Unser Vorschlag', art: 'mehrzeilig', freiwillig: true },
    { id: 'frist', label: 'Entscheidung erbeten bis', art: 'datum', freiwillig: true },
    { id: 'stopp', label: 'Arbeiten ruhen bis zur Entscheidung (Behinderung anzeigen)', art: 'haken' },
    { id: 'haftung', label: 'Haftung bei unveränderter Ausführung ablehnen', art: 'haken', vorgabe: '1' },
    { id: 'unterzeichner', label: 'Name des Unterzeichners', art: 'text', freiwillig: true },
  ],
  baue: (w, n) => {
    const vob = w.text.vertrag !== 'bgb'
    const gegen = GEGENSTAND[w.text.gegenstand] ?? GEGENSTAND.ausfuehrung
    const b: Block[] = []
    const p = (text: string, fett = false): void => void b.push({ art: 'absatz', text, fett })
    p(vob ? `hiermit melden wir gemäß § 4 Abs. 3 VOB/B Bedenken an gegen ${gegen}.` : `hiermit melden wir im Rahmen unserer Prüf- und Hinweispflicht Bedenken an gegen ${gegen}.`)
    p('Unsere Bedenken', true)
    p(t(w, 'bedenken'))
    p('Mögliche Folgen', true)
    p(t(w, 'folgen'))
    if (t(w, 'vorschlag')) {
      p('Unser Vorschlag', true)
      p(t(w, 'vorschlag'))
    }
    p(t(w, 'frist') ? `Wir bitten um Ihre schriftliche Entscheidung bis zum ${datumDeutsch(t(w, 'frist'))}, wie die Leistung ausgeführt werden soll.` : 'Wir bitten umgehend um Ihre schriftliche Entscheidung, wie die Leistung ausgeführt werden soll.')
    if (an(w, 'stopp')) {
      p(
        vob
          ? 'Bis zu Ihrer Entscheidung können wir die betroffenen Arbeiten nicht fortsetzen. Die daraus entstehende Verzögerung zeigen wir hiermit vorsorglich als Behinderung gemäß § 6 Abs. 1 VOB/B an.'
          : 'Bis zu Ihrer Entscheidung können wir die betroffenen Arbeiten nicht fortsetzen. Die daraus entstehende Verzögerung zeigen wir hiermit vorsorglich als Behinderung an.'
      )
    }
    // § 13 Abs. 3 VOB/B betrifft die Mängelhaftung; bei Unfallgefahren passt der Baustein nicht
    if (an(w, 'haftung') && w.text.gegenstand !== 'sicherung') {
      p(
        vob
          ? 'Sollten Sie auf der unveränderten Ausführung bestehen, weisen wir darauf hin, dass wir für daraus entstehende Mängel und Schäden nicht haften (§ 13 Abs. 3 VOB/B).'
          : 'Sollten Sie auf der unveränderten Ausführung bestehen, lehnen wir die Haftung für daraus entstehende Mängel und Schäden ab.'
      )
    }
    const k = kopf(w)
    if (t(w, 'leistung')) k.bezug.push(`Betroffene Leistung: ${t(w, 'leistung')}`)
    return {
      ...k,
      betreff: vob ? 'Bedenkenanzeige gemäß § 4 Abs. 3 VOB/B' : 'Bedenkenanzeige',
      anrede: 'Sehr geehrte Damen und Herren,',
      bloecke: [...b, ...fotos(n)],
      gruss: 'Mit freundlichen Grüßen',
      unterschriften: [t(w, 'unterzeichner')],
    }
  },
}

/* ---------- Stundenzettel / Regiebericht ---------- */

export const STUNDENZETTEL: Vorlage = {
  id: 'stundenzettel',
  datei: 'Stundenzettel',
  hinweis:
    'Vorlage ohne Gewähr. Stundenlohnarbeiten sollten vor Beginn vereinbart sein und zeitnah bestätigt werden. Namen von Beschäftigten sind personenbezogene Daten – wo es reicht, nur die Qualifikation eintragen.',
  unterschriften: ['Unterschrift Auftragnehmer', 'Unterschrift Auftraggeber / Bauleitung'],
  // eine unterschriebene Summe darf keine Zeile stillschweigend auslassen
  pruefe: (w) => [...zahlenFehler(w, 'stunden', 'stunden', 'Arbeitszeit'), ...belegt(w.tabellen.material ?? []).flatMap((z, i) => ((z.menge ?? '').trim() === '' || Number.isFinite(leseMenge(z.menge ?? '')) ? [] : [`Material: Menge in Zeile ${i + 1} ist nicht lesbar`]))],
  felder: [
    ...KOPFFELDER,
    { id: 'nummer', label: 'Bericht Nr.', art: 'text', freiwillig: true },
    { id: 'arbeiten', label: 'Ausgeführte Arbeiten', art: 'mehrzeilig', platzhalter: 'Was wurde gemacht, wo und auf wessen Anordnung?' },
    {
      id: 'stunden',
      label: 'Arbeitszeit',
      art: 'tabelle',
      neueZeile: 'Person hinzufügen',
      spalten: [
        { id: 'wer', label: 'Wer', art: 'text', platzhalter: 'z. B. Geselle' },
        { id: 'stunden', label: 'Stunden', art: 'zahl' },
        { id: 'was', label: 'Tätigkeit', art: 'text' },
        { id: 'tag', label: 'Tag (bei mehreren Tagen)', art: 'text', platzhalter: 'z. B. Mo 24.11.' },
      ],
    },
    {
      id: 'material',
      label: 'Material und Geräte',
      art: 'tabelle',
      freiwillig: true,
      neueZeile: 'Material hinzufügen',
      spalten: [
        { id: 'was', label: 'Bezeichnung', art: 'text' },
        { id: 'menge', label: 'Menge', art: 'zahl' },
        { id: 'einheit', label: 'Einheit', art: 'text', platzhalter: 'm, Stk, h' },
      ],
    },
    { id: 'bemerkung', label: 'Bemerkungen', art: 'mehrzeilig', freiwillig: true },
  ],
  baue: (w, n) => {
    const stunden = belegt(w.tabellen.stunden ?? [])
    const material = belegt(w.tabellen.material ?? [])
    const summe = stunden.reduce((a, z) => a + (Number.isFinite(leseMenge(z.stunden ?? '')) ? leseMenge(z.stunden ?? '') : 0), 0)
    const mitTag = stunden.some((z) => (z.tag ?? '').trim() !== '')
    const b: Block[] = [
      { art: 'absatz', text: 'Ausgeführte Arbeiten', fett: true },
      { art: 'absatz', text: t(w, 'arbeiten') },
      { art: 'absatz', text: 'Arbeitszeit', fett: true },
      {
        art: 'tabelle',
        // die Spalte „Tag“ erscheint nur, wenn sie benutzt wird
        kopf: [...(mitTag ? ['Tag'] : []), 'Wer', 'Tätigkeit', 'Stunden'],
        rechts: [...(mitTag ? [false] : []), false, false, true],
        zeilen: stunden.map((z) => [...(mitTag ? [(z.tag ?? '').trim()] : []), z.wer ?? '', z.was ?? '', Number.isFinite(leseMenge(z.stunden ?? '')) ? zahlDeutsch(leseMenge(z.stunden ?? '')) : (z.stunden ?? '')]),
        summen: [[...(mitTag ? [''] : []), 'Summe', '', zahlDeutsch(summe)]],
      },
    ]
    if (material.length) {
      b.push({ art: 'absatz', text: 'Material und Geräte', fett: true })
      b.push({
        art: 'tabelle',
        kopf: ['Bezeichnung', 'Menge', 'Einheit'],
        rechts: [false, true, false],
        zeilen: material.map((z) => [z.was ?? '', Number.isFinite(leseMenge(z.menge ?? '')) ? zahlDeutsch(leseMenge(z.menge ?? ''), 3) : (z.menge ?? ''), z.einheit ?? '']),
      })
    }
    if (t(w, 'bemerkung')) {
      b.push({ art: 'absatz', text: 'Bemerkungen', fett: true })
      b.push({ art: 'absatz', text: t(w, 'bemerkung') })
    }
    b.push({ art: 'absatz', text: 'Mit der Unterschrift werden die aufgeführten Stunden und Mengen bestätigt.' })
    return {
      ...kopf(w),
      betreff: `Stundenlohnzettel${t(w, 'nummer') ? ` Nr. ${t(w, 'nummer')}` : ''} vom ${datumDeutsch(t(w, 'datum'))}`,
      bloecke: [...b, ...fotos(n)],
      unterschriften: ['Auftragnehmer', 'Auftraggeber / Bauleitung'],
    }
  },
}

/* ---------- Aufmaßblatt ---------- */

export interface AufmassZeile {
  bezeichnung: string
  /** negativ = Abzug, z. B. −1 für eine Öffnung */
  anzahl: number
  /** nur die ausgefüllten Maße, in Metern */
  masse: number[]
  menge: number
  einheit: 'Stk' | 'm' | 'm²' | 'm³'
}

export type AufmassErgebnisZeile = AufmassZeile | { bezeichnung: string; fehler: true } | { bezeichnung: string; titel: true }

/**
 * Menge je Zeile = Anzahl × alle ausgefüllten Maße. Die Einheit folgt aus der Zahl der Maße:
 * keines = Stück, eines = m, zwei = m², drei = m³. Eine leere Anzahl zählt als 1, eine negative
 * als Abzug. Eine Zeile nur mit Bezeichnung ist eine Zwischenüberschrift. Unlesbare Zahlen machen
 * die Zeile ungültig.
 */
export function rechneAufmass(zeilenRoh: Zeile[]): { zeilen: AufmassErgebnisZeile[]; summen: Record<string, number> } {
  const summen: Record<string, number> = {}
  const zeilenAus = belegt(zeilenRoh).map((z): AufmassErgebnisZeile => {
    const bezeichnung = (z.was ?? '').trim()
    const anzahlText = (z.anzahl ?? '').trim()
    const roh = [z.laenge, z.breite, z.hoehe].map((x) => (x ?? '').trim()).filter((x) => x !== '')
    if (anzahlText === '' && roh.length === 0) return { bezeichnung, titel: true }
    const minus = /^[-−]/.test(anzahlText)
    const anzahl = anzahlText === '' ? 1 : (minus ? -1 : 1) * leseMenge(anzahlText.replace(/^[-−]\s*/, ''))
    const masse = roh.map(leseMenge)
    if (!Number.isFinite(anzahl) || masse.some((m) => !Number.isFinite(m)) || !Number.isFinite(masse.reduce((a, m) => a * m, anzahl))) return { bezeichnung, fehler: true }
    const menge = masse.reduce((a, m) => a * m, anzahl)
    const einheit = (['Stk', 'm', 'm²', 'm³'] as const)[masse.length]
    summen[einheit] = (summen[einheit] ?? 0) + menge
    return { bezeichnung, anzahl, masse, menge, einheit }
  })
  return { zeilen: zeilenAus, summen }
}

export const AUFMASS: Vorlage = {
  id: 'aufmass',
  datei: 'Aufmass',
  hinweis:
    'Vorlage ohne Gewähr. Maße in Metern eintragen. Leere Maße zählen nicht mit: nur Länge ergibt Meter, Länge und Breite Quadratmeter, alle drei Kubikmeter, ohne Maße Stück. Eine leere Anzahl zählt als 1, eine negative Anzahl ist ein Abzug. Eine Zeile nur mit Bezeichnung wird zur Zwischenüberschrift. Die Summen laufen je Einheit über alle Positionen. Abrechnungsregeln (z. B. Übermessung nach VOB/C) sind selbst zu beachten.',
  pruefe: (w) => rechneAufmass(w.tabellen.positionen ?? []).zeilen.flatMap((z, i) => ('fehler' in z ? [`Positionen: Zahl in Zeile ${i + 1} ist nicht lesbar`] : [])),
  unterschriften: ['Unterschrift Auftragnehmer', 'Unterschrift Auftraggeber / Bauleitung'],
  felder: [
    ...KOPFFELDER,
    { id: 'nummer', label: 'Aufmaß Nr.', art: 'text', freiwillig: true },
    { id: 'teilnehmer', label: 'Teilnehmer', art: 'text', freiwillig: true, platzhalter: 'wer hat gemeinsam gemessen?' },
    {
      id: 'positionen',
      label: 'Positionen',
      art: 'tabelle',
      neueZeile: 'Position hinzufügen',
      spalten: [
        { id: 'was', label: 'Bezeichnung', art: 'text', platzhalter: 'z. B. Pos. 3 Lattung' },
        { id: 'anzahl', label: 'Anzahl', art: 'zahl', platzhalter: '1' },
        { id: 'laenge', label: 'Länge m', art: 'zahl' },
        { id: 'breite', label: 'Breite m', art: 'zahl' },
        { id: 'hoehe', label: 'Höhe m', art: 'zahl' },
      ],
    },
    { id: 'bemerkung', label: 'Bemerkungen', art: 'mehrzeilig', freiwillig: true },
  ],
  baue: (w, n) => {
    const r = rechneAufmass(w.tabellen.positionen ?? [])
    const b: Block[] = []
    if (t(w, 'teilnehmer')) b.push({ art: 'absatz', text: `Teilnehmer: ${t(w, 'teilnehmer')}` })
    b.push({
      art: 'tabelle',
      kopf: ['Bezeichnung', 'Anzahl', 'Maße in m', 'Menge', ''],
      rechts: [false, true, false, true, false],
      zeilen: r.zeilen.map((z) =>
        'titel' in z ? [z.bezeichnung, '', '', '', ''] : 'fehler' in z ? [z.bezeichnung, '', 'Zahl nicht lesbar', '', ''] : [z.bezeichnung, zahlDeutsch(z.anzahl, 3), z.masse.map((m) => zahlDeutsch(m, 3)).join(' × '), zahlDeutsch(z.menge, 3), z.einheit]
      ),
      summen: (['Stk', 'm', 'm²', 'm³'] as const).filter((e) => e in r.summen).map((e) => [`Summe ${e}`, '', '', zahlDeutsch(r.summen[e], 3), e]),
    })
    if (t(w, 'bemerkung')) {
      b.push({ art: 'absatz', text: 'Bemerkungen', fett: true })
      b.push({ art: 'absatz', text: t(w, 'bemerkung') })
    }
    b.push({ art: 'absatz', text: 'Mit der Unterschrift werden die aufgeführten Maße und Mengen als gemeinsam festgestellt bestätigt.' })
    return {
      ...kopf(w),
      betreff: `Aufmaß${t(w, 'nummer') ? ` Nr. ${t(w, 'nummer')}` : ''} vom ${datumDeutsch(t(w, 'datum'))}`,
      bloecke: [...b, ...fotos(n)],
      unterschriften: ['Auftragnehmer', 'Auftraggeber / Bauleitung'],
    }
  },
}

/* ---------- Behinderungsanzeige ---------- */

export const BEHINDERUNG: Vorlage = {
  id: 'behinderung',
  datei: 'Behinderungsanzeige',
  hinweis: 'Vorlage ohne Gewähr – sie ersetzt keine Rechtsberatung. Die Anzeige muss dem Auftraggeber unverzüglich und nachweisbar zugehen.',
  unterschriften: ['Unterschrift'],
  felder: [
    VERTRAG,
    ...KOPFFELDER,
    { id: 'leistung', label: 'Betroffene Leistung', art: 'text', freiwillig: true, platzhalter: 'z. B. Dachstuhl aufrichten' },
    { id: 'seit', label: 'Behindert seit', art: 'datum', vorgabe: 'heute' },
    { id: 'ursache', label: 'Hindernde Umstände', art: 'mehrzeilig', platzhalter: 'Was genau behindert die Arbeit? Möglichst mit Ort und Zeitpunkt.' },
    { id: 'auswirkung', label: 'Auswirkungen auf die Leistung', art: 'mehrzeilig', platzhalter: 'Welche Arbeiten können nicht oder nur eingeschränkt ausgeführt werden?' },
    { id: 'dauer', label: 'Voraussichtliche Dauer', art: 'text', freiwillig: true, platzhalter: 'leer = nicht absehbar' },
    { id: 'massnahme', label: 'Erforderliche Maßnahmen', art: 'mehrzeilig', freiwillig: true, platzhalter: 'Was muss der Auftraggeber tun, damit weitergearbeitet werden kann?' },
    { id: 'aufforderung', label: 'Auftraggeber zur Beseitigung auffordern (nicht bei Witterung oder höherer Gewalt)', art: 'haken', vorgabe: '1' },
    { id: 'fristverlaengerung', label: 'Verlängerung der Ausführungsfristen anzeigen', art: 'haken', vorgabe: '1' },
    { id: 'mehrkosten', label: 'Mehrkosten vorbehalten', art: 'haken', vorgabe: '1' },
    { id: 'unterzeichner', label: 'Name des Unterzeichners', art: 'text', freiwillig: true },
  ],
  baue: (w, n) => {
    // Der Brieftext selbst steht in anzeige.ts und ist dort getestet
    const a = baueAnzeige(
      {
        vertrag: w.text.vertrag === 'bgb' ? 'bgb' : 'vob',
        absender: w.text.absender ?? '',
        empfaenger: w.text.empfaenger ?? '',
        bauvorhaben: w.text.bauvorhaben ?? '',
        auftrag: w.text.auftrag ?? '',
        ort: w.text.ort ?? '',
        datum: w.text.datum ?? '',
        leistung: w.text.leistung ?? '',
        seit: w.text.seit ?? '',
        ursache: w.text.ursache ?? '',
        auswirkung: w.text.auswirkung ?? '',
        dauer: w.text.dauer ?? '',
        massnahme: w.text.massnahme ?? '',
        // Dokumente, die vor Einführung des Hakens gespeichert wurden, behalten die Aufforderung
        aufforderung: w.text.aufforderung === undefined || an(w, 'aufforderung'),
        fristverlaengerung: an(w, 'fristverlaengerung'),
        mehrkosten: an(w, 'mehrkosten'),
        unterzeichner: w.text.unterzeichner ?? '',
      },
      n
    )
    return {
      absender: a.absender,
      empfaenger: a.empfaenger,
      ortDatum: a.ortDatum,
      betreff: a.betreff,
      bezug: a.bezug,
      anrede: a.anrede,
      bloecke: a.absaetze.map((p) => ({ art: 'absatz' as const, text: p.text, fett: p.fett })),
      gruss: a.gruss,
      unterschriften: [a.unterzeichner],
    }
  },
}

/* ---------- Abnahmeprotokoll ---------- */

export const ABNAHME: Vorlage = {
  id: 'abnahme',
  datei: 'Abnahmeprotokoll',
  hinweis: 'Vorlage ohne Gewähr – sie ersetzt keine Rechtsberatung. Mängel und Vorbehalte müssen bei der Abnahme ausdrücklich festgehalten werden, sonst können Rechte verloren gehen.',
  unterschriften: ['Unterschrift Auftragnehmer', 'Unterschrift Auftraggeber'],
  pruefe: (w) => {
    const maengel = belegt(w.tabellen.maengel ?? []).length
    if (w.text.ergebnis === 'ohne' || !w.text.ergebnis) return maengel ? ['Das Ergebnis „keine Mängel festgestellt“ passt nicht zur ausgefüllten Mängelliste'] : []
    return maengel ? [] : ['Bei diesem Ergebnis muss mindestens ein Mangel eingetragen sein']
  },
  felder: [
    VERTRAG,
    ...KOPFFELDER,
    { id: 'leistung', label: 'Abgenommene Leistung', art: 'text', platzhalter: 'z. B. Zimmerarbeiten Dachstuhl' },
    { id: 'tag', label: 'Tag der Abnahme', art: 'datum', vorgabe: 'heute' },
    { id: 'teilnehmer', label: 'Teilnehmer', art: 'text', freiwillig: true },
    {
      id: 'ergebnis',
      label: 'Ergebnis',
      art: 'auswahl',
      vorgabe: 'ohne',
      optionen: [
        { wert: 'ohne', label: 'abgenommen, keine Mängel festgestellt' },
        { wert: 'mit', label: 'abgenommen mit den aufgeführten Mängeln' },
        { wert: 'verweigert', label: 'Abnahme verweigert' },
      ],
    },
    {
      id: 'maengel',
      label: 'Mängel und Restarbeiten',
      art: 'tabelle',
      freiwillig: true,
      neueZeile: 'Mangel hinzufügen',
      spalten: [
        { id: 'was', label: 'Beschreibung', art: 'text' },
        { id: 'bis', label: 'Zu beheben bis', art: 'text', platzhalter: 'Datum' },
      ],
    },
    { id: 'vorbehalte', label: 'Vorbehalte', art: 'mehrzeilig', freiwillig: true, platzhalter: 'z. B. Vertragsstrafe' },
    { id: 'bemerkung', label: 'Bemerkungen', art: 'mehrzeilig', freiwillig: true },
  ],
  baue: (w, n) => {
    const vob = w.text.vertrag !== 'bgb'
    const maengel = belegt(w.tabellen.maengel ?? [])
    const ergebnis = w.text.ergebnis
    const b: Block[] = []
    const p = (text: string, fett = false): void => void b.push({ art: 'absatz', text, fett })
    p(`Die Leistung „${t(w, 'leistung')}“ wurde am ${datumDeutsch(t(w, 'tag'))} gemeinsam besichtigt.${t(w, 'teilnehmer') ? ` Teilnehmer: ${t(w, 'teilnehmer')}` : ''}`)
    p('Ergebnis', true)
    p(
      ergebnis === 'verweigert'
        ? 'Die Abnahme wird wegen der nachfolgend aufgeführten wesentlichen Mängel verweigert.'
        : ergebnis === 'mit'
          ? 'Die Leistung wird abgenommen. Der Auftraggeber behält sich seine Rechte wegen der nachfolgend aufgeführten Mängel vor.'
          : 'Die Leistung wird abgenommen. Mängel wurden nicht festgestellt.'
    )
    if (maengel.length) {
      p('Mängel und Restarbeiten', true)
      b.push({ art: 'tabelle', kopf: ['Nr.', 'Beschreibung', 'Zu beheben bis'], rechts: [false, false, false], zeilen: maengel.map((z, i) => [String(i + 1), z.was ?? '', z.bis ?? '']) })
    }
    if (t(w, 'vorbehalte')) {
      p('Vorbehalte', true)
      p(t(w, 'vorbehalte'))
    }
    if (t(w, 'bemerkung')) {
      p('Bemerkungen', true)
      p(t(w, 'bemerkung'))
    }
    if (ergebnis !== 'verweigert') p('Mit der Abnahme beginnt die Verjährungsfrist für Mängelansprüche, und die Gefahr geht auf den Auftraggeber über.')
    const k = kopf(w)
    return {
      ...k,
      betreff: vob ? 'Abnahmeprotokoll gemäß § 12 VOB/B' : 'Abnahmeprotokoll gemäß § 640 BGB',
      bloecke: [...b, ...fotos(n)],
      unterschriften: ['Auftragnehmer', 'Auftraggeber'],
    }
  },
}

/* ---------- Bautagesbericht ---------- */

export const BAUTAGEBUCH: Vorlage = {
  id: 'bautagebuch',
  datei: 'Bautagesbericht',
  hinweis: 'Vorlage ohne Gewähr. Ein Blatt je Arbeitstag. Wo es reicht, nur Qualifikation und Anzahl eintragen statt Namen.',
  unterschriften: ['Unterschrift Aufsteller', 'Unterschrift Bauleitung (freiwillig)'],
  pruefe: (w) => zahlenFehler(w, 'personal', 'anzahl', 'Personal'),
  felder: [
    ...KOPFFELDER.map((f) => (f.id === 'empfaenger' ? { ...f, freiwillig: true } : f)),
    { id: 'nummer', label: 'Blatt Nr.', art: 'text', freiwillig: true },
    { id: 'wetter', label: 'Wetter', art: 'text', freiwillig: true, platzhalter: 'z. B. bewölkt, trocken' },
    { id: 'temperatur', label: 'Temperatur', art: 'text', freiwillig: true, platzhalter: 'z. B. 4 °C' },
    { id: 'zeit', label: 'Arbeitszeit', art: 'text', freiwillig: true, platzhalter: 'z. B. 7:00 bis 16:00' },
    {
      id: 'personal',
      label: 'Personal',
      art: 'tabelle',
      neueZeile: 'Zeile hinzufügen',
      spalten: [
        { id: 'wer', label: 'Qualifikation', art: 'text', platzhalter: 'z. B. Gesellen' },
        { id: 'anzahl', label: 'Anzahl', art: 'zahl' },
      ],
    },
    { id: 'arbeiten', label: 'Ausgeführte Arbeiten', art: 'mehrzeilig' },
    { id: 'lieferungen', label: 'Lieferungen und Geräte', art: 'mehrzeilig', freiwillig: true },
    { id: 'besonderes', label: 'Besonderheiten', art: 'mehrzeilig', freiwillig: true, platzhalter: 'Behinderungen, Anordnungen, Besucher, Unfälle' },
  ],
  baue: (w, n) => {
    const personal = belegt(w.tabellen.personal ?? [])
    const koepfe = personal.reduce((a, z) => a + (Number.isFinite(leseMenge(z.anzahl ?? '')) ? leseMenge(z.anzahl ?? '') : 0), 0)
    const lage = [t(w, 'wetter') && `Wetter: ${t(w, 'wetter')}`, t(w, 'temperatur') && `Temperatur: ${t(w, 'temperatur')}`, t(w, 'zeit') && `Arbeitszeit: ${t(w, 'zeit')}`].filter((x): x is string => !!x)
    const b: Block[] = []
    if (lage.length) b.push({ art: 'absatz', text: lage.join(' · ') })
    b.push({ art: 'absatz', text: 'Personal', fett: true })
    b.push({
      art: 'tabelle',
      kopf: ['Qualifikation', 'Anzahl'],
      rechts: [false, true],
      zeilen: personal.map((z) => [z.wer ?? '', Number.isFinite(leseMenge(z.anzahl ?? '')) ? zahlDeutsch(leseMenge(z.anzahl ?? '')) : (z.anzahl ?? '')]),
      summen: [['Summe', zahlDeutsch(koepfe)]],
    })
    b.push({ art: 'absatz', text: 'Ausgeführte Arbeiten', fett: true }, { art: 'absatz', text: t(w, 'arbeiten') })
    if (t(w, 'lieferungen')) b.push({ art: 'absatz', text: 'Lieferungen und Geräte', fett: true }, { art: 'absatz', text: t(w, 'lieferungen') })
    if (t(w, 'besonderes')) b.push({ art: 'absatz', text: 'Besonderheiten', fett: true }, { art: 'absatz', text: t(w, 'besonderes') })
    return {
      ...kopf(w),
      betreff: `Bautagesbericht${t(w, 'nummer') ? ` Nr. ${t(w, 'nummer')}` : ''} vom ${datumDeutsch(t(w, 'datum'))}`,
      bloecke: [...b, ...fotos(n)],
      unterschriften: ['Aufsteller', 'Bauleitung'],
    }
  },
}

export const VORLAGEN: Record<string, Vorlage> = { behinderung: BEHINDERUNG, bedenken: BEDENKEN, stundenzettel: STUNDENZETTEL, aufmass: AUFMASS, abnahme: ABNAHME, bautagebuch: BAUTAGEBUCH }
