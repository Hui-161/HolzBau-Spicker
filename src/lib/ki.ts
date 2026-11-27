/**
 * Anbindung des KI-Assistenten an die Claude-API. Läuft nur, wenn der Nutzer einen eigenen
 * API-Schlüssel hinterlegt hat. Der Schlüssel liegt in einem eigenen Speicherplatz dieses
 * Geräts – getrennt von den Projektdaten, damit er weder in eine Sicherung noch in einen
 * Teilen-Link gerät – und geht ausschließlich an die API des Anbieters.
 */
import type Anthropic from '@anthropic-ai/sdk'
import { pruefeZiegelfund, rechnerKatalog, werkzeugLies, werkzeugRechne, type Vorschlag, type Ziegelfund } from './kiwerkzeug'
import { aktivesProjekt, zustand } from './zustand.svelte'

const SPEICHER = 'holzbau.ki'
const MODELL = 'claude-opus-5-5'
/** Lehnt das Modell eine Anfrage ab, darf die API sie einem Ersatzmodell geben */
const BETAS: Anthropic.Beta.AnthropicBeta[] = ['server-side-fallback-2026-07-01']

export function kiSchluessel(): string {
  try {
    return localStorage.getItem(SPEICHER) ?? ''
  } catch {
    return ''
  }
}
export function setzeKiSchluessel(schluessel: string): void {
  try {
    if (schluessel.trim() === '') localStorage.removeItem(SPEICHER)
    else localStorage.setItem(SPEICHER, schluessel.trim())
  } catch {
    // ohne Speicher (privater Modus) gibt es keinen Assistenten
  }
}

/** Fehler mit einem Text, der dem Nutzer gezeigt werden kann (wird in der Ansicht übersetzt) */
export class KiFehler extends Error {}

/** Das SDK wird erst geladen, wenn der Assistent wirklich benutzt wird */
async function sdk() {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const schluessel = kiSchluessel()
  if (schluessel === '') throw new KiFehler('Es ist kein API-Schlüssel hinterlegt.')
  // Aufruf aus dem Browser ist hier gewollt: Jeder Nutzer verwendet seinen eigenen Schlüssel auf seinem eigenen Gerät.
  return { Anthropic, client: new Anthropic({ apiKey: schluessel, dangerouslyAllowBrowser: true }) }
}

/** API-Fehler in verständliche Meldungen übersetzen; von der genauesten zur allgemeinsten Klasse */
function deute(e: unknown, A: typeof Anthropic): KiFehler {
  if (e instanceof KiFehler) return e
  if (e instanceof A.AuthenticationError) return new KiFehler('Der API-Schlüssel wird nicht angenommen. Bitte prüfen und neu eintragen.')
  if (e instanceof A.PermissionDeniedError) return new KiFehler('Der API-Schlüssel hat für diese Anfrage keine Berechtigung.')
  if (e instanceof A.RateLimitError) return new KiFehler('Das Anfragelimit des API-Schlüssels ist erreicht. Bitte später erneut versuchen.')
  if (e instanceof A.BadRequestError) return new KiFehler('Die Anfrage wurde von der API abgelehnt. Bei Dateien: Format und Größe prüfen.')
  if (e instanceof A.APIConnectionError) return new KiFehler('Keine Verbindung zur KI. Der Assistent braucht Netz – die Rechner laufen auch ohne.')
  if (e instanceof A.APIError) return new KiFehler('Die KI ist gerade nicht erreichbar. Bitte später erneut versuchen.')
  return new KiFehler('Die Anfrage ist fehlgeschlagen.')
}

const system = (): string =>
  [
    'Du bist der Assistent im „Holzbau-Spicker“, einer Rechen-App für Zimmerer auf der Baustelle.',
    'Du rechnest nie selbst. Für jede Rechnung rufst du das Werkzeug „rechne“ auf: Der Rechenkern der App liefert die Ergebnisse, und nur diese Zahlen gibst du weiter.',
    `Längen stehen in der eingestellten Einheit der App: ${zustand.einheit}. Nennt der Nutzer eine andere Einheit (zum Beispiel Meter), rechne die Eingabe in ${zustand.einheit} um, bevor du sie übergibst. Winkel in Grad.`,
    'Fehlt eine nötige Angabe, frage kurz nach, statt einen Wert anzunehmen. Vorgabewerte der Felder darfst du verwenden, wenn der Nutzer nichts anderes sagt – nenne sie dann in der Antwort.',
    'Sollen Werte aus einem anderen Rechner übernommen werden, lies sie mit „lies_eingaben“.',
    'Antworte kurz und auf Deutsch: welcher Rechner, mit welchen Eingaben, die wichtigsten Ergebnisse. Der Nutzer kann deine Eingaben danach mit einem Knopf in den Rechner übernehmen und sieht dort Zeichnung und Details.',
    'Statik, Bemessung und Rechtsfragen beantwortest du nicht; verweise dafür auf Fachplanung.',
    '',
    'Verzeichnis der Rechner (Kennung – Titel, darunter die Felder):',
    '',
    rechnerKatalog(),
  ].join('\n')

