<script lang="ts">
  import { onDestroy } from 'svelte'
  import { neigungAusSchwerkraft } from '../core/sensor'
  import { t } from './sprache.svelte'
  import { zustand } from './zustand.svelte'

  type Stand = 'aus' | 'laeuft' | 'verweigert' | 'fehlt'
  let stand = $state<Stand>('aus')
  let roh = $state(0)
  let null0 = $state(0)
  let lage = $state<'kante' | 'flach'>('kante')
  let fest = $state(false)

  const winkel = $derived(roh - null0)
  const prozent = $derived(Math.tan((winkel * Math.PI) / 180) * 100)
  const zeige = (x: number, n: number) => (Number.isFinite(x) ? x.toLocaleString(zustand.sprache === 'de' ? 'de-DE' : 'en-GB', { minimumFractionDigits: n, maximumFractionDigits: n }) : '–')

  let warten: ReturnType<typeof setTimeout> | undefined

  function bewegung(e: DeviceMotionEvent) {
    const g = e.accelerationIncludingGravity
    if (!g || g.x === null || g.y === null || g.z === null) return
    clearTimeout(warten)
    stand = 'laeuft'
    if (fest) return
    const m = neigungAusSchwerkraft(g.x, g.y, g.z)
    if (!m) return
    // bei Lagewechsel springen, sonst glätten (Sensor rauscht)
    roh = m.lage === lage ? roh + 0.15 * (m.winkel - roh) : m.winkel
    lage = m.lage
  }

  async function starte() {
    if (typeof DeviceMotionEvent === 'undefined') {
      stand = 'fehlt'
      return
    }
    // iPhone/iPad verlangen eine ausdrückliche Freigabe nach einem Tipp
    const frage = (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission
    if (typeof frage === 'function') {
      try {
        if ((await frage.call(DeviceMotionEvent)) !== 'granted') {
          stand = 'verweigert'
          return
        }
      } catch {
        stand = 'verweigert'
        return
      }
    }
    addEventListener('devicemotion', bewegung)
    // PC ohne Sensor: es kommen keine Werte
    warten = setTimeout(() => {
      if (stand !== 'laeuft') stand = 'fehlt'
    }, 1500)
  }

  onDestroy(() => {
    removeEventListener('devicemotion', bewegung)
    clearTimeout(warten)
  })
</script>

{#if stand === 'aus'}
  <button class="gross" onclick={starte}>{t('Messung starten')}</button>
  <p class="leise">{t('Das Handy fragt eventuell nach dem Zugriff auf den Bewegungssensor. Die Werte bleiben auf dem Gerät.')}</p>
{:else if stand === 'verweigert'}
  <p class="fehler">{t('Der Zugriff auf den Bewegungssensor wurde nicht erlaubt. In den Browser-Einstellungen freigeben und die Seite neu laden.')}</p>
{:else if stand === 'fehlt'}
  <p class="fehler">{t('Dieses Gerät liefert keine Sensorwerte. Der Neigungsmesser funktioniert nur auf Handys und Tablets.')}</p>
{:else}
  <div class="anzeige" class:fest aria-live="off">
    <div class="wert">{zeige(winkel, 1)}<span>°</span></div>
    <div class="neben">{zeige(prozent, 1)} % · {lage === 'kante' ? t('auf der Kante') : t('flach aufgelegt')}</div>
    <svg viewBox="-60 -60 120 120" aria-hidden="true">
      <circle r="52" />
      <line x1="-52" x2="52" class="soll" />
      <line x1="-52" x2="52" transform={`rotate(${-winkel})`} />
    </svg>
  </div>
  <div class="reihe">
    <button onclick={() => (fest = !fest)} aria-pressed={fest}>{fest ? t('Weiter messen') : t('Festhalten')}</button>
    <button onclick={() => (null0 = roh)}>{t('Nullen')}</button>
    <button onclick={() => (null0 = 0)} disabled={null0 === 0}>{t('Nullung aufheben')}</button>
  </div>
{/if}

<p class="leise">
  {t('Handy mit einer Kante auf das Bauteil stellen oder flach auflegen. Der Sensor im Handy ist ein Schätzeisen: Für Kontrollen reicht er, für Anriss und Zuschnitt Wasserwaage oder Winkelmesser nehmen. Mit „Nullen“ wird die aktuelle Lage als Bezug gesetzt.')}
</p>

<style>
  .gross {
    width: 100%;
    min-height: 4rem;
    border: 0;
    border-radius: 0.75rem;
    background: var(--akzent);
    color: var(--grund);
    font: inherit;
    font-size: 1.2rem;
    font-weight: 600;
  }
  .anzeige {
    padding: 1rem;
    border: 2px solid var(--rand);
    border-radius: 0.75rem;
    background: var(--flaeche);
    text-align: center;
  }
  .anzeige.fest {
    border-color: var(--akzent);
  }
  .wert {
    font-size: 4.5rem;
    font-weight: 700;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
    color: var(--akzent);
  }
  .wert span {
    font-size: 2.5rem;
  }
  .neben {
    color: var(--leise);
  }
  svg {
    width: 60%;
    max-width: 14rem;
    margin-top: 0.5rem;
    fill: none;
    stroke: var(--akzent);
    stroke-width: 3;
    stroke-linecap: round;
  }
  svg circle,
  svg .soll {
    stroke: var(--rand);
    stroke-width: 1.5;
  }
  .reihe {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1rem 0;
  }
  .reihe button {
    flex: 1;
    min-height: 3rem;
    padding: 0 0.75rem;
    border: 1px solid var(--rand);
    border-radius: 0.6rem;
    background: var(--flaeche);
    color: inherit;
    font: inherit;
  }
  .reihe button:disabled {
    opacity: 0.5;
  }
  .leise {
    color: var(--leise);
    font-size: 0.9rem;
  }
  .fehler {
    color: var(--warn);
    font-weight: 600;
  }
</style>
