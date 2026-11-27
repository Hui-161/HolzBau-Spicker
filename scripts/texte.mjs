// Sammelt alle sichtbaren deutschen Texte aus dem Quellcode (für die Übersetzung und deren Test).
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const lies = (p) => readFileSync(p, 'utf8')
const alle = (dir, endung) => readdirSync(dir).filter((f) => f.endsWith(endung) && !f.includes('.test.')).map((f) => join(dir, f))
const roh = (s) => s.replace(/\\'/g, "'")

export function sammleTexte(wurzel = '.') {
  const texte = new Set()
  const oberflaeche = [...alle(join(wurzel, 'src/lib'), '.svelte'), join(wurzel, 'src/App.svelte')]
  // 1. ausdrückliche t('…')-Aufrufe
  for (const p of oberflaeche) for (const m of lies(p).matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'\s*\)/g)) texte.add(roh(m[1]))
  // 2. Rechner-Definitionen und Rechenkern: alle Zeichenketten, die wie Text aussehen
  const istText = (s) => /[A-ZÄÖÜ]|\s|[αβγ]/.test(s) && !/^[A-Za-z]+$/.test(s) === true || /^[A-ZÄÖÜ][a-zäöüß]+/.test(s)
  for (const p of [join(wurzel, 'src/calcs/index.ts'), ...alle(join(wurzel, 'src/core'), '.ts').filter((f) => !f.endsWith('anzeige.ts') && !f.endsWith('dokumente.ts'))]) {
    // anzeige.ts und dokumente.ts sind deutsche Dokumentvorlagen und werden nicht übersetzt
    const q = lies(p).replace(/^import .*$/gm, '')
    for (const m of q.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) if (istText(roh(m[1])) && !/^(M\d|fill=|de-DE)/.test(m[1])) texte.add(roh(m[1]))
    for (const m of q.matchAll(/<text[^>]*>([^<]+)<\/text>/g)) texte.add(m[1])
  }
  // 3. zusammengesetzte Meldungen
  for (const n of ['Dachneigung', 'Neigung Hauptdach', 'Neigung Walm']) texte.add(`${n} muss zwischen 0° und 90° liegen.`)
  // Fehlermeldungen des KI-Assistenten (stehen in src/lib/ki.ts, gezeigt über t(fehler))
  for (const s of ["Es ist kein API-Schlüssel hinterlegt.", "Der API-Schlüssel wird nicht angenommen. Bitte prüfen und neu eintragen.", "Der API-Schlüssel hat für diese Anfrage keine Berechtigung.", "Das Anfragelimit des API-Schlüssels ist erreicht. Bitte später erneut versuchen.", "Die Anfrage wurde von der API abgelehnt. Bei Dateien: Format und Größe prüfen.", "Keine Verbindung zur KI. Der Assistent braucht Netz – die Rechner laufen auch ohne.", "Die KI ist gerade nicht erreichbar. Bitte später erneut versuchen.", "Die Anfrage ist fehlgeschlagen.", "Die KI hat diese Anfrage abgelehnt.", "Die Antwort der KI war zu lang und wurde abgebrochen.", "Die KI ist zu keinem Ergebnis gekommen. Bitte die Aufgabe genauer beschreiben.", "Bitte ein PDF oder ein Foto (JPEG, PNG, WebP) wählen.", "Die Datei ist größer als 20 MB.", "In der Datei wurde keine eindeutige Decklänge gefunden."]) texte.add(s)
  for (const s of ['vorgebohrt', 'Treffer', 'Traufpunkt', 'Senkelriss', 'First', 'Mittelpfette', 'Firstpfette', 'ab Traufpunkt', 'ab Bezugslinie', 'Auflager', 'Traufmitte', 'Traufecke', 'Spitze', 'Gaubentraufe', 'Gaubenfirst', 'Sparren', 'Hauptdach', 'Fußpfette', 'Traufe', 'Anfallspunkt', 'Walm', 'Traufe Walm', 'Info & Datenschutz', 'Meine Favoriten', 'Projekte & Notizen', 'Bitte nur Zahlen eingeben.', 'Mit diesen Werten ist keine Berechnung möglich.']) texte.add(s)
  for (const s of ['${name} muss zwischen 0° und 90° liegen.', 'Dachneigung']) if (s.includes('${')) texte.delete(s)
  // ohne Buchstaben (Trennzeichen wie „, “) ist es kein Text
  return [...texte].filter((s) => /\p{L}/u.test(s) && !s.includes('${')).sort()
}

if (process.argv[1]?.endsWith('texte.mjs')) console.log(sammleTexte().join('\n'))
