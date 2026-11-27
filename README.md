# Holzbau-Spicker

Rechnungen und Maßkontrollen für Zimmerer – als Web-App für Android, iPhone und PC.
Nach dem ersten Aufruf läuft alles offline, die Eingaben bleiben auf dem Gerät.

## Rechner

- **Dach:** Sparren (Länge, Kerve, Obholz), Grat- und Kehlsparren mit Hexenschnitt und Schifterliste, Kehlbalken/Zange, Pultdach, Zelt- und Turmdach, Schleppgaube, Sattel- und Walmgaube, Wechsel am Dachfenster, Lattung/Ziegel, Dachfläche Satteldach, Neigung umrechnen
- **Einteilung:** Stäbe/Latten/Pfosten (Außen-, Eck-, Innenmaß), Sparreneinteilung mit Anrissliste
- **Winkel & Maßkontrolle:** Diagonalkontrolle, 3-4-5-Winkel, rechtwinkliges und allgemeines Dreieck, Stichbogen, Neigungsmesser (Lagesensor)
- **Sonstiges:** Treppe (Schrittmaß), Holzmenge, Maßstab, Holzstern, Zuschnitt und Verschnitt, Mindestabstände für Nägel, Schrauben, Bolzen und Stabdübel
- **Projekte & Notizen:** Eingaben je Projekt, Notizen, Teilen per Link oder QR-Code, Ergebnisübersicht, Projektbericht als PDF, Datensicherung
- **Dokumente:** Behinderungsanzeige, Bedenkenanzeige, Stundenzettel, Aufmaßblatt, Abnahmeprotokoll und Bautagesbericht mit Unterschrift, Fotos und PDF-Export; Absender und Projektangaben werden vorbelegt (deutsche Vorlage, ersetzt keine Rechtsberatung)
- **Sprachen:** Deutsch und Englisch

Längeneinheit (mm / cm / m) oben rechts umschaltbar. Häufig genutzte Rechner lassen sich mit ☆ als Favorit oben anheften.

## Installieren

- **Android (Chrome):** Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“
- **iPhone/iPad (Safari):** Teilen → „Zum Home-Bildschirm“
- **PC (Chrome/Edge):** Installieren-Symbol in der Adresszeile

## Entwicklung

```bash
npm install
npm run dev      # lokal starten
npm test         # Rechenkern testen
npm run check    # Typen prüfen
npm run e2e      # Browsertests gegen die gebaute App
npm run build    # nach dist/ bauen
```

Aufbau:

- `src/core/` – Rechenkern, reine Funktionen ohne Oberfläche, mit Tests (`core.test.ts`)
- `src/calcs/` – jeder Rechner als Datensatz (Felder + Rechenfunktion); ein neuer Rechner ist ein neuer Eintrag in `index.ts`
- `src/calcs/zeichnung.ts` – maßstäbliche Zeichnungen als SVG
- `src/core/dokumente.ts` – Dokumentvorlagen als Daten (Felder + Textaufbau); eine neue Vorlage ist ein neuer Eintrag
- `src/lib/` – Oberfläche (Startseite, Rechner-Ansicht, Projekte, Neigungsmesser, gespeicherter Zustand)
- `src/lib/en.ts` – englische Texte; der deutsche Text ist der Schlüssel, `texte.test.ts` prüft die Vollständigkeit

## Veröffentlichung

Der Workflow `.github/workflows/deploy.yml` testet und baut bei jedem Push auf `main`.
Auf GitHub Pages veröffentlicht wird, sobald das Repo öffentlich ist und unter
*Settings → Pages → Source* „GitHub Actions“ gewählt wurde.

Was vor dem öffentlichen Start noch offen ist, steht in [docs/veroeffentlichung.md](docs/veroeffentlichung.md).

## Sicherheit und Datenschutz

Keine Konten, kein Tracking, keine externen Dienste. Eine Content-Security-Policy lässt nur eigene Dateien zu.

## Hinweis

Alle Ergebnisse ohne Gewähr. Vor dem Zuschnitt nachmessen. Die App ersetzt keine Statik und keine Fachplanung.
Weitere Ideen stehen in [docs/funktionen.md](docs/funktionen.md).
