<script lang="ts">
  import { alsApp, installation, installiere, istIos, istTelefon } from './installieren.svelte'
  import { t } from './sprache.svelte'
  import { sichere, zustand } from './zustand.svelte'

  // nur im Browser auf dem Telefon, nicht in der installierten App und nicht nach dem Wegklicken
  const zeigen = $derived(!zustand.installWeg && !installation.installiert && istTelefon() && !alsApp())
  const ios = istIos()

  function weg() {
    zustand.installWeg = true
    sichere()
  }
</script>

{#if zeigen}
  <aside class="install nicht-drucken" aria-label={t('App installieren')}>
    <img src="./icon-192.png" alt="" width="40" height="40" />
    <div class="text">
      <strong>{t('Als App auf den Startbildschirm')}</strong>
      {#if installation.aufforderung}
        <span>{t('Startet wie eine App und funktioniert auch ohne Netz.')}</span>
      {:else if ios}
        <span>{t('In Safari unten auf „Teilen“ tippen, dann „Zum Home-Bildschirm“.')}</span>
      {:else}
        <span>{t('Im Browsermenü (⋮) „Zum Startbildschirm hinzufügen“ oder „App installieren“ wählen.')}</span>
      {/if}
    </div>
    {#if installation.aufforderung}
      <button class="los" onclick={installiere}>{t('Installieren')}</button>
    {/if}
    <button class="zu" onclick={weg} aria-label={t('Hinweis schließen')}>✕</button>
  </aside>
{/if}

<style>
  .install {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: calc(0.5rem + env(safe-area-inset-top)) 0.5rem 0.5rem 0.75rem;
    border-bottom: 1px solid var(--rand);
    background: var(--flaeche);
  }
  img {
    flex: none;
    border-radius: 0.5rem;
  }
  .text {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    font-size: 0.85rem;
  }
  .text span {
    color: var(--leise);
  }
  button {
    flex: none;
    min-height: 2.75rem;
    border-radius: 0.6rem;
    font: inherit;
  }
  .los {
    padding: 0 0.9rem;
    border: 0;
    background: var(--akzent);
    color: var(--grund);
    font-weight: 600;
  }
  .zu {
    width: 2.75rem;
    border: 0;
    background: transparent;
    color: var(--leise);
    font-size: 1.1rem;
  }
</style>
