<script lang="ts">
  import { dokDateiname, fehlend, type DokWerte, type Vorlage, type Zeile } from '../core/dokumente'
  import { erzeugeDokument } from './dokpdf'
  import { gibAus, ladeBild, type Bild } from './pdf'
  import Unterschrift from './Unterschrift.svelte'
  import { aktivesProjekt, sichere, zustand } from './zustand.svelte'

  /*
   * Gemeinsame Ansicht für Dokumentvorlagen. Die Dokumente sind deutsche Vorlagen, deshalb bleibt
   * die Ansicht deutsch. Texte und Tabellen werden im aktiven Projekt gespeichert; Unterschriften
   * und Fotos bleiben nur bis zum Schließen der Seite im Arbeitsspeicher.
   */
  let { vorlage }: { vorlage: Vorlage } = $props()

  const MAX_BILDER = 12
  const MAX_ZEILEN = 40
  const MAX_ZELLE = 120
  /** Längen der Kopfdaten, wie sie der Speicher zulässt */
  const GRENZE: Record<string, number> = { absender: 500, ort: 100, unterzeichner: 100, bauvorhaben: 200, empfaenger: 500, auftrag: 200 }
  // svelte-ignore state_referenced_locally
  const v = vorlage

  const heute = (): string => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  const leereZeile = (id: string): Zeile => Object.fromEntries((v.felder.find((f) => f.id === id)?.spalten ?? []).map((s) => [s.id, '']))

  /** Kopfdaten aus den Stammdaten des Betriebs und den Angaben zum aktiven Projekt */
  const kopfdaten = (): Record<string, string> => {
    const p = aktivesProjekt().daten
    const s = zustand.stammdaten
    return { absender: s.absender, ort: s.ort, unterzeichner: s.unterzeichner, bauvorhaben: p.bauvorhaben, empfaenger: p.empfaenger, auftrag: p.auftrag }
  }

  function vorgaben(): DokWerte {
    const w: DokWerte = { text: {}, tabellen: {} }
    const kopf = kopfdaten()
    for (const f of v.felder) {
      if (f.art === 'tabelle') w.tabellen[f.id] = [leereZeile(f.id)]
      else w.text[f.id] = f.vorgabe === 'heute' ? heute() : (kopf[f.id] ?? f.vorgabe ?? '')
    }
    return w
  }

  /** Gespeichert wird je Feld ein Text; Tabellen als JSON. Unlesbares fällt auf die Vorgabe zurück. */
  function lade(): DokWerte {
    const w = vorgaben()
    const roh = aktivesProjekt().eingaben[v.id] ?? {}
    for (const f of v.felder) {
      const text = roh[f.id]
      if (typeof text !== 'string') continue
      if (f.art !== 'tabelle') {
        // gespeicherte Angaben gelten, auch ein bewusst geleertes Feld; vorbelegt wird nur ein neues Dokument
        w.text[f.id] = text
        continue
      }
      try {
        const daten: unknown = JSON.parse(text)
        if (!Array.isArray(daten)) continue
        const spalten = (f.spalten ?? []).map((s) => s.id)
        const zeilen = daten
          .slice(0, MAX_ZEILEN)
          .filter((z): z is Record<string, unknown> => typeof z === 'object' && z !== null)
          .map((z) => Object.fromEntries(spalten.map((s) => [s, typeof z[s] === 'string' ? (z[s] as string).slice(0, MAX_ZELLE) : ''])))
        if (zeilen.length) w.tabellen[f.id] = zeilen
      } catch {
        // abgeschnittene oder fremde Daten: Tabelle bleibt leer
      }
    }
    return w
  }

  let werte = $state<DokWerte>(lade())
  let unterschriften = $state<(string | undefined)[]>(v.unterschriften.map(() => undefined))
  let felder = $state<({ leere: () => void } | undefined)[]>([])
  let bilder = $state<Bild[]>([])
  let arbeitet = $state(false)
  let meldung = $state('')
  let bildFehler = $state('')

  // fehlende Pflichtangaben und Widersprüche sperren den Export
  const fehlt = $derived(fehlend(v, werte))
  const probleme = $derived(v.pruefe?.(werte) ?? [])
  const inhalt = $derived(v.baue(werte, bilder.length))

  function merke() {
    const roh: Record<string, string> = { ...werte.text }
    for (const [id, zeilen] of Object.entries(werte.tabellen)) roh[id] = JSON.stringify(zeilen)
    aktivesProjekt().eingaben[v.id] = roh
    sichere()
  }

  /** Gibt es im Formular Kopfdaten, die noch nicht hinterlegt sind? */
  const neuesImKopf = $derived(Object.entries(kopfdaten()).some(([id, alt]) => id in werte.text && werte.text[id].trim() !== '' && werte.text[id].trim().slice(0, GRENZE[id] ?? 500) !== alt.trim()))

  /** Absender, Ort und Unterzeichner als Stammdaten, Bauvorhaben, Empfänger und Auftrag für dieses Projekt merken */
  function merkeKopf() {
    const w = werte.text
    const s = zustand.stammdaten
    const p = aktivesProjekt().daten
    // dieselben Längen wie beim Laden, sonst gälte das Gemerkte nach dem Neuladen als geändert
    if (w.absender?.trim()) s.absender = w.absender.trim().slice(0, 500)
    if (w.ort?.trim()) s.ort = w.ort.trim().slice(0, 100)
    if (w.unterzeichner?.trim()) s.unterzeichner = w.unterzeichner.trim().slice(0, 100)
    if (w.bauvorhaben?.trim()) p.bauvorhaben = w.bauvorhaben.trim().slice(0, 200)
    if (w.empfaenger?.trim()) p.empfaenger = w.empfaenger.trim().slice(0, 500)
    if (w.auftrag?.trim()) p.auftrag = w.auftrag.trim().slice(0, 200)
    sichere()
    meldung = 'Für weitere Dokumente gemerkt.'
  }

  function zeileDazu(id: string) {
    if (werte.tabellen[id].length < MAX_ZEILEN) werte.tabellen[id].push(leereZeile(id))
    merke()
  }

  function zeileWeg(id: string, i: number) {
    werte.tabellen[id].splice(i, 1)
    if (werte.tabellen[id].length === 0) werte.tabellen[id].push(leereZeile(id))
    merke()
  }

  async function fotos(e: Event) {
    const feld = e.currentTarget as HTMLInputElement
    bildFehler = ''
    for (const datei of [...(feld.files ?? [])]) {
      if (bilder.length >= MAX_BILDER) {
        bildFehler = `Höchstens ${MAX_BILDER} Fotos.`
        break
      }
      try {
        bilder.push(await ladeBild(datei))
      } catch {
        bildFehler = `„${datei.name}“ konnte nicht gelesen werden.`
      }
    }
    feld.value = ''
  }

  async function exportiere() {
    arbeitet = true
    meldung = ''
    try {
      const pdf = await erzeugeDokument(inhalt, $state.snapshot(unterschriften), $state.snapshot(bilder))
      meldung = (await gibAus(pdf, dokDateiname(v, werte))) === 'geladen' ? 'PDF wurde gespeichert.' : ''
    } catch {
      meldung = 'Das PDF konnte nicht erstellt werden.'
    } finally {
      arbeitet = false
    }
  }

  function allesLeeren() {
    werte = vorgaben()
    bilder = []
    unterschriften = v.unterschriften.map(() => undefined)
    for (const f of felder) f?.leere()
    merke()
  }
