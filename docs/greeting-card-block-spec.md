# Spezifikation: Grußkarten-Selektor (WooCommerce Block)

## Kontext

WordPress mit Block-Theme (Twenty Twenty-Five), WooCommerce (neueste Version),
Gutenberg Block Editor. Das Feature erlaubt Kunden, beim Kauf eines Produkts
optional eine Grußkarte auszuwählen und einen persönlichen Grußtext zu verfassen.

---

## Anforderungen

### Funktional

1. Auf der Produktseite erscheint eine Checkbox „Grußkarte gewünscht?"
2. Bei Aktivierung wird ein Slider mit auswählbaren Grußkarten eingeblendet
3. Genau eine Grußkarte kann selektiert werden
4. Ein Textfeld erlaubt die Eingabe eines persönlichen Grußtexts (max. 300 Zeichen)
5. Grußkarte und Grußtext werden im Warenkorb angezeigt
6. Die Grußkarte erscheint im Warenkorb und Checkout als **eigene Zeile** (separate Position, nicht als Meta der Hauptposition)
7. Beide Informationen sind in der Bestellung dauerhaft gespeichert
8. Sie erscheinen in der Bestellbestätigungs-E-Mail und im WooCommerce-Admin
9. Der Preis der Grußkarte wird dem Gesamtpreis hinzuaddiert

### Nicht-funktional

- Grußkarten sind redaktionell über den WooCommerce-Shop pflegbar (kein eigener CPT)
- Das Feature ist als eigenständiges Plugin entwickelt (kein Child-Theme)
- Setzt auf **WooCommerce Cart/Checkout Blocks** (kein klassischer Shortcode-Cart) — zukunftssichere Ausrichtung gemäß WordPress FSE-Strategie

---

## Datenstruktur

### Grußkarten (WooCommerce Produkte)

- Produktkategorie: `grußkarten`
- Produkttyp: Simple Product
- Preis: optional (0 = kostenlos, oder mit Preis)
- Produktbild: das Kartenmotiv
- Zugriff über Query Loop mit Kategorie-Filter

### Bestellposition Meta (`wc_order_itemmeta`)

| meta_key  | Beschreibung                       |
|-----------|------------------------------------|
| Grußkarte | Name des gewählten Karten-Produkts |
| Grußtext  | Vom Kunden verfasster Freitext     |

---

## Architektur

### Komponenten

```
myplugin/
├── greeting-card-selector/       ← Custom Gutenberg Block
│   ├── block.json
│   ├── render.php                ← Serverseitiges Rendering
│   ├── view.js                   ← Slider-Logik + Checkbox-Toggle
│   └── style.css
└── includes/
    └── woocommerce-hooks.php     ← Cart/Order-Integration
```

### Block: `myplugin/greeting-card-selector`

- **Typ:** Standalone Block (kein InnerBlocks-Wrapper)
- **Rendering:** Serverseitig via `render_callback` / `render.php`
- **Platzierung:** Im Single Product Template via Site Editor (vor Add-to-Cart-Button)
- **Slider:** Swiper.js (bereits in WordPress verfügbar)

#### render.php – Ausgabe

```php
$cards = wc_get_products([
    'category' => ['grußkarten'],
    'limit'    => -1,
    'status'   => 'publish',
]);
```

Erzeugt:
- Checkbox `#greeting-card-toggle`
- Slider-Container (initial `display: none`)
- Karten als `<button type="button" aria-pressed="false" data-card-id="...">` (kein Radio-Input)
- Hidden Input `<input type="hidden" name="greeting_card_id">` — wird per JS beim Klick befüllt
- Textarea `name="greeting_card_text"` (max. 300 Zeichen)

#### view.js – Verhalten

- Checkbox → Slider ein-/ausblenden
- Swiper-Instanz initialisieren
- Kartenauswahl über `aria-pressed`-State auf `<button>`-Elementen
- Bei Klick: aktive Karte markieren + hidden Input `greeting_card_id` aktualisieren
- Zeichenzähler für Textarea (Limit: 300)

---

## WooCommerce-Integration

### 1. Daten beim Add-to-Cart speichern

Hook: `woocommerce_add_cart_item_data`

```php
$cart_data['greeting_card_id']   = absint($_POST['greeting_card_id']);
$cart_data['greeting_card_text'] = sanitize_textarea_field($_POST['greeting_card_text']);
```

### 2. Grußkarte als separate Warenkorb-Position

Hook: `woocommerce_add_to_cart`

```php
WC()->cart->add_to_cart(
    $cart_item_data['greeting_card_id'],
    1, 0, [],
    ['linked_to' => $cart_item_key]
);
```

WooCommerce berechnet Preis, Steuer und Gesamtsumme automatisch.
Die Karte erscheint als eigene Position in Warenkorb und Bestellung.

