<script lang="ts">
  import { GRUPPEN, RECHNER, kopierbar, rechnerNachId } from '../calcs'
  import { alsApp, installation, installiere, istIos } from './installieren.svelte'
  import { t, titelVon } from './sprache.svelte'
  import { entferneKopie, neueKopie, setzeEingabenZurueck, sichere, zustand, type Einheit, type Thema } from './zustand.svelte'

  const speichere = (): void => sichere()

  /* ---------- Startseite ---------- */
  /** Abschnitte in der gewählten Reihenfolge; neue Abschnitte hinten */
  const gruppen = $derived([...zustand.gruppenFolge.filter((g) => GRUPPEN.includes(g)), ...GRUPPEN.filter((g) => !zustand.gruppenFolge.includes(g))])
  function verschiebe(g: string, um: number) {
    const liste = [...gruppen]
    const i = liste.indexOf(g)
    const j = i + um
    if (j < 0 || j >= liste.length) return
    ;[liste[i], liste[j]] = [liste[j], liste[i]]
    zustand.gruppenFolge = liste
    speichere()
  }
  function zeige(id: string, an: boolean) {
    zustand.ausgeblendet = an ? zustand.ausgeblendet.filter((x) => x !== id) : [...zustand.ausgeblendet, id]
    speichere()
  }

  /* ---------- weitere Ausgaben ---------- */
  const kopierbare = RECHNER.filter(kopierbar)
  let basis = $state('sparren')
  let meldung = $state('')
  function legeAn() {
    const id = neueKopie(basis)
    meldung = id ? '' : t('Von dieser Funktion gibt es schon die höchste Anzahl.')
    if (id) location.hash = `#/${id}`
  }
  function entferne(id: string) {
    const r = rechnerNachId(id)
    if (r && confirm(`${titelVon(r)}: ${t('entfernen? Die Eingaben dieser Ausgabe werden in allen Projekten gelöscht.')}`)) entferneKopie(id)
  }

  /* ---------- Daten ---------- */
  let zurueckGesetzt = $state(-1)
  function setzeZurueck() {
    if (!confirm(t('Alle Eingaben in allen Rechnern und allen Projekten löschen? Projekte, Notizen, Dokumentvorlagen und Fotos bleiben erhalten. Das lässt sich nicht rückgängig machen.'))) return
    zurueckGesetzt = setzeEingabenZurueck((id) => {
      const r = rechnerNachId(id)
      return !!r && !r.eigen
    })
  }

  const ios = istIos()
</script>

