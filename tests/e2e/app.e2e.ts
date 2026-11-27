import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

/** Beispielwerte je Rechner, in der Reihenfolge der Eingabefelder. */
const BEISPIELE: Record<string, string[]> = {
  sparren: ['400', '35', '50', '18', '3'],
  grat: ['40', '50', '400', '12', '80', '90', '90'],
  kehlbalken: ['800', '45', '250', '16'],
  pultdach: ['400', '10', '30', '20', '800'],
  zeltdach: ['4', '800', '40'],
  gaube: ['45', '15', '120', '200'],
  sattelgaube: ['45', '45', '200', '100', '40'],
  dachfenster: ['114', '118', '2', '4', '80', '8'],
  lattung: ['35', '600', '32', '4', '33', '36'],
  dachflaeche: ['1000', '800', '35', '50', '30'],
  neigung: ['30'],
  einteilung: ['300', '6', '62.5'],
  sparreneinteilung: ['1000', '8', '0', '80'],
  '345': ['240'],
  treppe: ['280'],
  vorbemessung: ['480', '24'],
  gelaender: ['300', '2', '12'],
  holz: ['8', '16', '5', '10', '470'],
  massstab: ['2.5', '50'],
  abstaende: ['4', '0'],
}

/** Rechner, deren Werte in der Zeichnung eingetragen werden: Beschriftung des Maßes → Wert */
const IN_ZEICHNUNG: Record<string, Record<string, string>> = {
  rechtwinklig: { 'a =': '3', 'b =': '4' },
  dreieck: { 'a =': '7', 'b =': '9', 'c =': '12' },
  diagonale: { 'L =': '800', 'B =': '600', 'd1 =': '1001', 'd2 =': '999' },
  bogen: { 's =': '200', 'h =': '40' },
}

/** Maß in der Zeichnung antippen, Wert eintragen, bestätigen */
async function trageEin(page: Page, mass: string, wert: string): Promise<void> {
  await page.locator('svg.zeichnung').first().locator('text.tippbar', { hasText: mass }).click()
  await page.locator('.massfeld input').fill(wert)
  await page.locator('.massfeld button[type=submit]').click()
}

/** Fehler in der Browserkonsole lassen jeden Test scheitern. */
function sammleFehler(page: Page): string[] {
  const fehler: string[] = []
  page.on('pageerror', (e) => fehler.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') fehler.push(m.text())
  })
  return fehler
}

const mitSprache = (page: Page, sprache: 'de' | 'en') =>
  page.addInitScript((s) => {
    if (!localStorage.getItem('holzbau.v1')) localStorage.setItem('holzbau.v1', JSON.stringify({ sprache: s }))
  }, sprache)