### 3. Anzeige im Warenkorb

Hook: `woocommerce_get_item_data`

Zeigt Grußkarten-Name und Grußtext als Metazeilen unter dem Produkt.

### 4. Dauerhaft in Bestellung speichern

Hook: `woocommerce_checkout_create_order_line_item`

```php
$item->add_meta_data('Grußkarte', $card->get_name());
$item->add_meta_data('Grußtext',  $values['greeting_card_text']);
```

Erscheint automatisch in:
- Admin → Bestellung → Artikel
- Bestellbestätigungs-E-Mail
- Kundenbereich → Bestellhistorie

---

## WooCommerce Cart/Checkout Blocks Kompatibilität

Die klassischen PHP-Hooks funktionieren **nicht** mit den React-basierten WooCommerce Blocks. Die folgende Tabelle zeigt die Unterschiede:

| Aufgabe | Klassisch (Shortcode) | WooCommerce Blocks |
|---|---|---|
| Daten beim Add-to-Cart speichern | `woocommerce_add_cart_item_data` | identisch — funktioniert für beide |
| Grußkarten-Info im Warenkorb anzeigen | `woocommerce_get_item_data` | `woocommerce_store_api_register_endpoint_data` mit `CartItemSchema::IDENTIFIER` |
| Daten beim Checkout in Bestellung speichern | `woocommerce_checkout_create_order_line_item` | `woocommerce_store_api_checkout_update_order_from_request` |

### WooCommerce Cart/Checkout Blocks (gewählte Implementierung)

**Anzeige im Cart Block** — serverseitige Registrierung via Store API:

```php
use Automattic\WooCommerce\StoreApi\StoreApi;
use Automattic\WooCommerce\StoreApi\Schemas\ExtendSchema;
use Automattic\WooCommerce\StoreApi\Schemas\V1\CartItemSchema;

add_action('woocommerce_blocks_loaded', function() {
    woocommerce_store_api_register_endpoint_data([
        'endpoint'        => CartItemSchema::IDENTIFIER,
        'namespace'       => 'myplugin-greeting-card',
        'data_callback'   => function($cart_item) {
            return [
                'greeting_card_name' => !empty($cart_item['greeting_card_id'])
                    ? get_the_title($cart_item['greeting_card_id'])
                    : null,
                'greeting_card_text' => $cart_item['greeting_card_text'] ?? null,
            ];
        },
        'schema_callback' => function() {
            return [
                'greeting_card_name' => ['type' => ['string', 'null'], 'readonly' => true],
                'greeting_card_text' => ['type' => ['string', 'null'], 'readonly' => true],
            ];
        },
        'schema_type' => ARRAY_A,
    ]);
});
```

Die Daten sind dann im Cart Block JavaScript-Kontext unter `extensions['myplugin-greeting-card']` verfügbar.

**Speichern beim Checkout Block** — statt `woocommerce_checkout_create_order_line_item`:

```php
add_action('woocommerce_store_api_checkout_update_order_from_request',
    function(\WC_Order $order, \WP_REST_Request $request) {
        $data = $request['extensions']['myplugin-greeting-card'] ?? [];
        if (!empty($data['greeting_card_name'])) {
            // Über alle Order Items iterieren und Meta setzen
            foreach ($order->get_items() as $item) {
                if ($item->get_meta('_is_greeting_card')) {
                    $item->add_meta_data('Grußtext', sanitize_textarea_field($data['greeting_card_text']));
                    $item->save();
                }
            }
        }
    }, 10, 2
);
```

> **Quelle:** [WooCommerce Store API – Exposing your data](https://github.com/woocommerce/woocommerce/blob/trunk/docs/apis/store-api/extending-store-api/extend-store-api-add-data.md) · [Adding fields and passing values](https://github.com/woocommerce/woocommerce/blob/trunk/docs/apis/store-api/extending-store-api/extend-store-api-add-custom-fields.md)

---

## Optionaler Edit-Flow (Warenkorb → Produkt)

Standardmäßig ist der Produktlink im Warenkorb ein generischer Permalink ohne
Warenkorb-Kontext. Für einen Edit-Flow müssen folgende Schritte implementiert werden:

1. **Link überschreiben** via `woocommerce_cart_item_name`:
   ```
   /produkt/rosen/?edit_cart_item=abc123
   ```

2. **Produktseite vorbelegen:** `$_GET['edit_cart_item']` → Cart-Item aus Session lesen → Felder vorbelegen

3. **Beim Absenden:** altes Cart-Item entfernen, neues mit aktualisierten Daten hinzufügen

> Dieses Feature ist **nicht im MVP** enthalten. Standard-Flow: Artikel entfernen und neu hinzufügen.