const WERKZEUGE: Anthropic.Beta.BetaToolUnion[] = [
  {
    name: 'rechne',
    description: 'Rechnet mit einem Rechner der App. Liefert die Ergebnisse des Rechenkerns oder eine Fehlermeldung, wenn Felder fehlen oder Werte nicht zusammenpassen.',
    input_schema: {
      type: 'object',
      properties: {
        rechner: { type: 'string', description: 'Kennung des Rechners aus dem Verzeichnis, z. B. „sparren“' },
        werte: { type: 'object', description: 'Feldkennung → Wert. Zahlen als Zahl, Auswahlfelder mit dem Auswahlwert.', additionalProperties: { type: ['number', 'string'] } },
      },
      required: ['rechner', 'werte'],
    },
  },
  {
    name: 'lies_eingaben',
    description: 'Liest die Eingaben, die im aktuellen Projekt für einen Rechner gespeichert sind.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { rechner: { type: 'string', description: 'Kennung des Rechners' } },
      required: ['rechner'],
      additionalProperties: false,
    },
  },
]

export interface KiAntwort {
  text: string
  vorschlaege: Vorschlag[]
  /** Gesprächsverlauf für die nächste Frage */
  verlauf: Anthropic.Beta.BetaMessageParam[]
}

/** Eine Frage oder Aufgabe an den Assistenten; er bedient dafür die Rechner. */
export async function frage(text: string, verlauf: Anthropic.Beta.BetaMessageParam[] = []): Promise<KiAntwort> {
  const { Anthropic: A, client } = await sdk()
  const nachrichten: Anthropic.Beta.BetaMessageParam[] = [...verlauf, { role: 'user', content: text }]
  const vorschlaege: Vorschlag[] = []
  try {
    // höchstens einige Runden: Rechner wählen, rechnen, gegebenenfalls korrigieren, antworten
    for (let runde = 0; runde < 8; runde++) {
      const antwort = await client.beta.messages.create({
        model: MODELL,
        max_tokens: 16000,
        betas: BETAS,
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: [{ type: 'text', text: system(), cache_control: { type: 'ephemeral' } }],
        tools: WERKZEUGE,
        messages: nachrichten,
      })
      nachrichten.push({ role: 'assistant', content: antwort.content })
      if (antwort.stop_reason === 'refusal') throw new KiFehler('Die KI hat diese Anfrage abgelehnt.')
      if (antwort.stop_reason === 'max_tokens') throw new KiFehler('Die Antwort der KI war zu lang und wurde abgebrochen.')
      if (antwort.stop_reason === 'pause_turn') continue
      const aufrufe = antwort.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use')
      if (antwort.stop_reason !== 'tool_use' || aufrufe.length === 0) {
        const worte = antwort.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text)
        return { text: worte.join('\n').trim(), vorschlaege, verlauf: nachrichten }
      }
      // alle Ergebnisse einer Runde gehören in eine einzige Nachricht
      const ergebnisse: Anthropic.Beta.BetaToolResultBlockParam[] = aufrufe.map((aufruf) => {
        const r = aufruf.name === 'rechne' ? werkzeugRechne(aufruf.input) : aufruf.name === 'lies_eingaben' ? werkzeugLies(aufruf.input, aktivesProjekt().eingaben) : { text: `Unbekanntes Werkzeug „${aufruf.name}“.`, fehler: true }
        if ('vorschlag' in r && r.vorschlag) {
          // je Rechner zählt der letzte Stand
          const v = r.vorschlag
          const alt = vorschlaege.findIndex((x) => x.rechner === v.rechner)
          if (alt >= 0) vorschlaege.splice(alt, 1)
          vorschlaege.push(v)
        }
        return { type: 'tool_result', tool_use_id: aufruf.id, content: r.text, is_error: r.fehler }
      })
      nachrichten.push({ role: 'user', content: ergebnisse })
    }
    throw new KiFehler('Die KI ist zu keinem Ergebnis gekommen. Bitte die Aufgabe genauer beschreiben.')
  } catch (e) {
    throw deute(e, A)
  }
}

