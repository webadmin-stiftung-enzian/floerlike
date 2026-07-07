# Spezifikation: Grußkarten-Block (WooCommerce)

## Kontext

WordPress mit Block-Theme (Twenty Twenty-Five), WooCommerce (neueste Version),
Gutenberg Block Editor. Das Feature erlaubt Kunden, beim Kauf eines Produkts
optional eine Grußkarte auszuwählen und einen persönlichen Grußtext zu verfassen.

---

## Anforderungen

### Funktional

1. Auf der Produktseite erscheint eine Checkbox „Möchten Sie eine Grußkarte hinzufügen?"
2. Bei Aktivierung wird ein Slider (Swiper.js) mit auswählbaren Grußkarten eingeblendet
3. Genau eine Grußkarte kann selektiert werden
4. Ein Textfeld erlaubt die Eingabe eines persönlichen Grußtexts (max. 300 Zeichen)
5. **Client-seitige Pflichtfeld-Validierung:** Ist die Checkbox aktiv, müssen sowohl
   Karte als auch Text ausgefüllt sein. Die Validierung greift beim Absende-Versuch
   (Klick auf „Add to cart"/„In den Warenkorb"), nicht bereits beim Ankreuzen der
   Checkbox. Bei fehlender Auswahl/Text wird der Submit clientseitig blockiert und
   je ein Fehlerbanner unter Karten-Slider bzw. Textfeld angezeigt.
