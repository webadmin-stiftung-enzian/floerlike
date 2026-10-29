# Wie das Schaufenster-Plugin funktioniert

Diese Datei erklärt, wie `product-showcase-block` aufgebaut ist und warum.
Die Einrichtung im Admin steht in [SETUP.md](SETUP.md), die ursprüngliche
Planung mit allen Entscheidungen in
[product-showcase-spec_v1.md](product-showcase-spec_v1.md).

Viele Grundbegriffe (Block, Rahmen, Innenblöcke, Hook, Interactivity API)
erklärt die [ARCHITEKTUR.md des Grusskarten-Plugins](../greeting-card-block/ARCHITEKTUR.md)
ausführlich. Das Schaufenster ist nach demselben Muster gebaut; hier steht,
was anders oder neu ist.

## Inhalt

1. Worum geht es?
2. Die Blöcke und die Dateien
3. Die Grundidee: WooCommerce rechnet, wir blenden aus
4. Filter-Schlagwörter
5. Der Weg eines Filterklicks
6. Der Slider
7. Im Editor
8. Abhängigkeiten und was nach Updates brechen kann
9. Grenzen

---

## 1. Worum geht es?

Die Shop-Seite zeigt mehrere **Zeilen**, jede mit einer Überschrift und
einem Slider mit den Produkten einer Kategorie. Darüber stehen
**Filter-Knöpfe** aus Schlagwörtern (Tags), z. B. „Valentinstag“:

- Klick → in jeder Zeile nur noch Produkte mit diesem Schlagwort; Zeilen ohne
  Treffer verschwinden samt Überschrift.
- Zweiter Klick auf denselben Knopf → Filter aufgehoben. Es ist immer
  höchstens ein Filter aktiv.
- Bleibt nirgends etwas übrig → Hinweis „Kein Treffer“.
- Kein Neuladen der Seite; der Filter steht trotzdem in der Adresse
  (`?filter=valentinstag`), damit man den Link teilen kann.

---

## 2. Die Blöcke und die Dateien

### Die Blöcke

| Block | Name | Aufgabe |
|---|---|---|
| Schaufenster | `product-showcase/showcase` | Rahmen um alles; hält den Zustand des Filters |
| Filter | `product-showcase/filter` | ein Knopf je Filter-Schlagwort |
| Zeile | `product-showcase/row` | Überschrift + Produktsammlung; verschwindet ohne Produkte |
| Kein Treffer | `product-showcase/empty` | sichtbar nur, wenn ein Filter nichts übrig lässt |

Filter, Zeile und Kein Treffer gibt es nur innerhalb des Schaufensters
(`ancestor` in ihrer `block.json`). Alle vier sind **dynamisch**: Die Ausgabe
erzeugt jeweils `render.php` auf dem Server. Gespeichert werden nur die
Innenblöcke (`save: () => <InnerBlocks.Content />`).

Dazu kommt eine **Erweiterung** des WooCommerce-Blocks „Produktsammlung“:
der Stil „Swiper Slider“ mit dem Panel „Slider“. Sie gilt für jede
Produktsammlung, nicht nur im Schaufenster (Kapitel 6).

Und ein **Produktblock** für jede Produktvorlage, ebenfalls nicht an das
Schaufenster gebunden:

| Block | Name | Aufgabe |
|---|---|---|
| Varianten-Spanne | `product-showcase/variation-range` | Werte der Varianten als Spanne, z. B. „Grösse: klein – gross“ |
| Begriffsliste | `product-showcase/term-list` | Begriffe einer Taxonomie als Liste, z. B. die Werte des Attributs „Blumen“: „Dahlien, Rosen, Sonnenhut“ |

Er bekommt das Produkt aus dem Block-Kontext (`postId`) wie die
WooCommerce-Blöcke für Titel und Preis. Einstellungen: Beschriftung,
Attribut (`pa_…`) und welcher Wert aus jeder Variante:

- **Attributwert:** erster bis letzter in der Reihenfolge der Varianten am
  Produkt (Tab „Variationen“) – Werte wie „klein“ lassen sich nicht der
  Grösse nach sortieren.
- **Regulärer Preis, Preis (aktuell):** kleinster bis grösster Wert.
- **Weitere Werte** melden andere Plugins über den Filter
  `psb_variation_range_values` an (Schlüssel → `label`, `value`
  (Variante → Zahl oder null), `format` (min, max → Text)). So kommt der
  „Durchmesser“ aus dem Grusskarten-Plugin dazu.

