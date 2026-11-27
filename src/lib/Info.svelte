<script lang="ts">
  import { BETREIBER } from '../betreiber'
  import { t } from './sprache.svelte'

  const lizenzen = [
    ['Svelte', 'MIT'],
    ['jsPDF', 'MIT'],
    ['qrcode-generator', 'MIT'],
    ['Workbox', 'MIT'],
    ['Anthropic SDK', 'MIT'],
  ]
</script>

<section>
  <h2>{t('Über diese App')}</h2>
  <p>{t('Holzbau-Spicker')} · {t('Version')} {__APP_VERSION__}</p>
  <p>
    {t(
      'Alle Ergebnisse sind Rechenhilfen ohne Gewähr. Vor dem Zuschnitt nachmessen. Die App ersetzt keine Statik, keine Fachplanung und keine Rechtsberatung. Maßgebend sind die geltenden Normen, Herstellerangaben und die Bauordnung.'
    )}
  </p>
</section>

<section>
  <h2>{t('Datenschutz')}</h2>
  <p>{t('Die App hat kein Konto, kein Tracking, keine Werbung und setzt keine Cookies. Sie lädt nichts von fremden Servern nach.')}</p>
  <p>
    {t(
      'Eingaben, Projekte und Notizen werden nur im Speicher dieses Browsers auf diesem Gerät abgelegt. Sie verlassen das Gerät erst, wenn du selbst ein Projekt teilst, eine Sicherung speicherst oder ein PDF weitergibst.'
    )}
  </p>
  <p>{t('Fotos, Unterschrift und Sensorwerte werden nur auf dem Gerät verarbeitet und nicht gespeichert.')}</p>
  <p>
    {t(
      'Ausnahme ist der freiwillige KI-Assistent: Er ist nur aktiv, wenn du einen eigenen API-Schlüssel hinterlegst. Dann gehen deine Frage, die Eingaben der abgefragten Rechner und hochgeladene Datenblätter an die Claude-API von Anthropic (api.anthropic.com). Der Schlüssel liegt nur im Speicher dieses Geräts. Für das Diktat nutzt der Browser seine eigene Spracherkennung.'
    )}
  </p>
  <p>
    {t(
      'Beim Aufruf der Seite verarbeitet der Hosting-Anbieter technisch notwendige Verbindungsdaten wie die IP-Adresse. Die App selbst wertet diese Daten nicht aus.'
    )}
  </p>
</section>

<section>
  <h2>{t('Impressum')}</h2>
  {#if BETREIBER.name}
    <p class="mehrzeilig">{BETREIBER.name}{'\n'}{BETREIBER.anschrift}</p>
    {#if BETREIBER.kontakt}<p class="mehrzeilig">{BETREIBER.kontakt}</p>{/if}
  {:else}
    <p class="warn">{t('Die Angaben des Betreibers sind noch nicht eingetragen.')}</p>
  {/if}
</section>

<section>
  <h2>{t('Verwendete Software')}</h2>
  <ul>
    {#each lizenzen as [name, lizenz] (name)}
      <li>{name} – {lizenz}</li>
    {/each}
  </ul>
</section>

<style>
  section {
    margin-bottom: 1rem;
    padding: 0.25rem 1rem 0.5rem;
    border: 1px solid var(--rand);
    border-radius: 0.75rem;
    background: var(--flaeche);
  }
  h2 {
    margin: 0.75rem 0 0.5rem;
    font-size: 1rem;
  }
  p,
  ul {
    margin: 0 0 0.6rem;
  }
  ul {
    padding-left: 1.2rem;
  }
  .mehrzeilig {
    white-space: pre-line;
  }
  .warn {
    color: var(--warn);
    font-weight: 600;
  }
</style>
