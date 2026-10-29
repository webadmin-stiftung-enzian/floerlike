# Einrichtung: Schaufenster auf der Shop-Seite

Diese Schritte passieren **im WordPress-Admin**, nicht im Code. Wie alles
technisch zusammenhängt, erklärt [ARCHITEKTUR.md](ARCHITEKTUR.md).

Das Schaufenster zeigt auf der Shop-Seite eine **Zeile je Produktkategorie**
(Überschrift + Slider) und darüber einen **Filter** aus Schlagwörtern, z. B.
„Valentinstag“. Ein Klick auf einen Filter zeigt in jeder Zeile nur noch die
passenden Produkte; Zeilen ohne Treffer verschwinden ganz. Ein zweiter Klick
hebt den Filter auf.

Voraussetzung: WooCommerce ist aktiv. Ohne WooCommerce lässt WordPress das
Plugin gar nicht erst aktivieren.

## 1. Schlagwörter für den Filter einrichten

Produkte → **Schlagwörter** → ein Schlagwort bearbeiten (oder neu anlegen).
Unten stehen vier zusätzliche Felder:

| Feld | Bedeutung |
|---|---|
| **Im Filter zeigen** | Nur eingeschaltete Schlagwörter werden zu Filter-Knöpfen. |
| **Sichtbar von / bis** | Optional. Zeitraum, in dem der Knopf erscheint. Leer = immer. |
| **Jährlich wiederholen** | An: nur Tag und Monat zählen, der Zeitraum gilt jedes Jahr. Darf über den Jahreswechsel gehen (1.12.–6.1.). |
| **Reihenfolge im Filter** | Kleinere Zahl = weiter vorne, bei Gleichstand alphabetisch. |

Beispiel Valentinstag: Im Filter zeigen an, von 20.01. bis 14.02., jährlich
wiederholen an. Der Knopf erscheint dann jedes Jahr vom 20. Januar bis zum
14. Februar – die Produkte behalten ihr Schlagwort das ganze Jahr.

In der Liste der Schlagwörter zeigt die Spalte **„Im Filter“**, welche
gerade als Knopf erscheinen.

Dann das Schlagwort wie gewohnt an die Produkte hängen (Produkt bearbeiten →
Schlagwörter). Ein Knopf erscheint nur, wenn mindestens ein Produkt im
Schaufenster das Schlagwort trägt – sonst führte er ins Leere.

## 2. Schaufenster ins Template setzen

1. Site Editor → **Templates → Produktkatalog** („Product Catalog“) öffnen.
2. Den Block **„Schaufenster“** einfügen (Kategorie „Schaufenster“). Er legt
   automatisch an:

   | Block | Aufgabe |
   |---|---|
   | Filter | Knöpfe aus den Filter-Schlagwörtern |
   | Zeile (2×) | Überschrift + Produktsammlung einer Kategorie als Slider |
   | Kein Treffer | Hinweis, wenn ein Filter nirgends etwas übrig lässt |

3. **In jeder Zeile die Kategorie wählen:** Die Produktsammlung zeigt beim
   Einfügen gleich die Kategorie-Auswahl – anhaken, **Done**. Später ändern:
   Produktsammlung auswählen → Seitenleiste → Filter → Produktkategorien.
4. **Überschrift** der Zeile eintragen, z. B. „Für jeden Anlass“.
5. **Weitere Zeilen:** Im Schaufenster den Block „Zeile“ einfügen. Zeilen gibt
   es nur innerhalb des Schaufensters, beliebig viele.
6. **Frei gestalten:** Zwischen und in den Zeilen dürfen beliebige Blöcke
   stehen (Texte, Bilder, Gruppen …). Auch die Produktkarte (Bild, Titel,
   Preis …) lässt sich in der Produktsammlung wie gewohnt umbauen.

Eine Zeile, in der kein Produkt steht (leere Kategorie, keine Kategorie
gewählt), erscheint auf der Seite gar nicht – auch ihre Überschrift nicht.

## 3. Einstellungen