const BILDER = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
type Bildart = (typeof BILDER)[number]

/** Datei als Base64 ohne Zeilenumbrüche */
async function base64(datei: Blob): Promise<string> {
  const bytes = new Uint8Array(await datei.arrayBuffer())
  let binaer = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binaer += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binaer)
}

const ZIEGEL_WERKZEUG: Anthropic.Beta.BetaToolUnion = {
  name: 'melde_ziegelmasse',
  description: 'Meldet die Maße eines Dachziegels oder Dachsteins, wie sie im Datenblatt stehen. Alle Längen in Zentimetern. Was im Datenblatt nicht steht, bleibt null.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      hersteller: { type: 'string' },
      modell: { type: 'string' },
      decklaenge_min_cm: { type: ['number', 'null'], description: 'kleinste Decklänge bzw. Lattweite' },
      decklaenge_max_cm: { type: ['number', 'null'], description: 'größte Decklänge bzw. Lattweite' },
      deckbreite_cm: { type: ['number', 'null'], description: 'mittlere Deckbreite' },
      laf_cm: { type: ['number', 'null'], description: 'Lattenabstand zum First (LAF), falls ein einzelner Wert angegeben ist' },
      fundstelle: { type: 'string', description: 'Seite und wörtliche Angabe, aus der die Decklänge stammt' },
      hinweis: { type: 'string', description: 'Einschränkungen, z. B. abhängig von der Dachneigung; sonst leer' },
    },
    required: ['hersteller', 'modell', 'decklaenge_min_cm', 'decklaenge_max_cm', 'deckbreite_cm', 'laf_cm', 'fundstelle', 'hinweis'],
    additionalProperties: false,
  },
}

/** Liest Decklängen aus einem Datenblatt (PDF oder Foto). Das Ergebnis ist ein Vorschlag zum Prüfen. */
export async function leseDatenblatt(datei: File): Promise<Ziegelfund> {
  const istPdf = datei.type === 'application/pdf'
  const bildart = BILDER.find((b) => b === datei.type) as Bildart | undefined
  if (!istPdf && !bildart) throw new KiFehler('Bitte ein PDF oder ein Foto (JPEG, PNG, WebP) wählen.')
  if (datei.size > 20_000_000) throw new KiFehler('Die Datei ist größer als 20 MB.')
  const { Anthropic: A, client } = await sdk()
  try {
    const daten = await base64(datei)
    const antwort = await client.beta.messages.create({
      model: MODELL,
      max_tokens: 16000,
      betas: BETAS,
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      tools: [ZIEGEL_WERKZEUG],
      messages: [
        {
          role: 'user',
          content: [
            istPdf ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: daten } } : { type: 'image', source: { type: 'base64', media_type: bildart as Bildart, data: daten } },
            {
              type: 'text',
              text: 'Das ist das Datenblatt eines Dachziegels oder Dachsteins. Lies die kleinste und größte Decklänge (auch „Lattweite“ oder „variable Decklänge“), die mittlere Deckbreite und, falls angegeben, den Lattenabstand zum First heraus und melde sie mit dem Werkzeug „melde_ziegelmasse“. Rechne Millimeter in Zentimeter um. Übernimm nur, was ausdrücklich im Datenblatt steht; schätze nichts und ergänze nichts aus eigenem Wissen. Steht keine Decklänge darin, melde dafür null.',
            },
          ],
        },
      ],
    })
    if (antwort.stop_reason === 'refusal') throw new KiFehler('Die KI hat diese Anfrage abgelehnt.')
    const aufruf = antwort.content.find((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use' && b.name === 'melde_ziegelmasse')
    const fund = pruefeZiegelfund(aufruf?.input)
    if (!fund) throw new KiFehler('In der Datei wurde keine eindeutige Decklänge gefunden.')
    return fund
  } catch (e) {
    throw deute(e, A)
  }
}