for (const sprache of ['de', 'en'] as const) {
  test(`alle Rechner liefern ein Ergebnis (${sprache})`, async ({ page }) => {
    const fehler = sammleFehler(page)
    await mitSprache(page, sprache)
    await page.goto('./')
    const ids = await page.locator('main li a').evaluateAll((links) => links.map((a) => (a.getAttribute('href') ?? '').replace('#/', '')))
    // jede Funktion der Startseite ist hier abgedeckt oder hat eine eigene Ansicht
    const eigene = ['neigungsmesser', 'behinderung', 'verschnitt', 'bedenken', 'stundenzettel', 'aufmass', 'abnahme', 'bautagebuch']
    expect(ids.filter((id) => !(id in BEISPIELE) && !(id in IN_ZEICHNUNG) && !eigene.includes(id))).toEqual([])

    for (const [id, werte] of Object.entries(BEISPIELE)) {
      await page.goto(`./#/${id}`)
      const felder = page.locator('form input')
      for (const [n, wert] of werte.entries()) await felder.nth(n).fill(wert)
      await expect(page.locator('.ergebnis dl'), `Rechner ${id}`).toBeVisible()
      await expect(page.locator('.ergebnis dd').first(), `Rechner ${id}`).not.toHaveText(/NaN|Infinity|undefined/)
    }
    for (const [id, werte] of Object.entries(IN_ZEICHNUNG)) {
      await page.goto(`./#/${id}`)
      // eine Zeichnung oben statt Skizze, darunter die Feldliste; eingetragen wird im Bild oder in der Liste
      await expect(page.locator('form[data-sprung]'), `Rechner ${id}`).toHaveCount(1)
      await expect(page.locator('svg.skizze'), `Rechner ${id}`).toHaveCount(0)
      await expect(page.locator('svg.zeichnung'), `Rechner ${id}`).toHaveCount(1)
      for (const [mass, wert] of Object.entries(werte)) await trageEin(page, mass, wert)
      await expect(page.locator('.ergebnis dl'), `Rechner ${id}`).toBeVisible()
      await expect(page.locator('.ergebnis dd').first(), `Rechner ${id}`).not.toHaveText(/NaN|Infinity|undefined/)
      await expect(page.locator('svg.zeichnung'), `Rechner ${id}`).toHaveCount(1)
    }
    await page.goto('./#/verschnitt')
    await page.locator('textarea').nth(0).fill('500')
    await page.locator('form input').nth(0).fill('0.4')
    await page.locator('textarea').nth(1).fill('240 x 3\n180 x 2\n95 x 4\n60 x 5')
    await expect(page.locator('.ergebnis dd').first()).toHaveText('4')
    // mit Namen und Querschnitten: je Querschnitt getrennt
    await page.locator('textarea').nth(1).fill('Sparren: 480 x 3 @ 8/18\nPfosten: 250 x 2 @ 12/12')
    await expect(page.locator('.ergebnis')).toContainText('12/12')
    await page.locator('textarea').nth(1).fill('240 x 3\n180 x 2\n95 x 4\n60 x 5')
    await expect(page.locator('.ergebnis dd').first()).toHaveText('4')
    // Seite verlassen, während ein Feld mit ungespeicherter Änderung den Fokus hat
    await page.locator('textarea').nth(1).pressSequentially('\n30')
    await page.goto('./#/projekte')
    await expect(page.locator('h1')).not.toBeEmpty()
    for (const id of eigene) {
      await page.goto(`./#/${id}`)
      await expect(page.locator('h1')).not.toBeEmpty()
    }
    await page.goto('./#/projekte')
    await page.goto('./#/info')
    await expect(page.locator('main section').first()).toBeVisible()

    expect(await page.evaluate(() => [...((globalThis as unknown as { __fehlend: Set<string> }).__fehlend ?? [])]), 'unübersetzte Texte').toEqual([])
    expect(fehler).toEqual([])
  })
}

test('bekannte Ergebnisse stimmen in der Anzeige', async ({ page }) => {
  await mitSprache(page, 'de')
  await page.goto('./#/grat')
  const felder = page.locator('form input')
  for (const [n, wert] of ['45', '45', '400', '12'].entries()) await felder.nth(n).fill(wert)
  const text = await page.locator('.ergebnis').innerText()
  expect(text).toContain('692,8') // Gratlänge 400·√3
  expect(text).toContain('35,26') // Gratneigung
  // Seitenansicht oben und fünf Details: Grundriss mit Schiftern, Gratfuß, Querschnitt, Hexenschnitt, Anfallspunkt
  await expect(page.locator('svg.zeichnung')).toHaveCount(6)
  // mit Sparrenhöhe und Obholz kommt die Kerve je Seite dazu
  await felder.nth(7).fill('24')
  await felder.nth(8).fill('16')
  await expect(page.locator('svg.zeichnung')).toHaveCount(9)
  await expect(page.locator('.ergebnis')).toContainText('Kerve: Wange lotrecht')
  await expect(page.locator('.ergebnis h2').first()).toContainText('Grundriss mit Schiftern')
  await expect(page.locator('.ergebnis')).toContainText('Arbeitsfolge am Gratsparren')
  await page.goto('./#/dreieck')
  for (const [mass, wert] of [['a =', '3'], ['b =', '4'], ['c =', '5']]) await trageEin(page, mass, wert)
  await expect(page.locator('.ergebnis')).toContainText('90,00')
  // Es gelten die drei zuletzt eingetragenen Werte: ein vierter verdrängt den ältesten, dessen Feld wird geleert
  const liste = page.locator('form[data-sprung] input')
  await trageEin(page, 'α =', '30')
  await expect(liste.nth(0)).toHaveValue('') // a war die älteste Eingabe
  await expect(liste.nth(0)).toHaveAttribute('placeholder', /\d/) // und zeigt jetzt den berechneten Wert
  await expect(liste.nth(3)).toHaveValue('30')
  await expect(page.locator('.fehler')).toHaveCount(0)
  await expect(page.locator('.ergebnis dl')).toBeVisible()
  await expect(page.locator('svg.zeichnung')).toHaveCount(1)
  // die Liste ändert die Zeichnung sofort, ohne Bestätigen
  await liste.nth(0).fill('6')
  await expect(page.locator('svg.zeichnung text.tippbar:not(.berechnet)', { hasText: 'a = 6,0' })).toBeVisible()
  await expect(liste.nth(1)).toHaveValue('') // jetzt ist b die älteste Eingabe
  await expect(page.locator('svg.zeichnung text.tippbar.berechnet', { hasText: 'b =' })).toBeVisible()
  // Wert leeren: nur noch zwei Angaben, es wird nichts Falsches gezeigt
  await liste.nth(0).fill('')
  await expect(page.locator('.ergebnis dl')).toHaveCount(0)
  // unmögliche Eingabe: Meldung direkt unter der Zeichnung, keine Ergebnisliste
  await page.goto('./#/rechtwinklig')
  const recht = page.locator('form[data-sprung] input')
  for (const [n, wert] of [[0, '20'], [1, '60'], [2, '65'], [3, '50'], [4, '800']] as const) await recht.nth(n).fill(wert)
  await expect(recht.nth(0)).toHaveValue('')
  await expect(recht.nth(1)).toHaveValue('')
  await expect(recht.nth(2)).toHaveValue('')
  await expect(page.locator('.fehler.oben')).toContainText('zwischen 0° und 90°')
  await expect(page.locator('.ergebnis dl')).toHaveCount(0)
  await recht.nth(4).fill('')
  await recht.nth(0).fill('20')
  await expect(page.locator('.ergebnis dl')).toContainText('16,8') // b = 20 / tan 50°
})