| Block | in der Seitenleiste |
|---|---|
| Schaufenster | **Vorschau → Vorschau-Filter** (siehe 4.), Abstand zwischen den Blöcken |
| Filter | Beschriftung („Filter zur feineren Auswahl“) |
| Zeile | Abstand zwischen Überschrift und Slider |
| Produktsammlung (Stil „Swiper Slider“) | **Slider:** sichtbare Produkte Desktop / Tablet / Handy, letzte Karte anschneiden, Pfeile, Punkte |
| Kein Treffer | Beschriftung des Knopfs („Filter aufheben“) |

„Produkte pro Seite“ der Produktsammlung heisst hier: so viele Produkte
stehen höchstens im Slider (Vorlage: 24). Der Filter wählt nur unter diesen
aus.

Das Panel **Slider** gibt es an jeder Produktsammlung mit dem Stil
„Swiper Slider“, auch ausserhalb des Schaufensters.

## 4. Im Editor prüfen: Vorschau-Filter

Im Editor einfach auf einen **Filter-Knopf** klicken – ein zweiter Klick hebt
den Vorschau-Filter wieder auf, der gewählte Knopf erscheint gedrückt. Oder:
Schaufenster auswählen → Seitenleiste → **Vorschau → Vorschau-Filter**. Zur
Wahl stehen alle Schlagwörter mit „Im Filter zeigen“, auch solche ausserhalb
ihres Zeitraums (markiert). Ausgegraut wird, was bei diesem Filter auf der
Seite verschwinden würde:

- Zeilen ohne passendes Produkt,
- in den übrigen Zeilen die einzelnen unpassenden Produkte,
- „Kein Treffer“, solange noch eine Zeile übrig bliebe.

Unter der Auswahl steht das Ergebnis, z. B. „1 von 2 Zeilen hätten
Produkte“. Auf der Seite bewirkt die Einstellung nichts. Zurück auf **Kein
Filter** stellen, wenn du fertig bist.

Einzelne Produkte erkennt der Editor am verlinkten Titel. Fehlt der Titel in
der Produktkarte oder ist er nicht verlinkt, bleiben die Produkte normal; die
Zeilen werden trotzdem richtig ausgegraut.

## 5. Auf der Seite

- **Filter in der Adresse:** Ein Klick schreibt den Filter in die Adresse,
  z. B. `…/shop/?filter=valentinstag`. Diesen Link kann man teilen: Die Seite
  kommt dann schon gefiltert an.
- Ein unbekannter oder gerade nicht sichtbarer Filter in der Adresse wird
  übergangen – die Seite erscheint ungefiltert.
- Der Parameter heisst bewusst `filter` und nicht `product_tag`: Mit
  `product_tag` würde WordPress die Shop-Seite in die Seite des Schlagworts
  verwandeln.

## 6. Varianten in der Produktkarte: „Varianten-Spanne“

Der Block **„Varianten-Spanne“** (Kategorie „Schaufenster“) zeigt in einer
Produktkarte, welche Varianten es gibt, z. B. „Grösse: klein – gross“ oder
„Grösse: ca. 35 – 55 cm Ø“. In der Produktsammlung die Produktvorlage
öffnen und den Block z. B. unter den Titel setzen. Er funktioniert in jeder
Produktsammlung und auch auf der Produktseite.

| Einstellung | Bedeutung |
|---|---|
| Beschriftung | z. B. „Grösse“; leer = ohne |
| Attribut | nach dem die Varianten gebildet sind, z. B. „Strauss Variation Grösse“ |
| Wert aus der Variante | **Attributwert** (erster bis letzter in der Reihenfolge der Variationen am Produkt), **Regulärer Preis**, **Preis (aktuell)**, **Durchmesser** (aus dem Grusskarten-Plugin) – Zahlen von klein bis gross |

Produkte ohne dieses Attribut zeigen nichts. Es zählen alle kaufbaren
Varianten, auch ausverkaufte.

