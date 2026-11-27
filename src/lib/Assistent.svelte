<script lang="ts">
  import { frage, kiSchluessel, KiFehler, leseDatenblatt, setzeKiSchluessel, type KiAntwort } from './ki'
  import type { Vorschlag, Ziegelfund } from './kiwerkzeug'
  import { rechnerNachId } from '../calcs'
  import { t } from './sprache.svelte'
  import { aktivesProjekt, loescheZiegel, merkeZiegel, sichere, zustand } from './zustand.svelte'

  let schluessel = $state(kiSchluessel())
  let neu = $state('')
  let einverstanden = $state(false)

  function speichere() {
    setzeKiSchluessel(neu)
    schluessel = kiSchluessel()
    neu = ''
  }
  function entferne() {
    setzeKiSchluessel('')
    schluessel = ''
    einverstanden = false
    gespraech = []
    verlauf = []
  }

  /* ---------- Frage oder Aufgabe ---------- */
  let text = $state('')
  let laeuft = $state(false)
  let fehler = $state('')
  let gespraech = $state<{ von: 'ich' | 'ki'; text: string; vorschlaege: Vorschlag[] }[]>([])
  let verlauf: KiAntwort['verlauf'] = []

  async function sende() {
    const aufgabe = text.trim()
    if (aufgabe === '' || laeuft) return
    laeuft = true
    fehler = ''
    gespraech.push({ von: 'ich', text: aufgabe, vorschlaege: [] })
    text = ''
    try {
      const a = await frage(aufgabe, verlauf)
      verlauf = a.verlauf
      gespraech.push({ von: 'ki', text: a.text, vorschlaege: a.vorschlaege })
    } catch (e) {
      fehler = e instanceof KiFehler ? e.message : 'Die Anfrage ist fehlgeschlagen.'
    } finally {
      laeuft = false
    }
  }

  /** Vorgeschlagene Eingaben ins aktuelle Projekt schreiben und den Rechner öffnen */
  function uebernimm(v: Vorschlag) {
    const r = rechnerNachId(v.rechner)
    if (!r) return
    const werte = Object.fromEntries(
      Object.entries(v.werte).map(([id, wert]) => {
        const zahlenfeld = r.felder.some((f) => f.id === id && f.art !== 'select' && f.art !== 'liste')
        return [id, zahlenfeld && zustand.sprache === 'de' ? wert.replace('.', ',') : wert]
      })
    )
    aktivesProjekt().eingaben[r.id] = { ...(aktivesProjekt().eingaben[r.id] ?? {}), ...werte }
    sichere()
    location.hash = `#/${r.id}`
  }

  const feldname = (v: Vorschlag, id: string): string => rechnerNachId(v.rechner)?.felder.find((f) => f.id === id)?.label ?? id

  /* ---------- Diktat über die Spracherkennung des Browsers ---------- */
  interface Erkennung {
    lang: string
    interimResults: boolean
    onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
    onend: (() => void) | null
    onerror: (() => void) | null
    start: () => void
    stop: () => void
  }
  const Sprecherkennung = (globalThis as unknown as { SpeechRecognition?: new () => Erkennung; webkitSpeechRecognition?: new () => Erkennung }).SpeechRecognition ?? (globalThis as unknown as { webkitSpeechRecognition?: new () => Erkennung }).webkitSpeechRecognition
  let hoert = $state(false)
  let erkennung: Erkennung | undefined
  function diktiere() {
    if (!Sprecherkennung) return
    if (hoert) {
      erkennung?.stop()
      return
    }
    erkennung = new Sprecherkennung()
    erkennung.lang = zustand.sprache === 'de' ? 'de-DE' : 'en-GB'
    erkennung.interimResults = false
    erkennung.onresult = (e) => {
      const gesagt = Array.from(e.results, (r) => r[0].transcript).join(' ')
      text = `${text} ${gesagt}`.trim()
    }
    erkennung.onend = erkennung.onerror = () => (hoert = false)
    hoert = true
    erkennung.start()
  }

  /* ---------- Datenblatt ---------- */
  let liest = $state(false)
  let blattFehler = $state('')
  let fund = $state<Ziegelfund | null>(null)
  let ziegelName = $state('')
  let gespeichert = $state(false)

  async function lies(e: Event) {
    const feld = e.currentTarget as HTMLInputElement
    const datei = feld.files?.[0]
    feld.value = ''
    if (!datei || liest) return
    liest = true
    blattFehler = ''
    fund = null
    gespeichert = false
    try {
      fund = await leseDatenblatt(datei)
      ziegelName = fund.name
    } catch (err) {
      blattFehler = err instanceof KiFehler ? err.message : 'Die Anfrage ist fehlgeschlagen.'
    } finally {
      liest = false
    }
  }
  function speichereZiegel() {
    if (!fund || ziegelName.trim() === '') return
    merkeZiegel(ziegelName, fund.min, fund.max)
    gespeichert = true
  }
  const cm = (x: number): string => x.toLocaleString(zustand.sprache === 'de' ? 'de-DE' : 'en-GB', { maximumFractionDigits: 2 })