<section>
  <h2>{t('Darstellung')}</h2>
  <div class="wahl" role="group" aria-label={t('Darstellung')}>
    {#each [['auto', 'wie das Gerät'], ['hell', 'hell'], ['dunkel', 'dunkel']] as const as [wert, name] (wert)}
      <button class:an={zustand.thema === wert} aria-pressed={zustand.thema === wert} onclick={() => ((zustand.thema = wert as Thema), speichere())}>{t(name)}</button>
    {/each}
  </div>
</section>

<section>
  <h2>{t('Längeneinheit')}</h2>
  <div class="wahl" role="group" aria-label={t('Längeneinheit')}>
    {#each ['mm', 'cm', 'm'] as const as e (e)}
      <button class:an={zustand.einheit === e} aria-pressed={zustand.einheit === e} onclick={() => ((zustand.einheit = e as Einheit), speichere())}>{e}</button>
    {/each}
  </div>
</section>

<section>
  <h2>{t('Sprache')}</h2>
  <div class="wahl" role="group" aria-label="Sprache / Language">
    {#each [['de', 'Deutsch'], ['en', 'English']] as const as [kuerzel, name] (kuerzel)}
      <button class:an={zustand.sprache === kuerzel} aria-pressed={zustand.sprache === kuerzel} onclick={() => ((zustand.sprache = kuerzel), speichere())}>{name}</button>
    {/each}
  </div>
</section>

<section>
  <h2>{t('Funktion zweimal nutzen')}</h2>
  <p class="leise">{t('Eine weitere Ausgabe rechnet mit denselben Formeln, merkt sich aber eigene Eingaben – zum Beispiel zwei Sparren mit verschiedener Neigung nebeneinander.')}</p>
  <div class="zeile">
    <select bind:value={basis} aria-label={t('Funktion')}>
      {#each kopierbare as r (r.id)}
        <option value={r.id}>{t(r.titel)}</option>
      {/each}
    </select>
    <button class="knopf" onclick={legeAn}>{t('Hinzufügen')}</button>
  </div>
  {#if meldung}<p class="warn">{meldung}</p>{/if}
  {#if zustand.kopien.length}
    <ul class="liste">
      {#each zustand.kopien as id (id)}
        {@const r = rechnerNachId(id)}
        {#if r}
          <li>
            <a href={`#/${id}`}>{titelVon(r)}</a>
            <button class="knopf leise" onclick={() => entferne(id)}>{t('Entfernen')}</button>
          </li>
        {/if}
      {/each}
    </ul>
  {/if}
</section>

<section>
  <h2>{t('Startseite bearbeiten')}</h2>
  <label class="schalter">
    <input type="checkbox" checked={zustand.kiKachel} onchange={(e) => ((zustand.kiKachel = e.currentTarget.checked), speichere())} />
    {t('Kachel „KI-Assistent“ zeigen')}
  </label>
  <p class="leise">{t('Abschnitte mit den Pfeilen verschieben, Funktionen per Haken ein- oder ausblenden. Ausgeblendete Funktionen findet die Suche weiterhin.')}</p>
  {#each gruppen as g, i (g)}
    <div class="gruppe">
      <h3>
        <span>{t(g)}</span>
        <button class="pfeil" disabled={i === 0} onclick={() => verschiebe(g, -1)} aria-label={`${t(g)}: ${t('nach oben')}`}>↑</button>
        <button class="pfeil" disabled={i === gruppen.length - 1} onclick={() => verschiebe(g, 1)} aria-label={`${t(g)}: ${t('nach unten')}`}>↓</button>
      </h3>
      {#each RECHNER.filter((r) => r.gruppe === g) as r (r.id)}
        <label class="schalter">
          <input type="checkbox" checked={!zustand.ausgeblendet.includes(r.id)} onchange={(e) => zeige(r.id, e.currentTarget.checked)} />
          {t(r.titel)}
        </label>
      {/each}
    </div>
  {/each}
</section>

<section>
  <h2>{t('Menüleiste unten')}</h2>
  <p class="leise">{t('Die zuletzt benutzte Funktion steht links. Lange drücken (am Rechner: Rechtsklick) löst eine Funktion aus der Leiste.')}</p>
</section>

<section>
  <h2>{t('App installieren')}</h2>
  {#if alsApp() || installation.installiert}
    <p class="leise">{t('Der Spicker läuft bereits als installierte App.')}</p>
  {:else if installation.aufforderung}
    <button class="knopf" onclick={installiere}>{t('Auf dem Startbildschirm installieren')}</button>
  {:else if ios}
    <p class="leise">{t('In Safari unten auf „Teilen“ tippen, dann „Zum Home-Bildschirm“.')}</p>
  {:else}
    <p class="leise">{t('Im Browsermenü (⋮) „Zum Startbildschirm hinzufügen“ oder „App installieren“ wählen.')}</p>
  {/if}
  {#if zustand.installWeg && !alsApp()}
    <button class="knopf leise" onclick={() => ((zustand.installWeg = false), speichere())}>{t('Hinweis beim Start wieder zeigen')}</button>
  {/if}
</section>

<section>
  <h2>{t('Daten')}</h2>
  <p class="leise">{t('Alle Eingaben bleiben auf diesem Gerät. Sicherung, Projekte und Angaben des Betriebs findest du unter „Projekt“.')}</p>
  <button class="knopf gefahr" onclick={setzeZurueck}>{t('Alle Eingaben zurücksetzen')}</button>
  {#if zurueckGesetzt >= 0}<p class="leise" role="status">{t('Die Eingaben wurden zurückgesetzt.')}</p>{/if}
  <p><a href="#/info">{t('Info & Datenschutz')}</a></p>
</section>

<style>
  section {
    margin-bottom: 1.5rem;
  }
  h2 {
    margin: 0 0 0.5rem;
    font-size: 0.85rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--leise);
  }
  h3 {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0 0 0.25rem;
    font-size: 1rem;
  }
  h3 span {
    flex: 1;
  }
  .leise {
    color: var(--leise);
    font-size: 0.9rem;
  }
  .warn {
    color: var(--warn);
  }
  .wahl {
    display: flex;
    border: 1px solid var(--rand);
    border-radius: 0.6rem;
    overflow: hidden;
  }
  .wahl button {
    flex: 1;
    min-height: 2.75rem;
    border: 0;
    background: var(--flaeche);
    color: inherit;
    font: inherit;
  }
  .wahl button + button {
    border-left: 1px solid var(--rand);
  }
  .wahl button.an {
    background: var(--akzent);
    color: var(--grund);
    font-weight: 600;
  }
  .zeile {
    display: flex;
    gap: 0.5rem;
  }
  select {
    flex: 1;
    min-width: 0;
    min-height: 2.75rem;
    padding: 0 0.6rem;
    border: 1px solid var(--rand);
    border-radius: 0.6rem;
    background: var(--flaeche);
    color: inherit;
    font: inherit;
  }
  .knopf {
    min-height: 2.75rem;
    padding: 0 1rem;
    border: 1px solid var(--akzent);
    border-radius: 0.6rem;
    background: var(--akzent);
    color: var(--grund);
    font: inherit;
    font-weight: 600;
  }
  .knopf.leise {
    border-color: var(--rand);
    background: var(--flaeche);
    color: inherit;
    font-weight: 400;
    font-size: 0.9rem;
  }
  .knopf.gefahr {
    border-color: var(--warn);
    background: var(--flaeche);
    color: var(--warn);
  }
  .liste {
    margin: 0.75rem 0 0;
    padding: 0;
    list-style: none;
  }
  .liste li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0;
    border-bottom: 1px solid var(--rand);
  }
  .liste a {
    flex: 1;
    color: var(--akzent);
    font-weight: 600;
  }
  .gruppe {
    margin-top: 0.9rem;
  }
  .schalter {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-height: 2.6rem;
  }
  .schalter input {
    width: 1.3rem;
    height: 1.3rem;
    accent-color: var(--akzent);
  }
  .pfeil {
    width: 2.75rem;
    height: 2.5rem;
    border: 1px solid var(--rand);
    border-radius: 0.5rem;
    background: var(--flaeche);
    color: inherit;
    font-size: 1.1rem;
  }
  .pfeil:disabled {
    opacity: 0.35;
  }
  a {
    color: var(--akzent);
  }
</style>
