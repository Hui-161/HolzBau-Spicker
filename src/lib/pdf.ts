export interface Bild {
  /** JPEG als data:-URL */
  daten: string
  breite: number
  hoehe: number
}

/** Foto verkleinern und als JPEG ablegen (kleinere PDF, Drehung laut Kamera wird übernommen). */
export async function ladeBild(datei: File, maxKante = 1600): Promise<Bild> {
  const quelle = await createImageBitmap(datei, { imageOrientation: 'from-image' })
  const f = Math.min(1, maxKante / Math.max(quelle.width, quelle.height))
  const breite = Math.max(1, Math.round(quelle.width * f))
  const hoehe = Math.max(1, Math.round(quelle.height * f))
  const flaeche = document.createElement('canvas')
  flaeche.width = breite
  flaeche.height = hoehe
  const stift = flaeche.getContext('2d')
  if (!stift) throw new Error('Kein Zeichenkontext')
  // weißer Grund, falls das Bild durchsichtige Stellen hat
  stift.fillStyle = '#fff'
  stift.fillRect(0, 0, breite, hoehe)
  stift.drawImage(quelle, 0, 0, breite, hoehe)
  quelle.close()
  return { daten: flaeche.toDataURL('image/jpeg', 0.82), breite, hoehe }
}

/** PDF teilen (Handy) oder herunterladen (PC). */
export async function gibAus(pdf: Blob, name: string): Promise<'geteilt' | 'geladen'> {
  const datei = new File([pdf], name, { type: 'application/pdf' })
  if (navigator.canShare?.({ files: [datei] })) {
    try {
      await navigator.share({ files: [datei], title: name })
      return 'geteilt'
    } catch (e) {
      // Abbruch durch den Nutzer: nichts weiter tun
      if (e instanceof DOMException && e.name === 'AbortError') return 'geteilt'
    }
  }
  const url = URL.createObjectURL(datei)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
  return 'geladen'
}
