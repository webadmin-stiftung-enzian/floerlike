# Spezifikation v1: Produkt-Schaufenster mit Filter

**Status:** Überarbeitung 2 – alle Entscheidungen getroffen (Kapitel 13),
bereit zur Umsetzung.
**Vorbild:** der Rahmen „Grusskarten-Kauf“ aus `greeting-card-block` – gleiche
Bauweise (Rahmen + Innenblöcke, gemeinsamer Interactivity-Store).
**Einsatzort:** die normale Shop-Seite (Template „Produktkatalog“ im Site
Editor).

---

## 1. Ziel

Eine Seite wie im Entwurf: mehrere **Zeilen**, jede mit einer Überschrift
(„Für jeden Anlass“, „Grünes für drinnen“ …) und einem **Slider** mit den
Produkten einer Kategorie. Darüber ein **Filter** aus Schlagwörtern
(Tags), z. B. „Valentinstag“:

- Ein Klick auf einen Filter zeigt in jeder Zeile nur noch die Produkte mit
  diesem Tag. Ein zweiter Klick auf denselben Filter hebt ihn auf. Es ist
  immer höchstens ein Filter aktiv; einen Knopf „Alle“ gibt es nicht.
- Bleibt in einer Zeile nichts übrig, verschwindet die **ganze Zeile**
  samt Überschrift.
- Bleibt überall nichts übrig, erscheint ein Hinweis („Für diesen Anlass
  haben wir gerade nichts – schau bald wieder vorbei“).
- Kein Neuladen der Seite; der Filter steht trotzdem in der Adresse, damit
  man den Link teilen kann.

Alles als Blöcke im Editor, mit Innenblöcken: Überschriften, Texte, Bilder
dürfen frei zwischen und in den Zeilen stehen.

---

## 2. Begriffe

| Begriff | Bedeutung |
|---|---|
| **Schaufenster** | der Rahmenblock um alles (wie „Grusskarten-Kauf“) |
| **Filter** | die Knöpfe oben („Valentinstag“, „Muttertag“ …) |
| **Zeile** | Überschrift + Slider mit den Produkten einer Kategorie |
| **Filter-Tag** | ein Schlagwort, das als Filter-Knopf erscheinen darf |

---

## 3. Woher die Daten kommen

**Zeilen = Produktkategorien.** Jede Zeile zeigt eine Kategorie
(„Sträusse“, „Zimmerpflanzen“ …).

**Filter = Schlagwörter (Tags).** Das Problem dabei: Nicht jedes Tag soll
immer ein Filter sein. „Valentinstag“ nur im Februar, „art“ oder „design“
(Grusskarten) nie. Tags von den Produkten zu nehmen und später wieder
anzuhängen, wäre umständlich und fehleranfällig.

**Lösung: Schalter am Tag selbst.** Das Plugin ergänzt die Bearbeitung
eines Schlagworts (Produkte → Schlagwörter → bearbeiten) um:

| Feld | Bedeutung |
|---|---|
| **Im Filter zeigen** | ein/aus – nur eingeschaltete Tags werden zu Filter-Knöpfen |
| **Sichtbar von / bis** | optional: Zeitraum, in dem der Knopf erscheint (z. B. 20.1.–14.2.). Leer = immer, solange „Im Filter zeigen“ an ist. |
| **Jährlich wiederholen** | an: nur Tag und Monat zählen, der Zeitraum gilt jedes Jahr (Valentinstag, Muttertag, Weihnachten). Aus: einmaliger Zeitraum mit Jahr (z. B. eine Aktion). |
| **Reihenfolge** | Zahl für die Reihenfolge der Knöpfe |

Ein jährlicher Zeitraum darf über den Jahreswechsel gehen (z. B. 1.12.–6.1.):
liegt „bis“ vor „von“, gilt er von „von“ bis Jahresende und von Jahresanfang
bis „bis“. Ein 29.2. wird in Nicht-Schaltjahren wie der 28.2. behandelt.

Gespeichert als Term-Meta am Tag (wie das Feld „Durchmesser“ an der
Variation). Die Zuordnung Tag ↔ Produkt bleibt immer stehen; abgeschaltet
wird nur der Knopf. In der Tag-Liste zeigt eine zusätzliche Spalte, welche
Tags gerade im Filter stehen.

Zusätzlich erscheint ein Knopf nur, wenn mindestens ein Produkt im
Schaufenster dieses Tag hat – sonst führte er immer ins Leere.

---

## 4. Grundidee: WooCommerce wiederverwenden

Jede Zeile enthält den WooCommerce-Block **„Produktsammlung“** (Kategorie,
Anzahl, Sortierung, Gestaltung der Produktkarte mit den WooCommerce-Blöcken
für Bild, Titel, Preis …). Abfrage, Produktkarte und Editor-Vorschau gibt es
damit fertig.

