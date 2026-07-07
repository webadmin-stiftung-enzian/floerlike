# Setup-Checkliste: Grusskarte als Bundled Item

Diese Schritte passieren **im WooCommerce-Admin**, nicht im Code. Ohne sie
rendert der Block still gar nichts (`render.php` bricht ab, wenn das Produkt
nicht vom Typ „Bundle" ist).

Voraussetzung: **WooCommerce Product Bundles** ist lizenziert und aktiv.

1. Grusskarten als **Simple Products** anlegen, Kategorie-Slug `grusskarte`,
   Produktbild = Kartenmotiv. Katalog-Sichtbarkeit optional auf „Verborgen".
2. Den **Blumenstrauss** als Produkttyp **„Product Bundle"** anlegen (oder ein
   bestehendes Strauss-Produkt umwandeln) — **falls er keine Grössen-/
   Farbvarianten hat.** Hat er welche, siehe „Weg 2" weiter unten stattdessen.

   > ⚠️ **Wichtig, damit die Cart-Anzeige sauber bleibt (Weg 1):** Der Strauss
   > **selbst** wird zum Bundle-Produkt (dessen eigener Name/Preis/Bild = die
   > des Straussens). Es wird **kein separates, zusätzliches Container-Produkt**
   > angelegt, das den Strauss dann noch einmal als eigenes (Pflicht-)Bundled
   > Item enthält — das ergäbe im Cart drei statt zwei Zeilen (Container +
   > Strauss + Karte). Genau dieser Fehler ist beim Testprodukt „Bundle" (mit
   > „Lorem Strauss" als Pflicht-Bundled-Item) ursprünglich aufgetreten:
   > Add-to-Cart schlug mit „Please choose 'Lorem Strauss' options…" fehl, weil
   > die Variante des Straussens nie mitgeschickt wurde — inzwischen unterstützt
   > unser Block genau diesen Fall aber explizit, siehe „Weg 2".
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

## Weg 2: Strauss mit Grössen-/Farbvarianten (variables Produkt)

Ein einzelnes WooCommerce-Produkt kann nicht gleichzeitig „Variable" (eigene
Attribut-Varianten) **und** „Bundle" sein — das ist eine harte Beschränkung
von WooCommerce selbst, keine Einschränkung unseres Plugins. Für Sträusse mit
Grössen-/Farbauswahl braucht es daher einen separaten Bundle-Container, der
den variablen Strauss als **Pflicht**-Bundled-Item einhüllt. Unser Block
erkennt dieses Pflicht-Item automatisch (kein zusätzliches Admin-Feld nötig —
siehe `gcb_get_variable_main_item()` in `includes/class-integration.php`:
jedes Pflicht-Item, das keine Grusskarte ist, gilt als „Hauptprodukt") und
rendert dafür zusätzlich zum Kartenslider eine Attribut-/Variantenauswahl mit
eigener, reaktiver Preisanzeige.

> ⚠️ **Korrektur — „Faked Parent Item" verworfen:** Ein früherer Versuch, das
> Bundle-Container-Item per Product-Bundles-internem „Faked Parent
> Item"-Feature komplett unsichtbar zu machen (Strauss selbst als
> Parent-Zeile), scheiterte in der Praxis: Der Cart-Block blendet das
> Container-Item damit **nicht zuverlässig** aus — getestet, Container blieb
> als eigene sichtbare Zeile bestehen. Das Feature war laut Plugin-Code nie als
> reguläre Option vorgesehen.
>
> **Die jetzige Lösung liegt im Code, nicht in der PB-Konfiguration:** Unser
> Block verwendet das Bundle-Produkt **nur**, wenn tatsächlich eine Karte
> gewählt wird (siehe `addToCart()` in `view.js`). Ohne Kartenwahl kauft der
> Block die Strauss-Variante **direkt** (normaler, bundle-loser
> Store-API-Aufruf) — das Bundle-Produkt taucht dann im Warenkorb gar nicht
> erst auf, und die ganze „Container unsichtbar machen"-Problematik entfällt.
> Nur wenn eine Karte gewählt wird, entsteht eine sichtbare Eltern-Kind-Zeile
> im Cart — was dann inhaltlich korrekt und nicht verwirrend ist. Deshalb
> braucht es **kein** „Bundle type = Unassembled", keinen leeren Preis und
> keinen benutzerdefinierten „Item Grouping"-Modus mehr — ganz normales
> „Grouped" reicht.