Es zählen alle aktiven Varianten, auch ausverkaufte. Hat das Produkt das
Attribut nicht (einfache Produkte, Grusskarten), gibt der Block nichts aus.
Logik: `includes/class-variation-range.php`. Im Editor zeigt er per
`ServerSideRender` die echte Ausgabe; die Produkt-ID geht als `post_id`
mit, weil `ServerSideRender` keinen Block-Kontext kennt.

Die **Begriffsliste** arbeitet genauso (Kontext, Editor-Vorschau). Quelle
ist eine Taxonomie am Produkt: globale Attribute (`pa_…`), Kategorien,
Schlagwörter. Die Begriffe holt `wc_get_product_terms()` – dieselbe
Funktion wie „Zusätzliche Informationen“ auf der Produktseite, inklusive
der eigenen Reihenfolge der Attributwerte. Sortierung: wie beim Attribut
eingestellt, eigene Reihenfolge, Name A–Z / Z–A (selbst sortiert mit
`remove_accents()` + `strnatcasecmp()`: „Löwenmäulchen“ unter L, „2“ vor
„10“ – `name_num` von WooCommerce ordnet solche Namen falsch ein).
Verlinken nur, wenn die Taxonomie Übersichtsseiten hat (beim Attribut
„Archive aktivieren“). Logik: `includes/class-term-list.php`.

### Die Dateien

```
product-showcase-block.php     Plugin-Kopf, lädt die Dateien in includes/
includes/
  class-filter-tags.php        Felder am Schlagwort, Zeitraum, psb_get_filter_tags()
  class-blocks.php             Blöcke registrieren, Hilfsfunktionen für render.php,
                               Filter auf dem Server, Daten für den Editor
  class-slider.php             Stil "Swiper Slider" der Produktsammlung
src/
  blocks/showcase/             Rahmen: edit.js (Vorschau-Filter), render.php,
                               view.js (Store: Filter im Browser), style.scss
  blocks/filter/               Filter: render.php (Knöpfe), edit.js, style.scss
  blocks/row/                  Zeile: edit.js (Vorlage), render.php
  blocks/empty/                Kein Treffer: edit.js, render.php
  editor/product-collection.js Panel "Slider" an der Produktsammlung
  slider/view.js, style.scss   Swiper-Start für die Produktsammlung
build/                         fertige Dateien (npm run build), werden geladen
```

Gebaut wird mit `npm run build` (wp-scripts, mit `--blocks-manifest` und
`--experimental-modules`). `webpack.config.js` ergänzt nur die zwei Einstiege,
die zu keiner `block.json` gehören (`editor/product-collection`,
`slider/view`).

---

## 3. Die Grundidee: WooCommerce rechnet, wir blenden aus

Jede Zeile enthält den WooCommerce-Block **Produktsammlung**. Abfrage,
Sortierung, Produktkarte und Editor-Vorschau kommen damit fertig von
WooCommerce.

Der Server liefert jeder Zeile **alle** Produkte ihrer Kategorie (bis zur
Obergrenze „Produkte pro Seite“, Vorlage 24). WooCommerce gibt jedem Produkt
seine Schlagwörter als CSS-Klasse mit:

```html
<li class="wc-block-product … product_tag-valentinstag …">
```

Ein Filter kann die Menge nur **verkleinern**. Deshalb braucht es beim Klick
keine neue Abfrage: Der Browser nimmt einfach die Produkte ohne die passende
Klasse heraus.

### Die Reihenfolge beim Rendern

WordPress rendert Innenblöcke **vor** ihrem Rahmen. Die `render.php` des
Rahmens bekommt in `$content` das fertige Markup aller Zeilen – mit allen
Produkten. Erst hier ist bekannt, welche Schlagwörter überhaupt vorkommen.
Deshalb erledigt der Rahmen drei Dinge nachträglich, mit dem
`WP_HTML_Tag_Processor` (er ändert Attribute im fertigen HTML, ohne es neu
aufzubauen):

1. **Knöpfe ohne Produkt ausblenden** (`psb_hide_unused_filter_buttons()`):
   Ein Knopf, zu dem kein Produkt im Schaufenster passt, führte ins Leere.
   Bleibt keiner übrig, verschwindet der ganze Filter.
