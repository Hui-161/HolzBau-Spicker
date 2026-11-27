<script lang="ts">
  import { RECHNER, rechnerNachId } from './calcs'
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

  // geöffnete Funktion merken: sie erscheint in der Menüleiste
  $effect(() => {
    const id = aktiv?.id
    // Neue Funktionen hinten anfügen und die Reihenfolge sonst nicht ändern: die Knöpfe der
    // Menüleiste sollen an ihrem Platz bleiben, damit man blind hin- und herspringen kann
    if (id && !zustand.zuletzt.includes(id)) {
      zustand.zuletzt = [...zustand.zuletzt, id].slice(-8)
      sichere()
    }
  })

  /** Schnellzugriff: erst die Favoriten, dann die zuletzt benutzten Funktionen */
  const schnell = $derived(
    [...new Set([...zustand.favoriten, ...zustand.zuletzt])]
      .map((id) => RECHNER.find((r) => r.id === id))
      .filter((r) => !!r)
      .slice(0, 10)
  )

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

<nav class="menue nicht-drucken" aria-label={t('Schnellzugriff')}>
  <a class="fest" class:an={!titel} href="#/" aria-current={!titel ? 'page' : undefined}>{t('Start')}</a>
  <div class="schnell">
    {#each schnell as r (r.id)}
      <a class:an={aktiv?.id === r.id} href={`#/${r.id}`} aria-current={aktiv?.id === r.id ? 'page' : undefined}>{t(r.titel)}</a>
    {:else}
      <span>{t('Favoriten und zuletzt benutzte Funktionen erscheinen hier.')}</span>
    {/each}
  </div>
  <a class="fest" class:an={projektSeite} href="#/projekte" aria-current={projektSeite ? 'page' : undefined}>{t('Projekt')}</a>
</nav>

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
