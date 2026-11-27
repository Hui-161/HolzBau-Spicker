<script lang="ts">
  /** Unterschriftsfeld für Finger, Stift oder Maus. `wert` ist ein PNG als data:-URL oder undefined. */
  let { wert = $bindable() }: { wert?: string } = $props()

  const B = 660
  const H = 220
  let flaeche = $state<HTMLCanvasElement>()
  let zeichnet = false
  let letzter: [number, number] = [0, 0]

  const stift = (): CanvasRenderingContext2D | null => flaeche?.getContext('2d') ?? null

  function ort(e: PointerEvent): [number, number] {
    const r = (flaeche as HTMLCanvasElement).getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * B, ((e.clientY - r.top) / r.height) * H]
  }

  function start(e: PointerEvent) {
    const s = stift()
    if (!s) return
    e.preventDefault()
    flaeche?.setPointerCapture(e.pointerId)
    zeichnet = true
    letzter = ort(e)
    // ein Tipp ohne Bewegung ergibt einen Punkt
    s.fillStyle = '#000'
    s.beginPath()
    s.arc(letzter[0], letzter[1], 1.6, 0, Math.PI * 2)
    s.fill()
  }

  function zieh(e: PointerEvent) {
    const s = stift()
    if (!zeichnet || !s) return
    e.preventDefault()
    const p = ort(e)
    s.strokeStyle = '#000'
    s.lineWidth = 3.2
    s.lineCap = 'round'
    s.lineJoin = 'round'
    s.beginPath()
    s.moveTo(letzter[0], letzter[1])
    s.lineTo(p[0], p[1])
    s.stroke()
    letzter = p
  }

  function ende() {
    if (!zeichnet) return
    zeichnet = false
    wert = flaeche?.toDataURL('image/png')
  }

  export function leere() {
    stift()?.clearRect(0, 0, B, H)
    wert = undefined
  }
</script>

<div class="rahmen">
  <canvas
    bind:this={flaeche}
    width={B}
    height={H}
    aria-label="Unterschriftsfeld"
    onpointerdown={start}
    onpointermove={zieh}
    onpointerup={ende}
    onpointercancel={ende}
    onpointerleave={ende}
  ></canvas>
  {#if !wert}<span class="leer">Hier unterschreiben</span>{/if}
</div>
<button onclick={leere} disabled={!wert}>Unterschrift löschen</button>

<style>
  .rahmen {
    position: relative;
    border: 1px solid var(--rand);
    border-radius: 0.6rem;
    /* immer weiß: so sieht die Unterschrift aus wie später im PDF */
    background: #fff;
    overflow: hidden;
  }
  canvas {
    display: block;
    width: 100%;
    aspect-ratio: 3;
    /* verhindert, dass die Seite beim Unterschreiben scrollt */
    touch-action: none;
    cursor: crosshair;
  }
  .leer {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: #888;
    pointer-events: none;
  }
  button {
    min-height: 2.75rem;
    margin-top: 0.5rem;
    padding: 0 1rem;
    border: 1px solid var(--rand);
    border-radius: 0.6rem;
    background: var(--flaeche);
    color: inherit;
    font: inherit;
  }
  button:disabled {
    opacity: 0.5;
  }
</style>
