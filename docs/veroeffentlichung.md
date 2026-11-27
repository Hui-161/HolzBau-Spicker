# Weg zur Veröffentlichung

Stand der App und alles, was vor dem öffentlichen Start noch zu klären, zu prüfen oder zu testen ist.
Erledigtes steht unten, damit nachvollziehbar bleibt, was schon abgesichert ist.

## 1. Muss vor dem Start erledigt sein

Diese Punkte kann nur der Betreiber entscheiden oder liefern.

- [ ] **Impressum eintragen:** Name, Anschrift und Kontakt in `src/betreiber.ts`. Solange das leer ist, zeigt die Info-Seite einen Warnhinweis.
- [ ] **Datenschutztext prüfen lassen:** Der Text auf der Info-Seite beschreibt, was die App technisch tut. Ob er rechtlich genügt, muss jemand mit Datenschutzkenntnis bestätigen (Hosting über GitHub Pages, Sitz des Anbieters in den USA).
- [ ] **Abnahmeprotokoll rechtlich prüfen lassen:** Formulierungen zu Vorbehalt, Verweigerung und Abnahmewirkung (§ 12 VOB/B, § 640 BGB) in `src/core/dokumente.ts`.
- [ ] **Bedenkenanzeige, Stundenzettel und Aufmaßblatt rechtlich prüfen lassen:** Texte und Paragrafen (§ 4 Abs. 3, § 6 Abs. 1, § 13 Abs. 3 VOB/B) in `src/core/dokumente.ts`. Beim Stundenzettel auch die Bestätigungsformel für den Auftraggeber.
- [ ] **Behinderungsanzeige rechtlich prüfen lassen:** Formulierungen und Paragrafen (§ 6 Abs. 1, 2, 4, 6 VOB/B, § 642 BGB) in `src/core/anzeige.ts`.
- [ ] **Lizenz festlegen:** Es gibt noch keine `LICENSE`-Datei. Ohne Lizenz darf niemand den Code weiterverwenden, auch wenn das Repo öffentlich ist.
- [ ] **Name und Adresse der App:** „Holzbau-Spicker“ ist ein Arbeitstitel. Namens- und Markenrecherche steht aus.
- [ ] **Fachliche Durchsicht der Rechner** durch eine Zimmerermeisterin oder einen Zimmerermeister, mindestens mit je einem Praxisbeispiel pro Rechner (Liste in Abschnitt 4).

## 2. Tests auf echten Geräten

Bisher läuft alles nur im simulierten Handy-Browser (Chromium). Auf echten Geräten ist nichts getestet.

Je einmal auf **iPhone (Safari)**, **Android (Chrome)** und **PC (Chrome oder Edge, Firefox)**:

- [ ] Seite öffnen, zum Startbildschirm hinzufügen bzw. installieren, aus dem Symbol starten
- [ ] Flugmodus einschalten, App neu starten, drei Rechner benutzen
- [ ] Zahlen mit Komma und mit Punkt eingeben; erscheint die Zahlentastatur?
- [ ] Einheit umschalten (mm, cm, m), Sprache umschalten
- [ ] Projekt anlegen, per Link teilen, auf dem zweiten Gerät öffnen
- [ ] QR-Code auf Gerät A anzeigen, mit der Kamera von Gerät B scannen und übernehmen
- [ ] Projektfotos aufnehmen und beschriften, App schließen und neu öffnen: sind sie noch da?
- [ ] Sicherung speichern, Browserdaten löschen, Sicherung einspielen (kommen Projekte, Stammdaten und Fotos zurück?)
- [ ] Rechner drucken bzw. als PDF sichern; Projektbericht als PDF erzeugen und öffnen (stimmen die Zeichnungen?)
- [ ] Dunkle Ansicht, Lesbarkeit draußen bei Sonne

Nur auf dem Handy:

- [ ] **Neigungsmesser:** Zugriff erlauben (iPhone fragt nach), gegen eine Wasserwaage prüfen: 0°, etwa 30°, 45°, 90°; auf der Kante und flach; „Nullen“ und „Festhalten“
- [ ] **Dokumentvorlagen (alle vier):** mit dem Finger unterschreiben (scrollt die Seite dabei?), Foto mit der Kamera aufnehmen, Foto aus der Galerie, Hochkant- und Querformat, PDF teilen per Mail und Messenger, PDF auf dem PC öffnen
- [ ] Große Schrift in den Systemeinstellungen: bleibt alles bedienbar?

