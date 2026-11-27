<script lang="ts">
  import type { Art, Ergebnis, Feld, Liste, Mass, Rechner, Werte, Zeichnung } from '../calcs/types'
  import { EingabeFehler } from '../core/trig'
  import { t, tSkizze } from './sprache.svelte'
  import { aktivesProjekt, einheitVon, formatiere, JE_CM, leseZahl, schalteFavorit, sichere, zustand } from './zustand.svelte'

  let { rechner }: { rechner: Rechner } = $props()

  const vorgaben = (): Record<string, string> =>
    Object.fromEntries(rechner.felder.map((f) => [f.id, f.vorgabe === undefined ? '' : String(f.vorgabe).replace('.', zustand.sprache === 'de' ? ',' : '.')]))

  // Eingaben bleiben je Rechner erhalten, auch nach dem Schließen der App.
  // Die Komponente wird je Rechner neu erzeugt ({#key}), der Startwert reicht also.
  // svelte-ignore state_referenced_locally
  let roh = $state<Record<string, string>>({ ...vorgaben(), ...(aktivesProjekt().eingaben[rechner.id] ?? {}) })
  let kopiert = $state(false)

  const istText = (f: Feld): boolean => f.art === 'select' || f.art === 'liste'

  const werte = $derived<Werte>(Object.fromEntries(rechner.felder.map((f) => [f.id, istText(f) ? (roh[f.id] ?? '') : leseZahl(roh[f.id] ?? '')])))
  const sichtbar = $derived(rechner.felder.filter((f) => !f.wenn || f.wenn(werte)))
  const imFormular = $derived(sichtbar.filter((f) => !f.inSkizze))
  const ungueltig = (f: Feld): boolean => !istText(f) && (roh[f.id] ?? '').trim() !== '' && Number.isNaN(werte[f.id])

  type Stand = { ergebnis: Ergebnis } | { fehler: string } | { offen: true }

  const stand = $derived.by<Stand>(() => {
    if (sichtbar.some(ungueltig)) return { fehler: 'Bitte nur Zahlen eingeben.' }
    if (sichtbar.some((f) => !f.optional && (istText(f) ? String(werte[f.id]).trim() === '' : Number.isNaN(werte[f.id])))) return { offen: true }
    try {
      return { ergebnis: rechner.rechne(werte, { jeCm: JE_CM[zustand.einheit] }) }
    } catch (e) {
      if (e instanceof EingabeFehler) {
        // optionale Felder noch leer → als "noch nicht fertig" behandeln
        const leer = sichtbar.every((f) => istText(f) || !f.optional || Number.isNaN(werte[f.id]))
        return leer && sichtbar.some((f) => f.optional) ? { offen: true } : { fehler: e.message }
      }
      return { fehler: 'Mit diesen Werten ist keine Berechnung möglich.' }
    }
  })

  // Beim Verlassen der Seite feuert ein fokussiertes Feld noch ein „change“, während die Ansicht
  // schon abgebaut wird – dann ist `rechner` nicht mehr gesetzt. Deshalb die ID vorab festhalten.
  // svelte-ignore state_referenced_locally
  const rechnerId = rechner.id

  function merke() {
    aktivesProjekt().eingaben[rechnerId] = { ...roh }
    sichere()
  }

  /** Auswahl mit Vorbelegung (z. B. Ziegelmodell): trägt die hinterlegten Längen in der gewählten Einheit ein */
  function belege(f: Feld) {
    for (const [id, cm] of Object.entries(f.setzt?.[roh[f.id]] ?? {})) {
      const wert = String(Math.round(cm * JE_CM[zustand.einheit] * 1e4) / 1e4)
      roh[id] = zustand.sprache === 'de' ? wert.replace('.', ',') : wert
    }
  }
  /** Wird ein vorbelegter Wert von Hand geändert, gilt die Auswahl nicht mehr */
  function loese(id: string) {
    for (const f of rechner.felder) if (f.setzt && Object.values(f.setzt).some((s) => id in s) && roh[f.id] !== f.vorgabe) roh[f.id] = String(f.vorgabe ?? '')
  }

  function leere() {
    roh = vorgaben()
    merke()
  }

  const listen = (e: Ergebnis): Liste[] => [...(e.liste ? [e.liste] : []), ...(e.listen ?? [])]

  const text = (e: Ergebnis): string =>
    [
      t(rechner.titel),
      ...sichtbar.filter((f) => (roh[f.id] ?? '') !== '').map((f) => `${t(f.label)}: ${f.art === 'select' ? (f.roheOptionen && roh[f.id] !== f.vorgabe ? (f.optionen?.find((o) => o.wert === roh[f.id])?.label ?? '') : t(f.optionen?.find((o) => o.wert === roh[f.id])?.label ?? '')) : `${roh[f.id]} ${einheitVon(f.art, f.einheit)}`}`),
      '—',
      ...e.ausgaben.map((a) => `${t(a.label)}: ${formatiere(a.wert, a.art, a.stellen)} ${einheitVon(a.art, a.einheit)}`),
      ...listen(e).flatMap((l) => [t(l.titel), ...l.zeilen.map((z) => z.map((c, i) => zelle(c, l.arten[i])).join('\t'))]),
    ].join('\n')

  async function kopiere(e: Ergebnis) {
    try {
      await navigator.clipboard.writeText(text(e))
      kopiert = true
      setTimeout(() => (kopiert = false), 1500)
    } catch {
      // Zwischenablage gesperrt → nichts tun
    }
  }

  /** Tabellenzelle: feste Wörter übersetzen, alles andere formatieren */
  const zelle = (c: number | string | number[], art: Art): string => (art === 'wort' && typeof c === 'string' ? t(c) : formatiere(c, art))

  const massText = (m: Mass): string => (m.text ? t(m.text) : `${m.name ? `${t(m.name)} ` : ''}${m.vor ?? ''}${formatiere(m.wert, m.art)}${m.art === 'ang' ? '°' : ''}`)

  // Maß in der Zeichnung angetippt: Eingabefeld direkt unter dieser Zeichnung
  let offenesMass = $state<{ bild: number; feld: string } | null>(null)
  const feldVon = (id: string): Feld | undefined => sichtbar.find((f) => f.id === id && !istText(f))
  function tippe(bildNr: number, feld: string) {
    offenesMass = offenesMass?.bild === bildNr && offenesMass.feld === feld ? null : { bild: bildNr, feld }
    entwurf = roh[feld] ?? ''
  }
  // Der neue Wert gilt erst nach „Fertig“ – sonst rechnet die Zeichnung schon mit halb getippten Zahlen
  let entwurf = $state('')
  function uebernimm() {
    if (offenesMass) {
      roh[offenesMass.feld] = entwurf
      merke()
    }
    offenesMass = null
  }
  /** Eingabefeld beim Erscheinen fokussieren und markieren */
  function fokus(el: HTMLInputElement) {
    el.focus()
    el.select()
  }

  // Auswahl in der Skizze: Elemente mit data-feld/data-wert setzen das zugehörige Auswahlfeld
  let skizze = $state<SVGSVGElement | null>(null)
  const waehlbar = $derived(rechner.felder.some((f) => f.inSkizze))
  function waehle(e: Event) {
    const ziel = (e.target as Element).closest<SVGElement>('[data-feld]')
    if (!ziel || (e instanceof KeyboardEvent && e.key !== 'Enter' && e.key !== ' ')) return
    e.preventDefault()
    roh[ziel.dataset.feld as string] = ziel.dataset.wert as string
    merke()
  }
  $effect(() => {
    void zustand.sprache
    for (const el of skizze?.querySelectorAll<SVGElement>('[data-feld]') ?? []) {
      const gewaehlt = roh[el.dataset.feld as string] === el.dataset.wert
      el.classList.toggle('gewaehlt', gewaehlt)
      el.setAttribute('role', 'radio')
      el.setAttribute('aria-checked', String(gewaehlt))
      el.setAttribute('tabindex', '0')
    }
  })

  // Sprungleiste über der Programmleiste: direkt zu Eingabe, Zeichnung, jedem Detail, Maßen und Listen
  // „Detail Kerve Fußpfette“ → „Kerve Fußpfette“, „Detail 1: …“ → „Detail 1“
  const kurz = (titel: string): string => titel.split(/:| – | \(/)[0].replace(/^Detail (?=\D)/, '')
  const spruenge = $derived.by<{ k: string; n: string }[]>(() => {
    if (!('ergebnis' in stand)) return []
    const e = stand.ergebnis
    const l = listen(e)
    return [
      { k: 'eingabe', n: t('Eingabe') },
      ...(e.zeichnung ? [{ k: 'z0', n: t('Zeichnung') }] : []),
      ...(e.details ?? []).map((d, i) => ({ k: `z${i + 1}`, n: kurz(t(d.titel)) })),
      { k: 'masse', n: t('Maße') },
      ...l.map((_, i) => ({ k: `l${i}`, n: l.length > 1 ? `${t('Liste')} ${i + 1}` : t('Liste') })),
    ]
  })
  function springe(k: string) {
    document.querySelector(`[data-sprung="${k}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /** Enter springt ins nächste Eingabefeld; im letzten Feld schließt es die Tastatur */
  function weiter(e: KeyboardEvent) {
    const ziel = e.target as HTMLElement
    if (e.key !== 'Enter' || !(ziel instanceof HTMLInputElement)) return
    e.preventDefault()
    const felder = [...(e.currentTarget as HTMLFormElement).querySelectorAll<HTMLElement>('input, select, textarea')]
    const naechstes = felder[felder.indexOf(ziel) + 1]
    if (naechstes) naechstes.focus()
    else ziel.blur()
  }

  const fav = $derived(zustand.favoriten.includes(rechner.id))
</script>

{#snippet bild(z: Zeichnung, nr: number)}
  <svg class="zeichnung" viewBox={`0 0 ${z.breite} ${z.hoehe}`} role="img" aria-label={t('Maßstäbliche Zeichnung')}>
    {@html z.inhalt}
    {#each z.masse ?? [] as m, i (i)}
      {@const text = massText(m)}
      {#if m.hinterlegt}
        <rect class="grund" x={m.x - text.length * 2.8 - 3} y={m.y - 6.5} width={text.length * 5.6 + 6} height="13" rx="2" transform={m.drehung ? `rotate(${m.drehung} ${m.x} ${m.y})` : undefined} />
      {/if}
      {#if m.feld && feldVon(m.feld)}
        {@const f = m.feld}
        <text
          class="mass tippbar"
          class:klein={m.klein}
          class:gewaehlt={offenesMass?.bild === nr && offenesMass.feld === f}
          x={m.x}
          y={m.y}
          text-anchor={m.anker ?? 'middle'}
          dominant-baseline="middle"
          transform={m.drehung ? `rotate(${m.drehung} ${m.x} ${m.y})` : undefined}
          role="button"
          tabindex="0"
          aria-label={`${t(feldVon(f)?.label ?? '')}: ${text} – ${t('ändern')}`}
          onclick={() => tippe(nr, f)}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), tippe(nr, f))}>{text}</text
        >
      {:else}
        <text class="mass" class:klein={m.klein} x={m.x} y={m.y} text-anchor={m.anker ?? 'middle'} dominant-baseline="middle" transform={m.drehung ? `rotate(${m.drehung} ${m.x} ${m.y})` : undefined}
          >{text}</text
        >
      {/if}
    {/each}
  </svg>
  {#if offenesMass?.bild === nr && feldVon(offenesMass.feld)}
    {@const f = feldVon(offenesMass.feld) as Feld}
    <form class="massfeld" onsubmit={(e) => (e.preventDefault(), uebernimm())}>
      <label>
        <span class="name">{t(f.label)}</span>
        <span class="feld">
          <input type="text" inputmode={f.art === 'int' ? 'numeric' : 'decimal'} autocomplete="off" enterkeyhint="done" bind:value={entwurf} use:fokus />
          <span class="einheit">{einheitVon(f.art, f.einheit)}</span>
        </span>
      </label>
      <button type="button" class="neben" onclick={() => (offenesMass = null)}>{t('Abbrechen')}</button>
      <button type="submit">{t('Fertig')}</button>
    </form>
  {/if}
  {#if z.masse?.length}<p class="legende">{t('Maße in')} {z.einheit ?? zustand.einheit}{#if z.masse.some((m) => m.feld && feldVon(m.feld))}{' · '}{t('blaue Maße antippen zum Ändern')}{/if}</p>{/if}
{/snippet}

{#if rechner.skizze}
  {#if waehlbar}
    <!-- die Seiten selbst sind fokussierbar (tabindex im Effekt), die Gruppe nicht -->
    <!-- svelte-ignore a11y_interactive_supports_focus -->
    <svg bind:this={skizze} class="skizze waehlbar" viewBox="0 0 240 120" role="radiogroup" aria-label={t(rechner.felder.find((f) => f.inSkizze)?.label ?? '')} onclick={waehle} onkeydown={waehle}>{@html tSkizze(rechner.skizze)}</svg>
    <p class="legende">{t('Seite antippen, deren Maß bekannt ist')}</p>
  {:else}
    <svg class="skizze" viewBox="0 0 240 120" role="img" aria-label={`${t('Skizze')} ${t(rechner.titel)}`}>{@html tSkizze(rechner.skizze)}</svg>
  {/if}
{/if}

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<form data-sprung="eingabe" onsubmit={(e) => e.preventDefault()} oninput={merke} onchange={merke} onkeydown={weiter}>
  {#each imFormular as f (f.id)}
    <label class:falsch={ungueltig(f)} class:breit={f.art === 'liste'}>
      <span class="name">{t(f.label)}{#if f.optional}<em> · {t('freiwillig')}</em>{/if}</span>
      {#if f.art === 'select'}
        <select bind:value={roh[f.id]} onchange={() => belege(f)}>
          {#each f.optionen ?? [] as o (o.wert)}
            <option value={o.wert}>{f.roheOptionen && o.wert !== f.vorgabe ? o.label : t(o.label)}</option>
          {/each}
        </select>
      {:else if f.art === 'liste'}
        <textarea rows="5" autocomplete="off" spellcheck="false" bind:value={roh[f.id]}></textarea>
      {:else}
        <span class="feld">
          <input type="text" inputmode={f.art === 'int' ? 'numeric' : 'decimal'} autocomplete="off" enterkeyhint="next" bind:value={roh[f.id]} oninput={() => loese(f.id)} onfocus={(e) => e.currentTarget.select()} />
          <span class="einheit">{einheitVon(f.art, f.einheit)}</span>
        </span>
      {/if}
      {#if f.hinweis}<small>{t(f.hinweis)}</small>{/if}
    </label>
  {/each}
</form>

<div class="leiste nicht-drucken">
  <button onclick={leere}>{t('Leeren')}</button>
  <button onclick={() => schalteFavorit(rechner.id)} aria-pressed={fav}>{fav ? '★' : '☆'} {t('Favorit')}</button>
  {#if 'ergebnis' in stand}
    <button onclick={() => kopiere(stand.ergebnis)}>{kopiert ? t('Kopiert ✓') : t('Kopieren')}</button>
    <button onclick={() => print()}>{t('Drucken / PDF')}</button>
  {/if}
</div>

<section class="ergebnis" aria-live="polite">
  {#if 'fehler' in stand}
    <p class="fehler">{t(stand.fehler)}</p>
  {:else if 'offen' in stand}
    <p class="offen">{t('Werte eingeben – das Ergebnis erscheint sofort.')}</p>
  {:else}
    {#each stand.ergebnis.hinweise ?? [] as h (h)}
      <p class="fehler">{t(h)}</p>
    {/each}
    {#if stand.ergebnis.zeichnung}
      <div data-sprung="z0">{@render bild(stand.ergebnis.zeichnung, 0)}</div>
    {/if}
    {#each stand.ergebnis.details ?? [] as d, i (d.titel)}
      <h2 data-sprung={`z${i + 1}`}>{t(d.titel)}</h2>
      {@render bild(d.zeichnung, i + 1)}
    {/each}
    <dl data-sprung="masse">
      {#each stand.ergebnis.ausgaben as a (a.label + a.art)}
        <div class:wichtig={a.wichtig}>
          <dt>{t(a.label)}</dt>
          <dd>{formatiere(a.wert, a.art, a.stellen)}<span>{einheitVon(a.art, a.einheit)}</span></dd>
        </div>
      {/each}
    </dl>
    {#each listen(stand.ergebnis) as l, nr (l.titel)}
      <h2 data-sprung={`l${nr}`}>{t(l.titel)}</h2>
      <table>
        <thead>
          <tr>{#each l.kopf as k, i (k)}<th>{t(k)}{#if l.arten[i] === 'len'} ({zustand.einheit}){/if}</th>{/each}</tr>
        </thead>
        <tbody>
          {#each l.zeilen as z, n (n)}
            <tr>{#each z as c, i (i)}<td class:wort={l.arten[i] === 'wort'}>{zelle(c, l.arten[i])}</td>{/each}</tr>
          {/each}
        </tbody>
      </table>
    {/each}
  {/if}
</section>

{#if rechner.info}
  <p class="info">{t(rechner.info)}</p>
{/if}

{#if spruenge.length > 2}
  <div class="platz nicht-drucken"></div>
  <nav class="sprung nicht-drucken" aria-label={t('Springen zu')}>
    {#each spruenge as sp (sp.k)}
      <button type="button" onclick={() => springe(sp.k)}>{sp.n}</button>
    {/each}
  </nav>
{/if}

<style>
  /* Planzeichnung: immer schwarz auf weiß, auch im dunklen Farbschema */
  .zeichnung {
    display: block;
    width: 100%;
    max-width: 34rem;
    margin: 0.75rem auto 0.25rem;
    background: #fff;
    border: 1px solid var(--rand);
    border-radius: 3px;
  }
  .mass {
    fill: #000;
    font-size: 9.5px;
    font-weight: 400;
    font-variant-numeric: tabular-nums;
    /* weißer Rand, damit die Zahl frei steht */
    paint-order: stroke;
    stroke: #fff;
    stroke-width: 2.5px;
    stroke-linejoin: round;
  }
  .mass.klein {
    font-size: 8px;
    fill: #333;
  }
  .mass.tippbar {
    fill: #0b50c8;
    cursor: pointer;
    text-decoration: underline;
    text-decoration-thickness: 0.4px;
  }
  .mass.tippbar:focus-visible,
  .mass.gewaehlt {
    fill: #c2410c;
    outline: none;
    font-weight: 700;
  }
  .grund {
    fill: #fff;
    stroke: none;
  }
  .massfeld {
    display: flex;
    align-items: end;
    gap: 0.5rem;
    max-width: 34rem;
    margin: 0.25rem auto 0.5rem;
  }
  .massfeld label {
    flex: 1;
    min-width: 0;
  }
  .massfeld input {
    min-width: 0;
  }
  .massfeld button.neben {
    border-color: var(--rand);
    background: var(--flaeche);
    color: inherit;
    font-weight: 400;
  }
  .massfeld button {
    flex: none;
    min-height: 2.75rem;
    padding: 0 1rem;
    border: 1px solid var(--akzent);
    border-radius: 0.6rem;
    background: var(--akzent);
    color: #fff;
    font: inherit;
    font-weight: 600;
  }
  .legende {
    margin: 0 0 0.5rem;
    color: var(--leise);
    font-size: 0.8rem;
    text-align: center;
  }
  .skizze {
    display: block;
    width: 100%;
    max-width: 22rem;
    margin: 0 auto 0.75rem;
    color: var(--leise);
  }
  .skizze.waehlbar :global([data-feld]) {
    cursor: pointer;
    outline: none;
  }
  /* breitere Trefferfläche für den Finger */
  .skizze.waehlbar :global([data-feld] path) {
    pointer-events: stroke;
    stroke-width: 2;
  }
  .skizze.waehlbar :global([data-feld].gewaehlt) {
    color: var(--akzent);
    font-weight: 700;
  }
  .skizze.waehlbar :global([data-feld].gewaehlt path) {
    stroke-width: 4;
  }
  .skizze.waehlbar :global([data-feld]:focus-visible text) {
    text-decoration: underline;
  }
  /* obere Ebene der Menüleiste: Sprünge innerhalb des geöffneten Rechners */
  .sprung {
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(3.55rem + 1px + env(safe-area-inset-bottom));
    z-index: 6;
    display: flex;
    gap: 0.3rem;
    padding: 0.3rem 0.5rem;
    overflow-x: auto;
    scrollbar-width: none;
    border-top: 1px solid var(--rand);
    background: var(--flaeche);
  }
  .sprung button {
    flex: none;
    min-height: 2.25rem;
    padding: 0 0.7rem;
    border: 1px solid var(--rand);
    border-radius: 0.6rem;
    background: var(--grund);
    color: inherit;
    font: inherit;
    font-size: 0.85rem;
    white-space: nowrap;
  }
  .platz {
    height: 3rem;
  }
  :global([data-sprung]) {
    scroll-margin-top: 4.5rem;
  }
  form {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: 0.75rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .name {
    font-size: 0.9rem;
    font-weight: 600;
  }
  em {
    font-style: normal;
    font-weight: 400;
    color: var(--leise);
  }
  small {
    color: var(--leise);
    font-size: 0.8rem;
  }
  .feld {
    display: flex;
    align-items: center;
    border: 1px solid var(--rand);
    border-radius: 0.6rem;
    background: var(--flaeche);
  }
  .feld:focus-within,
  select:focus-visible {
    outline: 3px solid var(--akzent);
    outline-offset: 1px;
  }
  .falsch .feld {
    border-color: var(--warn);
  }
  input,
  select {
    flex: 1;
    min-width: 0;
    min-height: 3rem;
    padding: 0 0.8rem;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 1.15rem;
    font-variant-numeric: tabular-nums;
  }
  input:focus {
    outline: none;
  }
  textarea {
    min-height: 7rem;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--rand);
    border-radius: 0.6rem;
    background: var(--flaeche);
    color: inherit;
    font: inherit;
    font-size: 1.05rem;
    font-variant-numeric: tabular-nums;
  }
  textarea:focus-visible {
    outline: 3px solid var(--akzent);
    outline-offset: 1px;
  }
  .breit {
    grid-column: 1 / -1;
  }
  select {
    border: 1px solid var(--rand);
    border-radius: 0.6rem;
    background: var(--flaeche);
  }
  .einheit {
    padding-right: 0.8rem;
    color: var(--leise);
  }
  .leiste {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1rem 0;
  }
  .leiste button {
    min-height: 2.75rem;
    padding: 0 1rem;
    border: 1px solid var(--rand);
    border-radius: 0.6rem;
    background: var(--flaeche);
    color: inherit;
    font: inherit;
  }
  .ergebnis {
    padding: 0.25rem 1rem;
    border: 1px solid var(--rand);
    border-radius: 0.75rem;
    background: var(--flaeche);
  }
  dl {
    margin: 0;
  }
  dl div {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--rand);
  }
  dl div:last-child {
    border-bottom: 0;
  }
  dt {
    color: var(--leise);
  }
  dd {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    user-select: all;
  }
  dd span {
    margin-left: 0.25em;
    font-weight: 400;
    color: var(--leise);
    user-select: none;
  }
  .wichtig dt {
    color: inherit;
    font-weight: 600;
  }
  .wichtig dd {
    font-size: 1.5rem;
    color: var(--akzent);
  }
  .fehler,
  .offen {
    margin: 0.75rem 0;
  }
  .fehler {
    color: var(--warn);
    font-weight: 600;
  }
  .offen {
    color: var(--leise);
  }
  h2 {
    margin: 1rem 0 0.25rem;
    font-size: 1rem;
  }
  table {
    width: 100%;
    margin-bottom: 0.75rem;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }
  th,
  td {
    padding: 0.4rem 0.25rem;
    border-bottom: 1px solid var(--rand);
    text-align: right;
  }
  th:first-child,
  td:first-child {
    text-align: left;
    color: var(--leise);
  }
  td.wort {
    text-align: left;
    white-space: normal;
  }
  th {
    font-size: 0.85rem;
    color: var(--leise);
  }
  .info {
    color: var(--leise);
    font-size: 0.9rem;
  }
</style>