2. **Filter aus der Adresse anwenden** (`psb_apply_server_filter()`, Kapitel 5).
3. **„Kein Treffer“ zeigen**, wenn dieser Filter nichts übrig lässt
   (`psb_set_empty_visibility()`).

Die Zeile selbst prüft vorher in ihrer `render.php`, ob überhaupt ein
Produkt in ihr steht (`psb_row_has_products()`). Ohne Produkt gibt sie gar
nichts aus.

### Standard-Abstände

Rahmen, Zeile und Kein Treffer haben in ihrer `block.json` einen Standard für
den Blockabstand (4 rem, 1,5 rem, 1 rem). Der Editor speichert ein Attribut
aber nicht, solange es dem Standard entspricht – und die Abstands-Funktion
von WordPress liest auf der Seite nur gespeicherte Werte. Ohne Gegenmassnahme
gälte der Standard nur im Editor. Ein `render_block_data`-Filter in
`class-blocks.php` setzt ihn deshalb vor dem Rendern ein; im Editor
geänderte Werte gehen vor.

---

## 4. Filter-Schlagwörter

Nicht jedes Schlagwort soll ein Filter sein („Valentinstag“ nur im Februar,
„art“ vielleicht nie). Statt Schlagwörter von Produkten zu nehmen und wieder
anzuhängen, hat jedes Schlagwort eigene Felder (`class-filter-tags.php`),
gespeichert als **Term-Meta**:

| Feld | Meta-Schlüssel |
|---|---|
| Im Filter zeigen | `_psb_in_filter` |
| Sichtbar von / bis | `_psb_from`, `_psb_until` (JJJJ-MM-TT) |
| Jährlich wiederholen | `_psb_yearly` |
| Reihenfolge | `_psb_order` |

`psb_get_filter_tags()` liefert die Schlagwörter, die **heute** als Knopf
erscheinen: eingeschaltet, mit mindestens einem Produkt, im Zeitraum, nach
Reihenfolge sortiert. „Heute“ ist das Datum in der Zeitzone der Website.

Der Zeitraum (`psb_is_period_active()`):

- **Jährlich:** nur Monat und Tag zählen. Liegt „bis“ vor „von“ (1.12.–6.1.),
  gilt er von „von“ bis Jahresende und von Jahresanfang bis „bis“. Ein 29.2.
  zählt in Nicht-Schaltjahren als 28.2.
- **Einmalig:** ganze Daten. Fehlt „von“ oder „bis“, ist diese Seite offen.

Die Klasse, die WooCommerce passenden Produkten gibt, baut
`psb_tag_class()` nach (`product_tag-<slug>`, bei Slugs ohne verwertbare
Zeichen die ID).

---

## 5. Der Weg eines Filterklicks

```
 Server (Seite wird geladen)
 ① Jede Zeile rendert ihre Produktsammlung mit allen Produkten.
 ② Der Rahmen blendet Knöpfe ohne Produkt aus.
 ③ Steht ?filter=valentinstag in der Adresse (und ist es gerade ein
    Filter-Schlagwort), setzt der Rahmen hidden an unpassende Produkte und
    leere Zeilen und legt activeTag in den Kontext → kein Aufblitzen.

 Browser
 ④ Klick auf „Muttertag“ → actions.toggleTag: activeTag = "muttertag",
    Adresse per history.replaceState auf ?filter=muttertag.
    Zweiter Klick → activeTag = null, Parameter weg.
 ⑤ callbacks.applyFilter (data-wp-watch am Rahmen) läuft, weil sich
    activeClass geändert hat: unpassende Produkte raus, leere Zeilen hidden,
    Swiper.update(), Sprung auf die erste Karte.
 ⑥ "Kein Treffer" sichtbar, wenn kein Produkt übrig ist; Ansage für
    Screenreader ("12 Produkte in 2 Kategorien").
```

### Der Zustand: Kontext statt globaler State

`activeTag` und `activeClass` stehen im **Kontext** des Rahmens
(`data-wp-context`, in `render.php`). Die Knöpfe liegen im Rahmen und erben
diesen Kontext; ihr eigener Kontext ergänzt `tag` und `tagClass`. Schreibt
`toggleTag()` in `activeTag`, landet das im Kontext des Rahmens – alle Knöpfe
und der Watch am Rahmen sehen die Änderung.