</script>

<section>
  <h2>{t('Einrichtung')}</h2>
  <p>
    {t(
      'Der Assistent ist freiwillig und abgeschaltet, solange kein API-Schlüssel hinterlegt ist. Er wählt den passenden Rechner und trägt die Werte ein; gerechnet wird weiter von der App selbst.'
    )}
  </p>
  <p class="warnung">
    {t(
      'Mit dem Assistenten verlassen Daten das Gerät: Deine Frage, die Eingaben der abgefragten Rechner und hochgeladene Datenblätter gehen an die Claude-API von Anthropic. Projektnamen, Stammdaten und Notizen werden nicht mitgeschickt. Gib keine personenbezogenen Daten ein. Jede Anfrage wird über deinen API-Schlüssel abgerechnet.'
    )}
  </p>
  {#if schluessel}
    <p>{t('API-Schlüssel hinterlegt, endet auf')} <code>…{schluessel.slice(-4)}</code></p>
    <div class="leiste"><button type="button" onclick={entferne}>{t('Schlüssel vom Gerät löschen')}</button></div>
  {:else}
    <form class="schluessel" onsubmit={(e) => (e.preventDefault(), speichere())}>
      <label>
        <span class="name">{t('API-Schlüssel (Claude-API)')}</span>
        <input type="password" autocomplete="off" spellcheck="false" bind:value={neu} />
        <small>{t('Bleibt nur im Speicher dieses Geräts, kommt in keine Sicherung und keinen Teilen-Link. Wer das entsperrte Gerät hat, kann ihn auslesen.')}</small>
      </label>
      <label class="haken"><input type="checkbox" bind:checked={einverstanden} /> <span>{t('Ich habe verstanden, dass Anfragen an einen externen Dienst gehen und Kosten verursachen.')}</span></label>
      <div class="leiste"><button type="submit" class="haupt" disabled={!einverstanden || neu.trim() === ''}>{t('Schlüssel speichern')}</button></div>
    </form>
  {/if}
</section>

{#if schluessel}
  <section>
    <h2>{t('Frage oder Aufgabe')}</h2>
    <p class="leise">{t('Zum Beispiel: „Sparren mit Grundmaß 4 Meter, 35 Grad, 50 Überstand, Sparrenhöhe 18, Kerve 3“.')}</p>
    <div class="gespraech" aria-live="polite">
      {#each gespraech as g, i (i)}
        <div class="beitrag {g.von}">
          <p>{g.text}</p>
          {#each g.vorschlaege as v (v.rechner)}
            <div class="vorschlag">
              <strong>{t(v.titel)}</strong>
              <ul>
                {#each Object.entries(v.werte) as [id, wert] (id)}
                  <li>{t(feldname(v, id))}: {wert}</li>
                {/each}
              </ul>
              <button type="button" class="haupt" onclick={() => uebernimm(v)}>{t('In den Rechner übernehmen')}</button>
            </div>
          {/each}
        </div>
      {/each}
      {#if laeuft}<p class="leise">{t('Die KI arbeitet …')}</p>{/if}
      {#if fehler}<p class="fehler">{t(fehler)}</p>{/if}
    </div>
    <form class="frage" onsubmit={(e) => (e.preventDefault(), sende())}>
      <textarea rows="3" bind:value={text} placeholder={t('Aufgabe eintippen oder diktieren')} aria-label={t('Frage oder Aufgabe')}></textarea>
      <div class="leiste">
        {#if Sprecherkennung}
          <button type="button" aria-pressed={hoert} onclick={diktiere}>{hoert ? t('Diktat beenden') : t('Diktieren')}</button>
        {/if}
        <button type="submit" class="haupt" disabled={laeuft || text.trim() === ''}>{t('Senden')}</button>
      </div>
      {#if Sprecherkennung}
        <small class="leise">{t('Das Diktat nutzt die Spracherkennung des Browsers; je nach Gerät wird die Aufnahme dafür an dessen Hersteller übertragen. Alternativ das Mikrofon der Tastatur verwenden.')}</small>
      {/if}
    </form>
  </section>

  <section>
    <h2>{t('Ziegel aus einem Datenblatt')}</h2>
    <p class="leise">{t('PDF oder Foto des Datenblatts wählen. Die KI sucht die Decklängen heraus; du prüfst sie und speicherst den Ziegel für den Lattungs-Rechner.')}</p>
    <label class="datei">
      <span class="name">{t('Datenblatt wählen')}</span>
      <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onchange={lies} disabled={liest} />
    </label>
    {#if liest}<p class="leise">{t('Die KI liest das Datenblatt …')}</p>{/if}
    {#if blattFehler}<p class="fehler">{t(blattFehler)}</p>{/if}
    {#if fund}
      <div class="vorschlag">
        <strong>{t('Gefunden – bitte mit dem Datenblatt vergleichen')}</strong>
        <ul>
          <li>{t('Decklänge min.')}: {cm(fund.min)} cm</li>
          <li>{t('Decklänge max.')}: {cm(fund.max)} cm</li>
          {#if fund.deckbreite}<li>{t('Deckbreite')}: {cm(fund.deckbreite)} cm</li>{/if}
          {#if fund.laf}<li>{t('Lattenabstand zum First (LAF)')}: {cm(fund.laf)} cm</li>{/if}
          {#if fund.fundstelle}<li>{t('Fundstelle')}: {fund.fundstelle}</li>{/if}
          {#if fund.hinweis}<li>{t('Hinweis')}: {fund.hinweis}</li>{/if}
        </ul>
        {#if gespeichert}
          <p>{t('Gespeichert. Der Ziegel steht jetzt in der Auswahl des Lattungs-Rechners.')} <a href="#/lattung">{t('Lattung / Ziegel')} ›</a></p>
        {:else}
          <label>
            <span class="name">{t('Bezeichnung')}</span>
            <input type="text" autocomplete="off" bind:value={ziegelName} />
          </label>
          <div class="leiste"><button type="button" class="haupt" onclick={speichereZiegel} disabled={ziegelName.trim() === ''}>{t('Als eigenen Ziegel speichern')}</button></div>
        {/if}
      </div>
    {/if}
  </section>
{/if}

{#if zustand.ziegel.length > 0}
  <section>
    <h2>{t('Eigene Ziegel')}</h2>
    <ul class="ziegel">
      {#each zustand.ziegel as z (z.id)}
        <li>
          <span>{z.name} · {cm(z.min)}–{cm(z.max)} cm</span>
          <button type="button" aria-label={`${z.name}: ${t('löschen')}`} onclick={() => loescheZiegel(z.id)}>{t('löschen')}</button>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  section {
    margin-bottom: 1.5rem;
  }
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1.05rem;
  }
  p {
    margin: 0 0 0.6rem;
    line-height: 1.45;
  }
  .leise,
  small {
    color: var(--leise);
    font-size: 0.85rem;
  }
  .warnung {
    padding: 0.7rem 0.8rem;
    border: 1px solid var(--rand);
    border-left: 4px solid var(--akzent);
    border-radius: 0.5rem;
    background: var(--flaeche);
    font-size: 0.9rem;
  }
  .fehler {
    color: var(--fehler, #b3261e);
    font-weight: 600;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.6rem;
  }
  label.haken {
    flex-direction: row;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: 0.9rem;
  }
  .name {
    font-size: 0.9rem;
    font-weight: 600;
  }
  input[type='password'],
  input[type='text'],
  textarea {
    width: 100%;
    min-height: 2.75rem;
    padding: 0.5rem 0.7rem;
    border: 1px solid var(--rand);
    border-radius: 0.6rem;
    background: var(--flaeche);
    color: inherit;
    font: inherit;
  }
  .leiste {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0.4rem 0;
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
  button.haupt {
    border-color: var(--akzent);
    background: var(--akzent);
    color: #fff;
    font-weight: 600;
  }
  button:disabled {
    opacity: 0.5;
  }
  .beitrag {
    margin-bottom: 0.6rem;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--rand);
    border-radius: 0.6rem;
    background: var(--flaeche);
  }
  .beitrag.ich {
    margin-left: 2rem;
    background: transparent;
  }
  .beitrag p {
    white-space: pre-wrap;
  }
  .vorschlag {
    margin-top: 0.5rem;
    padding: 0.6rem 0.8rem;
    border: 1px dashed var(--rand);
    border-radius: 0.6rem;
  }
  .vorschlag ul,
  .ziegel {
    margin: 0.3rem 0 0.6rem;
    padding-left: 1.1rem;
    font-size: 0.9rem;
  }
  .ziegel {
    padding: 0;
    list-style: none;
  }
  .ziegel li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.3rem 0;
    border-bottom: 1px solid var(--rand);
  }
  code {
    font-size: 0.95em;
  }
</style>