Der Server liefert pro Zeile **alle** Produkte der Kategorie (bis zu einer
Obergrenze, z. B. 24). Jedes Produkt trägt seine Tags schon als CSS-Klasse
(geprüft: `<li class="wc-block-product … product_tag-design …">`). Der
Filter blendet im Browser nur aus – kein neuer Request. Das passt, weil ein
Filter die Menge nur verkleinert, nie vergrössert.

---

## 5. Die Blöcke

Ein Plugin `product-showcase-block`, aufgebaut wie `greeting-card-block`
(mehrere Blöcke, ein gemeinsamer Store, `build/blocks-manifest.php`).

### 5.1 Schaufenster (Rahmen) – `product-showcase/showcase`

- Innenblöcke frei (beliebige Blöcke, auch Gruppen und Spalten).
- Vorlage beim Einfügen: Filter, zwei Zeilen, „Kein Treffer“.
- Hält den gemeinsamen Zustand: welches Tag aktiv ist.

### 5.2 Filter – `product-showcase/filter`

- Knöpfe in der Optik `button outline` (wie die Variantenauswahl), der
  aktive mit `is-selected`.
- Zeigt die Tags mit „Im Filter zeigen“ (Kapitel 3), in deren
  Reihenfolge, und nur die, die im Schaufenster vorkommen.
- Klick wählt, zweiter Klick auf denselben Knopf hebt auf. Technisch
  `<button aria-pressed="true|false">` statt Radio-Buttons, weil man
  Radio-Buttons nicht wieder abwählen kann.
- Einstellung: Beschriftung („Filter zur feineren Auswahl“).
- Nur innerhalb des Schaufensters, einmal.

### 5.3 Zeile – `product-showcase/row`

- Innenblöcke frei; Vorlage: Überschrift + Produktsammlung (Stil „Swiper
  Slider“, Layout Raster, Kategorie vorbelegt).
- Blendet sich **selbst** aus, wenn in ihr kein Produkt sichtbar bleibt –
  samt Überschrift und allem, was in der Zeile steht. Deshalb ein eigener
  Block und nicht nur eine Gruppe.
- Nur innerhalb des Schaufensters (`ancestor`), beliebig oft.

### 5.4 Kein Treffer – `product-showcase/empty`

- Innenblöcke frei (Text, Bild, Knopf „Filter aufheben“ …).
- Sichtbar nur, wenn alle Zeilen ausgeblendet sind.

### 5.5 Slider-Einstellungen an der Produktsammlung

Kein eigener Block, sondern eine **Erweiterung der Produktsammlung**
(wie das Feld „Variante“ am Block „Produkt“), sichtbar beim Stil
„Swiper Slider“ – auch ausserhalb des Schaufensters:

| Einstellung | Standard |
|---|---|
| Sichtbare Produkte Desktop / Tablet / Handy | „Spalten“ der Produktsammlung / höchstens 2 / 1 – wie vor dem Umzug |
| **Letzte Karte anschneiden** | aus (siehe Kapitel 6) |
| Pfeile anzeigen | an, immer sichtbar |
| Punkte anzeigen | an – wie vor dem Umzug |

„Produkte pro Seite“ der Produktsammlung bedeutet hier: Produkte im Slider
insgesamt. Ein Hinweis im Panel sagt das.

---

## 6. „Letzte Karte anschneiden“ für alle Swiper-Slider

Einheitlicher Schalter bei **unseren eigenen** Swiper-Slidern. Technisch
heisst das: statt z. B. 3 sichtbaren Folien 3.3 – die vierte schaut am
Rand hervor und zeigt, dass es weitergeht.

| Block | Umsetzung |
|---|---|
| Produktsammlung (Stil „Swiper Slider“) | eigener Slider-Start (Kapitel 5.5) |
| Grusskarten-Auswahl | neue Einstellung im Block |

Der Block „Carousel“ (Plugin „Carousel Block“) bleibt bewusst aussen vor:
Er liest die Anzahl mit `parseInt` (3.3 → 3), Kommawerte gingen nur über
einen Umweg durch seine Breakpoints, der bei jedem Plugin-Update brechen kann.

Der Anteil (0.3) ist fest; auf Wunsch einstellbar.

---

## 7. Ablauf eines Filterklicks