`state.isPressed` (Knopf gedrückt?) ist ein abgeleiteter Wert. Es gibt ihn
zweimal mit derselben Logik: als Getter in `view.js` und als PHP-Closure in
`class-blocks.php`. Die PHP-Version sorgt dafür, dass der gewählte Knopf
schon beim Laden gedrückt aussieht (`aria-pressed`, `is-selected`).

### Warum Produkte herausnehmen statt verstecken?

Swiper zählt versteckte Folien mit – es entstünden Lücken und falsche
Positionen. `applyFilter()` merkt sich deshalb beim ersten Filtern alle
Produkte einer Liste (in einer `WeakMap`) und ersetzt die Liste jeweils durch
die passenden (`replaceChildren`). Beim Aufheben kommen alle in der
ursprünglichen Reihenfolge zurück.

Mit `?filter=` hat der Server unpassende Produkte schon versteckt. Beim
ersten Merken nimmt `applyFilter()` dieses `hidden` wieder weg – ab dann
regelt das Herausnehmen die Sichtbarkeit.

Reihenfolge in `applyFilter()`: erst die Zeile sichtbar machen, dann Swiper
neu rechnen lassen. In einer versteckten Zeile hätte Swiper keine Breite.

### Die Adresse

`?filter=` statt `?product_tag=`: `product_tag` ist der WordPress-eigene
Parameter für Schlagwort-Seiten – WordPress würde die Shop-Seite in ein
Schlagwort-Archiv verwandeln. `history.replaceState` statt `pushState`:
„Zurück“ führt zur vorigen Seite, nicht durch jeden Filterklick.

### Die Ansage

Unter dem Rahmen steht ein unsichtbarer Absatz mit `aria-live="polite"`.
Nach jedem Klick schreibt `applyFilter` das Ergebnis hinein, Screenreader
lesen es vor. Beim Laden der Seite bleibt er leer. Die Textbausteine
(„%d Produkte“, „in 1 Kategorie“ …) kommen übersetzt aus PHP
(`state.messages`) – in Skriptmodulen gibt es kein `wp.i18n`.

---

## 6. Der Slider

Der Block-Stil **„Swiper Slider“** der Produktsammlung lag früher im Theme
und ist hierher umgezogen (`class-slider.php`): Den Stil soll es nur geben,
wenn es auch den Slider dazu gibt.

- **Einstellungen** (Panel „Slider“, `src/editor/product-collection.js`):
  sichtbare Produkte Desktop / Tablet / Handy, letzte Karte anschneiden,
  Pfeile, Punkte. Gespeichert im zusätzlichen Attribut `psbSlider` der
  Produktsammlung.
- **Auf der Seite** hängt `class-slider.php` die fertig berechneten
  Einstellungen als `data-psb-slider` an den Block und lädt die Dateien – nur
  auf Seiten mit Slider. `src/slider/view.js` wickelt die Produktliste in
  `div.slider > div.swiper`, baut Pfeile und Punkte und startet Swiper.
- **Anschneiden:** statt 3 sichtbaren Folien 3,3. Der Anteil kommt als ganze
  Prozentzahl (`peekPercent: 30`), weil PHP Kommazahlen hier mit 17 Stellen
  ins JSON schreibt (0.3 → 0.29999999999999999).
- **Optik** von Pfeilen und Punkten: Theme (`main.css`, Abschnitt SLIDER,
  Klassen `.slider` und `.slider--controls-start`).

### Swiper-CSS nur im eigenen Slider

Swipers eigene CSS spricht allgemeine Klassen an (`.swiper`,
`.swiper-button-next` …). Dieselben benutzt auch der Block „Carousel“ (Plugin
Carousel Block, eigene Swiper-Kopie). Global geladen würde unsere CSS dessen
Pfeile mitverändern. `src/slider/style.scss` schliesst sie deshalb mit
`meta.load-css()` in `:where(.psb-slider)` ein: Jede Regel gilt nur in
unseren Slidern, und `:where()` hält ihre Spezifität so niedrig wie im
Original – die Theme-Regeln gewinnen immer. Die Grusskarten-Auswahl macht es
genauso.

---

## 7. Im Editor

- **Zeilen** zeigen die normale Vorschau der Produktsammlung (Raster, kein
  Slider – Swiper läuft im Editor nicht).