1. Neues Produkt vom Typ **„Product Bundle"** anlegen (oder das vorhandene
   Test-Setup, z. B. „Bundle 2", weiterverwenden).
2. **Name und Produktbild sinnvoll setzen** (z. B. identisch zum Strauss) —
   dieser Name/das Bild erscheinen als Parent-Zeile im Cart, sobald eine Karte
   gewählt wird.
3. Unter **Bundled Products**:
   - Den **variablen Strauss** hinzufügen, **„Optional" NICHT aktivieren**
     (Pflicht-Item), Min/Max Quantity je 1, **„Priced Individually"
     AKTIVIEREN.**
   - Die Grusskarten wie in Weg 1 als **optionale** Bundled Items ergänzen
     (ebenfalls „Priced Individually").

   > ⚠️ **Wichtig — nicht nur bei den Karten vergessen:** Ohne „Priced
   > Individually" bei **mindestens einem** Bundled Item (hier: dem Strauss
   > selbst) meldet WooCommerce beim Add-to-Cart-Versuch über das Bundle
   > „'Bundle' is not available for purchase" — `WC_Product_Bundle::is_purchasable()`
   > verlangt entweder einen eigenen Preis > 0 auf dem Container oder
   > mindestens ein individuell bepreistes Bundled Item.
4. **Item Grouping = „Grouped"** (Standardoption, wie in Weg 1).
5. **Max Bundle Size = 2**, **Min Bundle Size = 1** setzen — anders als in Weg 1,
   weil hier ein Pflicht-Item existiert, das selbst zur Summe zählt (siehe
   Korrektur-Hinweis oben: „Min/Max Bundle Size" zählt alle Bundled-Item-Mengen,
   Pflicht-Items eingeschlossen — mit einem Pflicht-Item ist „Min = 1" also
   automatisch erfüllt, nicht mehr gleichbedeutend mit „Karte ist Pflicht").
6. Den **ursprünglichen Strauss** (jetzt nur noch Bundled Item) auf
   Katalog-Sichtbarkeit **„Verborgen"** setzen, damit er nicht zusätzlich unter
   eigener URL im Shop erscheint (wie bei den Grusskarten).
7. Unseren Block auf der **Bundle-Produktseite** einbinden (Schritt 8/9 oben) —
   nicht auf der (jetzt verborgenen) ursprünglichen Straussseite.

**Fertig, wenn:** Ohne Kartenwahl landet **nur** die Strauss-Variante im Cart
(keine Bundle-/Container-Zeile sichtbar). Mit Kartenwahl erscheinen Bundle
(Parent) + Strauss-Variante + Karte (Kinder, eingerückt) gruppiert.

Danach den manuellen Testplan aus `greeting-card-bundle-block-spec_v3.1_1.md`
(§11) durchgehen, insbesondere:

- #1b: zwei Karten gleichzeitig wählen → Validierungsfehler.
- #3–#5: Block ohne Karte / mit Karte+Text / Checkbox an ohne Karte.
- #6/#7: Strauss entfernen/Menge ändern → Karte folgt nativ.
- #11: Mini-Cart aktualisiert sich ohne Reload (`receiveCart`-Sync).
- #12: normales Produkt (Simple/Variable) → native Add-to-Cart-Form, genau ein Button, unser Block rendert nicht.
- #13: Grusskarten-Bundle → nur unser Block, genau ein Button, native Form weggefiltert.
- #14: Bundle ohne Grusskarten-Item (falls vorhanden) → native PB-Bundle-Form, unser Block rendert nicht.
