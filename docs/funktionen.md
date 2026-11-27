# Funktionsumfang und Ausblick

Als Vergleich diente eine verbreitete Zimmerer-App; übernommen wurde nur die Idee, welche Rechnungen auf der
Baustelle gebraucht werden. Formeln sind Standard-Geometrie (Tabellenbuch) und im Rechenkern gegen unabhängige
Kontrollrechnungen getestet. Texte, Skizzen und Aufbau sind eigene.

## Enthalten

- Sparren: Länge, Überstand, Firsthöhe, Lot-/Waagschnitt, Obholz, Kerven an Fuß-, Mittel- und Firstpfette, Traufabschnitt (lotrecht, winkelrecht, Senkel- mit Waagschnitt), Anrissliste mit Kettenmaßen ab Traufpunkt, Mindest-Holzlänge; Details zu Traufe, jeder Kerve und First
- Grat/Kehle: Länge, Neigung, Grundmaße, Grundwinkel, Schifterwinkel, Abgratung, Verstich, Hexenschnitt, Schifterliste (auch ungleiche Neigungen)
- Kehlbalken / Zange: Längen, Abschnitt, Riss am Sparren
- Pultdach, Zelt- und Turmdach über dem Vieleck, Schleppgaube
- Sattel- und Walmgaube: Kehlsparren, Kehlneigung, First- und Trauflänge, Fläche, Grate des vorderen Walms, Grundriss als Zeichnung
- Wechsel am Dachfenster: passt das Fenster ins Sparrenfeld, wie viele Sparren werden gekappt
- Zuschnitt und Verschnitt: Stückliste auf Stangen verteilen, auch mit mehreren Stangenlängen, Querschnitten und Bezeichnungen je Teil, mit Bedarf und Schnittplan
- Mindestabstände nach Eurocode 5 für Nägel, Schrauben, Bolzen und Stabdübel (Tabellen 8.2, 8.4, 8.5, Nachschlagehilfe), Mindestholzdicke ohne Vorbohren
- Ergebnisübersicht je Projekt und Projektbericht als PDF mit Eingaben, allen Ergebnissen, Zeichnungen und Listen
- Zeichnung zum Wechsel am Dachfenster
- Lattung: Lattweite und Reihen innerhalb der Decklängen, Lattenpositionen
  - Auswahl einiger verbreiteter Ziegel und Dachsteine, die die Decklängen vorbelegt (`src/calcs/ziegel.ts`, Richtwerte aus Herstellerunterlagen, Stand 11/2026 – bei Modellwechseln nachziehen)
- Einteilung (Außen-/Eck-/Innenmaß) und Sparreneinteilung, jeweils mit Anrissliste
- Dreiecke: rechtwinklig (zwei beliebige Werte), allgemein (SSS, SWS, WSW, SSW)
- Maßkontrolle: Diagonalen, 3-4-5-Winkel, Neigungsmesser über den Lagesensor
- Neigung umrechnen, Dachfläche, Stichbogen, Treppe, Holzmenge mit Gewicht, Maßstab
- Projekte mit eigenen Eingaben und Notizen, Teilen per Link oder QR-Code, Drucken/PDF
- Maßstäbliche Zeichnungen mit Maßzahlen zu Sparren, Grat mit Schiftern, Kehlbalken, Einteilung und Dreieck
- Zeichnungen als Plandetails (Haarlinien auf weißem Grund) mit Maßketten; blau gesetzte Eingabemaße lassen sich in der Zeichnung antippen und ändern
- Grat-/Kehlsparren wie der Sparren aufgebaut: Seitenansicht in der Gratachse mit Überstand, Traufschnitt, Kerve und Kettenmaßen; Anrissliste ab Traufpunkt (Achse und beide Seitenflächen); Arbeitsfolge in sieben Schritten; Details zu Grundriss mit Schiftern, Gratfuß mit Verstich, Abgratung, Hexenschnitt, Kerve je Seite mit Kettenmaß, Anfallspunkt im Grundriss und in der Seitenansicht
- Details auch für Kehlbalken (Anschluss am Sparren, Werkstück), Pultdach (Traufe, beide Auflager, oberes Ende – mit Sparrenhöhe), Zeltdach (Mittel- und Gratsparren, Dachfläche in wahrer Größe), Schleppgaube (Anschnitt auf dem Hauptdach) und Sattel-/Walmgaube (Querschnitt, Längsschnitt, Kehl- und Gratsparren)
- Bedienung: Sprungleiste über der Programmleiste (Eingabe, Zeichnung, Details, Maße, Listen), Enter springt ins nächste Feld, Auswahl direkt in der Skizze (3-4-5)
- Deutsch und Englisch, umschaltbar auf der Startseite
- Abnahmeprotokoll mit Mängelliste und Bautagesbericht
- Stammdaten des Betriebs und Angaben zum Projekt werden in allen Vorlagen vorbelegt
- Fotos als Notiz im Projekt, mit Beschriftung, im Projektbericht und in der Datensicherung
- Sparrenliste der Gaube (volle Sparren, Kehl- und Gratschifter) und Schifterliste des Walms
- Bedenkenanzeige (VOB/B oder BGB), Stundenzettel für Stundenlohnarbeiten und Aufmaßblatt mit Mengensummen, jeweils mit Unterschriften auf dem Display, Fotos und PDF-Export
- Behinderungsanzeige (VOB/B oder BGB) als Formular mit Unterschrift auf dem Display, Fotos und PDF-Export
- Gratverschiebung bei ungleichen Neigungen, Schifterraster wahlweise ab Gratfuß oder Anfallspunkt
- Schlagwortsuche mit abweichenden Namen und Tippfehlertoleranz
- Datensicherung als Datei, Info-Seite mit Datenschutz und Impressum
- Einheit umschaltbar (mm/cm/m), Favoriten, Suche, Ergebnis kopieren, dunkle Ansicht, offline

