<script lang="ts">
  import type { Art, Ergebnis, Feld, Liste, Mass, Rechner, Werte } from '../calcs/types'
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

  function leere() {
    roh = vorgaben()
    merke()
  }

  const listen = (e: Ergebnis): Liste[] => [...(e.liste ? [e.liste] : []), ...(e.listen ?? [])]

  const text = (e: Ergebnis): string =>
    [
      t(rechner.titel),
      ...sichtbar.filter((f) => (roh[f.id] ?? '') !== '').map((f) => `${t(f.label)}: ${f.art === 'select' ? t(f.optionen?.find((o) => o.wert === roh[f.id])?.label ?? '') : `${roh[f.id]} ${einheitVon(f.art, f.einheit)}`}`),
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

  const massText = (m: Mass): string => `${m.name ? `${t(m.name)} ` : ''}${m.vor ?? ''}${formatiere(m.wert, m.art)}${m.art === 'ang' ? '°' : ''}`

  const fav = $derived(zustand.favoriten.includes(rechner.id))
</script>

{#if rechner.skizze}
  <svg class="skizze" viewBox="0 0 240 120" role="img" aria-label={`${t('Skizze')} ${t(rechner.titel)}`}>{@html tSkizze(rechner.skizze)}</svg>
{/if}

<form onsubmit={(e) => e.preventDefault()} oninput={merke} onchange={merke}>
  {#each sichtbar as f (f.id)}
    <label class:falsch={ungueltig(f)} class:breit={f.art === 'liste'}>
      <span class="name">{t(f.label)}{#if f.optional}<em> · {t('freiwillig')}</em>{/if}</span>
      {#if f.art === 'select'}
        <select bind:value={roh[f.id]}>
          {#each f.optionen ?? [] as o (o.wert)}
            <option value={o.wert}>{t(o.label)}</option>
          {/each}
        </select>
      {:else if f.art === 'liste'}
        <textarea rows="5" autocomplete="off" spellcheck="false" bind:value={roh[f.id]}></textarea>
      {:else}
        <span class="feld">
          <input type="text" inputmode={f.art === 'int' ? 'numeric' : 'decimal'} autocomplete="off" enterkeyhint="next" bind:value={roh[f.id]} onfocus={(e) => e.currentTarget.select()} />
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
      {@const z = stand.ergebnis.zeichnung}
      <svg class="zeichnung" viewBox={`0 0 ${z.breite} ${z.hoehe}`} role="img" aria-label={t('Maßstäbliche Zeichnung')}>
        {@html z.inhalt}
        {#each z.masse ?? [] as m, i (i)}
          {@const text = massText(m)}
          {#if m.hinterlegt}
            <rect class="grund" x={m.x - text.length * 2.8 - 3} y={m.y - 6.5} width={text.length * 5.6 + 6} height="13" rx="2" transform={m.drehung ? `rotate(${m.drehung} ${m.x} ${m.y})` : undefined} />
          {/if}
          <text class="mass" class:klein={m.klein} x={m.x} y={m.y} text-anchor={m.anker ?? 'middle'} dominant-baseline="middle" transform={m.drehung ? `rotate(${m.drehung} ${m.x} ${m.y})` : undefined}
            >{text}</text
          >
        {/each}
      </svg>
      {#if z.masse?.length}<p class="legende">{t('Maße in')} {zustand.einheit}</p>{/if}
    {/if}
    <dl>
      {#each stand.ergebnis.ausgaben as a (a.label + a.art)}
        <div class:wichtig={a.wichtig}>
          <dt>{t(a.label)}</dt>
          <dd>{formatiere(a.wert, a.art, a.stellen)}<span>{einheitVon(a.art, a.einheit)}</span></dd>
        </div>
      {/each}
    </dl>
    {#each listen(stand.ergebnis) as l (l.titel)}
      <h2>{t(l.titel)}</h2>
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

<style>
  .zeichnung {
    display: block;
    width: 100%;
    max-width: 34rem;
    margin: 0.75rem auto 0.25rem;
    color: var(--akzent);
  }
  .mass {
    fill: var(--text);
    font-size: 10.5px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    /* heller Rand, damit die Zahl auch über Linien lesbar bleibt */
    paint-order: stroke;
    stroke: var(--flaeche);
    stroke-width: 3px;
    stroke-linejoin: round;
  }
  .mass.klein {
    font-size: 8.5px;
    fill: var(--leise);
  }
  .grund {
    fill: var(--flaeche);
    stroke: none;
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