6. Grußkarte und Grußtext werden im Warenkorb **als Zusatzinformation an der
   Strauß-Position** angezeigt (nicht als eigene Warenkorb-Zeile — siehe
   [Architektur-Entscheidung](#warum-keine-eigene-warenkorb-position))
7. Beide Informationen sind in der Bestellung dauerhaft gespeichert
8. Sie erscheinen in der Bestellbestätigungs-E-Mail und im WooCommerce-Admin
9. Der Preis der Grußkarte wird dem Strauß-Preis serverseitig hinzuaddiert
   (kombinierter Line-Total; der Stückpreis des Straußes bleibt für die Anzeige
   unverändert, siehe [Preislogik](#4-preislogik))
10. Der Lagerbestand der Grußkarte wird beim Bezahlvorgang reduziert bzw. bei
    Stornierung/Rückerstattung wiederhergestellt

### Nicht-funktional

- Grußkarten sind redaktionell über den WooCommerce-Shop pflegbar (kein eigener CPT),
  Produktkategorie-Slug: `grusskarte`
- Das Feature ist als eigenständiges Plugin entwickelt (`greeting-card-block`, kein Child-Theme)
- Setzt auf **WooCommerce Cart/Checkout Blocks** (kein klassischer Shortcode-Cart) — zukunftssichere Ausrichtung gemäß WordPress FSE-Strategie
- Frontend-Interaktivität über die **WordPress Interactivity API** (kein React/Redux im Frontend)

---

## Datenstruktur

### Grußkarten (WooCommerce Produkte)

- Produktkategorie-Slug: `grusskarte`
- Produkttyp: Simple Product
- Preis: optional (0 = kostenlos, oder mit Preis)
- Produktbild: das Kartenmotiv
- Zugriff über `wc_get_products(['category' => ['grusskarte'], 'limit' => -1, 'status' => 'publish'])` in `render.php`

### Cart-Item-Daten (Session, nicht `cart_contents` direkt)

Werden über den Session-Key `gcb_meta` (Array, indiziert nach Cart-Item-Key)
gehalten und über den Filter `woocommerce_get_cart_item_from_session` in das
Cart-Item des **Straußes** injiziert:

| Cart-Item-Key            | Beschreibung                                          |
|---------------------------|--------------------------------------------------------|
| `_greeting_card_id`        | Produkt-ID der gewählten Grußkarte                      |
| `_greeting_card_text`      | Vom Kunden verfasster Grußtext (max. 300 Zeichen)       |
| `_greeting_card_price`     | Preis der Grußkarte zum Auswahlzeitpunkt                |
| `_bouquet_base_price`      | Ursprünglicher Straußpreis ohne Kartenaufschlag (verhindert kumuliertes Addieren bei mehrfacher Totals-Neuberechnung) |
| `_greeting_card_selected`  | Bool, nur In-Memory für die aktuelle Response relevant  |

### Bestellposition Meta (`wc_order_itemmeta`), am Strauß-Line-Item

| meta_key            | Beschreibung                                                  |
|---------------------|----------------------------------------------------------------|
| `Grußkarte`          | Name des gewählten Karten-Produkts (lesbarer Key, erscheint automatisch in Admin/E-Mail) |
| `Grußtext`           | Vom Kunden verfasster Freitext (lesbarer Key)                  |
| `_greeting_card_id`  | Interne Produkt-ID, für Stock-Management (Lead-Underscore blendet es aus der Kundenansicht aus) |

---

## Architektur

### Komponenten

```
greeting-card-block/
├── src/
│   └── greeting-card-block/
│       ├── block.json            ← Blockname: greeting-card-block/greeting-card-block
│       ├── render.php            ← Serverseitiges Rendering (Karten-Query, Interactivity-State-Init)
│       ├── view.js               ← viewScriptModule: Interactivity-API-Store (Checkbox/Slider/Validierung)
│       ├── cart-sync.js          ← viewScript (klassisch): liest DOM-Auswahl, ruft extensionCartUpdate
│       ├── edit.js / index.js    ← Editor-Ansicht (Platzhalter, kein funktionaler Vorschau-Slider)
│       ├── style.scss            ← Front- und Editor-Styles
│       └── editor.scss
├── build/                        ← Kompiliertes Ergebnis (npm run build), wird ausgeliefert
├── includes/
│   └── woocommerce-hooks.php     ← Cart/Order-Integration (Session-Meta, Preislogik, Anzeige, Stock)
├── greeting-card-block.php       ← Plugin-Bootstrap, registriert Block + lädt woocommerce-hooks.php
└── webpack.config.js             ← Custom Webpack-Konfig (Dual-Build: Script + Modul, siehe unten)
```

### Block: `greeting-card-block/greeting-card-block`

- **Typ:** Standalone Block (kein InnerBlocks-Wrapper), `apiVersion: 3`
- **Rendering:** Serverseitig via `render.php`, initialisiert den Interactivity-State via `wp_interactivity_state()`
- **Platzierung:** Im Single Product Template via Site Editor (vor Add-to-Cart-Block)
- **Slider:** Swiper.js (via npm, in `view.js` gebündelt), `loop: false` zwingend (siehe Hinweis unten)
- **Kontext:** nutzt `usesContext: ["postId"]` zur Ermittlung der Bouquet-Produkt-ID

#### render.php – Ausgabe

```php
$cards = wc_get_products([
    'category' => ['grusskarte'],
    'limit'    => -1,
    'status'   => 'publish',
    'order'    => $attributes['order'] ?? 'ASC',
]);

wp_interactivity_state('greeting-card-block', [
    'wantsCard'      => false,
    'selectedCardId' => '',
    'text'           => '',
    'validated'      => false,
]);
```

Erzeugt:
- Checkbox `#isGreetingCardChecked` (`data-wp-on--change="actions.toggleWantsCard"`)
- Swiper-Slider-Container mit Karten als `<button type="button" data-wp-on--click="actions.selectCard" data-wp-bind--aria-pressed="state.isCardPressed" data-card-id="...">`
- Fehlerbanner für Karten-Auswahl (`data-wp-bind--hidden="!state.showCardError"`)
- Textarea `#greetingCardMessage` (max. 300 Zeichen) mit Zeichenzähler und eigenem Fehlerbanner
- `data-product-id` am Block-Wrapper (Bouquet-Produkt-ID, aus `postId`-Context)

> Auswahl (`card_id`) und Grußtext werden **nicht** über native Formularfelder übertragen,
> sondern im Interactivity-State gehalten und beim Add-to-Cart-Klick via
> `extensionCartUpdate` an den Server gesendet.

#### view.js – Interactivity-API-Store (viewScriptModule)

State: `wantsCard`, `selectedCardId`, `text`, `validated` + abgeleitete Getter:
`charCounter`, `isCardPressed`, `isValid`, `showCardError`, `showTextError`.

> **Wichtig:** Die Getter `isValid`/`showCardError`/`showTextError` lesen die
> Roh-State-Werte (`selectedCardId`, `text`, `wantsCard`) **direkt**, nicht über
> Zwischen-Getter. Grund: eine sauberere/robustere Abhängigkeitskette innerhalb
> der Interactivity-API-Reaktivität.

Actions: `toggleWantsCard`, `selectCard`, `updateText`.

Zusätzlich registriert `view.js` einen **Capture-Phase `submit`-Listener** auf
`document`, der bei Klick auf „Add to cart" (`form.wp-block-woocommerce-add-to-cart-with-options`
bzw. `form.cart`) `state.validated = true` setzt und den Submit per
`preventDefault()`/`stopImmediatePropagation()` blockiert, falls `!state.isValid`.
Die Fehlerbanner werden dadurch erst **nach** einem Submit-Versuch sichtbar,
nicht bereits beim Ankreuzen der Checkbox.

`callbacks.initSwiper()` initialisiert Swiper mit `loop: false` — Swiper-Klone
im Loop-Modus werden von der Interactivity API nicht hydratisiert, Klicks auf
Klone würden `actions.selectCard` nicht auslösen.

#### cart-sync.js – klassisches viewScript

Grund für die Trennung von `view.js`: WooCommerce registriert
`wc-blocks-checkout`/`wc-blocks-data-store` nur als klassische Script-Globals
(`window.wc.*`), nicht als Script-Module. Ein Interactivity-Modul kann sie nicht
importieren.

`cart-sync.js` hört auf das Event `wc-blocks_added_to_cart`, liest die Auswahl
**aus dem DOM** (nicht aus dem Interactivity-State, da unterschiedliche
Modul-Kontexte) — `aria-pressed`-Karte, `#greetingCardMessage`, `#isGreetingCardChecked` —
und ruft:

```js
extensionCartUpdate({
    namespace: 'greeting-card-block',
    data: {
        action:              'add',
        card_id:              selectedCardId,
        text,
        bouquet_product_id:   bouquetProductId,
        wants_card:           wantsCard,
    },
});
```

---

## WooCommerce-Integration

> **Grundlegende Erkenntnis:** Der `woocommerce/add-to-cart-with-options`-Block ist **kein** klassisches POST-Formular. Seine `addToCart`-Action ruft `event.preventDefault()` auf und legt das Produkt über die **Store API** (`addCartItem`) an. Es werden ausschließlich `id`, `quantity`, `variation` und `type` übertragen — **eigene Formularfelder erreichen den Server nie über `$_POST`**.
>
> Der einzige von WooCommerce unterstützte Weg, vom Client aus den Server-Cart zu verändern, ist `extensionCartUpdate` in Kombination mit einem serverseitig registrierten `register_update_callback`.
>
> **Quelle:** [Updating the cart on-demand](https://github.com/woocommerce/woocommerce/blob/trunk/docs/apis/store-api/extending-store-api/extend-store-api-update-cart.md)

### Warum keine eigene Warenkorb-Position

Ursprünglich war geplant, die Grußkarte als **eigene Cart-Position** via
`WC()->cart->add_to_cart()` anzulegen. Das wurde verworfen:

- Direktes Schreiben in `cart_contents` + `set_session()` **destabilisiert die
  WooCommerce Blocks Store API** und führt zu „Cart item does not exist"-Fehlern,
  weil die Blocks-interne Darstellung des Warenkorbs inkonsistent wird.
- Stattdessen: Die Auswahl wird in einem **separaten Session-Key** (`gcb_meta`,
  indiziert nach Cart-Item-Key) gespeichert und über den Filter
  `woocommerce_get_cart_item_from_session` bei jeder Warenkorb-Initialisierung
  in das Cart-Item des **Straußes** injiziert (nicht in `cart_contents` persistiert).
- Die Grußkarte erscheint dadurch als `item_data`-Meta **innerhalb** der
  Strauß-Zeile (siehe unten), **nicht** als separate Position/Zeile.

### 1. Auswahl vom Client an den Server übergeben

Clientseitig (`cart-sync.js`), **nach** erfolgreichem Hinzufügen des Hauptprodukts
(Event `wc-blocks_added_to_cart`):

```js
extensionCartUpdate({
    namespace: 'greeting-card-block',
    data: { action: 'add', card_id, text, bouquet_product_id, wants_card },
});
```

> Pro `namespace` darf **nur ein** Callback registriert werden. Unterschiedliche
> Aktionen werden über den `action`-Key im `data` unterschieden.

### 2. Serverseitige Validierung + Speicherung als Session-Meta

Registriert über `woocommerce_blocks_loaded` → `woocommerce_store_api_register_update_callback`
(Namespace `greeting-card-block`). Ablauf im Callback (`includes/woocommerce-hooks.php`):

1. `card_id`/`text` fehlen → `RouteException` (400, `greeting_card_block_incomplete`)
2. Karte existiert nicht oder gehört nicht zur Kategorie `grusskarte` →
   `RouteException` (400, `greeting_card_block_invalid_product`)
3. Passendes Strauß-Cart-Item über `bouquet_product_id` finden
4. `_bouquet_base_price` ermitteln (aus vorhandenem Cart-Item-Wert, sonst
   `get_price()` bei Erstauswahl)
5. Auswahl in `gcb_meta[$key]` in der Session persistieren
6. In-Memory-Cart (`WC()->cart->cart_contents`) für die aktuelle Response sofort aktualisieren
   (Preis/Anzeige ohne Wartezeit auf `calculate_totals()`)

### 3. Anzeige im Warenkorb (als Item-Data an der Strauß-Position)

Hook: `woocommerce_get_item_data`

Was hier an das `item_data`-Feld eines Cart-Items angehängt wird, rendert der
WooCommerce **Cart-Block nativ** unter dem Artikel. Aktuelle Implementierung
rendert reiches HTML (`display`-Feld: Bild, Label, Kartenname, Preis) sowie einen
Plaintext-Fallback (`value`-Feld, für E-Mail-Templates ohne HTML-Rendering).

> **15-Token-Truncation-Falle:** Der Cart-/Mini-Cart-Block kürzt jeden
> `item_data`-Wert clientseitig auf die ersten 15 durch Whitespace getrennten
> Tokens (`mini-cart.js`). Gegenmaßnahme: `alt=""` am Bild, `&nbsp;` statt Space
> im Preis, um unter dem Token-Limit zu bleiben (siehe Code-Kommentare in
> `woocommerce-hooks.php`).

```php
add_filter('woocommerce_get_item_data', function ($item_data, $cart_item) {
    if (empty($cart_item['_greeting_card_id'])) {
        return $item_data;
    }
    // ... Bild, Preis, Name als HTML (`display`) + Plaintext (`value`)
    // 'key' => '' (leer), damit kein doppeltes Label gerendert wird —
    // das Label ist bereits Teil des `display`-HTML.
});
```

Begleitendes CSS wird über `wp_head` inline ausgegeben (Klassen `gcb-card-meta*`,
Unterdrückung des del/ins-Preisvergleichs, siehe Code-Kommentare).

### 4. Preislogik

Da die Karte kein eigenes Line-Item ist, wird ihr Preis manuell zum Strauß-Preis
addiert und nach der Totals-Berechnung wieder zurückgesetzt:

- `woocommerce_get_cart_item_from_session`: setzt beim Laden aus der Session
  sofort `base_price + card_price` als Produktpreis (zuverlässiger als
  `before_calculate_totals`, da garantiert vor `calculate_totals()` läuft)
- `woocommerce_before_calculate_totals`: addiert `_greeting_card_price` auf
  `_bouquet_base_price`, damit `line_total`/Subtotal korrekt berechnet werden
- `woocommerce_after_calculate_totals`: setzt den Produktpreis wieder auf
  `_bouquet_base_price` zurück, damit die Store API `prices.price` (Stückpreis-Anzeige)
  **ohne** Kartenaufschlag zeigt, während `totals.line_total` (Zeilensumme) den
  kombinierten Preis enthält
- Nur `set_price()`, nie `set_regular_price()` — Letzteres kann die
  Preisberechnung in WooCommerce Blocks stören (führt zu ungewolltem
  del/ins-Preisvergleich, der separat per CSS unterdrückt wird)

### 5. Dauerhaft in Bestellung speichern

Hook: `woocommerce_checkout_create_order_line_item`, am Strauß-Line-Item (nicht
an einer eigenen Position):

```php
add_action('woocommerce_checkout_create_order_line_item',
    function ($item, $cart_item_key, $values, $order) {
        if (empty($values['_greeting_card_id'])) {
            return;
        }
        $item->add_meta_data('Grußkarte', wc_get_product($values['_greeting_card_id'])->get_name(), true);
        $item->add_meta_data('Grußtext',  $values['_greeting_card_text'] ?? '', true);
        $item->add_meta_data('_greeting_card_id', (int)$values['_greeting_card_id'], true);
    }, 10, 4
);
```

Erscheint automatisch in:
- Admin → Bestellung → Artikel
- Bestellbestätigungs-E-Mail
- Kundenbereich → Bestellhistorie

### 6. Lagerbestand

- `woocommerce_payment_complete` / `woocommerce_order_status_processing` →
  `_gcb_reduce_card_stock()`: reduziert den Bestand der Grußkarte manuell
  (WooCommerce verwaltet nur den Stock von echten Order-Line-Items automatisch;
  die Karte ist keins). Flag `_gcb_stock_reduced` an der Order verhindert
  Doppelreduzierung.
- `woocommerce_order_status_cancelled` / `_refunded` → `_gcb_restore_card_stock()`:
  stellt den Bestand wieder her.

---

## WooCommerce Cart/Checkout Blocks Kompatibilität

| Aufgabe | Klassisch (Shortcode) | WooCommerce Blocks (verifiziert, aktuelle Implementierung) |
|---|---|---|
| Auswahl/Text vom Client an den Server | `$_POST` im Add-to-Cart-Formular | `extensionCartUpdate` (in `cart-sync.js`) → `register_update_callback` |
| Speicherung der Auswahl | Cart-Item-Data direkt am Cart-Item | Separater Session-Key `gcb_meta`, injiziert via `woocommerce_get_cart_item_from_session` (siehe [Architektur-Entscheidung](#warum-keine-eigene-warenkorb-position)) |
| Grußtext im Warenkorb anzeigen | `woocommerce_get_item_data` | `woocommerce_get_item_data` — identisch, rendert nativ wie Variations-Meta, plus reiches `display`-HTML |
| Daten in Bestellung speichern | `woocommerce_checkout_create_order_line_item` | `woocommerce_checkout_create_order_line_item` — identisch (Session-Meta → Order-Item-Meta am Strauß-Item) |
| Preisaufschlag | Eigenes Line-Item mit eigenem Preis | Manuell via `before/after_calculate_totals` auf den Strauß-Preis addiert/zurückgesetzt |

### Warum nicht `register_endpoint_data` zum Schreiben?

`woocommerce_store_api_register_endpoint_data` (mit `CartItemSchema::IDENTIFIER`)
ist laut Docs **ausschließlich lesend** (`readonly`). Kein Transport-/Schreibweg.

### Warum nicht der Checkout-Weg (`setExtensionData`)?

Transportiert Daten erst beim Checkout. Die Anforderung verlangt jedoch, dass
Grußkarte **und** Grußtext bereits **im Warenkorb** sichtbar sind. Deshalb
`extensionCartUpdate` (Cart-Update-Weg), nicht der Checkout-Weg.

> **Quellen:** [Updating the cart on-demand](https://github.com/woocommerce/woocommerce/blob/trunk/docs/apis/store-api/extending-store-api/extend-store-api-update-cart.md) · [Exposing your data](https://github.com/woocommerce/woocommerce/blob/trunk/docs/apis/store-api/extending-store-api/extend-store-api-add-data.md) · [Available extensible endpoints](https://github.com/woocommerce/woocommerce/blob/trunk/docs/apis/store-api/extending-store-api/available-endpoints-to-extend.md)

---

## Build-System

- `npm run build` / `npm run start` benötigen `--experimental-modules` (für die
  Interactivity API `viewScriptModule`). Damit liefert
  `@wordpress/scripts/config/webpack.config` ein Array `[scriptConfig, moduleConfig]`;
  `webpack.config.js` mappt über beide.
- Beide Configs müssen `output.clean: false` haben (Race-Condition zwischen den
  beiden parallelen Webpack-Läufen sonst löscht der eine Build die Assets des
  anderen). Stattdessen räumt das npm-Script `clean` (`rimraf build`) vorab auf.
- `@woocommerce/dependency-extraction-webpack-plugin` erfordert eine explizite
  `requestToExternal`/`requestToHandle`-Konfiguration für `react/jsx-runtime`,
  sonst wird die JSX-Runtime doppelt gebündelt (React-Fehler #31 im Editor).

---

## Optionaler Edit-Flow (Warenkorb → Produkt)

Standardmäßig ist der Produktlink im Warenkorb ein generischer Permalink ohne
Warenkorb-Kontext. Für einen Edit-Flow müssten folgende Schritte implementiert werden:

1. **Link überschreiben** via `woocommerce_cart_item_name`:
   ```
   /produkt/rosen/?edit_cart_item=abc123
   ```

2. **Produktseite vorbelegen:** `$_GET['edit_cart_item']` → `gcb_meta` aus Session lesen → Felder vorbelegen

3. **Beim Absenden:** bestehenden `gcb_meta`-Eintrag überschreiben (passiert
   bereits automatisch, wenn dieselbe `bouquet_product_id` erneut gesendet wird)

> Dieses Feature ist **nicht implementiert**. Standard-Flow: Artikel entfernen und neu hinzufügen.

