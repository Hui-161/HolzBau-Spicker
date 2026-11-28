<script lang="ts">
  import { tick, untrack } from 'svelte'
  import { flip } from 'svelte/animate'
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
      const liste = zustand.zuletzt
      if (zustand.leisteEigen) {
        // eigene Reihenfolge: was schon in der Leiste steht, bleibt an seinem Platz; Neues kommt
        // auf den letzten Platz rechts (bei voller Leiste ersetzt es den bisherigen letzten)
        if (liste.includes(id)) return
        zustand.zuletzt = [...(liste.length >= 12 ? liste.slice(0, 11) : liste), id]
      } else {
        if (liste[0] === id) return
        zustand.zuletzt = [id, ...liste.filter((x) => x !== id)].slice(0, 12)
      }
      sichere()
    })
  })


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
  /*
   * Lösen wie auf dem Startbildschirm des Telefons: gedrückt halten hebt die Funktion aus der Leiste,
   * sie folgt dem Finger; über dem Feld „Entfernen“ loslassen entfernt sie, anderswo springt sie zurück.
   * Am Rechner: Maustaste gedrückt halten und ziehen, oder Rechtsklick und dann „Entfernen“ anklicken.
   */
  interface Zug {
    id: string
    name: string
    /** Zeigerposition */
    x: number
    y: number
    /** Abstand des Zeigers zur linken oberen Ecke des Knopfs und dessen Größe */
    dx: number
    dy: number
    breite: number
    /** per Rechtsklick gehoben: kein Ziehen, „Entfernen“ wird angeklickt */
    klick: boolean
    /** Vorschau der Reihenfolge, während die Funktion über der Leiste gezogen wird */
    reihe: string[]
  }
  let zug = $state<Zug | null>(null)
  let ueberAblage = $state(false)
  let ablage = $state<HTMLElement>()
  /** Menüleiste: zuletzt benutzte Funktionen (bzw. eigene Reihenfolge); beim Ziehen die Vorschau der neuen Reihenfolge */
  const schnell = $derived((zug?.reihe ?? zustand.zuletzt).map(rechnerNachId).filter((r) => !!r))
  let leiste = $state<HTMLElement>()
  let druckUhr: ReturnType<typeof setTimeout> | undefined
  let druck: { x: number; y: number; art: string } = { x: 0, y: 0, art: '' }
  let gehobenGerade = false

  function hebe(id: string, el: HTMLElement, x: number, y: number, klick: boolean) {
    const r = rechnerNachId(id)
    if (!r) return
    const rechteck = el.getBoundingClientRect()
    zug = { id, name: titelVon(r), x, y, dx: x - rechteck.left, dy: y - rechteck.top, breite: rechteck.width, klick, reihe: [...zustand.zuletzt] }
    if (!klick) rolle()
    ueberAblage = false
    gehobenGerade = true
    navigator.vibrate?.(25)
  }
  function druckBeginn(e: PointerEvent, id: string) {
    gehobenGerade = false
    if (e.button !== 0) return
    druck = { x: e.clientX, y: e.clientY, art: e.pointerType }
    const el = e.currentTarget as HTMLElement
    clearTimeout(druckUhr)
    druckUhr = setTimeout(() => hebe(id, el, druck.x, druck.y, false), 450)
  }
  function druckBewegt(e: PointerEvent) {
    if (zug) return
    // wer die Leiste wischt, will nicht lösen
    if (Math.hypot(e.clientX - druck.x, e.clientY - druck.y) > 10) clearTimeout(druckUhr)
  }
  const druckEnde = (): void => clearTimeout(druckUhr)

  const istUeberAblage = (x: number, y: number): boolean => {
    const r = ablage?.getBoundingClientRect()
    // großzügig: auch knapp neben dem Feld zählt
    return !!r && x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 24 && y <= r.bottom + 12
  }
  /** Zeiger auf Höhe der Leiste (etwas darüber zählt mit) */
  const inLeiste = (y: number): boolean => !!leiste && y >= leiste.getBoundingClientRect().top - 28
  const gleich = (a: string[], b: string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i])

  /** Neue Stelle in der Leiste: so viele andere Funktionen, wie links vom Zeiger ihre Mitte haben */
  function sortiere(x: number) {
    if (!zug || !leiste) return
    const andere = [...leiste.querySelectorAll<HTMLElement>('a[data-id]')].filter((a) => a.dataset.id !== zug?.id)
    const stelle = andere.filter((a) => {
      const r = a.getBoundingClientRect()
      return r.left + r.width / 2 < x
    }).length
    const ids = andere.map((a) => a.dataset.id as string)
    const neu = [...ids.slice(0, stelle), zug.id, ...ids.slice(stelle)]
    if (!gleich(neu, zug.reihe)) zug.reihe = neu
  }
  function zeigerBewegt(e: PointerEvent) {
    if (!zug || zug.klick) return
    zug.x = e.clientX
    zug.y = e.clientY
    const vorher = ueberAblage
    ueberAblage = istUeberAblage(e.clientX, e.clientY)
    if (ueberAblage && !vorher) navigator.vibrate?.(10)
    if (!ueberAblage && inLeiste(e.clientY)) sortiere(e.clientX)
    // weder Leiste noch „Entfernen“: Vorschau zurück auf die alte Reihenfolge
    else if (!gleich(zug.reihe, zustand.zuletzt)) zug.reihe = [...zustand.zuletzt]
  }
  /** am Rand der Leiste mitrollen, damit man auch zu verdeckten Plätzen ziehen kann */
  function rolle() {
    const schritt = () => {
      if (!zug || zug.klick || !leiste) return
      const r = leiste.getBoundingClientRect()
      if (inLeiste(zug.y) && !ueberAblage) {
        const um = zug.x < r.left + 36 ? -8 : zug.x > r.right - 36 ? 8 : 0
        if (um) {
          leiste.scrollLeft += um
          sortiere(zug.x)
        }
      }
      requestAnimationFrame(schritt)
    }
    requestAnimationFrame(schritt)
  }
  function zeigerLos(e: PointerEvent) {
    clearTimeout(druckUhr)
    if (!zug || zug.klick) return
    if (ueberAblage) loese(zug.id)
    else if (inLeiste(e.clientY) && !gleich(zug.reihe, zustand.zuletzt)) {
      // einmal selbst sortiert: ab jetzt gilt die eigene Reihenfolge
      zustand.zuletzt = zug.reihe
      zustand.leisteEigen = true
      sichere()
    }
    zug = null
    ueberAblage = false
  }
  function zeigerAbbruch() {
    clearTimeout(druckUhr)
    if (zug && !zug.klick) zug = null
  }
  function zeigerUnten(e: PointerEvent) {
    // per Rechtsklick gehoben: ein Klick daneben bricht ab
    if (zug?.klick && !ablage?.contains(e.target as Node)) zug = null
  }
  function kontext(e: MouseEvent, id: string) {
    // kein Link-Menü des Browsers; ist die Funktion schon gehoben (Finger), bleibt es dabei
    e.preventDefault()
    if (zug) return
    clearTimeout(druckUhr)
    const el = e.currentTarget as HTMLElement
    const r = el.getBoundingClientRect()
    // Android meldet langes Drücken teils als Kontextmenü, bevor der eigene Zeitgeber abläuft
    hebe(id, el, druck.art === 'touch' ? druck.x : r.left + r.width / 2, druck.art === 'touch' ? druck.y : r.top + r.height / 2, druck.art !== 'touch')
  }
  function tipp(e: MouseEvent) {
    // nach dem Heben nicht auch noch öffnen
    if (gehobenGerade || zug) e.preventDefault()
    gehobenGerade = false
  }
  function ablageGeklickt() {
    if (zug) loese(zug.id)
    zug = null
  }
  // während des Ziehens darf die Seite nicht mitscrollen (passive: false, sonst wirkt preventDefault nicht)
  $effect(() => {
    const halt = (e: TouchEvent): void => {
      if (zug && !zug.klick) e.preventDefault()
    }
    window.addEventListener('touchmove', halt, { passive: false })
    return () => window.removeEventListener('touchmove', halt)
  })

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

