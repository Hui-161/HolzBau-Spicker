/**
 * Installation auf dem Startbildschirm. Chrome/Edge/Samsung melden mit „beforeinstallprompt“, dass
 * die App installierbar ist; der Dialog darf erst auf einen Tipp hin erscheinen. Safari auf
 * iPhone/iPad kennt das nicht – dort geht es nur über „Teilen → Zum Home-Bildschirm“.
 */
interface InstallAufforderung extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const installation = $state({ aufforderung: null as InstallAufforderung | null, installiert: false })

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // eigene Leiste statt der Mini-Infoleiste des Browsers
    e.preventDefault()
    installation.aufforderung = e as InstallAufforderung
  })
  window.addEventListener('appinstalled', () => {
    installation.installiert = true
    installation.aufforderung = null
  })
}

/** läuft bereits als installierte App (vom Startbildschirm geöffnet) */
export const alsApp = (): boolean => matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

/** iPhone oder iPad (iPadOS meldet sich als Mac mit Touch) */
export const istIos = (): boolean => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Telefon oder Tablet: Bedienung per Finger */
export const istTelefon = (): boolean => matchMedia('(pointer: coarse)').matches

/** Installationsdialog des Browsers öffnen; true, wenn installiert wurde */
export async function installiere(): Promise<boolean> {
  const a = installation.aufforderung
  if (!a) return false
  await a.prompt()
  const { outcome } = await a.userChoice
  // die Aufforderung gilt nur einmal
  installation.aufforderung = null
  if (outcome === 'accepted') installation.installiert = true
  return outcome === 'accepted'
}
