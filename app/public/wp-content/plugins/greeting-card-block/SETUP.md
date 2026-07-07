# Setup-Checkliste: Grusskarte als Bundled Item

Diese Schritte passieren **im WooCommerce-Admin**, nicht im Code. Ohne sie
rendert der Block still gar nichts (`render.php` bricht ab, wenn das Produkt
nicht vom Typ „Bundle" ist).

Voraussetzung: **WooCommerce Product Bundles** ist lizenziert und aktiv.

1. Grusskarten als **Simple Products** anlegen, Kategorie-Slug `grusskarte`,
   Produktbild = Kartenmotiv. Katalog-Sichtbarkeit optional auf „Verborgen".
2. Den **Blumenstrauss** als Produkttyp **„Product Bundle"** anlegen (oder ein
   bestehendes Strauss-Produkt umwandeln).

   > ⚠️ **Wichtig, damit die Cart-Anzeige sauber bleibt:** Der Strauss **selbst**
   > wird zum Bundle-Produkt (dessen eigener Name/Preis/Bild = die des
   > Straussens). Es wird **kein separates, zusätzliches Container-Produkt**
   > angelegt, das den Strauss dann noch einmal als eigenes (Pflicht-)Bundled
   > Item enthält — das ergäbe im Cart drei statt zwei Zeilen (Container +
   > Strauss + Karte) und würde bei einem variablen Strauss zusätzlich eine
   > Variationsauswahl erfordern, die unser Block nicht anbietet (er kümmert
   > sich nur um Grusskarten, siehe Spec §6). Genau dieser Fehler ist beim
   > Testprodukt „Bundle" (mit „Lorem Strauss" als Pflicht-Bundled-Item)
   > aufgetreten: Add-to-Cart schlägt mit „Please choose 'Lorem Strauss'
   > options…" fehl, weil die Variante des Straussens nie mitgeschickt wird.
3. Unter **Product Data → Bundled Products** jede Grusskarte als **Bundled
   Item** hinzufügen — **sonst nichts** (insbesondere nicht den Strauss selbst).
4. Für jedes Karten-Bundled-Item in den **Basic Settings**:
   - **Optional** aktivieren.
   - **Priced Individually** aktivieren.
   - **Min Quantity 1, Max Quantity 1**.
5. **Item Grouping** des Bundles auf **„Grouped"** setzen (Parent-Child-Optik
   im Cart).
6. **Max Bundle Size = 1** setzen, **Min Bundle Size leer lassen (bzw. 0)**
   (Tab „Bundled Products", oberhalb der Item-Liste).

   > ⚠️ **Korrektur gegenüber der Spec-Vorlage (v3.1, §3 Punkt 6):** Die Spec
   > nennt dort „Min Bundle Size = 1, Max Bundle Size = 2" mit der Begründung,
   > der Strauss belege selbst einen Pflicht-Slot. Das stimmt für die
   > installierte Product-Bundles-Version (8.5.9) **nicht** — geprüft im
   > Quellcode (`WC_PB_MMI_Cart::add_to_cart_validation`/`cart_validation`,
   > `includes/modules/min-max-items/includes/class-wc-pb-mmi-cart.php`):
   > `Min/Max Bundle Size` zählt ausschliesslich die Summe der **Bundled-Item**-
   > Mengen, der Bundle-Container (Strauss) selbst zählt nicht mit. Mit
   > „Min = 1" wäre die Karte **verpflichtend** — das genaue Gegenteil von
   > „optional". Richtig für „optional, höchstens eine Karte": **Min leer/0,
   > Max = 1**.
7. Testen: Strauss über die **native** Bundle-Form (noch ohne unseren Block)
   in den Warenkorb legen — wahlweise mit oder ohne Karte. Im Cart-Block
   erscheint der Strauss als Parent mit eingerückter Karte darunter. Der
   Versuch, zwei Karten gleichzeitig zu wählen, wird abgewiesen (Max Bundle
   Size 1).
8. **Single-Product-Template im Site Editor: Koexistenz statt Ersetzung**
   (korrigiert ggü. v3.1 — siehe `greeting-card-bundle-block-spec_v3.1_1.md`
   §10). Das Template gilt für **alle** Produkte des Shops, nicht nur für
   Bundles — den nativen Add-to-Cart-Block zu entfernen würde jedem
   Nicht-Bundle-Produkt (einzelne Grusskarten, sonstiges Sortiment) den
   Kaufen-Button nehmen. Deshalb:
   - Der native Add-to-Cart-Block **bleibt im Template**.
   - Unser Block „Grusskarte + Bundle in den Warenkorb"
     (`greeting-card-block/greeting-card-bundle`) wird **zusätzlich** an der
     gewünschten Stelle eingefügt.
   - Ein `render_block`-Filter in `includes/class-integration.php`
     unterdrückt die native Form **nur** auf Produkten, für die unser Block
     zuständig ist (gemeinsames Prädikat `gcb_is_greeting_card_bundle()`,
     auch von `render.php` genutzt). Auf allen anderen Produkten bleibt sie
     unverändert aktiv — es rendert also pro Produkt immer genau **ein**
     Mechanismus.

   > ⚠️ **Empirischer Befund in dieser Installation:** Das aktuelle
   > „Single Product"-Template (Site Editor → Templates → Single Product)
   > enthält **noch gar keinen** Add-to-Cart-Block (weder
   > `woocommerce/add-to-cart-form` noch `woocommerce/add-to-cart-with-options`)
   > — geprüft per direktem Seitenabruf einer echten, unveränderten Grusskarte
   > (Simple Product): Titel/Preis/Kurzbeschreibung erscheinen, aber **kein**
   > Kaufen-Button, unabhängig vom Grusskarten-Block. Das ist keine Folge
   > unseres Plugins, sondern eine bestehende Lücke im Template. Vor Schritt
   > 8 daher zusätzlich: Im Site Editor den Block **„Add to Cart with
   > Options"** (`woocommerce/add-to-cart-with-options`) ins Single-Product-
   > Template einfügen (z. B. dieselbe Spalte wie Titel/Preis/Kurzbeschreibung).
   > Erst danach greift der `render_block`-Filter sinnvoll, weil er genau
   > diesen Blocknamen abfängt.

9. **Aufräumen:** Falls unser Block noch in einer der Vorlagen „Simple/
   Variable Product Add to Cart + Options" (Template-Parts, die
   `woocommerce/add-to-cart-with-options` je nach Produkttyp lädt) referenziert
   ist — dort **entfernen**. Unser Block gehört ins Haupt-Template (Schritt 8),
   nicht in diese typ-spezifischen Untervorlagen, sonst rendert er (wirkungslos,
   aber verwirrend) auch für Produkttypen, für die er nie zuständig sein kann.

Danach den manuellen Testplan aus `greeting-card-bundle-block-spec_v3.1_1.md`
(§11) durchgehen, insbesondere:

- #1b: zwei Karten gleichzeitig wählen → Validierungsfehler.
- #3–#5: Block ohne Karte / mit Karte+Text / Checkbox an ohne Karte.
- #6/#7: Strauss entfernen/Menge ändern → Karte folgt nativ.
- #11: Mini-Cart aktualisiert sich ohne Reload (`receiveCart`-Sync).
- #12: normales Produkt (Simple/Variable) → native Add-to-Cart-Form, genau ein Button, unser Block rendert nicht.
- #13: Grusskarten-Bundle → nur unser Block, genau ein Button, native Form weggefiltert.
- #14: Bundle ohne Grusskarten-Item (falls vorhanden) → native PB-Bundle-Form, unser Block rendert nicht.