test('Maß in der Zeichnung antippen ändert die Eingabe', async ({ page }) => {
  const fehler = sammleFehler(page)
  await mitSprache(page, 'de')
  await page.goto('./#/sparren')
  const felder = page.locator('form:not(.massfeld) input')
  for (const [n, wert] of BEISPIELE.sparren.entries()) await felder.nth(n).fill(wert)
  await page.locator('svg.zeichnung text.tippbar', { hasText: '400,0' }).first().click()
  await page.locator('.massfeld input').fill('450')
  // erst nach „Fertig“ wird übernommen
  await expect(felder.nth(0)).toHaveValue('400')
  await page.locator('.massfeld button[type=submit]').click()
  await expect(felder.nth(0)).toHaveValue('450')
  await expect(page.locator('.ergebnis')).toContainText('610,4')
  await expect(page.locator('.massfeld')).toHaveCount(0)
  expect(fehler).toEqual([])
})

test('Gratsparren übernimmt Werte aus dem Sparren, Zuschnitt stößt überlange Teile', async ({ page }) => {
  const fehler = sammleFehler(page)
  await mitSprache(page, 'de')
  await page.goto('./#/grat')
  // ohne Sparren-Eingaben gibt es nichts zu übernehmen
  await expect(page.locator('.uebernahme')).toHaveCount(0)
  await page.goto('./#/sparren')
  const sparren = page.locator('form[data-sprung] input')
  for (const [n, wert] of ['400', '35', '50', '18', '3'].entries()) await sparren.nth(n).fill(wert)
  await page.goto('./#/grat')
  await page.locator('.uebernahme button').click()
  const grat = page.locator('form[data-sprung] input')
  await expect(grat.nth(0)).toHaveValue('35') // Neigung Hauptdach
  await expect(grat.nth(2)).toHaveValue('400') // Grundmaß Hauptdach
  await expect(grat.nth(5)).toHaveValue('125') // Traufabschnitt lotrecht: 90° + Neigung
  await expect(grat.nth(8)).toHaveValue('18,31') // Obholz lotrecht (18 − 3) / cos 35°
  await expect(grat.nth(9)).toHaveValue('50') // Dachüberstand
  await expect(page.locator('.ergebnis dl')).toBeVisible()

  await page.goto('./#/verschnitt')
  await page.locator('textarea').nth(0).fill('400\n500\n600')
  await page.locator('textarea').nth(1).fill('1300 x 4')
  await expect(page.locator('.ergebnis')).toContainText('Stöße in überlangen Teilen')
  await expect(page.locator('.ergebnis .fehler')).toContainText('gestoßen')
  await page.locator('form select').selectOption('fehler')
  await expect(page.locator('.ergebnis .fehler')).toContainText('länger als die längste Stange')
  expect(fehler).toEqual([])
})

