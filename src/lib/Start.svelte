<script lang="ts">
  import { GRUPPEN, RECHNER } from '../calcs'
  import { STICHWORTE } from '../calcs/stichworte'
  import { suche as finde, type Suchbar } from '../core/suche'
  import { EN } from './en'
  import type { Rechner } from '../calcs/types'
  import { t } from './sprache.svelte'
  import { aktivesProjekt, schalteFavorit, sichere, zustand } from './zustand.svelte'

  let suche = $state('')

  // Durchsucht werden beide Sprachen und die Schlagworte, egal welche Sprache gerade angezeigt wird
  const suchbar: Suchbar[] = RECHNER.map((r) => ({
    id: r.id,
    titel: [r.titel, EN[r.titel] ?? ''],
    text: [r.kurz, r.gruppe, EN[r.kurz] ?? '', EN[r.gruppe] ?? ''],
    stichworte: STICHWORTE[r.id] ?? [],
  }))
  const sucht = $derived(suche.trim() !== '')
  const treffer = $derived(finde(suche, suchbar))
  /** Schlagwort, über das eine Funktion gefunden wurde */
  const ueber = $derived(new Map(treffer.map((x) => [x.id, x.ueber])))
  const gefunden = $derived(treffer.map((x) => RECHNER.find((r) => r.id === x.id)).filter((r): r is Rechner => !!r))
  const abschnitte = $derived(
    (sucht
      ? // bei einer Suche: eine Liste, beste Treffer zuerst
        [{ titel: 'Treffer', liste: gefunden }]
      : [{ titel: 'Meine Favoriten', liste: RECHNER.filter((r) => zustand.favoriten.includes(r.id)) }, ...GRUPPEN.map((g) => ({ titel: g, liste: RECHNER.filter((r) => r.gruppe === g) }))]
    ).filter((a) => a.liste.length > 0)
  )
</script>

{#snippet kachel(r: Rechner)}
  {@const fav = zustand.favoriten.includes(r.id)}
  <li>
    <a href={`#/${r.id}`}>
      <strong>{t(r.titel)}</strong>
      <span>{t(r.kurz)}</span>
      {#if sucht && ueber.get(r.id)}<span class="ueber">{t('gefunden über')}: {ueber.get(r.id)}</span>{/if}
    </a>
    <button class:fav aria-pressed={fav} aria-label={`${t(r.titel)}: ${fav ? t('aus Favoriten entfernen') : t('als Favorit merken')}`} onclick={() => schalteFavorit(r.id)}>
      {fav ? '★' : '☆'}
    </button>
  </li>
{/snippet}

<a class="projekt" href="#/projekte">
  <span>{t('Projekt')}</span>
  <strong>{aktivesProjekt().name}</strong>
  <span class="mehr">{t('Projekte & Notizen')} ›</span>
</a>

<input class="suche" type="search" placeholder={t('Funktion oder Schlagwort suchen …')} aria-label={t('Funktion oder Schlagwort suchen')} bind:value={suche} />

{#each abschnitte as a (a.titel)}
  <section>
    <h2>{t(a.titel)}</h2>
    <ul>
      {#each a.liste as r (r.id)}
        {@render kachel(r)}
      {/each}
    </ul>
  </section>
{:else}
  <p class="leer">{t('Nichts gefunden. Versuche ein anderes Wort, zum Beispiel das Bauteil.')}</p>
{/each}

<div class="sprache" role="group" aria-label="Sprache / Language">
  {#each [['de', 'Deutsch'], ['en', 'English']] as const as [kuerzel, name] (kuerzel)}
    <button aria-pressed={zustand.sprache === kuerzel} class:an={zustand.sprache === kuerzel} onclick={() => ((zustand.sprache = kuerzel), sichere())}>{name}</button>
  {/each}
</div>

<style>
  .projekt {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    min-height: 3rem;
    margin-bottom: 0.75rem;
    padding: 0.7rem 0.9rem;
    border: 1px solid var(--rand);
    border-radius: 0.75rem;
    background: var(--flaeche);
    color: inherit;
    text-decoration: none;
  }
  .projekt span {
    color: var(--leise);
    font-size: 0.85rem;
  }
  .projekt .mehr {
    margin-left: auto;
    color: var(--akzent);
  }
  .suche {
    width: 100%;
    min-height: 3rem;
    padding: 0 1rem;
    border: 1px solid var(--rand);
    border-radius: 0.75rem;
    background: var(--flaeche);
    color: inherit;
    font: inherit;
  }
  h2 {
    margin: 1.25rem 0 0.5rem;
    font-size: 0.85rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--leise);
  }
  ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    border: 1px solid var(--rand);
    border-radius: 0.75rem;
    background: var(--flaeche);
    overflow: hidden;
  }
  a {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-height: 4rem;
    padding: 0.7rem 0.9rem;
    color: inherit;
    text-decoration: none;
  }
  a span {
    color: var(--leise);
    font-size: 0.85rem;
  }
  a .ueber {
    color: var(--akzent);
  }
  button {
    width: 3rem;
    border: 0;
    background: transparent;
    color: var(--leise);
    font-size: 1.4rem;
  }
  button.fav {
    color: var(--akzent);
  }
  .sprache {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1.5rem;
  }
  .sprache button {
    width: auto;
    min-height: 2.75rem;
    padding: 0 1rem;
    border: 1px solid var(--rand);
    border-radius: 0.6rem;
    font: inherit;
    font-size: 0.9rem;
  }
  .sprache button.an {
    border-color: var(--akzent);
    color: var(--akzent);
    font-weight: 600;
  }
  .leer {
    color: var(--leise);
    text-align: center;
  }
</style>
