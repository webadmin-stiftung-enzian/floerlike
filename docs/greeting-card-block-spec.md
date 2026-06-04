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
- **Slider:** Swiper.js (via npm, in `view.js` gebundelt mit `@wordpress/scripts`)

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
- Textarea für den Grußtext (max. 300 Zeichen)

> Auswahl (`card_id`) und Grußtext werden **nicht** über Formularfelder übertragen, sondern im JS-State gehalten und via `extensionCartUpdate` an den Server gesendet (siehe WooCommerce-Integration). Ein Hidden Input ist daher nicht erforderlich.

#### view.js – Verhalten

- Checkbox → Slider ein-/ausblenden
- Swiper-Instanz initialisieren
- Kartenauswahl über `aria-pressed`-State auf `<button>`-Elementen
- Bei Klick: aktive Karte markieren + Auswahl (`card_id`) im JS-State halten
- Zeichenzähler für Textarea (Limit: 300)
- **Übergabe an den Server** erfolgt nicht über ein Formularfeld, sondern aktiv via `extensionCartUpdate` (siehe unten). Der Hidden Input ist daher nicht funktional relevant.

---

## WooCommerce-Integration

> **Grundlegende Erkenntnis:** Der `woocommerce/add-to-cart-with-options`-Block ist **kein** klassisches POST-Formular. Seine `addToCart`-Action ruft `event.preventDefault()` auf und legt das Produkt über die **Store API** (`addCartItem`) an. Es werden ausschließlich `id`, `quantity`, `variation` und `type` übertragen — **eigene Formularfelder wie `greeting_card_id` oder die Textarea erreichen den Server nie über `$_POST`**. Der gesamte klassische `$_POST`-basierte Ansatz entfällt damit.
>
> Der einzige von WooCommerce unterstützte Weg, vom Client aus den Server-Cart zu verändern, ist die Funktion `extensionCartUpdate` in Kombination mit einem serverseitig registrierten `register_update_callback`. Extensions dürfen den Client-Cart-State **nicht** direkt manipulieren.
>
> **Quelle:** [Updating the cart on-demand](https://github.com/woocommerce/woocommerce/blob/trunk/docs/apis/store-api/extending-store-api/extend-store-api-update-cart.md)

### 1. Auswahl vom Client an den Server übergeben

Clientseitig (`view.js`), **nach** erfolgreichem Hinzufügen des Hauptprodukts:

```js
const { extensionCartUpdate } = window.wc.blocksCheckout;

extensionCartUpdate({
    namespace: 'greeting-card-block',
    data: {
        action:  'add',
        card_id: selectedCardId,
        text:    greetingText,
    },
});
```

Die Daten landen im `data`-Argument des registrierten Callbacks (siehe Schritt 2).

> **Hinweis (Docs):** Pro `namespace` darf **nur ein** Callback registriert werden. Unterschiedliche Aktionen (z. B. Karte hinzufügen / entfernen / ändern) werden über einen `action`-Key im `data` unterschieden.

### 2. Grußkarte als separate Warenkorb-Position anlegen

Serverseitig via `register_update_callback`. Der Callback validiert die Eingabe und legt die Karte als **eigene Cart-Position** mit dem Grußtext als Cart-Item-Data an:

```php
add_action('woocommerce_blocks_loaded', function () {
    woocommerce_store_api_register_update_callback([
        'namespace' => 'greeting-card-block',
        'callback'  => function ($data) {
            if (($data['action'] ?? '') !== 'add' || empty($data['card_id'])) {
                return;
            }
            $card = wc_get_product(absint($data['card_id']));
            if (!$card || !has_term('grusskarte', 'product_cat', $card->get_id())) {
                return; // ungültige Eingabe still ignorieren
            }
            WC()->cart->add_to_cart(
                $card->get_id(), 1, 0, [],
                [
                    '_is_greeting_card'  => true,
                    'greeting_card_text' => sanitize_textarea_field($data['text'] ?? ''),
                ]
            );
        },
    ]);
});
```

WooCommerce berechnet Preis, Steuer und Gesamtsumme automatisch und gibt den
aktualisierten Cart-State an den Block zurück. Die Karte erscheint als eigene
Position in Warenkorb und Bestellung.

### 3. Anzeige im Warenkorb (wie eine Variation)

Hook: `woocommerce_get_item_data`

Was hier an das `item_data`-Feld eines Cart-Items angehängt wird, rendert der
WooCommerce **Cart-Block nativ** unter dem Artikel — exakt so, wie auch
Variations-Attribute angezeigt werden. Es ist **kein** eigener Anzeige-Block und
**kein** `register_endpoint_data` nötig.

```php
add_filter('woocommerce_get_item_data', function ($item_data, $cart_item) {
    if (!empty($cart_item['_is_greeting_card']) && !empty($cart_item['greeting_card_text'])) {
        $item_data[] = [
            'key'   => 'Grußtext',
            'value' => wp_kses_post($cart_item['greeting_card_text']),
        ];
    }
    return $item_data;
}, 10, 2);
```

> `register_endpoint_data` (`CartItemSchema::IDENTIFIER`) ist laut Docs ausschließlich **lesend/readonly** (Anzeige) und dient nur als Fallback, falls der native `item_data`-Pfad für freie Custom-Meta nicht ausreicht. Es ist **kein** Schreibweg.

### 4. Dauerhaft in Bestellung speichern

Hook: `woocommerce_checkout_create_order_line_item`

Da der Grußtext bereits als Cart-Item-Data am Karten-Item hängt, wird er beim
Checkout pro Line-Item in die Bestellung übernommen:

```php
add_action('woocommerce_checkout_create_order_line_item',
    function ($item, $cart_item_key, $values, $order) {
        if (!empty($values['_is_greeting_card'])) {
            $item->add_meta_data('Grußkarte', $item->get_name());
            $item->add_meta_data('Grußtext',  $values['greeting_card_text'] ?? '');
        }
    }, 10, 4
);
```

Erscheint automatisch in:
- Admin → Bestellung → Artikel
- Bestellbestätigungs-E-Mail
- Kundenbereich → Bestellhistorie

---

## WooCommerce Cart/Checkout Blocks Kompatibilität

Die React-basierten WooCommerce Blocks übertragen beim Add-to-Cart **keine**
eigenen Formularfelder. Die folgende Tabelle zeigt den korrekten Mechanismus pro
Aufgabe:

| Aufgabe | Klassisch (Shortcode) | WooCommerce Blocks (verifiziert) |
|---|---|---|
| Auswahl/Text vom Client an den Server | `$_POST` im Add-to-Cart-Formular | `extensionCartUpdate` → `register_update_callback` |
| Grußkarte als eigene Cart-Zeile anlegen | `woocommerce_add_to_cart` (PHP) | `WC()->cart->add_to_cart()` **im** `register_update_callback` |
| Grußtext im Warenkorb anzeigen | `woocommerce_get_item_data` | `woocommerce_get_item_data` — identisch, rendert nativ wie Variations-Meta |
| Daten in Bestellung speichern | `woocommerce_checkout_create_order_line_item` | `woocommerce_checkout_create_order_line_item` — identisch (Cart-Item-Data → Order-Item-Meta) |

### Warum nicht `register_endpoint_data` zum Schreiben?

`woocommerce_store_api_register_endpoint_data` (mit `CartItemSchema::IDENTIFIER`)
ist laut Docs **ausschließlich lesend** (`readonly`): Der `data_callback` bekommt
`$cart_item` und liefert Daten **zur Anzeige** zurück — er nimmt **keine**
Client-Daten entgegen. Damit ist es **kein** Transport-/Schreibweg, sondern nur
ein optionaler Fallback für die Anzeige, falls der native `item_data`-Pfad
(Schritt 3) für freie Custom-Meta einmal nicht genügt.

### Warum nicht der Checkout-Weg (`setExtensionData`)?

Der `setExtensionData` → `woocommerce_store_api_checkout_update_order_from_request`-
Pfad transportiert Daten **erst beim Checkout**. Die Anforderung verlangt jedoch,
dass Grußkarte **und** Grußtext bereits **im Warenkorb** an der Karten-Position
sichtbar sind (analog zur Variations-Description). Deshalb wird der Cart-Update-
Weg (`extensionCartUpdate`) verwendet, nicht der Checkout-Weg.

> **Quellen:** [Updating the cart on-demand](https://github.com/woocommerce/woocommerce/blob/trunk/docs/apis/store-api/extending-store-api/extend-store-api-update-cart.md) · [Exposing your data](https://github.com/woocommerce/woocommerce/blob/trunk/docs/apis/store-api/extending-store-api/extend-store-api-add-data.md) · [Available extensible endpoints](https://github.com/woocommerce/woocommerce/blob/trunk/docs/apis/store-api/extending-store-api/available-endpoints-to-extend.md)

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