## 3. Test-Veröffentlichung und Start

Der Code liegt im Repo `HolzBau-Spicker`. Bei jedem Push auf `main` laufen Typprüfung, Rechen- und Browsertests.
Veröffentlicht wird auf GitHub Pages, sobald das Repo öffentlich ist; bei einem privaten Repo nur, wenn der
Workflow von Hand gestartet wird und der GitHub-Tarif Pages für private Repos erlaubt.

Für den Test auf echten Geräten:

- [ ] Unter *Settings → Pages → Build and deployment → Source* „GitHub Actions“ wählen
- [ ] Repo öffentlich stellen **oder** (mit passendem Tarif) unter *Actions → Test und Veröffentlichung → Run workflow* von Hand starten
- [ ] Adresse aus dem Workflow-Lauf öffnen, voraussichtlich `https://hui-161.github.io/HolzBau-Spicker/`, und Abschnitt 2 durchgehen
- [ ] Achtung: Eine Pages-Seite ist für jeden mit dem Link erreichbar, auch wenn das Repo privat ist (Ausnahme: Enterprise-Tarif). Vor dem Test sind Impressum und Datenschutztext noch nicht geprüft – den Link nur intern weitergeben.

Vor dem öffentlichen Start:

- [ ] Version in `package.json` setzen (steht auf 0.1.0; sie erscheint auf der Info-Seite)
- [ ] Prüfen, dass keine echten Namen oder Anschriften in Testdaten, Bildern oder der Git-Historie stehen (bisher nur erfundene Beispiele)

## 4. Fachliche Unklarheiten

Hier ist die Rechnung in sich geprüft, aber die Festlegung ist eine Frage des Handwerks.

- **Verstich (Grat):** ausgegeben wird das Grundrissmaß in Gratrichtung, um das die Sparrenkante an der Traufe gegenüber der Achse versetzt ist. Bei 45° ist das die halbe Sparrenbreite. Bitte bestätigen, dass das dem betrieblichen Verständnis entspricht.
- **Gratverschiebung:** bei ungleichen Neigungen berechnet die App den Versatz, bei dem beide Abgratungen gleich hoch sind. Schifterlängen und Verstich rechnen weiter mit dem mittig sitzenden Grat.
- **Schifter:** Länge der Schifterachse, ohne Schifterbreite (lange und kurze Kante fehlen). Für Kehlschifter gilt die Liste nicht.
- **Hexenschnitt:** Winkel an der Seitenfläche zur Gratoberkante. Der Traufabschnitt wird zur Sparrenoberkante gemessen (90° = winkelrecht). Ergebnis kann über 90° liegen.
- **Lattung:** „Traufkante bis OK erste Latte“ meint die erste Traglatte, nicht eine Traufbohle. Jede Latte trägt eine Ziegelreihe.
- **Kehlbalken:** sitzt stumpf zwischen den Sparren. Für Zangen müssen die Sparrenbreiten zugegeben werden.
- **Treppe:** rechnet nur nach der Schrittmaßregel (63 cm). Vorgaben der Bauordnung und DIN 18065 werden nicht geprüft, nur ein Hinweis bei Steigung über 20 cm oder Auftritt unter 23 cm.
- **Dachfenster:** nimmt mittigen Einbau im Feld an.
- **Mindestabstände:** Tabelle 8.2 (Nägel, Schrauben bis 6 mm), 8.4 (Bolzen) und 8.5 (Stabdübel) der EN 1995-1-1 sind gegen den Normtext und für Bolzen zusätzlich gegen zwei weitere Quellen geprüft. **Nicht geprüft:** der deutsche nationale Anhang.
- **Sattel- und Walmgaube:** Trauf- und Firstlänge sind waagerecht gemessen, ohne Überstand und Holzstärken. Bei der Walmgaube zählt die Firstlänge ab dem Anfallspunkt.
- **Mindestholzdicke:** Gleichungen 8.18 und 8.19 der EN 1995-1-1 sind gegen den Normtext geprüft. Welche Holzarten als spaltempfindlich gelten, regelt der nationale Anhang.
- **Rundung in den Vorlagen:** Zeilen und Summen werden getrennt gerundet, gerechnet wird ungerundet. Die angezeigte Summe kann deshalb in der letzten Stelle von der Summe der angezeigten Zeilen abweichen.
- **Behinderungsanzeige bei Witterung:** Die Aufforderung zur Beseitigung ist abwählbar; ob Witterung überhaupt eine Behinderung ist, regelt § 6 Abs. 2 VOB/B.
- **Aufmaßblatt:** Menge = Anzahl × alle ausgefüllten Maße; die Einheit (Stk, m, m², m³) folgt aus der Zahl der ausgefüllten Maße. Abzüge und Übermessungsregeln der VOB/C werden nicht angewendet.
- **Mindestholzdicke:** Die Ersatzregel bei großen Randabständen ist nicht abgebildet. Im Projektbericht werden lange Listen nach 80 Zeilen gekürzt.
- **Stückliste:** Ein Teil ohne Querschnittsangabe bildet eine eigene Gruppe und wird nicht mit Teilen anderer Querschnitte gemischt.
- **Verschnitt:** Näherungsverfahren. Im Zufallsvergleich mit dem rechnerischen Bestwert lag die frühere Fassung mit mehreren Stangenlängen in gut der Hälfte der Fälle darüber; seitdem werden mehrere Aufteilungen verglichen. Ein Bestwert ist weiterhin nicht garantiert. Jedes Teil bekommt einen Sägeschnitt, auch das letzte, sofern es nicht bündig am Stangenende sitzt. Anschnitt und Fehlstellen sind nicht eingerechnet.
- **Zahleneingabe:** Punkt und Komma sind beide Dezimaltrenner. „1.200“ bedeutet 1,2 und nicht 1200.
- **Englische Fachbegriffe:** nicht von einer Fachkraft gegengelesen. Für „Hexenschnitt“ und „Verstich“ stehen Umschreibungen.

