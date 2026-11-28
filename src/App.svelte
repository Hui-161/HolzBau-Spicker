<script lang="ts">
  import { tick, untrack } from 'svelte'
  import { rechnerNachId } from './calcs'
  import { VORLAGEN } from './core/dokumente'
  import Assistent from './lib/Assistent.svelte'
  import Dokument from './lib/Dokument.svelte'
  import Einstellungen from './lib/Einstellungen.svelte'
  import Info from './lib/Info.svelte'
  import Installhinweis from './lib/Installhinweis.svelte'
  import Neigungsmesser from './lib/Neigungsmesser.svelte'
  import Projekte from './lib/Projekte.svelte'
  import Rechner from './lib/Rechner.svelte'
  import Start from './lib/Start.svelte'
  import { t, titelVon } from './lib/sprache.svelte'
  import { aktivesProjekt, sichere, zustand } from './lib/zustand.svelte'

  const ausHash = (): string => decodeURIComponent(location.hash.replace(/^#\/?/, ''))
  let route = $state(ausHash())
  const aktiv = $derived(rechnerNachId(route))
  const projektSeite = $derived(route === 'projekte' || route.startsWith('import/'))
  const seite = $derived(projektSeite ? 'Projekte & Notizen' : route === 'info' ? 'Info & Datenschutz' : route === 'ki' ? 'KI-Assistent' : route === 'einstellungen' ? 'Einstellungen' : '')
  const titel = $derived(aktiv ? titelVon(aktiv) : seite && t(seite))

  $effect(() => {
    document.title = titel ? `${titel} – ${t('Holzbau-Spicker')}` : t('Holzbau-Spicker')
    document.documentElement.lang = zustand.sprache
  })

  // Darstellung hell/dunkel; „wie das Gerät“ überlässt es dem Farbschema des Systems
  $effect(() => {
    const html = document.documentElement
    if (zustand.thema === 'auto') delete html.dataset.thema
    else html.dataset.thema = zustand.thema
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(html).getPropertyValue('--kopf').trim() || '#2f5d3a')
  })

  // geöffnete Funktion merken: sie rückt in der Menüleiste ganz nach links
  $effect(() => {
    const id = aktiv?.id
    if (!id) return
    untrack(() => {
      if (zustand.zuletzt[0] === id) return
      zustand.zuletzt = [id, ...zustand.zuletzt.filter((x) => x !== id)].slice(0, 12)
      sichere()
    })
  })

  /** Menüleiste: zuletzt benutzte Funktionen, die zuletzt benutzte links */
  const schnell = $derived(zustand.zuletzt.map(rechnerNachId).filter((r) => !!r))

  /* Lange drücken (Finger) oder Rechtsklick löst eine Funktion aus der Leiste – mit „Rückgängig“ */
  let geloest = $state<{ name: string; vorher: string[] } | null>(null)
  let geloestUhr: ReturnType<typeof setTimeout> | undefined
  function loese(id: string) {
    const r = rechnerNachId(id)
    if (!r || !zustand.zuletzt.includes(id)) return
    geloest = { name: titelVon(r), vorher: [...zustand.zuletzt] }
    zustand.zuletzt = zustand.zuletzt.filter((x) => x !== id)
    sichere()
    clearTimeout(geloestUhr)
    geloestUhr = setTimeout(() => (geloest = null), 5000)
  }
  function rueckgaengig() {
    if (!geloest) return
    zustand.zuletzt = geloest.vorher
    sichere()
    geloest = null
  }
  // eigener Zeitgeber für Touch: Safari auf dem iPhone meldet langes Drücken nicht als Kontextmenü
  let druckUhr: ReturnType<typeof setTimeout> | undefined
  let druckStart: [number, number] = [0, 0]
  let langGedrueckt = false
  function druckBeginn(e: PointerEvent, id: string) {
    langGedrueckt = false
    if (e.pointerType !== 'touch') return
    druckStart = [e.clientX, e.clientY]
    clearTimeout(druckUhr)
    druckUhr = setTimeout(() => {
      langGedrueckt = true
      navigator.vibrate?.(20)
      loese(id)
    }, 550)
  }
  function druckBewegt(e: PointerEvent) {
    // wer die Leiste wischt, will nicht lösen
    if (Math.hypot(e.clientX - druckStart[0], e.clientY - druckStart[1]) > 10) clearTimeout(druckUhr)
  }
  const druckEnde = (): void => clearTimeout(druckUhr)
  function kontext(e: MouseEvent, id: string) {
    e.preventDefault()
    clearTimeout(druckUhr)
    if (!langGedrueckt) loese(id)
    langGedrueckt = true
  }
  function tipp(e: MouseEvent) {
    // nach dem langen Drücken nicht auch noch öffnen
    if (langGedrueckt) e.preventDefault()
    langGedrueckt = false
  }

  // Beim Zurückkehren zur Übersicht wieder dort stehen, wo man sie verlassen hat;
  // jede Funktion beginnt dagegen oben.
  let startScroll = 0
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  async function wechsle() {
    if (route === '') startScroll = scrollY
    route = ausHash()
    await tick()
    scrollTo(0, route === '' ? startScroll : 0)
  }
</script>

<svelte:window onhashchange={wechsle} />

<Installhinweis />

<header>
  {#if titel}
    <a class="zurueck nicht-drucken" href="#/" aria-label={t('Zurück zur Übersicht')}>‹</a>
    <h1>{titel}</h1>
  {:else}
    <h1>{t('Holzbau-Spicker')}</h1>
  {/if}
  <a class="einstellungen nicht-drucken" class:an={route === 'einstellungen'} href="#/einstellungen" aria-label={t('Einstellungen')} title={t('Einstellungen')}>
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"
      ><path
        fill="currentColor"
        d="M19.14 12.94a7.07 7.07 0 0 0 .06-.94 7.07 7.07 0 0 0-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58a7.4 7.4 0 0 0 0 1.88l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54a7.03 7.03 0 0 0 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58ZM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2Z"
      /></svg
    >
  </a>
</header>

<main>
  {#if aktiv}
    <a class="projekt" href="#/projekte">{t('Projekt')}: <strong>{aktivesProjekt().name}</strong></a>
    {#if aktiv.eigen === 'neigungsmesser'}
      <Neigungsmesser />
    {:else if aktiv.eigen === 'dokument' && VORLAGEN[aktiv.id]}
      {#key aktiv.id + zustand.aktiv}
        <Dokument vorlage={VORLAGEN[aktiv.id]} />
      {/key}
    {:else}
      {#key aktiv.id + zustand.aktiv}
        <Rechner rechner={aktiv} />
      {/key}
    {/if}
  {:else if route === 'info'}
    <Info />
  {:else if route === 'ki'}
    <Assistent />
  {:else if route === 'einstellungen'}
    <Einstellungen />
  {:else if projektSeite}
    {#key route}
      <Projekte importText={route.startsWith('import/') ? route.slice(7) : ''} />
    {/key}
  {:else}
    <Start />
  {/if}
</main>

<nav class="menue nicht-drucken" aria-label={t('Schnellzugriff')}>
  <a class="fest" class:an={!titel} href="#/" aria-current={!titel ? 'page' : undefined}>{t('Start')}</a>
  <div class="schnell">
    {#each schnell as r (r.id)}
      <a
        class:an={aktiv?.id === r.id}
        href={`#/${r.id}`}
        aria-current={aktiv?.id === r.id ? 'page' : undefined}
        title={t('Lange drücken oder Rechtsklick: aus der Leiste lösen')}
        oncontextmenu={(e) => kontext(e, r.id)}
        onpointerdown={(e) => druckBeginn(e, r.id)}
        onpointermove={druckBewegt}
        onpointerup={druckEnde}
        onpointercancel={druckEnde}
        onclick={tipp}>{titelVon(r)}</a
      >
    {:else}
      <span>{t('Zuletzt benutzte Funktionen erscheinen hier.')}</span>
    {/each}
  </div>
  <a class="fest" class:an={projektSeite} href="#/projekte" aria-current={projektSeite ? 'page' : undefined}>{t('Projekt')}</a>
</nav>

{#if geloest}
  <div class="geloest nicht-drucken" role="status">
    <span>„{geloest.name}“ {t('aus der Leiste gelöst')}</span>
    <button onclick={rueckgaengig}>{t('Rückgängig')}</button>
  </div>
{/if}

<footer>
  {t('Ergebnisse ohne Gewähr – vor dem Zuschnitt nachmessen. Kein Ersatz für Statik und Fachplanung. Alle Eingaben bleiben auf diesem Gerät.')}
  <a class="nicht-drucken" href="#/info">{t('Info & Datenschutz')}</a>
</footer>

<style>
  header {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: calc(0.5rem + env(safe-area-inset-top)) 1rem 0.5rem;
    background: var(--kopf);
    color: var(--kopf-text);
  }
  h1 {
    flex: 1;
    margin: 0;
    font-size: 1.15rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .zurueck {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    margin-left: -0.6rem;
    color: inherit;
    font-size: 2rem;
    line-height: 1;
    text-decoration: none;
    border-radius: 0.5rem;
  }
  .einstellungen {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    margin-right: -0.5rem;
    border-radius: 0.5rem;
    color: inherit;
  }
  .einstellungen.an {
    background: color-mix(in srgb, var(--kopf-text) 18%, transparent);
  }
  .geloest {
    position: fixed;
    left: 0.75rem;
    right: 0.75rem;
    bottom: calc(4.3rem + env(safe-area-inset-bottom));
    z-index: 7;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    max-width: 30rem;
    margin: 0 auto;
    padding: 0.4rem 0.4rem 0.4rem 0.9rem;
    border-radius: 0.6rem;
    background: var(--text);
    color: var(--grund);
    font-size: 0.9rem;
  }
  .geloest span {
    flex: 1;
  }
  .geloest button {
    min-height: 2.5rem;
    padding: 0 0.8rem;
    border: 0;
    border-radius: 0.5rem;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: 700;
    text-decoration: underline;
  }
  .projekt {
    display: inline-block;
    margin-bottom: 0.75rem;
    padding: 0.25rem 0;
    color: var(--leise);
    font-size: 0.9rem;
  }
  main {
    width: 100%;
    max-width: 44rem;
    margin: 0 auto;
    padding: 1rem;
    flex: 1;
  }
  .menue {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 6;
    display: flex;
    align-items: stretch;
    gap: 0.35rem;
    padding: 0.4rem 0.5rem calc(0.4rem + env(safe-area-inset-bottom));
    border-top: 1px solid var(--rand);
    background: var(--flaeche);
  }
  .menue a {
    display: flex;
    align-items: center;
    min-height: 2.75rem;
    padding: 0 0.8rem;
    border: 1px solid var(--rand);
    border-radius: 0.6rem;
    color: inherit;
    font-size: 0.9rem;
    text-decoration: none;
    white-space: nowrap;
    /* langes Drücken löst aus der Leiste: kein Link-Menü und keine Textauswahl */
    -webkit-touch-callout: none;
    user-select: none;
  }
  .menue .fest {
    font-weight: 600;
  }
  .menue a.an {
    border-color: var(--akzent);
    background: var(--akzent);
    color: var(--grund);
  }
  .schnell {
    flex: 1;
    display: flex;
    gap: 0.35rem;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .schnell span {
    align-self: center;
    padding: 0 0.4rem;
    color: var(--leise);
    font-size: 0.8rem;
  }
  footer a {
    display: inline-block;
    padding: 0.6rem 0.5rem;
    color: var(--akzent);
  }
  footer {
    max-width: 44rem;
    margin: 0 auto;
    /* Platz für die Menüleiste am unteren Rand */
    padding: 1rem 1rem calc(5rem + env(safe-area-inset-bottom));
    color: var(--leise);
    font-size: 0.8rem;
    text-align: center;
  }
</style>
