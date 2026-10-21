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

## 6. Kategorie- und Schlagwort-Seiten

Ohne eigenes Template nimmt WordPress für Kategorie- und Schlagwort-Seiten
ebenfalls „Produktkatalog“ – samt Schaufenster. Dafür im Site Editor die
Templates **„Products by Category“** und **„Products by Tag“** anlegen, mit
einer normalen Produktsammlung, die die Kategorie bzw. das Schlagwort der
Seite übernimmt.

## 7. Nach Updates prüfen

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