- **Filter** zeigt dieselben Knöpfe wie die Seite (aus `window.psbEditorData`,
  nur die gerade im Zeitraum), aber auch solche ohne Produkt – das weiss erst
  der Rahmen auf der Seite. Die Knöpfe bedienen den Vorschau-Filter: Ein Klick
  setzt `previewTag` am Rahmen, ein zweiter hebt ihn auf; der gewählte Knopf
  erscheint gedrückt. Den Wert bekommt der Filter vom Rahmen als Block-Kontext
  (`product-showcase/previewTag`).
- **Kein Treffer** ist immer sichtbar, damit man ihn bearbeiten kann.

### Der Vorschau-Filter

Am Rahmen (`showcase/edit.js`). Die Liste der Schlagwörter gibt der Server
dem Editor als `window.psbEditorData` mit – alle mit „Im Filter zeigen“, auch
ausserhalb des Zeitraums. Gewählt wird ein Schlagwort; dann:

1. **Zeilen:** Je Zeile eine Abfrage an die Store API von WooCommerce
   (`/wc/store/v1/products?category=…&tag=…&per_page=1`). Kein Treffer →
   Zeile ausgegraut.
2. **Produkte:** Eine Abfrage aller Produkte mit dem Schlagwort, davon die
   Permalinks. Im Editor tragen die Produktkarten keine ID; die Produktvorlage
   zeigt dieselben Blöcke für jedes Produkt. Erkennbar ist ein Produkt aber am
   Link seines Titels. Eine CSS-Regel graut jede Karte aus, die keinen der
   passenden Links enthält (`li:has(a[href]):not(:has(a[href="…"]))`).
3. **Kein Treffer:** ausgegraut, solange eine Zeile übrig bliebe.

Ausgegraut wird über ein `<style>`, das der Rahmen in den Editor rendert
(trifft die Blöcke über `data-block="<clientId>"`), und eines im
Hauptdokument für die Listenansicht – wie beim Grusskarten-Kauf.

---

## 8. Abhängigkeiten und was nach Updates brechen kann

```
 WooCommerce  ←  product-showcase-block  ←(nur Optik)  Theme floerlike
```

- Das Plugin braucht **WooCommerce** (`Requires Plugins: woocommerce` im
  Plugin-Kopf).
- Es braucht **nicht das Theme**: Ohne Theme funktioniert alles, sieht nur
  schlichter aus (Rückfall-Optik in `:where()`).
- Das **Theme** braucht das Plugin nicht: Es liefert nur Optik (`.slider`,
  `.button`).
- Mit dem Grusskarten-Plugin gibt es keine Verbindung. Beide bringen Swiper
  über npm mit (gleiche Version).

**Wo das Plugin auf Interna von WooCommerce baut** – nach einem
WooCommerce-Update die Checkliste in SETUP.md, Kapitel 8, durchgehen:

| Annahme | Wo | Wenn sie bricht |
|---|---|---|
| Produkte tragen `wc-block-product` und `product_tag-<slug>` als Klasse | `psb_tag_class()`, `applyFilter()`, `psb_apply_server_filter()` | Filter findet keine Produkte |
| Liste der Produkte hat die Klasse `wc-block-product-template` | `slider/view.js`, `applyFilter()` | kein Slider, kein Filtern |
| Attribute der Sammlung „nach Kategorie“ | Vorlage in `row/edit.js` | neue Zeilen falsch vorbelegt (bestehende nicht betroffen) |
| Store API: Parameter `category`, `tag`, Feld `permalink` | Vorschau-Filter | Ausgrauen im Editor stimmt nicht |
| Produkttitel im Editor als `<a href="Permalink">` | Vorschau-Filter | einzelne Produkte nicht ausgegraut |

---

## 9. Grenzen

- Pro Zeile werden alle Produkte (bis zur Obergrenze) auf einmal geladen.
  Bilder lädt der Browser erst, wenn sie ins Bild kommen.
- Hat eine Kategorie mehr Produkte als die Obergrenze, filtert der Filter
  nur innerhalb dieser ersten. Sonst müsste der Filter neu abfragen.
- Suchmaschinen sehen die ungefilterte Seite.
- Der Zeitraum eines Schlagworts wird beim Ausliefern der Seite geprüft. Mit
  einem Seiten-Cache erscheint oder verschwindet ein Knopf erst, wenn der
  Cache erneuert wird.
- Der Vorschau-Filter im Editor fragt nur Kategorie und Schlagwort ab. Hat
  eine Produktsammlung weitere Einschränkungen (z. B. nur Angebote), kann die
  Vorschau mehr Produkte zeigen als die Seite.