```
 Server (Seite wird geladen)
 ① Jede Zeile rendert ihre Produktsammlung mit allen Produkten der Kategorie.
 ② Steht ?filter=valentinstag in der Adresse, markiert der Server schon jetzt
    unpassende Produkte und leere Zeilen als ausgeblendet (hidden) – kein
    Aufblitzen beim Laden.

 Browser
 ③ Klick auf „Muttertag“ → action toggleTag → state.activeTag = "muttertag",
    Adresse per history.replaceState auf ?filter=muttertag.
    Zweiter Klick → state.activeTag = null, Parameter weg.
 ④ Jede Zeile zählt ihre passenden Produkte (Klasse product_tag-muttertag).
    0 → Zeile hidden. Sonst: unpassende Folien raus, Swiper.update().
 ⑤ Alle Zeilen hidden → „Kein Treffer“ sichtbar.
```

**Name des Parameters:** nicht `product_tag` – das ist der WordPress-eigene
Parameter für Tag-Archive; damit würde WordPress die Shop-Seite in ein
Tag-Archiv verwandeln. Deshalb ein eigener Name, z. B. `?filter=`.

**Technischer Knackpunkt:** Swiper kommt mit versteckten Folien nicht
zurecht (er rechnet sie mit). Unpassende Folien werden deshalb aus dem
Slider herausgenommen und zwischengespeichert, beim Aufheben wieder
eingefügt, jeweils mit `swiper.update()` und Sprung auf die erste Folie.

---

## 8. Abhängigkeiten zwischen Plugins und Theme

Mit dem Umzug des Slider-Starts ins Plugin entstehen Querverweise. Regeln:

**8.1 Wer braucht wen – nur in eine Richtung**

```
 WooCommerce  ←  product-showcase-block  ←(Optik)  Theme floerlike
 WooCommerce  ←  greeting-card-block     ←(Optik)  Theme floerlike
```

- Plugins hängen von **WooCommerce** ab. Das steht im Plugin-Kopf
  (`Requires Plugins: woocommerce`, seit WordPress 6.5): WordPress lässt das
  Plugin dann nur bei aktivem WooCommerce aktivieren und WooCommerce nicht
  deaktivieren, solange das Plugin aktiv ist. Beim Grusskarten-Plugin wird
  das nachgetragen.
- Plugins hängen **nicht** vom Theme ab: ohne Theme funktionieren sie, sehen
  nur schlichter aus (Ersatz-Optik in `:where()`, wie beim Grusskarten-Kauf).
- Das Theme hängt **nicht** von den Plugins ab: es liefert nur Optik
  (Klassen `.slider`, `.button`). Fehlt ein Plugin, greifen diese Regeln
  einfach nicht.
- Die beiden Plugins kennen sich **nicht** gegenseitig.

**8.2 Was vom Theme ins Plugin umzieht**

| heute im Theme | künftig |
|---|---|
| Block-Stil „Swiper Slider“ für die Produktsammlung (`functions.php`) | Plugin – sonst gäbe es den Stil ohne Funktion, wenn das Plugin aus ist |
| Pfeile/Punkte anhängen (`render_block`-Filter in `functions.php`) | Plugin |
| `product-slider.js` | Plugin, als Teil des Slider-Starts |
| Swiper-Bibliothek (`assets/swiper/`, auf **jeder** Seite geladen) | Plugin, nur auf Seiten mit Slider |
| Optik der Pfeile und Punkte (`.slider` in `main.css`) | bleibt im Theme |

Wird das Theme gewechselt, bleiben die Slider damit funktionsfähig.

**8.3 Swiper liegt heute dreimal vor**

| wo | Version |
|---|---|
| Theme `assets/swiper/` | 14.0.2 |
| `greeting-card-block` (npm) | ^12.2 |
| Plugin „Carousel Block“ | eigene Kopie |

Vorschlag: `product-showcase-block` bringt Swiper über npm mit (wie das
Grusskarten-Plugin), beide auf dieselbe Hauptversion; die Theme-Kopie
entfällt. Die Kopie des Carousel-Plugins lässt sich nicht beeinflussen.
Stehen Grusskarten-Auswahl und Schaufenster auf derselben Seite (normalerweise
nicht: Produktseite vs. Shop), lädt Swiper zweimal – vertretbar. Ein
gemeinsames Swiper-Modul für beide Plugins wäre möglich, würde die Plugins
aber aneinander koppeln (8.1).

**8.4 Nach Updates prüfen**

In der Doku eine kurze Liste: nach Updates von WooCommerce (Produktsammlung,
Klassen der Produkte) einmal das Schaufenster mit und ohne Filter ansehen.

---

## 9. Im Editor

- Produktsammlung zeigt ihre normale Vorschau (Raster, kein Slider – wie
  heute beim Stil „Swiper Slider“).