## 5. Bekannte Einschränkungen

- Daten liegen nur im Browser des Geräts. Löscht jemand die Browserdaten, sind Projekte weg, wenn keine Sicherung gespeichert wurde. Auf dem iPhone kann Safari den Speicher selten genutzter Web-Apps nach einigen Wochen leeren.
- Fotos und Unterschriften der Dokumentvorlagen werden nicht gespeichert und sind nach dem Schließen der Seite weg.
- Stammdaten (Absender, Ort, Unterzeichner) gelten für alle Projekte und stehen in der Datensicherung. Im Teilen-Link stehen sie nicht als eigener Eintrag – sobald aber in einem Projekt ein Dokument bearbeitet wurde, sind Absender, Ort und Unterzeichner Teil dieses Dokuments und wandern mit dem Projekt in Link, QR-Code und Sicherung. Dasselbe gilt für die Angaben zum Projekt (Bauvorhaben, Auftraggeber, Auftrag).
- Projektfotos liegen in der IndexedDB des Browsers. Sie stehen im Projektbericht und in der Sicherung, nicht im Teilen-Link. Höchstens 24 je Projekt und 200 insgesamt, damit eine Sicherung noch eingespielt werden kann; sie kann dann um die 100 MB groß werden. Das Einspielen einer Sicherung ersetzt auch die Fotos.
- Im Aufmaßblatt braucht ein Abzug eine negative Anzahl. Die Zahlentastatur des iPhones hat kein Minuszeichen; das muss auf einem echten Gerät geprüft werden.
- In Tabellen der Dokumentvorlagen sind je Zelle 120 Zeichen und je Tabelle 40 Zeilen möglich.
- Die Texte der Dokumentvorlagen stehen im Projekt und wandern damit in einen Teilen-Link, QR-Code oder eine Sicherung. Das sind personenbezogene Daten.
- Die Dokumentvorlagen (Behinderungs- und Bedenkenanzeige, Stundenzettel, Aufmaßblatt, Abnahmeprotokoll, Bautagesbericht) gibt es nur auf Deutsch. Der Stundenzettel kann Namen von Beschäftigten enthalten; das sind personenbezogene Daten.
- Der Neigungsmesser ist nur so genau wie der Sensor des Handys.
- Die Zeichnungen sind maßstäblich, aber keine Werkpläne. Die Fußpfette in der Sparrenzeichnung ist nur angedeutet.
- `npm audit` meldet vier mittlere Hinweise in Paketen, die nur beim Bauen laufen (minimatch über das PWA-Werkzeug). Sie betreffen nicht die ausgelieferte App. Die angebotene Abhilfe wäre ein Rückschritt auf eine ältere Hauptversion.
- Querschnitts- und Bemessungstabellen sind bewusst nicht enthalten.