**Einzelwert statt Spanne, z. B. „ab CHF 35.00“:** Im Einfügen-Menü gibt es
dafür die fertige Variante **„Ab-Preis“**. Sie ersetzt den Preis-Block von
WooCommerce: „ab CHF 35.00“ bei Produkten mit Varianten, der normale Preis
bei einfachen Produkten. Dieselben Einstellungen gibt es an jeder
Varianten-Spanne:

| Einstellung | Bedeutung |
|---|---|
| Darstellung | Spanne · kleinster Wert · grösster Wert (bei Attributwerten: erster/letzter) |
| Text davor / danach | z. B. „ab“, „von“ |
| Zusatztext nur bei mehreren Werten | an: ein Produkt mit nur einem Preis zeigt „CHF 35.00“ statt „ab CHF 35.00“ |
| Auch bei einfachen Produkten | an (Ab-Preis): einfache Produkte zeigen ihren Preis bzw. Durchmesser (Feld im Tab „Versand“). Aus (Standard der Spanne): einfache Produkte zeigen nichts – neben dem Preis-Block von WooCommerce steht dann kein Preis doppelt |

Bei Preisen und Durchmesser ist das Attribut optional („Alle Varianten“).
Preise erscheinen wie bei WooCommerce (Steuer-Anzeige des Shops, nie
negativ).

Zwei typische Kombinationen in der Produktkarte:

- **Preis-Block + Spanne:** Preis von WooCommerce, darunter die Spanne nur
  bei Varianten.
- **Nur „Ab-Preis“** (z. B. im Schaufenster): ohne Preis-Block von
  WooCommerce.

### Begriffsliste, z. B. die Blumen eines Strausses

Der Block **„Begriffsliste“** zeigt die Werte eines Attributs als Liste,
z. B. „Blumen: Dahlien, Rosen, Sonnenhut“ – in der Produktkarte oder auf der
Produktseite.

1. **Attribut anlegen** (einmal): Produkte → Attribute → z. B. „Blumen“, mit
   den Blumen als Werten. Reihenfolge der Werte per Ziehen, wenn „Eigene
   Reihenfolge“ gewünscht ist.
2. **Am Produkt:** Produktdaten → Attribute → „Blumen“ hinzufügen, Blumen
   wählen (neue mit „Neu erstellen“). „Für Variationen verwenden“ nicht
   anhaken.
3. **Block setzen:** in die Produktvorlage der Produktsammlung bzw. ins
   Template „Single Product“.

| Einstellung | Bedeutung |
|---|---|
| Quelle | ein globales Attribut, Kategorien oder Schlagwörter |
| Sortierung | wie beim Attribut eingestellt · eigene Reihenfolge · Name A–Z · Name Z–A |
| Beschriftung | z. B. „Blumen:“; leer = ohne |
| Trennzeichen | Standard „, “ |
| Verlinken | jede Blume mit ihrer Übersichtsseite (nur bei Attributen mit „Archive aktivieren“) |

Produkte ohne Werte in dieser Quelle zeigen nichts.

## 7. Kategorie- und Schlagwort-Seiten

Ohne eigenes Template nimmt WordPress für Kategorie- und Schlagwort-Seiten
ebenfalls „Produktkatalog“ – samt Schaufenster. Dafür im Site Editor die
Templates **„Products by Category“** und **„Products by Tag“** anlegen, mit
einer normalen Produktsammlung, die die Kategorie bzw. das Schlagwort der
Seite übernimmt.

## 8. Nach Updates prüfen

Nach einem Update von **WooCommerce** (oder WordPress) einmal die Shop-Seite
ansehen:

1. Ohne Filter: alle Zeilen da, Slider blättert, Pfeile links unten.
2. Einen Filter anklicken: unpassende Produkte und leere Zeilen weg, Adresse
   enthält `?filter=…`.
3. Denselben Filter noch einmal: alles wieder da, Adresse ohne `filter`.
4. Die Adresse mit `?filter=…` neu laden: Seite kommt gefiltert, Knopf
   gedrückt.
5. Im Editor: Vorschau-Filter wählen, Ausgrauen stimmt mit der Seite überein.

Was dabei brechen kann, steht in [ARCHITEKTUR.md](ARCHITEKTUR.md), Kapitel 8.