## Bewusst nicht enthalten

- **Querschnittstabellen für Balken und Sparren:** Bemessung gehört in die Statik; Richtwerte ohne Nachweis sind ein Haftungsrisiko.
- **Winkelmessung per Kamerabild:** ungenauer als der Lagesensor, den der Neigungsmesser nutzt.

## Offen

Alle offenen Punkte, Unklarheiten und ausstehenden Tests stehen in [veroeffentlichung.md](veroeffentlichung.md).

## Ideen

- Fledermaus- und Tonnengaube (gebogene Dachflächen)
- Kehlschifter auf der Hauptdachseite der Gaube, Schifterliste für Kehlen am Hauptdach
- Skizzen von Hand als Notiz im Projekt
- Weitere Vorlagen: Mängelanzeige an Lieferanten, Lieferschein, Übergabe an Folgegewerk
- Firmenlogo im Briefkopf der Dokumente
- Wochenübersicht der Stundenzettel
- Wirksame Anzahl der Verbindungsmittel und weitere Bemessungshilfen – bewusst zurückgestellt, das ist Statik
- Abstände Verbindungsmittel mit maßstäblicher Detailzeichnung (vier Verbindungsmittel am Holzende, Kraftrichtung, alle Mindestabstände in mm)
- Dreiecke, Diagonalkontrolle, Stichbogen: eine Zeichnung oben statt Skizze, darunter die Feldliste; die Zeichnung folgt jeder Eingabe sofort (auch bei Teilangaben), Maße lassen sich zusätzlich antippen
- Gratsparren: Neigung, Grundmaß, Traufabschnitt und Obholz auf Knopfdruck aus dem Sparren-Rechner übernehmen
- Zuschnitt: Teile, die länger als die längste Stange sind, wahlweise aus mehreren Stangen stoßen
- Dreiecke: Es gelten immer die zuletzt eingetragenen zwei bzw. drei Werte; die übrigen Felder werden geleert und zeigen den berechneten Wert (`loese` in der Rechner-Definition)
- Alle Rechner mit Zeichnung: eine Zeichnung oben statt Skizze, Feldliste darunter. Ohne Eingaben entsteht die Form aus Beispielwerten (`beispiel` in der Rechner-Definition, `src/lib/vorschau.ts`); gezeigt werden nur eingetragene Werte, leere Felder mit ihrem Namen, berechnete Maße erst mit dem Ergebnis
- Dachfläche Satteldach: Eingaben in der gewählten Längeneinheit, Fläche in m²; Querschnitt und Grundriss als Zeichnung; wahlweise zweite Dachneigung mit außermittigem First
- Gratsparren: Abgratungslinie (Kehle: Kehllinie) gestrichelt in Seitenansicht und Anfallspunkt, Gratlinie gestrichelt in den Ansichten der Seitenflächen (Hexenschnitt, Kerve)
- Übersicht merkt die Scrollposition: Zurück aus einer Funktion landet an der verlassenen Stelle
- Treppe: Auftritt wahlweise selbst eintragen, das Schrittmaß wird ausgewiesen und geprüft
- Treppe: Schnittzeichnung, wahlweise vorgegebene Lauflänge (Stufenzahl nach Schrittmaß), Stufenteilung auf der Wange
- Geländerstäbe: gleichmäßige Verteilung mit Höchstmaß für den lichten Abstand, Laufmaße, wahlweise auf die Schräge umgerechnet

## KI-Assistent (freiwillig)

- Nur aktiv, wenn der Nutzer einen eigenen API-Schlüssel der Claude-API hinterlegt; der Schlüssel liegt getrennt von den Projektdaten im Speicher des Geräts (`holzbau.ki`) und kommt in keine Sicherung und keinen Teilen-Link
- Aufgabe eintippen oder diktieren: Das Modell wählt den Rechner und nennt die Eingaben, gerechnet wird vom Rechenkern (`src/lib/kiwerkzeug.ts`); die Eingaben lassen sich mit einem Knopf in den Rechner übernehmen
- Datenblatt (PDF oder Foto) lesen: Decklängen als Vorschlag mit Fundstelle, nach Prüfung als eigener Ziegel für den Lattungs-Rechner speicherbar
- Übertragen werden nur die Frage, die Eingaben abgefragter Rechner und das Datenblatt – keine Projektnamen, Stammdaten oder Notizen (im Browser-Test geprüft)