## 6. Was abgesichert ist

- **Rechenkern:** rund 70 Tests in `src/core/core.test.ts` und `src/core/neu.test.ts`, viele gegen eine zweite, unabhängige Herleitung (Raumgeometrie, Ebenengleichungen).
- **Unabhängige Kontrolle:** Alle bis dahin vorhandenen Formeln wurden ein zweites Mal von Grund auf hergeleitet und mit 3.000 bis 20.000 Zufallsfällen je Gruppe gegengerechnet. Drei Fehler wurden gefunden und behoben (Ziegelreihen, widersprüchliche Dreiecksangaben, Grenzfälle bei Treppe und Einteilung).
- **Übersetzung:** Ein Test stellt sicher, dass jeder sichtbare Text eine englische Fassung hat.
- **Suche:** Ein Test stellt sicher, dass jede Funktion über jedes ihrer Schlagworte gefunden wird.
- **Browsertests** (`npm run e2e`, 11 Abläufe): alle Rechner in beiden Sprachen, Suche, Projekte teilen und sichern, Behinderungsanzeige mit PDF, Neigungsmesser mit simulierten Sensorwerten, Betrieb ohne Netz.
- **Sicherheit:** keine fremden Server, Content-Security-Policy, importierte Daten (Link, QR-Code, Sicherung) werden geprüft und begrenzt.

- **Zweiter Prüflauf:** Gratverschiebung, Schifterraster, Satteldachgaube, Zuschnitt mit mehreren Stangenlängen, Treppe sowie Bolzen und Stabdübel wurden ebenfalls unabhängig nachgerechnet. Gefunden und behoben: ein Tabellenfehler bei Stabdübeln (a3,c bis 30°), eine Abweichung zwischen Projektübersicht und Rechner und eine Schwäche des Zuschnitts mit mehreren Längen. Die Bolzenwerte a1 und a3,t sind jetzt über zwei weitere Quellen bestätigt.

- **Dritter Prüflauf:** Walmgaube, Stückliste mit Querschnitten, die neue Zuschnitt-Fassung, Mindestholzdicke und die Zeichnungen für Gaube und Dachfenster wurden unabhängig nachgerechnet, ohne Rechenfehler. Gefunden und behoben: Der Projektbericht führte ausgeblendete Eingabefelder auf, und die Stückliste deutete einige Schreibweisen still falsch. Der Zuschnitt lag im Zufallsvergleich in etwa 5 % der Fälle über dem rechnerischen Bestwert, im Mittel dann um 6 %.

- **Vierter Prüflauf:** Sparrenliste der Gaube (gegen eine Abtastung der Dachflächen, ohne Befund), Aufmaßblatt, Summen der Vorlagen, Stammdaten, Fotospeicher und Sicherung. Gefunden und behoben: Summen ließen unlesbare Zeilen still weg, das Abnahmeprotokoll konnte sich widersprechen, lange Tabellen konnten beim Neuladen verloren gehen, und eine große Fotosicherung ließ sich nicht wieder einspielen. Die zitierten Paragrafen hielt der Prüfer für plausibel, ohne sie nachzuschlagen.

**Nur gelesen, nicht im Browser nachgestellt:** Verhalten des Fotospeichers bei Fehlern und vollem Speicher, Aussehen mehrseitiger PDFs.

## 7. Befehle

```bash
npm run check   # Typen
npm test        # Rechenkern, Suche, Übersetzung, Anzeigetext
npm run e2e     # Browsertests gegen die gebaute App
npm run build   # nach dist/
```

## KI-Assistent

- [ ] Datenschutztext wegen der Übertragung an die Claude-API juristisch prüfen lassen (Drittlandübermittlung, Hinweis an Nutzer)
- [ ] Mit echtem API-Schlüssel testen: Aufgabe per Text und Diktat, Datenblatt als PDF und als Foto, Fehlermeldungen bei falschem Schlüssel und ohne Netz – bisher nur gegen eine nachgestellte API geprüft
- [ ] Kosten je Anfrage beobachten (Rechnerverzeichnis steht in jeder Anfrage, wird zwischengespeichert)
- [ ] Mit der IT klären, ob und welche API-Schlüssel im Betrieb verwendet werden dürfen