test('Zurück zur Übersicht landet an der verlassenen Stelle', async ({ page }) => {
  await mitSprache(page, 'de')
  await page.setViewportSize({ width: 400, height: 600 })
  await page.goto('./')
  const treppe = page.locator('main li a[href="#/treppe"]')
  await treppe.scrollIntoViewIfNeeded()
  const vorher = await page.evaluate(() => scrollY)
  expect(vorher).toBeGreaterThan(200)
  await treppe.click()
  await expect(page.locator('form[data-sprung]')).toBeVisible()
  expect(await page.evaluate(() => scrollY)).toBe(0)
  // eigener Auftritt statt des berechneten
  const felder = page.locator('form[data-sprung] input')
  await felder.nth(0).fill('280')
  await felder.nth(2).fill('27')
  await expect(page.locator('.ergebnis dl')).toContainText('405,0') // Lauflänge 15 × 27
  await page.locator('header a.zurueck').click()
  await expect(treppe).toBeVisible()
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(vorher)
})

test('Schlagwortsuche findet abweichende Namen und Tippfehler', async ({ page }) => {
  await mitSprache(page, 'de')
  await page.goto('./')
  const suche = page.locator('input[type=search]')
  const erster = page.locator('main li a strong').first()
  for (const [wort, titel] of [['velux', 'Wechsel am Dachfenster'], ['Klaue', 'Sparren'], ['gaupe', 'Schleppgaube'], ['Kelbalken', 'Kehlbalken / Zange'], ['kubikmeter', 'Holzmenge']]) {
    await suche.fill(wort)
    await expect(erster, wort).toHaveText(titel)
  }
  await suche.fill('qqqq')
  await expect(page.locator('.leer')).toBeVisible()
})

test('Projekte: anlegen, per Link teilen, sichern und wiederherstellen', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await mitSprache(page, 'de')
  await page.goto('./#/kehlbalken')
  for (const [n, wert] of ['800', '45', '250', '16'].entries()) await page.locator('form input').nth(n).fill(wert)
  await page.goto('./#/projekte')
  await page.locator('textarea').first().fill('Notiz äöü')
  // die Übersicht zeigt das Hauptergebnis des Kehlbalken-Rechners
  await expect(page.locator('section', { hasText: 'Ergebnisse im Projekt' })).toContainText('300,0 cm')

  // Projektbericht als PDF
  await page.evaluate(() => Object.defineProperty(navigator, 'canShare', { value: undefined }))
  const [bericht] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Bericht als PDF' }).click()])
  expect(bericht.suggestedFilename()).toMatch(/^Projektbericht_Allgemein_\d{4}-\d{2}-\d{2}\.pdf$/)
  const pdf = readFileSync(await bericht.path())
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  // mit eingebetteter Zeichnung deutlich größer als reiner Text
  expect(pdf.length).toBeGreaterThan(8000)

  // Teilen-Link → Import als neues Projekt
  await page.evaluate(() => Object.defineProperty(navigator, 'share', { value: undefined }))
  await page.getByRole('button', { name: 'Teilen' }).click()
  await expect(page.getByRole('status')).toHaveText('Link kopiert')
  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(link).toContain('#/import/z.')
  await page.goto(link)
  await page.getByRole('button', { name: 'Übernehmen' }).click()
  await expect(page.locator('.projekte li')).toHaveCount(2)

  // QR-Code wird gezeichnet
  await page.getByRole('button', { name: 'QR-Code' }).click()
  await expect(page.locator('svg.qr path')).toBeVisible()

  // Foto als Notiz im Projekt: bleibt nach dem Neuladen erhalten
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  const fotoKarte = page.locator('section', { hasText: 'Fotos im Projekt' })
  await fotoKarte.locator('input[type=file]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: png })
  await expect(fotoKarte.locator('.fotos li')).toHaveCount(1)
  await fotoKarte.locator('.fotos input[type=text]').fill('Traufe Nord')
  await fotoKarte.locator('.fotos input[type=text]').blur()
  await page.reload()
  await expect(fotoKarte.locator('.fotos li')).toHaveCount(1)
  await expect(fotoKarte.locator('.fotos input[type=text]')).toHaveValue('Traufe Nord')

  // Sicherung speichern, alles ändern, Sicherung einspielen
  const [datei] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Sicherung speichern' }).click()])
  const pfad = await datei.path()
  // Foto löschen – die Sicherung bringt es zurück
  await fotoKarte.getByRole('button', { name: /Löschen/ }).click()
  await expect(fotoKarte.locator('.fotos li')).toHaveCount(0)
  await page.locator('input[aria-label="Name des neuen Projekts"]').fill('Drittes')
  await page.getByRole('button', { name: 'Anlegen' }).click()
  await expect(page.locator('.projekte li')).toHaveCount(3)
  const sicherungFeld = page.locator('input[type=file][accept*="json"]')
  await sicherungFeld.setInputFiles(pfad)
  await page.getByRole('button', { name: 'Alles ersetzen' }).click()
  await expect(page.locator('.projekte li')).toHaveCount(2)
  await expect(fotoKarte.locator('.fotos li')).toHaveCount(1)
  await expect(fotoKarte.locator('.fotos input[type=text]')).toHaveValue('Traufe Nord')

  // kaputte Datei wird abgelehnt und ändert nichts
  await sicherungFeld.setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"kennung":"fremd"}') })
  await page.getByRole('button', { name: 'Alles ersetzen' }).click()
  await expect(page.getByRole('status')).toHaveText('Die Datei ist keine gültige Sicherung.')
  await expect(page.locator('.projekte li')).toHaveCount(2)

  await page.goto('./#/import/kaputt!!')
  await expect(page.locator('.fehler')).toHaveText('Der Link enthält kein gültiges Projekt.')
})