<svelte:window
  onhashchange={wechsle}
  onpointermove={zeigerBewegt}
  onpointerup={zeigerLos}
  onpointercancel={zeigerAbbruch}
  onpointerdown={zeigerUnten}
  onkeydown={(e) => e.key === 'Escape' && (zug = null)}
/>

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
  <div class="schnell" bind:this={leiste}>
    {#each schnell as r (r.id)}
      <a
        class:an={aktiv?.id === r.id}
        class:gehoben={zug?.id === r.id}
        data-id={r.id}
        animate:flip={{ duration: 160 }}
        draggable="false"
        href={`#/${r.id}`}
        aria-current={aktiv?.id === r.id ? 'page' : undefined}
        title={t('Gedrückt halten und ziehen: umsortieren oder auf „Entfernen“; am Rechner auch Rechtsklick')}
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

{#if zug}
  <button
    class="ablage nicht-drucken"
    class:drueber={ueberAblage}
    bind:this={ablage}
    onclick={ablageGeklickt}
    aria-label={`${zug.name}: ${t('aus der Leiste entfernen')}`}
  >
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"
      ><path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Zm4 2v8h1.5v-8H10Zm3.5 0v8H15v-8h-1.5Z" /></svg
    >
    <span>
      <strong>{t('Entfernen')}</strong>
      <small>{zug.klick ? t('Zum Entfernen hier tippen – daneben tippen bricht ab') : t('Hierher ziehen und loslassen – in der Leiste umsortieren')}</small>
    </span>
  </button>
  <div class="schwebend nicht-drucken" class:klick={zug.klick} style:left={`${zug.x - zug.dx}px`} style:top={`${zug.y - zug.dy}px`} style:min-width={`${zug.breite}px`} aria-hidden="true">
    {zug.name}
  </div>
{/if}

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
  /* Feld „Entfernen“ direkt über der Leiste */
  .ablage {
    position: fixed;
    left: 0.5rem;
    right: 0.5rem;
    bottom: calc(3.9rem + env(safe-area-inset-bottom));
    z-index: 8;
    display: flex;
    align-items: center;
    /* Text links, damit die gezogene Funktion ihn nicht verdeckt */
    justify-content: flex-start;
    gap: 0.75rem;
    min-height: 4.2rem;
    padding: 0 1.25rem;
    border: 2px dashed var(--warn);
    border-radius: 0.9rem;
    background: color-mix(in srgb, var(--flaeche) 92%, var(--warn));
    color: var(--warn);
    font: inherit;
    text-align: left;
    animation: einblenden 0.16s ease-out;
    transition:
      transform 0.12s,
      background 0.12s;
  }
  .ablage span {
    display: flex;
    flex-direction: column;
  }
  .ablage small {
    font-size: 0.8rem;
  }
  .ablage.drueber {
    border-style: solid;
    background: var(--warn);
    color: var(--flaeche);
    transform: scale(1.04);
  }
  @keyframes einblenden {
    from {
      opacity: 0;
      transform: translateY(1rem);
    }
  }
  /* die gehobene Funktion folgt dem Finger */
  .schwebend {
    position: fixed;
    z-index: 9;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 2.75rem;
    padding: 0 0.8rem;
    border: 1px solid var(--akzent);
    border-radius: 0.6rem;
    background: var(--flaeche);
    color: var(--text);
    font-size: 0.9rem;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 0.6rem 1.4rem rgb(0 0 0 / 0.3);
    transform: scale(1.1) rotate(-2deg);
    animation: heben 0.18s ease-out;
  }
  .schwebend.klick {
    animation:
      heben 0.18s ease-out,
      wackeln 0.5s ease-in-out 0.18s infinite;
  }
  @keyframes heben {
    from {
      transform: scale(1);
      box-shadow: none;
    }
  }
  @keyframes wackeln {
    50% {
      transform: scale(1.1) rotate(2deg);
    }
  }
  .menue a.gehoben {
    opacity: 0.25;
    border-style: dashed;
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
