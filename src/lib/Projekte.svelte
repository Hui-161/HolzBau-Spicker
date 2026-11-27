<script lang="ts">
  import qrcode from 'qrcode-generator'
  import { RECHNER } from '../calcs'
  import { t } from './sprache.svelte'
  import type { Mass } from '../calcs/types'
  import { erzeugeBericht, zeichnungAlsSvg, type BerichtTeil } from './bericht'
  import { alleFotos, anzahlFotos, ersetzeFotos, fotoAendern, fotoDazu, fotosVon, fotosWegVon, fotoWeg, MAX_FOTOS_GESAMT, MAX_FOTOS_JE_PROJEKT, pruefeFotos, type ProjektFoto } from './fotos'
  import { gibAus, ladeBild } from './pdf'
  import { berechne, werteAus } from './werte'
  import { aktivesProjekt, einheitVon, formatiere, JE_CM, entpacke, loescheProjekt, neuesProjekt, sichere, sicherung, stelleWiederHer, verpacke, zustand, type Projekt } from './zustand.svelte'

  /** Daten aus einem Teilen-Link (#/import/…), falls vorhanden */
  let { importText = '' }: { importText?: string } = $props()

  let eingang = $state<Projekt | undefined>()
  let importFehler = $state(false)
  // svelte-ignore state_referenced_locally
  if (importText) {
    void entpacke(importText).then((p) => {
      eingang = p
      importFehler = !p
    })
  }
  let neuerName = $state('')
  let meldung = $state('')
  let loeschen = $state('')
  /** SVG-Pfad und Kantenlänge des QR-Codes, solange er angezeigt wird */
  let qr = $state<{ pfad: string; n: number } | undefined>()

  const aktiv = $derived(aktivesProjekt())
  /** Hauptergebnisse aller Rechner, für die das aktive Projekt vollständige Eingaben hat */
  const uebersicht = $derived(
    RECHNER.filter((r) => !r.eigen && aktiv.eingaben[r.id]).flatMap((r) => {
      const e = berechne(r, aktiv.eingaben[r.id], JE_CM[zustand.einheit])
      if (!e) return []
      const wichtig = e.ausgaben.filter((a) => a.wichtig)
      return [{ rechner: r, ausgaben: wichtig.length ? wichtig : e.ausgaben.slice(0, 2) }]
    })
  )

  let berichtLaeuft = $state(false)

  /* ---------- Fotos im Projekt ---------- */
  let fotos = $state<ProjektFoto[]>([])
  let fotoFehler = $state('')

  // beim Öffnen und bei jedem Projektwechsel neu laden
  $effect(() => {
    const projekt = zustand.aktiv
    fotosVon(projekt)
      .then((liste) => {
        if (projekt === zustand.aktiv) fotos = liste
      })
      .catch(() => {
        fotos = []
        fotoFehler = t('Fotos können in diesem Browser nicht gespeichert werden.')
      })
  })

  async function neueFotos(e: Event) {
    const feld = e.currentTarget as HTMLInputElement
    const dateien = [...(feld.files ?? [])]
    feld.value = ''
    // das Projekt festhalten: ein Wechsel während des Ladens darf die Fotos nicht umleiten
    const projekt = zustand.aktiv
    fotoFehler = ''
    for (const datei of dateien) {
      if (projekt !== zustand.aktiv) break
      if (fotos.length >= MAX_FOTOS_JE_PROJEKT) {
        fotoFehler = `${t('Höchstens')} ${MAX_FOTOS_JE_PROJEKT} ${t('Fotos je Projekt.')}`
        break
      }
      try {
        if ((await anzahlFotos()) >= MAX_FOTOS_GESAMT) {
          fotoFehler = `${t('Höchstens')} ${MAX_FOTOS_GESAMT} ${t('Fotos insgesamt. Bitte ältere Fotos löschen.')}`
          break
        }
        const neu = await fotoDazu(projekt, await ladeBild(datei, 1280))
        if (projekt === zustand.aktiv) fotos.push(neu)
      } catch {
        fotoFehler = t('Das Foto konnte nicht gespeichert werden.')
      }
    }
  }

  async function entferneFoto(f: ProjektFoto) {
    await fotoWeg(f.id).catch(() => undefined)
    fotos = fotos.filter((x) => x.id !== f.id)
  }

  function loescheMitFotos(id: string) {
    void fotosWegVon(id).catch(() => undefined)
    loescheProjekt(id)
    loeschen = ''
  }

  /** Vollständiger Bericht: je Rechner Eingaben, alle Ergebnisse, Zeichnung und Listen */
  async function bericht() {
    berichtLaeuft = true
    try {
      const massText = (m: Mass): string => `${m.name ? `${t(m.name)} ` : ''}${m.vor ?? ''}${formatiere(m.wert, m.art)}${m.art === 'ang' ? '°' : ''}`
      const teile: BerichtTeil[] = RECHNER.filter((r) => !r.eigen && aktiv.eingaben[r.id]).flatMap((r) => {
        const roh = aktiv.eingaben[r.id]
        const e = berechne(r, roh, JE_CM[zustand.einheit])
        if (!e) return []
        const werte = werteAus(r, roh)
        return [
          {
            titel: t(r.titel),
            // nur sichtbare Felder; fehlt ein Wert im Speicher, gilt wie in der Rechnung die Vorgabe
            eingaben: r.felder
              .filter((f) => !f.wenn || f.wenn(werte))
              .map((f) => ({ f, text: (roh[f.id] ?? (f.vorgabe === undefined ? '' : String(f.vorgabe).replace('.', zustand.sprache === 'de' ? ',' : '.'))).trim() }))
              .filter((x) => x.text !== '')
              .map(({ f, text }): [string, string] => [t(f.label), f.art === 'select' ? t(f.optionen?.find((o) => o.wert === text)?.label ?? text) : f.art === 'liste' ? text : `${text} ${einheitVon(f.art, f.einheit)}`.trim()]),
            ausgaben: e.ausgaben.map((a): [string, string] => [t(a.label), `${formatiere(a.wert, a.art, a.stellen)} ${einheitVon(a.art, a.einheit)}`.trim()]),
            zeichnung: e.zeichnung ? { svg: zeichnungAlsSvg(e.zeichnung, massText), breite: e.zeichnung.breite, hoehe: e.zeichnung.hoehe } : undefined,
            listen: [...(e.liste ? [e.liste] : []), ...(e.listen ?? [])].map((l) => ({
              titel: t(l.titel),
              kopf: l.kopf.map((k, i) => `${t(k)}${l.arten[i] === 'len' ? ` (${zustand.einheit})` : ''}`),
              zeilen: l.zeilen.map((z) => z.map((c, i) => (l.arten[i] === 'wort' && typeof c === 'string' ? t(c) : formatiere(c, l.arten[i])))),
            })),
          },
        ]
      })
      const datum = new Date().toLocaleDateString(zustand.sprache === 'de' ? 'de-DE' : 'en-GB')
      const pdf = await erzeugeBericht({
        titel: `${t('Projektbericht')}: ${aktiv.name}`,
        unterzeile: `${datum} · ${t('Maße in')} ${zustand.einheit}`,
        notizTitel: t('Notizen'),
        notiz: aktiv.notiz,
        fotos: $state.snapshot(fotos),
        teile,
        fusszeile: t('Ergebnisse ohne Gewähr – vor dem Zuschnitt nachmessen. Kein Ersatz für Statik und Fachplanung.'),
        seite: [t('Seite'), t('von')],
      })
      const sauber = aktiv.name.replace(/[^A-Za-z0-9ÄÖÜäöüß]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'Projekt'
      await gibAus(pdf, `${t('Projektbericht')}_${sauber}_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch {
      zeige(t('Der Bericht konnte nicht erstellt werden.'))
    } finally {
      berichtLaeuft = false
    }
  }

  const titel = (id: string): string => t(RECHNER.find((r) => r.id === id)?.titel ?? id)
  const linkZu = async (p: Projekt): Promise<string> => `${location.origin}${location.pathname}#/import/${await verpacke(p)}`
  const belegt = (p: Projekt): string[] => Object.keys(p.eingaben).filter((id) => Object.values(p.eingaben[id]).some((v) => v !== ''))

  function zeige(text: string) {
    meldung = text
    setTimeout(() => (meldung = ''), 2500)
  }

  function anlegen(e: SubmitEvent) {
    e.preventDefault()
    if (!neuerName.trim()) return
    neuesProjekt(neuerName)
    neuerName = ''
  }

  function uebernehmen() {
    if (!eingang) return
    neuesProjekt(eingang.name, eingang)
    eingang = undefined
    location.hash = '#/projekte'
  }

  async function teile(p: Projekt) {
    const link = await linkZu(p)
    try {
      if (navigator.share) await navigator.share({ title: p.name, url: link })
      else {
        await navigator.clipboard.writeText(link)
        zeige(t('Link kopiert'))
      }
    } catch {
      // Teilen abgebrochen
    }
  }

  async function speichereSicherung() {
    // Fotos gehören zur Sicherung; fehlt der Fotospeicher, wird ohne sie gesichert
    const bilder = await alleFotos().catch(() => [])
    const url = URL.createObjectURL(new Blob([sicherung(bilder.map((f) => ({ projekt: f.projekt, titel: f.titel, daten: f.daten, breite: f.breite, hoehe: f.hoehe })))], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `holzbau-spicker-sicherung-${new Date().toISOString().slice(0, 10)}.json`
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  /** Inhalt der gewählten Sicherungsdatei, bis das Überschreiben bestätigt ist */
  let wartend = $state<string | undefined>()

  async function waehleSicherung(e: Event) {
    const feld = e.currentTarget as HTMLInputElement
    const datei = feld.files?.[0]
    feld.value = ''
    if (datei) wartend = await datei.text()
  }

  async function bestaetigeSicherung() {
    const ergebnis = wartend === undefined ? false : stelleWiederHer(wartend)
    wartend = undefined
    if (ergebnis === false) {
      zeige(t('Die Datei ist keine gültige Sicherung.'))
      return
    }
    try {
      await ersetzeFotos(pruefeFotos(ergebnis, new Set(zustand.projekte.map((p) => p.id))))
      fotos = await fotosVon(zustand.aktiv)
      zeige(t('Daten wiederhergestellt'))
    } catch {
      zeige(t('Daten wiederhergestellt, aber die Fotos konnten nicht gespeichert werden.'))
    }
  }

  async function zeigeQr(p: Projekt) {
    if (qr) {
      qr = undefined
      return
    }
    try {
      const code = qrcode(0, 'L')
      code.addData(await linkZu(p))
      code.make()
      const n = code.getModuleCount()
      let pfad = ''
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (code.isDark(r, c)) pfad += `M${c} ${r}h1v1h-1z`
      qr = { pfad, n }
    } catch {
      zeige(t('Das Projekt ist zu groß für einen QR-Code. Bitte per Link teilen.'))
    }
  }
</script>

{#if eingang}
  <section class="karte hervor">
    <h2>{t('Projekt übernehmen?')}</h2>
    <p>
      <strong>{eingang.name}</strong> · {belegt(eingang).length} {t('Rechner')}{eingang.notiz ? ` · ${t('Notizen')}` : ''}. {t('Es wird als neues Projekt angelegt, vorhandene Projekte bleiben unverändert.')}
    </p>
    <div class="reihe">
      <button class="haupt" onclick={uebernehmen}>{t('Übernehmen')}</button>
      <button onclick={() => ((eingang = undefined), (location.hash = '#/projekte'))}>{t('Verwerfen')}</button>
    </div>
  </section>
{:else if importFehler}
  <p class="fehler">{t('Der Link enthält kein gültiges Projekt.')}</p>
{/if}

<section class="karte">
  <h2>{t('Aktives Projekt')}</h2>
  <label>
    <span>{t('Name')}</span>
    <input type="text" maxlength="60" bind:value={aktiv.name} oninput={sichere} />
  </label>
  <label>
    <span>{t('Notizen')}</span>
    <textarea rows="6" maxlength="20000" placeholder={t('Maße, Material, Absprachen …')} bind:value={aktiv.notiz} oninput={sichere}></textarea>
  </label>
  <details class="nicht-drucken">
    <summary>{t('Angaben zum Projekt')}</summary>
    <p class="leise">{t('Diese Angaben werden in den Dokumentvorlagen dieses Projekts vorbelegt.')}</p>
    <label>
      <span>{t('Bauvorhaben')}</span>
      <input type="text" maxlength="200" bind:value={aktiv.daten.bauvorhaben} oninput={sichere} />
    </label>
    <label>
      <span>{t('Auftraggeber und Anschrift')}</span>
      <textarea rows="3" maxlength="500" bind:value={aktiv.daten.empfaenger} oninput={sichere}></textarea>
    </label>
    <label>
      <span>{t('Auftrag / Vertrag')}</span>
      <input type="text" maxlength="200" bind:value={aktiv.daten.auftrag} oninput={sichere} />
    </label>
  </details>
  {#if belegt(aktiv).length}
    <p class="leise">{t('Gespeicherte Eingaben:')}</p>
    <ul class="links">
      {#each belegt(aktiv) as id (id)}
        <li><a href={`#/${id}`}>{titel(id)}</a></li>
      {/each}
    </ul>
  {/if}
  <div class="reihe">
    <button class="nicht-drucken" onclick={() => teile(aktiv)}>{t('Teilen')}</button>
    <button class="nicht-drucken" aria-pressed={!!qr} onclick={() => zeigeQr(aktiv)}>{t('QR-Code')}</button>
    <button class="nicht-drucken" onclick={() => print()}>{t('Drucken / PDF')}</button>
  </div>
  {#if qr}
    <svg class="qr" viewBox={`-2 -2 ${qr.n + 4} ${qr.n + 4}`} role="img" aria-label={t('QR-Code')} shape-rendering="crispEdges">
      <rect x="-2" y="-2" width={qr.n + 4} height={qr.n + 4} fill="#fff" />
      <path d={qr.pfad} fill="#000" />
    </svg>
    <p class="leise">{t('Mit der Kamera eines anderen Geräts scannen, um das Projekt dort zu übernehmen.')}</p>
  {/if}
  <p class="leise nicht-drucken">{t('Beim Teilen stecken die Projektdaten im Link selbst. Sie werden auf keinem Server gespeichert.')}</p>
</section>

<section class="karte nicht-drucken">
  <h2>{t('Fotos im Projekt')} ({fotos.length})</h2>
  <p class="leise">{t('Fotos bleiben auf diesem Gerät. Sie stehen im Projektbericht und in der Datensicherung, aber nicht im Teilen-Link.')}</p>
  <label class="knopf">
    {t('Fotos hinzufügen')}
    <input class="versteckt" type="file" accept="image/*" multiple onchange={neueFotos} />
  </label>
  {#if fotoFehler}<p class="fehler">{fotoFehler}</p>{/if}
  {#if fotos.length}
    <ul class="fotos">
      {#each fotos as f (f.id)}
        <li>
          <img src={f.daten} alt={f.titel || t('Foto')} />
          <input type="text" maxlength="120" placeholder={t('Beschriftung')} aria-label={t('Beschriftung')} bind:value={f.titel} onchange={() => fotoAendern($state.snapshot(f)).catch(() => undefined)} />
          <button aria-label={`${t('Foto')} ${f.titel}: ${t('Löschen')}`} onclick={() => entferneFoto(f)}>{t('Löschen')}</button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

{#if uebersicht.length}
  <section class="karte">
    <h2>{t('Ergebnisse im Projekt')}</h2>
    <p class="leise nicht-drucken">{t('Der Bericht enthält je Rechner die Eingaben, alle Ergebnisse, die Zeichnung und die Listen.')}</p>
    <button class="haupt nicht-drucken" disabled={berichtLaeuft} onclick={bericht}>{berichtLaeuft ? t('Bericht wird erstellt …') : t('Bericht als PDF')}</button>
    {#each uebersicht as u (u.rechner.id)}
      <h3><a href={`#/${u.rechner.id}`}>{t(u.rechner.titel)}</a></h3>
      <dl>
        {#each u.ausgaben as a, i (i)}
          <div>
            <dt>{t(a.label)}</dt>
            <dd>{formatiere(a.wert, a.art, a.stellen)} {einheitVon(a.art, a.einheit)}</dd>
          </div>
        {/each}
      </dl>
    {/each}
  </section>
{/if}

<section class="karte nicht-drucken">
  <h2>{t('Alle Projekte')}</h2>
  <ul class="projekte">
    {#each zustand.projekte as p (p.id)}
      <li class:aktiv={p.id === zustand.aktiv}>
        <button class="wahl" aria-pressed={p.id === zustand.aktiv} onclick={() => ((zustand.aktiv = p.id), sichere())}>
          <strong>{p.name}</strong>
          <span>{p.id === zustand.aktiv ? t('aktiv') : `${belegt(p).length} ${t('Rechner')}`}</span>
        </button>
        {#if zustand.projekte.length > 1}
          {#if loeschen === p.id}
            <button class="warn" onclick={() => loescheMitFotos(p.id)}>{t('Wirklich löschen')}</button>
          {:else}
            <button aria-label={`${p.name}: ${t('Löschen')}`} onclick={() => (loeschen = p.id)}>{t('Löschen')}</button>
          {/if}
        {/if}
      </li>
    {/each}
  </ul>
  <form class="reihe" onsubmit={anlegen}>
    <input type="text" maxlength="60" placeholder={t('Neues Projekt, z. B. Bauvorhaben Nord')} aria-label={t('Name des neuen Projekts')} bind:value={neuerName} />
    <button class="haupt" type="submit">{t('Anlegen')}</button>
  </form>
</section>

<section class="karte nicht-drucken">
  <h2>{t('Stammdaten für Dokumente')}</h2>
  <p class="leise">{t('Diese Angaben werden in jeder Dokumentvorlage vorbelegt. Sie gelten für alle Projekte und bleiben auf diesem Gerät.')}</p>
  <label>
    <span>{t('Absender (Firma und Anschrift)')}</span>
    <textarea rows="3" maxlength="500" autocomplete="off" bind:value={zustand.stammdaten.absender} oninput={sichere}></textarea>
  </label>
  <label>
    <span>{t('Ort')}</span>
    <input type="text" maxlength="100" bind:value={zustand.stammdaten.ort} oninput={sichere} />
  </label>
  <label>
    <span>{t('Name des Unterzeichners')}</span>
    <input type="text" maxlength="100" autocomplete="off" bind:value={zustand.stammdaten.unterzeichner} oninput={sichere} />
  </label>
</section>

<section class="karte nicht-drucken">
  <h2>{t('Datensicherung')}</h2>
  <p class="leise">{t('Alle Projekte, Notizen und Einstellungen liegen nur in diesem Browser. Wird der Browserspeicher gelöscht, sind sie weg. Eine Sicherungsdatei schützt davor und überträgt die Daten auf ein anderes Gerät.')}</p>
  <div class="reihe">
    <button onclick={speichereSicherung}>{t('Sicherung speichern')}</button>
    <label class="knopf">
      {t('Sicherung einspielen')}
      <input class="versteckt" type="file" accept="application/json,.json" onchange={waehleSicherung} />
    </label>
  </div>
  {#if wartend !== undefined}
    <p class="fehler">{t('Das Einspielen ersetzt alle Projekte, Stammdaten und Fotos auf diesem Gerät.')}</p>
    <div class="reihe">
      <button class="warn" onclick={bestaetigeSicherung}>{t('Alles ersetzen')}</button>
      <button onclick={() => (wartend = undefined)}>{t('Abbrechen')}</button>
    </div>
  {/if}
</section>

{#if meldung}<p class="meldung" role="status">{meldung}</p>{/if}

<style>
  .karte {
    margin-bottom: 1rem;
    padding: 0.25rem 1rem 1rem;
    border: 1px solid var(--rand);
    border-radius: 0.75rem;
    background: var(--flaeche);
  }
  .hervor {
    border-color: var(--akzent);
    border-width: 2px;
  }
  h2 {
    margin: 0.75rem 0 0.5rem;
    font-size: 1rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
    font-weight: 600;
  }
  input,
  textarea {
    width: 100%;
    min-height: 3rem;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--rand);
    border-radius: 0.6rem;
    background: var(--grund);
    color: inherit;
    font: inherit;
    font-weight: 400;
  }
  input:focus-visible,
  textarea:focus-visible {
    outline: 3px solid var(--akzent);
    outline-offset: 1px;
  }
  .reihe {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .reihe input {
    flex: 1;
    min-width: 12rem;
  }
  button {
    min-height: 2.75rem;
    padding: 0 1rem;
    border: 1px solid var(--rand);
    border-radius: 0.6rem;
    background: var(--flaeche);
    color: inherit;
    font: inherit;
  }
  .knopf {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    margin: 0;
    padding: 0 1rem;
    border: 1px solid var(--rand);
    border-radius: 0.6rem;
    background: var(--flaeche);
    font-size: 1rem;
    font-weight: 400;
    cursor: pointer;
  }
  .knopf:focus-within {
    outline: 3px solid var(--akzent);
    outline-offset: 2px;
  }
  .versteckt {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
  .haupt {
    border-color: var(--akzent);
    background: var(--akzent);
    color: var(--grund);
    font-weight: 600;
  }
  .warn {
    border-color: var(--warn);
    color: var(--warn);
    font-weight: 600;
  }
  .projekte,
  .links {
    margin: 0 0 0.75rem;
    padding: 0;
    list-style: none;
  }
  .projekte li {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .wahl {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    text-align: left;
  }
  .wahl span {
    color: var(--leise);
    font-size: 0.85rem;
  }
  .aktiv .wahl {
    border-color: var(--akzent);
    border-width: 2px;
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1rem;
  }
  .links a {
    display: inline-block;
    padding: 0.5rem 0;
    color: var(--akzent);
  }
  h3 {
    margin: 0.75rem 0 0.15rem;
    font-size: 0.95rem;
  }
  h3 a {
    color: var(--akzent);
  }
  dl {
    margin: 0;
  }
  dl div {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.2rem 0;
  }
  dt {
    color: var(--leise);
  }
  dd {
    margin: 0;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  details {
    margin-bottom: 0.75rem;
  }
  summary {
    min-height: 2.75rem;
    padding: 0.6rem 0;
    color: var(--akzent);
    font-weight: 600;
    cursor: pointer;
  }
  .fotos {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
    gap: 0.75rem;
    margin: 0.75rem 0 0;
    padding: 0;
    list-style: none;
  }
  .fotos li {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .fotos img {
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    border-radius: 0.5rem;
  }
  .fotos input {
    min-height: 2.5rem;
    padding: 0.3rem 0.5rem;
    font-size: 0.9rem;
  }
  .qr {
    display: block;
    width: 100%;
    max-width: 26rem;
    margin: 1rem auto 0;
  }
  .leise {
    margin: 0.5rem 0;
    color: var(--leise);
    font-size: 0.85rem;
  }
  .fehler {
    color: var(--warn);
    font-weight: 600;
  }
  .meldung {
    position: fixed;
    left: 50%;
    bottom: calc(1.5rem + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    margin: 0;
    padding: 0.6rem 1rem;
    border-radius: 0.6rem;
    background: var(--text);
    color: var(--grund);
  }
</style>
