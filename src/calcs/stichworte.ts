/**
 * Schlagworte je Funktion: andere Namen, Fachbegriffe, Umgangssprache, Markennamen, Englisch.
 * Sie werden nur durchsucht, nicht angezeigt – deshalb auch nicht übersetzt.
 * Der Test prüft, dass jede Funktion Schlagworte hat und über jedes davon gefunden wird.
 */
export const STICHWORTE: Record<string, string[]> = {
  sparren: ['Sparrenlänge', 'Dachsparren', 'Kerve', 'Klaue', 'Sattel', 'Obholz', 'Aufholz', 'Lotschnitt', 'Senkel', 'Senkelschnitt', 'Waagschnitt', 'Abbund', 'Fußpfette', 'Firsthöhe', 'Pfettendach', 'rafter', 'birdsmouth'],
  grat: ['Gratsparren', 'Kehlsparren', 'Kehle', 'Walm', 'Walmdach', 'Krüppelwalm', 'Schifter', 'Schiftung', 'Schiftsparren', 'Hexenschnitt', 'Abgratung', 'Verstich', 'Backenschmiege', 'Gratgrundmaß', 'Gratlänge', 'hip', 'valley', 'jack rafter'],
  kehlbalken: ['Kehlbalkenlage', 'Zange', 'Zangen', 'Doppelzange', 'Hahnenbalken', 'Kehlriegel', 'Kehlbalkendach', 'Spitzboden', 'collar tie'],
  pultdach: ['Schleppdach', 'Anbau', 'Carport', 'Vordach', 'Garage', 'einseitig', 'Flachdach', 'Gefälledach', 'lean-to', 'mono pitch', 'shed roof'],
  zeltdach: ['Pyramidendach', 'Turmdach', 'Turmhelm', 'Pavillon', 'Vieleck', 'Sechseck', 'Achteck', 'Gartenhaus', 'pyramid', 'turret'],
  gaube: ['Dachgaube', 'Gaupe', 'Dachgaupe', 'Schleppgaupe', 'Dachaufbau', 'Dachausbau', 'Wange', 'dormer'],
  sattelgaube: ['Giebelgaube', 'Giebelgaupe', 'Satteldachgaupe', 'Spitzgaube', 'Dachgaube', 'Gaupe', 'Walmgaube', 'Kehle', 'Kehlsparren', 'Kehlbohle', 'Dachaufbau', 'Zwerchhaus', 'gable dormer'],
  dachfenster: ['Auswechslung', 'Wechselbalken', 'Wechsel', 'Dachflächenfenster', 'Wohndachfenster', 'Velux', 'Roto', 'Fakro', 'Einbau', 'Sparrenfeld', 'Füllholz', 'trimmer', 'roof window', 'skylight'],
  lattung: ['Dachlatten', 'Dachlattung', 'Lattenabstand', 'Lattmaß', 'Lattweite', 'Lattung', 'einlatten', 'Decklänge', 'Deckmaß', 'Dachziegel', 'Dachstein', 'Dachpfanne', 'Pfannen', 'Biberschwanz', 'Konterlattung', 'Traglattung', 'Eindeckung', 'LAF', 'batten', 'tile'],
  dachflaeche: ['Dachfläche', 'Quadratmeter', 'qm', 'm²', 'Flächenberechnung', 'Aufmaß', 'Materialbedarf', 'Eindeckung', 'roof area'],
  neigung: ['Dachneigung', 'Neigungswinkel', 'Gefälle', 'Steigung', 'Grad', 'Prozent', 'Umrechnung', 'Gradzahl', 'DN', 'pitch', 'slope'],
  einteilung: ['Zaun', 'Lattenzaun', 'Staketen', 'Sprossen', 'Pfosten', 'Latten', 'Teilung', 'Aufteilung', 'Abstand', 'gleichmäßig', 'Feldbreite', 'lichtes Maß', 'Achsabstand', 'Unterkonstruktion', 'Schalung', 'spacing', 'baluster'],
  sparreneinteilung: ['Sparrenabstand', 'Sparrenlage', 'Balkenlage', 'Balkenabstand', 'Achsmaß', 'Achsabstand', 'Anriss', 'Pfette', 'Raster', 'Aufteilung', 'rafter spacing'],
  diagonale: ['Diagonalmaß', 'Diagonale', 'Rechteck', 'Winkelkontrolle', 'im Winkel', 'winklig', 'Kreuzmaß', 'Stichmaß', 'Übereckmaß', 'Pythagoras', 'Fundament', 'Bodenplatte', 'Schnurgerüst', 'square check'],
  '345': ['Maurerdreieck', 'Pythagoras', 'rechter Winkel', '90 Grad', 'Winkel abstecken', 'einmessen', 'Schnurgerüst', '6-8-10', '3 4 5', 'right angle'],
  rechtwinklig: ['Pythagoras', 'Hypotenuse', 'Kathete', 'Sinus', 'Cosinus', 'Kosinus', 'Tangens', 'Trigonometrie', 'Winkelfunktionen', 'Winkel berechnen', 'right triangle'],
  dreieck: ['Sinussatz', 'Kosinussatz', 'Trigonometrie', 'schiefwinklig', 'Umkreis', 'Inkreis', 'Heron', 'Dreiecksfläche', 'Winkel berechnen', 'triangle'],
  bogen: ['Rundbogen', 'Segmentbogen', 'Kreisbogen', 'Bogenradius', 'Radius', 'Sehne', 'Pfeilhöhe', 'Stichhöhe', 'Tonnendach', 'Bogenfenster', 'arch'],
  neigungsmesser: ['Wasserwaage', 'Winkelmesser', 'Neigung messen', 'Libelle', 'Lot', 'Sensor', 'Inklinometer', 'Gefälle messen', 'spirit level', 'inclinometer'],
  gelaender: ['Geländer', 'Stäbe', 'Sprossen', 'Staketen', 'Baluster', 'Brüstung', 'Handlauf', 'Treppengeländer', 'Stababstand', 'railing', 'balusters'],
  treppe: ['Lauflänge', 'Wange', 'Treppenrechner', 'Stufen', 'Stufenhöhe', 'Steigung', 'Auftritt', 'Schrittmaß', 'Schrittmaßregel', 'Treppenwange', 'Geschosshöhe', 'Blockstufe', 'stairs', 'staircase'],
  holz: ['Kubikmeter', 'Festmeter', 'cbm', 'm³', 'Volumen', 'Gewicht', 'Laufmeter', 'lfm', 'Kantholz', 'Balken', 'Rohdichte', 'Holzliste', 'Holzbedarf', 'Bestellung', 'timber', 'lumber'],
  massstab: ['Plan', 'Zeichnung', 'Umrechnung', 'Planmaß', '1:50', '1:100', 'M 1:', 'scale'],
  verschnitt: ['Zuschnitt', 'Zuschnittliste', 'Schnittliste', 'Schnittplan', 'Stückliste', 'Optimierung', 'Stangenware', 'Reststück', 'Abschnitt', 'Kappliste', 'Stangenlänge', 'Lagerlänge', 'Verschnittoptimierung', 'Querschnitt', 'Materialliste', 'Holzliste', 'cutting list', 'cut list'],
  abstaende: ['Bolzen', 'Stabdübel', 'Passbolzen', 'Gewindestange', 'Schlüsselschraube', 'Bolzenabstand', 'Mindestholzdicke', 'Vorbohren', 'Spalten', 'Nagelabstand', 'Schraubenabstand', 'Randabstand', 'Mindestabstand', 'Verbindungsmittel', 'Nägel', 'Schrauben', 'Nagelbild', 'Eurocode', 'EC5', 'Hirnholz', 'nail', 'screw'],
  bedenken: ['Bedenken', 'Bedenkenanmeldung', 'Bedenkenhinweis', 'Hinweispflicht', 'Prüfpflicht', 'VOB', 'Mangel', 'Vorleistung', 'Vorgewerk', 'Haftung', 'Haftungsfreistellung', 'Schreiben', 'Brief', 'Formular', 'Vordruck', 'PDF', 'Unterschrift'],
  stundenzettel: ['Regiebericht', 'Regiezettel', 'Regiearbeit', 'Regie', 'Tagelohn', 'Tagelohnzettel', 'Stundenlohn', 'Stundenlohnzettel', 'Stundennachweis', 'Rapport', 'Rapportzettel', 'Arbeitsnachweis', 'Zeiterfassung', 'Arbeitszeit', 'Gegenzeichnung', 'Formular', 'PDF', 'Unterschrift', 'timesheet'],
  aufmass: ['Aufmaß', 'Aufmass', 'Aufmaßblatt', 'Mengenermittlung', 'Massenermittlung', 'Abrechnung', 'Mengen', 'Flächen', 'Quadratmeter', 'Kubikmeter', 'Laufmeter', 'gemeinsames Aufmaß', 'Formular', 'PDF', 'Unterschrift'],
  abnahme: ['Abnahme', 'Bauabnahme', 'Übergabe', 'Übergabeprotokoll', 'Schlussabnahme', 'Teilabnahme', 'Mängelliste', 'Mängel', 'Restarbeiten', 'Gewährleistung', 'Vorbehalt', 'VOB', 'Formular', 'PDF', 'Unterschrift'],
  bautagebuch: ['Bautagebuch', 'Tagesbericht', 'Bautagesbericht', 'Baustellenbericht', 'Bauprotokoll', 'Wetter', 'Personal', 'Dokumentation', 'Tagebuch', 'Formular', 'PDF', 'Unterschrift', 'site diary'],
  behinderung: ['Baubehinderung', 'Behinderung', 'VOB', 'Verzug', 'Bauverzug', 'Baustopp', 'Stillstand', 'Anzeige', 'Schreiben', 'Brief', 'Formular', 'Vordruck', 'PDF', 'Unterschrift', 'Mehrkosten', 'Fristverlängerung', 'Bauzeit'],
}