test('Behinderungsanzeige: ausfüllen, unterschreiben, Foto anhängen, PDF speichern', async ({ page }) => {
  const fehler = sammleFehler(page)
  await mitSprache(page, 'de')
  await page.goto('./#/behinderung')
  const pdfKnopf = page.getByRole('button', { name: 'Als PDF exportieren' })
  await expect(pdfKnopf).toBeDisabled()
  const bereiche = page.locator('form > label textarea')
  const zeilen = page.locator('form > label input[type=text]')
  await bereiche.nth(0).fill('Zimmerei Beispiel GmbH\nHolzweg 1')
  await bereiche.nth(1).fill('Bauherr Beispiel\nBaustraße 2')
  await zeilen.nth(0).fill('Neubau Halle')
  await bereiche.nth(2).fill('Decke nicht ausgehärtet.')
  await bereiche.nth(3).fill('Dachstuhl kann nicht gestellt werden.')
  await expect(page.locator('.brief')).toContainText('§ 6 Abs. 1 VOB/B')

  const feld = page.locator('canvas')
  await feld.scrollIntoViewIfNeeded()
  const r = (await feld.boundingBox())!
  await page.mouse.move(r.x + 20, r.y + r.height / 2)
  await page.mouse.down()
  await page.mouse.move(r.x + r.width - 20, r.y + r.height / 3, { steps: 8 })
  await page.mouse.up()
  await expect(page.locator('.signaturen img')).toBeVisible()

  // kleinstes gültiges PNG als „Foto“
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  await page.locator('input[type=file]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: png })
  await expect(page.locator('.bilder li')).toHaveCount(1)

  await page.evaluate(() => Object.defineProperty(navigator, 'canShare', { value: undefined }))
  const [datei] = await Promise.all([page.waitForEvent('download'), pdfKnopf.click()])
  expect(datei.suggestedFilename()).toMatch(/^Behinderungsanzeige_Neubau-Halle_\d{4}-\d{2}-\d{2}\.pdf$/)
  const inhalt = readFileSync(await datei.path())
  expect(inhalt.subarray(0, 5).toString()).toBe('%PDF-')
  expect(inhalt.length).toBeGreaterThan(5000)
  expect(fehler).toEqual([])
})

test('Neigungsmesser zeigt den Winkel aus den Sensorwerten', async ({ page }) => {
  await mitSprache(page, 'de')
  await page.goto('./#/neigungsmesser')
  await page.evaluate(() => {
    ;(DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission = async () => 'granted'
  })
  await page.getByRole('button', { name: 'Messung starten' }).click()
  await page.evaluate(() => {
    const s = Math.sin((12 * Math.PI) / 180) * 9.81
    const c = Math.cos((12 * Math.PI) / 180) * 9.81
    for (let i = 0; i < 80; i++) {
      const e = new Event('devicemotion') as Event & { accelerationIncludingGravity?: unknown }
      e.accelerationIncludingGravity = { x: s, y: c, z: 0 }
      dispatchEvent(e)
    }
  })
  await expect(page.locator('.wert')).toHaveText('12,0°')
})

test('läuft nach dem ersten Aufruf ohne Netz, Eingaben bleiben erhalten', async ({ page, context }) => {
  await mitSprache(page, 'de')
  await page.goto('./#/sparren')
  await page.locator('form input').nth(0).fill('432')
  // warten, bis der Service Worker die App zwischengespeichert hat
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.waitForFunction(async () => (await caches.keys()).length > 0)
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('form input').nth(0)).toHaveValue('432')
  await page.goto('./#/treppe')
  await expect(page.locator('h1')).toHaveText('Treppe')
})

test('Stundenzettel: Zeilen eintragen, beide Seiten unterschreiben, PDF speichern', async ({ page }) => {
  const fehler = sammleFehler(page)
  await mitSprache(page, 'de')
  await page.goto('./#/stundenzettel')
  const pdfKnopf = page.getByRole('button', { name: 'Als PDF exportieren' })
  await expect(pdfKnopf).toBeDisabled()
  await page.locator('form > label textarea').nth(0).fill('Zimmerei Beispiel GmbH')
  await page.locator('form > label textarea').nth(1).fill('Bauherr Beispiel')
  await page.locator('form > label input[type=text]').nth(0).fill('Neubau Halle')
  await page.locator('form > label textarea').nth(2).fill('Sparren ausgewechselt')
  const zeit = page.locator('fieldset').nth(0)
  await zeit.locator('input').nth(0).fill('Geselle')
  await zeit.locator('input').nth(1).fill('3,5')
  await zeit.getByRole('button', { name: /Person hinzufügen/ }).click()
  await zeit.locator('.zeile').nth(1).locator('input').nth(0).fill('Meister')
  await zeit.locator('.zeile').nth(1).locator('input').nth(1).fill('2')
  await expect(page.locator('.brief .summe')).toContainText('5,5')

  for (const feld of await page.locator('canvas').all()) {
    await feld.scrollIntoViewIfNeeded()
    const r = (await feld.boundingBox())!
    await page.mouse.move(r.x + 20, r.y + r.height / 2)
    await page.mouse.down()
    await page.mouse.move(r.x + r.width - 20, r.y + r.height / 3, { steps: 6 })
    await page.mouse.up()
  }
  await expect(page.locator('.signaturen img')).toHaveCount(2)

  await page.evaluate(() => Object.defineProperty(navigator, 'canShare', { value: undefined }))
  const [datei] = await Promise.all([page.waitForEvent('download'), pdfKnopf.click()])
  expect(datei.suggestedFilename()).toMatch(/^Stundenzettel_Neubau-Halle_\d{4}-\d{2}-\d{2}\.pdf$/)
  expect(readFileSync(await datei.path()).subarray(0, 5).toString()).toBe('%PDF-')

  // Tabellen bleiben nach dem Neuladen erhalten
  await page.reload()
  await expect(page.locator('fieldset').nth(0).locator('.zeile')).toHaveCount(2)
  await expect(page.locator('.brief .summe')).toContainText('5,5')
  expect(fehler).toEqual([])
})

test('Aufmaßblatt rechnet Mengen je Einheit, Bedenkenanzeige baut den Brief', async ({ page }) => {
  await mitSprache(page, 'de')
  await page.goto('./#/aufmass')
  const pos = page.locator('fieldset').nth(0)
  await pos.locator('input').nth(0).fill('Schalung')
  await pos.locator('input').nth(1).fill('2')
  await pos.locator('input').nth(2).fill('8')
  await pos.locator('input').nth(3).fill('4,5')
  await expect(page.locator('.brief .summe')).toContainText('72')
  await expect(page.locator('.brief .summe')).toContainText('m²')

  await page.goto('./#/bedenken')
  await expect(page.locator('.brief')).toContainText('§ 4 Abs. 3 VOB/B')
  await page.locator('select').nth(0).selectOption('bgb')
  await expect(page.locator('.brief')).not.toContainText('VOB')
})

test('Stammdaten und Projektdaten werden in den Vorlagen vorbelegt', async ({ page }) => {
  await mitSprache(page, 'de')
  // im ersten Dokument eintragen und merken
  await page.goto('./#/bedenken')
  await page.locator('form > label textarea').nth(0).fill('Zimmerei Beispiel GmbH\nHolzweg 1')
  await page.locator('form > label textarea').nth(1).fill('Bauherr Beispiel')
  await page.locator('form > label input[type=text]').nth(0).fill('Neubau Halle')
  await page.getByRole('button', { name: 'Kopfdaten merken' }).click()
  await expect(page.getByRole('button', { name: 'Kopfdaten merken' })).toHaveCount(0)

  // ein anderes Dokument desselben Projekts kennt Absender, Empfänger und Bauvorhaben
  await page.goto('./#/abnahme')
  await expect(page.locator('form > label textarea').nth(0)).toHaveValue('Zimmerei Beispiel GmbH\nHolzweg 1')
  await expect(page.locator('form > label textarea').nth(1)).toHaveValue('Bauherr Beispiel')
  await expect(page.locator('form > label input[type=text]').nth(0)).toHaveValue('Neubau Halle')
  await expect(page.locator('.brief')).toContainText('Abnahmeprotokoll gemäß § 12 VOB/B')

  // ein neues Projekt behält den Absender, aber nicht den Auftraggeber
  await page.goto('./#/projekte')
  await expect(page.locator('section', { hasText: 'Stammdaten für Dokumente' }).locator('textarea')).toHaveValue('Zimmerei Beispiel GmbH\nHolzweg 1')
  await page.locator('input[aria-label="Name des neuen Projekts"]').fill('Zweites')
  await page.getByRole('button', { name: 'Anlegen' }).click()
  await page.goto('./#/bautagebuch')
  await expect(page.locator('form > label textarea').nth(0)).toHaveValue('Zimmerei Beispiel GmbH\nHolzweg 1')
  await expect(page.locator('form > label textarea').nth(1)).toHaveValue('')
  await expect(page.locator('form > label input[type=text]').nth(0)).toHaveValue('')
})

test('Menüleiste springt zwischen Funktionen, Laufmaß wechselt die Seite', async ({ page }) => {
  await mitSprache(page, 'de')
  await page.goto('./#/sparren')
  await page.goto('./#/sparreneinteilung')
  const menue = page.locator('nav.menue')
  await expect(menue.locator('.schnell a')).toHaveText(['Sparren', 'Sparreneinteilung'])
  // die Reihenfolge bleibt beim Springen stehen
  await menue.getByRole('link', { name: 'Sparren', exact: true }).click()
  await expect(page.locator('h1')).toHaveText('Sparren')
  await expect(menue.locator('.schnell a')).toHaveText(['Sparren', 'Sparreneinteilung'])
  await menue.getByRole('link', { name: 'Start' }).click()
  await expect(page.locator('h1')).toHaveText('Holzbau-Spicker')

  // fortlaufende Maße: von links beginnt der erste Sparren bei 0, von rechts ebenso (symmetrisch) …
  await menue.getByRole('link', { name: 'Sparreneinteilung' }).click()
  for (const [n, wert] of ['1000', '8', '20', '80'].entries()) await page.locator('form input').nth(n).fill(wert)
  const ersteZeile = page.locator('.ergebnis tbody tr').first()
  await expect(ersteZeile).toContainText('20,0')
  await expect(page.locator('.ergebnis h2')).toContainText('von links')
  await page.locator('select').last().selectOption('rechts')
  await expect(page.locator('.ergebnis h2')).toContainText('von rechts')
  await expect(ersteZeile).toContainText('20,0')
  // … beim Eckmaß sitzt der Stab am rechten Ende: von rechts bei 0, von links nicht
  await page.goto('./#/einteilung')
  for (const [n, wert] of ['300', '6', '62.5'].entries()) await page.locator('form input').nth(n).fill(wert)
  await page.locator('select').nth(0).selectOption('ecke')
  await page.locator('select').last().selectOption('rechts')
  await expect(page.locator('.ergebnis tbody tr').first().locator('td').nth(1)).toHaveText('0,0')
  await page.locator('select').last().selectOption('links')
  await expect(page.locator('.ergebnis tbody tr').first().locator('td').nth(1)).toHaveText('54,0')
})

test('KI-Assistent: Schlüssel hinterlegen, Aufgabe stellen, Vorschlag in den Rechner übernehmen', async ({ page }) => {
  const fehler = sammleFehler(page)
  await mitSprache(page, 'de')
  // Die API wird nachgestellt: erste Antwort ruft das Werkzeug „rechne“ auf, die zweite fasst zusammen
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' }
  const anfragen: { schluessel: string | undefined; koerper: string }[] = []
  await page.route('https://api.anthropic.com/**', async (route) => {
    const req = route.request()
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    const kopf = await req.allHeaders()
    anfragen.push({ schluessel: kopf['x-api-key'] ?? kopf['authorization'], koerper: req.postData() ?? '' })
    const nachricht = (content: unknown[], stop: string) => ({ id: `msg_${anfragen.length}`, type: 'message', role: 'assistant', model: 'claude-opus-5-5', content, stop_reason: stop, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } })
    const antwort =
      anfragen.length === 1
        ? nachricht([{ type: 'tool_use', id: 'toolu_1', name: 'rechne', input: { rechner: 'sparren', werte: { g: 400, a: 35, ue: 50, h: 18, k: 3 } } }], 'tool_use')
        : nachricht([{ type: 'text', text: 'Sparren gerechnet: Sparrenlänge gesamt 549,3 cm.' }], 'end_turn')
    await route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(antwort) })
  })
  // Projektname, Stammdaten und Notiz dürfen die App nicht verlassen
  await page.addInitScript(() => {
    if (localStorage.getItem('holzbau.marker')) return
    localStorage.setItem('holzbau.marker', '1')
    const d = JSON.parse(localStorage.getItem('holzbau.v1') ?? '{}')
    d.stammdaten = { absender: 'GEHEIM-FIRMA', ort: 'GEHEIM-ORT', unterzeichner: 'GEHEIM-NAME' }
    d.projekte = [{ id: 'p1', name: 'GEHEIM-PROJEKT', notiz: 'GEHEIM-NOTIZ', daten: { bauvorhaben: 'GEHEIM-BV', empfaenger: '', auftrag: '' }, eingaben: {} }]
    d.aktiv = 'p1'
    localStorage.setItem('holzbau.v1', JSON.stringify(d))
  })
  await page.goto('./#/ki')
  // ohne Schlüssel gibt es keine Eingabe für Aufgaben
  await expect(page.locator('form.frage')).toHaveCount(0)
  await page.locator('input[type=password]').fill('sk-ant-test-0000')
  await expect(page.getByRole('button', { name: 'Schlüssel speichern' })).toBeDisabled()
  await page.locator('label.haken input').check()
  await page.getByRole('button', { name: 'Schlüssel speichern' }).click()
  await expect(page.locator('main')).toContainText('endet auf')
  await page.locator('form.frage textarea').fill('Sparren mit Grundmaß 4 Meter, 35 Grad, 50 Überstand, Höhe 18, Kerve 3')
  await page.getByRole('button', { name: 'Senden' }).click()
  await expect(page.locator('.beitrag.ki')).toContainText('549,3')
  // zwei Anfragen mit dem hinterlegten Schlüssel; die zweite trägt das Ergebnis des Rechenkerns
  expect(anfragen).toHaveLength(2)
  expect(anfragen[0].schluessel).toContain('sk-ant-test-0000')
  expect(anfragen[1].koerper).toContain('Sparrenlänge gesamt: 549,3 cm')
  // der Schlüssel liegt getrennt von den Projektdaten und der Projektname geht nicht mit
  expect(await page.evaluate(() => localStorage.getItem('holzbau.v1') ?? '')).not.toContain('sk-ant-test')
  for (const a of anfragen) expect(a.koerper).not.toMatch(/GEHEIM/)
  // Vorschlag übernehmen: Rechner öffnet sich mit den Werten
  await page.getByRole('button', { name: 'In den Rechner übernehmen' }).click()
  await expect(page).toHaveURL(/#\/sparren$/)
  await expect(page.locator('form[data-sprung] input').first()).toHaveValue('400')
  await expect(page.locator('.ergebnis')).toContainText('549,3')
  // Schlüssel wieder löschen
  await page.goto('./#/ki')
  await page.getByRole('button', { name: 'Schlüssel vom Gerät löschen' }).click()
  await expect(page.locator('form.frage')).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('holzbau.ki'))).toBeNull()
  expect(fehler).toEqual([])
})
