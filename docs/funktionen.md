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
- Neigung umrechnen, Dachfläche, Stichbogen, Treppe, Holzmenge mit Gewicht, Maßstab, Holzstern
- Projekte mit eigenen Eingaben und Notizen, Teilen per Link oder QR-Code, Drucken/PDF
- Maßstäbliche Zeichnungen mit Maßzahlen zu Sparren, Grat mit Schiftern, Kehlbalken, Einteilung, Dreieck und Stern
- Zeichnungen als Plandetails (Haarlinien auf weißem Grund) mit Maßketten; blau gesetzte Eingabemaße lassen sich in der Zeichnung antippen und ändern
- Grat-/Kehlsparren: Details zu Seitenansicht, Gratfuß mit Verstich, Abgratung, Hexenschnitt, Anfallspunkt mit Backen und Kerve über der Pfettenecke
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