</script>

<p class="hinweis">{v.hinweis} Texte bleiben im Projekt auf diesem Gerät gespeichert, Unterschriften und Fotos nur bis zum Schließen der Seite.</p>

<form onsubmit={(e) => e.preventDefault()} oninput={merke} onchange={merke}>
  {#each v.felder as f (f.id)}
    {#if f.art === 'tabelle'}
      <fieldset>
        <legend>{f.label}{#if f.freiwillig}<em> · freiwillig</em>{/if}</legend>
        {#each werte.tabellen[f.id] as zeile, i (i)}
          <div class="zeile">
            {#each f.spalten ?? [] as s (s.id)}
              <label class:zahl={s.art === 'zahl'}>
                <span>{s.label}</span>
                <input type="text" maxlength={MAX_ZELLE} inputmode={s.art === 'zahl' ? 'decimal' : 'text'} autocomplete="off" placeholder={s.platzhalter ?? ''} bind:value={zeile[s.id]} />
              </label>
            {/each}
            <button type="button" class="weg" aria-label={`Zeile ${i + 1} entfernen`} onclick={() => zeileWeg(f.id, i)}>✕</button>
          </div>
        {/each}
        <button type="button" onclick={() => zeileDazu(f.id)} disabled={werte.tabellen[f.id].length >= MAX_ZEILEN}>+ {f.neueZeile ?? 'Zeile hinzufügen'}</button>
      </fieldset>
    {:else if f.art === 'haken'}
      <label class="haken">
        <input type="checkbox" checked={werte.text[f.id] === '1'} onchange={(e) => (werte.text[f.id] = e.currentTarget.checked ? '1' : '')} />
        <span>{f.label}</span>
      </label>
    {:else}
      <label>
        <span>{f.label}{#if f.freiwillig}<em> · freiwillig</em>{/if}</span>
        {#if f.art === 'auswahl'}
          <select bind:value={werte.text[f.id]}>
            {#each f.optionen ?? [] as o (o.wert)}
              <option value={o.wert}>{o.label}</option>
            {/each}
          </select>
        {:else if f.art === 'mehrzeilig'}
          <textarea rows="3" autocomplete="off" placeholder={f.platzhalter ?? ''} bind:value={werte.text[f.id]}></textarea>
        {:else if f.art === 'datum'}
          <input type="date" bind:value={werte.text[f.id]} />
        {:else}
          <input type="text" autocomplete="off" placeholder={f.platzhalter ?? ''} bind:value={werte.text[f.id]} />
        {/if}
      </label>
    {/if}
  {/each}
</form>

{#each v.unterschriften as name, i (name)}
  <section>
    <h2>{name}</h2>
    <Unterschrift bind:this={felder[i]} bind:wert={unterschriften[i]} />
  </section>
{/each}

<section>
  <h2>Fotos ({bilder.length})</h2>
  <label class="knopf">
    Fotos hinzufügen
    <input class="versteckt" type="file" accept="image/*" multiple onchange={fotos} />
  </label>
  {#if bildFehler}<p class="fehler">{bildFehler}</p>{/if}
  {#if bilder.length}
    <ul class="bilder">
      {#each bilder as b, i (i)}
        <li>
          <img src={b.daten} alt={`Foto ${i + 1}`} />
          <button aria-label={`Foto ${i + 1} entfernen`} onclick={() => bilder.splice(i, 1)}>✕</button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<section>
  <h2>Vorschau</h2>
  <div class="brief">
    <p class="klein">{#each inhalt.absender as z, i (i)}{z}<br />{/each}</p>
    <p>{#each inhalt.empfaenger as z, i (i)}{z}<br />{/each}</p>
    <p class="rechts">{inhalt.ortDatum}</p>
    <p><strong>{inhalt.betreff}</strong><br />{#each inhalt.bezug as z, i (i)}{z}<br />{/each}</p>
    {#if inhalt.anrede}<p>{inhalt.anrede}</p>{/if}
    {#each inhalt.bloecke as b, i (i)}
      {#if b.art === 'absatz'}
        <p class:titel={b.fett}>{b.text}</p>
      {:else}
        <table>
          <thead>
            <tr>{#each b.kopf as k, j (j)}<th class:r={b.rechts[j]}>{k}</th>{/each}</tr>
          </thead>
          <tbody>
            {#each b.zeilen as z, n (n)}
              <tr>{#each z as c, j (j)}<td class:r={b.rechts[j]}>{c}</td>{/each}</tr>
            {/each}
            {#each b.summen ?? [] as z, n (n)}
              <tr class="summe">{#each z as c, j (j)}<td class:r={b.rechts[j]}>{c}</td>{/each}</tr>
            {/each}
          </tbody>
        </table>
      {/if}
    {/each}
    {#if inhalt.gruss}<p>{inhalt.gruss}</p>{/if}
    <div class="signaturen">
      {#each inhalt.unterschriften as name, i (i)}
        <div>
          {#if unterschriften[i]}<img src={unterschriften[i]} alt={`Unterschrift ${name}`} />{/if}
          <span>{name}</span>
        </div>
      {/each}
    </div>
  </div>
</section>

<div class="leiste">
  {#if fehlt.length}
    <p class="fehler">Es fehlt noch: {fehlt.join(', ')}</p>
  {/if}
  {#each probleme as p (p)}
    <p class="fehler">{p}</p>
  {/each}
  <button class="haupt" disabled={fehlt.length > 0 || probleme.length > 0 || arbeitet} onclick={exportiere}>{arbeitet ? 'PDF wird erstellt …' : 'Als PDF exportieren'}</button>
  {#if neuesImKopf}<button onclick={merkeKopf}>Kopfdaten merken</button>{/if}
  <button onclick={allesLeeren}>Alles leeren</button>
  {#if meldung}<p role="status">{meldung}</p>{/if}
</div>

<style>
  .hinweis {
    margin: 0 0 1rem;
    color: var(--leise);
    font-size: 0.9rem;
  }
  form {
    display: grid;
    gap: 0.75rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.9rem;
    font-weight: 600;
  }
  em {
    font-style: normal;
    font-weight: 400;
    color: var(--leise);
  }
  input[type='text'],
  input[type='date'],
  textarea,
  select {
    width: 100%;
    min-height: 3rem;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--rand);
    border-radius: 0.6rem;
    background: var(--flaeche);
    color: inherit;
    font: inherit;
    font-weight: 400;
  }
  input:focus-visible,
  textarea:focus-visible,
  select:focus-visible {
    outline: 3px solid var(--akzent);
    outline-offset: 1px;
  }
  fieldset {
    margin: 0;
    padding: 0.5rem 0.75rem 0.75rem;
    border: 1px solid var(--rand);
    border-radius: 0.75rem;
  }
  legend {
    padding: 0 0.3rem;
    font-size: 0.9rem;
    font-weight: 600;
  }
  .zeile {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.5rem;
    margin-bottom: 0.6rem;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid var(--rand);
  }
  .zeile label {
    flex: 1 1 9rem;
    font-weight: 400;
    font-size: 0.8rem;
    color: var(--leise);
  }
  .zeile label.zahl {
    flex: 1 1 4.5rem;
  }
  .zeile input {
    min-height: 2.75rem;
    color: var(--text);
  }
  .weg {
    width: 2.75rem;
    padding: 0;
  }
  .haken {
    flex-direction: row;
    align-items: center;
    gap: 0.6rem;
    min-height: 2.75rem;
    font-weight: 400;
    font-size: 1rem;
  }
  .haken input {
    width: 1.5rem;
    height: 1.5rem;
    accent-color: var(--akzent);
  }
  h2 {
    margin: 1.5rem 0 0.5rem;
    font-size: 1rem;
  }
  button,
  .knopf {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.75rem;
    padding: 0 1rem;
    border: 1px solid var(--rand);
    border-radius: 0.6rem;
    background: var(--flaeche);
    color: inherit;
    font: inherit;
    font-weight: 400;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
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
  .bilder {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
    gap: 0.5rem;
    margin: 0.75rem 0 0;
    padding: 0;
    list-style: none;
  }
  .bilder li {
    position: relative;
  }
  .bilder img {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 0.5rem;
  }
  .bilder button {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    min-height: 2.25rem;
    width: 2.25rem;
    padding: 0;
  }
  .brief {
    padding: 1rem;
    border: 1px solid var(--rand);
    border-radius: 0.5rem;
    background: #fff;
    color: #000;
    font-size: 0.9rem;
    overflow-wrap: anywhere;
  }
  .brief p {
    margin: 0 0 0.75rem;
    white-space: pre-line;
  }
  .brief .klein {
    font-size: 0.8rem;
  }
  .brief .rechts {
    text-align: right;
  }
  .brief .titel {
    margin-bottom: 0.1rem;
    font-weight: 700;
  }
  table {
    width: 100%;
    margin-bottom: 0.75rem;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }
  th,
  td {
    padding: 0.25rem 0.3rem 0.25rem 0;
    border-bottom: 1px solid #ccc;
    text-align: left;
    vertical-align: top;
  }
  .r {
    text-align: right;
  }
  .summe td {
    font-weight: 700;
  }
  .signaturen {
    display: flex;
    gap: 1rem;
  }
  .signaturen div {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    min-height: 4.5rem;
  }
  .signaturen img {
    width: 100%;
    max-width: 11rem;
  }
  .signaturen span {
    border-top: 1px solid #777;
    padding-top: 0.2rem;
    font-size: 0.8rem;
  }
  .leiste {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin: 1.5rem 0 0;
  }
  .leiste p {
    flex-basis: 100%;
    margin: 0;
  }
  .haupt {
    border-color: var(--akzent);
    background: var(--akzent);
    color: var(--grund);
    font-weight: 600;
  }
  .fehler {
    color: var(--warn);
    font-weight: 600;
  }
</style>