- Filter zeigt die echten Filter-Tags.
- Am Schaufenster eine Einstellung **„Vorschau-Filter“**: zeigt im Editor,
  welche Zeilen bei diesem Filter verschwinden würden (ausgegraut, nicht
  versteckt – man muss sie ja noch bearbeiten können). Gleiche Technik wie
  das Ausgrauen beim Grusskarten-Kauf.

---

## 10. Optik und Barrierefreiheit

- Filter-Knöpfe: `button outline` aus `main.css`, kleinere Schrift.
- Slider-Pfeile und Punkte **mittig unter dem Slider** – die bestehende
  `.slider`-Anordnung im Theme. Der Entwurf zeigt sie links; das wäre eine
  kleine Anpassung nur für die Produkt-Slider (Entscheidung offen).
- Filter als Gruppe mit Überschrift, Knöpfe mit `aria-pressed`.
- Nach einem Filterklick eine unsichtbare Ansage (`aria-live`): „12 Produkte
  in 2 Kategorien“.
- Ausgeblendete Zeilen mit `hidden` (für Screenreader wirklich weg).

---

## 11. Grenzen

- Pro Zeile werden alle Produkte (bis zur Obergrenze) auf einmal geladen.
  Bei z. B. 6 Zeilen × 24 Produkten unkritisch; Bilder lädt der Browser erst,
  wenn sie ins Bild kommen (`loading="lazy"`).
- Hat eine Kategorie mehr Produkte als die Obergrenze, filtert der Filter
  nur innerhalb dieser ersten 24. Für einen Shop dieser Grösse vertretbar;
  sonst müsste der Filter neu abfragen (deutlich mehr Aufwand).
- Suchmaschinen sehen die ungefilterte Seite (alle Produkte) – gut so.
- Der Zeitraum eines Filter-Tags (Kapitel 3) wird beim Ausliefern der Seite
  geprüft. Bei einem Seiten-Cache erscheint/verschwindet der Knopf erst, wenn
  der Cache erneuert wird.

---

## 12. Umsetzung in Stufen

| Stufe | Inhalt | danach testbar |
|---|---|---|
| 1 | Plugin-Grundgerüst (`Requires Plugins`), Felder am Tag (Im Filter zeigen, Zeitraum, jährlich, Reihenfolge, Spalte in der Liste) | Filter-Tags im Admin pflegen |
| 2 | Build-Werkzeuge (npm, webpack, Manifest, Store-Modul), Slider-Start ins Plugin (Block-Stil, Pfeile/Punkte, Swiper), Slider-Einstellungen an der Produktsammlung, Theme entschlacken | bestehende Produkt-Slider laufen über das Plugin, mit eigenen Einstellungen |
| 3 | Rahmen + Zeile (ohne Filter) | Shop-Seite wie im Entwurf, ohne Filter |
| 4 | Filter-Block + Ausblenden im Browser + Swiper-Update | Filtern ohne Neuladen |
| 5 | Adresse (`?filter=`) + Ausblenden schon auf dem Server | Link teilen, kein Aufblitzen |
| 6 | „Kein Treffer“, Ansage für Screenreader | Leerfall |
| 7 | Editor: Vorschau-Filter, Ausgrauen | im Editor prüfen |
| 8 | „Letzte Karte anschneiden“ für die Grusskarten-Auswahl | einheitlicher Schalter |
| 9 | Doku (ARCHITEKTUR.md, SETUP.md, Update-Checkliste), Tests | – |

---

## 13. Entscheidungen

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Was filtert der Filter? | **Tags**, ein-/ausschaltbar am Tag selbst (Kapitel 3) |
| 2 | Wie viele Filter gleichzeitig? | **einer** |
| 3 | Knopf „Alle“? | **nein** – zweiter Klick hebt den Filter auf |
| 4 | Filter in der Adresse? | **ja** (`?filter=…`) |
| 5 | Letzte Karte anschneiden? | **ja**, als Schalter bei unseren eigenen Swiper-Slidern, nicht beim Carousel-Block (Kapitel 6) |
| 6 | Slider-Start ins Plugin? | **ja**, Abhängigkeiten nach Kapitel 8 |
| 7 | Name / Ort | Shop-Seite; Rahmen heisst **„Schaufenster“** |
| 8 | Zeitraum am Tag? | **ja**, mit **jährlicher Wiederholung** (Kapitel 3) |
| 9 | Parameter in der Adresse | **`?filter=`** |
| 10 | Kategorie- und Tag-Seiten | **eigenes Template „Products by Category“** (bzw. „Products by Tag“) im Site Editor mit normaler Produktsammlung, die die Kategorie der Seite übernimmt. Ohne dieses Template nähme WordPress auch dort „Product Catalog“ – samt Schaufenster. Keine automatische Ausblendung im Plugin. |
