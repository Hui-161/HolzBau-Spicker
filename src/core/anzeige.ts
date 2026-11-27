/**
 * Behinderungsanzeige: baut aus den Formularangaben den Brieftext.
 * Reine Textlogik ohne Oberfläche, damit sie testbar bleibt.
 * Die Vorlage ersetzt keine Rechtsberatung.
 */

export interface AnzeigeDaten {
  /** vob = VOB/B-Vertrag, bgb = BGB-Bauvertrag */
  vertrag: 'vob' | 'bgb'
  absender: string
  empfaenger: string
  bauvorhaben: string
  auftrag: string
  ort: string
  /** JJJJ-MM-TT */
  datum: string
  leistung: string
  /** JJJJ-MM-TT */
  seit: string
  ursache: string
  auswirkung: string
  dauer: string
  massnahme: string
  fristverlaengerung: boolean
  mehrkosten: boolean
  /** Auftraggeber zur Beseitigung auffordern; entfällt z. B. bei Witterung (Vorgabe: ja) */
  aufforderung?: boolean
  unterzeichner: string
}

export interface Anzeige {
  absender: string[]
  empfaenger: string[]
  ortDatum: string
  betreff: string
  /** Zeilen unter dem Betreff (Bauvorhaben, Auftrag …) */
  bezug: string[]
  anrede: string
  /** Absätze; eine Überschrift steht als eigener Eintrag mit fett = true */
  absaetze: { text: string; fett?: boolean }[]
  gruss: string
  unterzeichner: string
}

/** JJJJ-MM-TT → TT.MM.JJJJ; alles andere bleibt unverändert */
export function datumDeutsch(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso.trim()
}

const zeilen = (text: string): string[] =>
  text
    .split('\n')
    .map((z) => z.trim())
    .filter((z) => z !== '')

/** Pflichtangaben, ohne die die Anzeige nicht aussagekräftig ist. */
export function fehlendeAngaben(d: AnzeigeDaten): string[] {
  const pflicht: [keyof AnzeigeDaten, string][] = [
    ['absender', 'Absender'],
    ['empfaenger', 'Empfänger'],
    ['bauvorhaben', 'Bauvorhaben'],
    ['datum', 'Datum'],
    ['seit', 'Behindert seit'],
    ['ursache', 'Hindernde Umstände'],
    ['auswirkung', 'Auswirkungen'],
  ]
  return pflicht.filter(([k]) => String(d[k]).trim() === '').map(([, name]) => name)
}

export function baueAnzeige(d: AnzeigeDaten, anzahlFotos = 0): Anzeige {
  const vob = d.vertrag === 'vob'
  const absaetze: Anzeige['absaetze'] = []
  const p = (text: string, fett = false): void => void absaetze.push({ text, fett })

  p(
    vob
      ? `hiermit zeigen wir Ihnen gemäß § 6 Abs. 1 VOB/B an, dass wir seit dem ${datumDeutsch(d.seit)} in der ordnungsgemäßen Ausführung unserer Leistungen behindert sind.`
      : `hiermit zeigen wir Ihnen an, dass wir seit dem ${datumDeutsch(d.seit)} in der ordnungsgemäßen Ausführung unserer vertraglichen Leistungen behindert sind.`
  )
  p('Hindernde Umstände', true)
  p(d.ursache.trim())
  p('Auswirkungen auf unsere Leistung', true)
  p(d.auswirkung.trim())
  p(d.dauer.trim() ? `Voraussichtliche Dauer der Behinderung: ${d.dauer.trim()}` : 'Die Dauer der Behinderung ist derzeit nicht absehbar.')
  if (d.massnahme.trim()) {
    p('Erforderliche Maßnahmen', true)
    p(d.massnahme.trim())
  }
  if (d.aufforderung !== false) p('Wir fordern Sie auf, die hindernden Umstände unverzüglich zu beseitigen.')
  if (d.fristverlaengerung) {
    p(
      vob
        ? 'Die Ausführungsfristen verlängern sich gemäß § 6 Abs. 2 und 4 VOB/B um die Dauer der Behinderung zuzüglich eines Zuschlags für die Wiederaufnahme der Arbeiten.'
        : 'Wir gehen davon aus, dass sich die vereinbarten Ausführungsfristen um die Dauer der Behinderung zuzüglich einer angemessenen Zeit für die Wiederaufnahme der Arbeiten verlängern.'
    )
  }
  if (d.mehrkosten) {
    p(
      vob
        ? 'Wir behalten uns vor, die uns durch die Behinderung entstehenden Mehrkosten und Schäden geltend zu machen (§ 6 Abs. 6 VOB/B, § 642 BGB).'
        : 'Wir behalten uns vor, wegen der uns durch die Behinderung entstehenden Mehrkosten eine angemessene Entschädigung geltend zu machen (§ 642 BGB).'
    )
  }
  p('Sobald die hindernden Umstände weggefallen sind, nehmen wir die Arbeiten unverzüglich wieder auf und benachrichtigen Sie.')
  if (anzahlFotos > 0) p(`Anlage: ${anzahlFotos} ${anzahlFotos === 1 ? 'Foto' : 'Fotos'}`)

  const bezug = [`Bauvorhaben: ${d.bauvorhaben.trim()}`]
  if (d.auftrag.trim()) bezug.push(`Auftrag: ${d.auftrag.trim()}`)
  if (d.leistung.trim()) bezug.push(`Betroffene Leistung: ${d.leistung.trim()}`)

  return {
    absender: zeilen(d.absender),
    empfaenger: zeilen(d.empfaenger),
    ortDatum: [d.ort.trim(), datumDeutsch(d.datum)].filter((x) => x !== '').join(', '),
    betreff: vob ? 'Behinderungsanzeige gemäß § 6 Abs. 1 VOB/B' : 'Behinderungsanzeige',
    bezug,
    anrede: 'Sehr geehrte Damen und Herren,',
    absaetze,
    gruss: 'Mit freundlichen Grüßen',
    unterzeichner: d.unterzeichner.trim(),
  }
}

/** Dateiname ohne Sonderzeichen, z. B. Behinderungsanzeige_Musterstrasse-12_2026-11-27.pdf */
export function dateiname(d: AnzeigeDaten): string {
  const sauber = d.bauvorhaben
    .trim()
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
  return ['Behinderungsanzeige', sauber, d.datum.trim()].filter((x) => x !== '').join('_') + '.pdf'
}
