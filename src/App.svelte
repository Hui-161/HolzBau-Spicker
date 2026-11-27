<script lang="ts">
  import { rechnerNachId } from './calcs'
  import { VORLAGEN } from './core/dokumente'
  import Dokument from './lib/Dokument.svelte'
  import Info from './lib/Info.svelte'
  import Neigungsmesser from './lib/Neigungsmesser.svelte'
  import Projekte from './lib/Projekte.svelte'
  import Rechner from './lib/Rechner.svelte'
  import Start from './lib/Start.svelte'
  import { t } from './lib/sprache.svelte'
  import { aktivesProjekt, sichere, zustand, type Einheit } from './lib/zustand.svelte'

  const ausHash = (): string => decodeURIComponent(location.hash.replace(/^#\/?/, ''))
  let route = $state(ausHash())
  const aktiv = $derived(rechnerNachId(route))
  const projektSeite = $derived(route === 'projekte' || route.startsWith('import/'))
  const titel = $derived(aktiv?.titel ?? (projektSeite ? 'Projekte & Notizen' : route === 'info' ? 'Info & Datenschutz' : ''))

  $effect(() => {
    document.title = titel ? `${t(titel)} – ${t('Holzbau-Spicker')}` : t('Holzbau-Spicker')
    document.documentElement.lang = zustand.sprache
  })

  function setzeEinheit(e: Einheit) {
    zustand.einheit = e
    sichere()
  }
</script>

<svelte:window
  onhashchange={() => {
    route = ausHash()
    scrollTo(0, 0)
  }}
/>

<header>
  {#if titel}
    <a class="zurueck nicht-drucken" href="#/" aria-label={t('Zurück zur Übersicht')}>‹</a>
    <h1>{t(titel)}</h1>
  {:else}
    <h1>{t('Holzbau-Spicker')}</h1>
  {/if}
  <div class="einheit nicht-drucken" role="group" aria-label={t('Längeneinheit')}>
    {#each ['mm', 'cm', 'm'] as const as e (e)}
      <button class:an={zustand.einheit === e} aria-pressed={zustand.einheit === e} onclick={() => setzeEinheit(e)}>{e}</button>
    {/each}
  </div>
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
  {:else if projektSeite}
    {#key route}
      <Projekte importText={route.startsWith('import/') ? route.slice(7) : ''} />
    {/key}
  {:else}
    <Start />
  {/if}
</main>

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
  .einheit {
    display: flex;
    border: 1px solid color-mix(in srgb, var(--kopf-text) 45%, transparent);
    border-radius: 0.5rem;
    overflow: hidden;
  }
  .einheit button {
    min-width: 2.75rem;
    min-height: 2.5rem;
    padding: 0 0.5rem;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-weight: 600;
  }
  .einheit button.an {
    background: var(--kopf-text);
    color: var(--kopf);
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
  footer a {
    display: inline-block;
    padding: 0.6rem 0.5rem;
    color: var(--akzent);
  }
  footer {
    max-width: 44rem;
    margin: 0 auto;
    padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom));
    color: var(--leise);
    font-size: 0.8rem;
    text-align: center;
  }
</style>
