# greeting-card-block: Architektur & Entwicklerdokumentation

Eine vollständige Referenz für das Plugin – von der Produktseite bis zur gespeicherten Bestellung.

---

## Bevor du anfängst: Was macht dieses Plugin genau?

Das Plugin fügt auf der WooCommerce-Produktseite eines Straußes einen Block ein, der dem Kunden erlaubt, eine Grußkarte auszuwählen und eine persönliche Nachricht einzugeben. Wenn der Strauß in den Warenkorb gelegt wird, wird die Karte **nicht** als eigene Warenkorb-Position angelegt, sondern als Zusatzinformation am Strauß-Item gespeichert; ihr Preis wird auf den Straußpreis aufgeschlagen. Im Warenkorb erscheint die Karte als formatierter Info-Block (Bild, Name, Preis) samt Grußtext unterhalb des Straußes. Pro Strauß-Produkt gibt es genau eine Karte; wird der Strauß entfernt, verschwinden die Karten-Daten automatisch mit.

Das ist konzeptionell anders als ein normaler WooCommerce-Checkout-Block (wie in `woo-order-ext`): Dieser Block lebt auf der **Produktseite**, nicht im Checkout. Der Checkout-Mechanismus (`setExtensionData` → Bestellmeta) wird hier **nicht** verwendet. Stattdessen schickt der Block die Kartenauswahl per `extensionCartUpdate` an den Server, wo sie in einem separaten Session-Speicher (`gcb_meta`) abgelegt und beim Laden des Warenkorbs als Meta in das Strauß-Item injiziert wird.

> **Warum kein eigenes Warenkorb-Item?** Ein direktes Schreiben der Karte in `cart_contents` destabilisiert die WooCommerce Blocks Store API ("Cart item does not exist"-Fehler), weil die Blocks-interne Warenkorb-Darstellung inkonsistent wird. Der Session-Meta-Ansatz umgeht das vollständig.

---

## 1. Schnell-Orientierung: Was macht welche Datei?

| Datei | Aufgabe | Läuft wo |
|---|---|---|
| `greeting-card-block.php` | Plugin-Bootstrap, registriert Block-Types | PHP, Server |
| `includes/woocommerce-hooks.php` | Warenkorb-Logik, Verknüpfung Karte↔Strauß | PHP, Server |
| `src/greeting-card-block/block.json` | Block-Manifest (Name, Attribute, Kontext) | Build-Zeit |
| `src/greeting-card-block/render.php` | Server-seitiges HTML des Blocks | PHP, Server |
| `src/greeting-card-block/view.js` | Interactivity-API-Store (Kartenauswahl, Text, Validierung) | JS, Browser |
| `src/greeting-card-block/cart-sync.js` | `extensionCartUpdate`-Aufruf nach Add-to-Cart | JS, Browser |
| `src/greeting-card-block/edit.js` | Platzhalter-Ansicht im Gutenberg-Editor | JS, Editor |

**Der wichtigste mentale Sprung:** Der Block wird auf der Produktseite platziert und nutzt die WordPress **Interactivity API** (kein React, kein jQuery). Die WooCommerce-Cart-API (`extensionCartUpdate`) ist technisch ein separates klassisches Script (`cart-sync.js`), weil WooCommerce-Globals (`window.wc.*`) nicht aus Interactivity-Modulen importiert werden können.

---

## 2. Architektur: Zwei Schichten

Das Plugin besteht aus zwei unabhängigen Schichten, die über den DOM kommunizieren:

```
┌─────────────────────────────────────────────────────┐
│  SCHICHT 1: Produkt-Block-UI (Interactivity API)    │
│                                                     │
│  render.php    → generiert HTML mit data-wp-*       │
│  view.js       → hydratisiert DOM, verwaltet State  │
│                  (wantsCard, selectedCardId, text)  │
│                                                     │
│  Single Source of Truth: DOM-Attribute (aria-pressed│
│  Checkbox checked, Textarea value)                  │
└──────────────────────┬──────────────────────────────┘
                       │ DOM lesen (decoupled)
┌──────────────────────▼──────────────────────────────┐
│  SCHICHT 2: WooCommerce Cart-Sync (klassisches JS)  │
│                                                     │
│  cart-sync.js  → lauscht auf wc-blocks_added_to_cart│
│                  liest DOM, ruft extensionCartUpdate │
│                                                     │
│  woocommerce-hooks.php → empfängt, validiert,       │
│                          speichert Karte als Session-│
│                          Meta am Strauß-Item und     │
│                          addiert den Kartenpreis     │
└─────────────────────────────────────────────────────┘
```

Die beiden Schichten teilen **keinen gemeinsamen State** – `cart-sync.js` liest Werte direkt aus dem DOM (welche Karte `aria-pressed="true"` hat, welcher Text im Textarea steht). Das ist bewusste Entkopplung: Schicht 1 kann sich frei weiterentwickeln, solange die DOM-Konventionen stabil bleiben.

---

## 3. Schicht 1: Der Produkt-Block (Interactivity API)

### 3.1 `render.php` – was der Server erzeugt

`render.php` wird bei jedem Seitenaufruf serverseitig ausgeführt. Es produziert das initiale HTML und befüllt den Interactivity-API-State:

```php
// Alle Grußkarten aus der Kategorie "grusskarte" laden
$cards = wc_get_products([
    'category' => ['grusskarte'],
    'limit'    => -1,
    'status'   => 'publish',
    'order'    => $attributes['order'] ?? 'ASC',
]);

// Produkt-ID des aktuellen Straußes einbetten (für Cart-Sync)
$product_id = absint($block->context['postId'] ?? get_the_ID());

// Initialer State für die Interactivity API
wp_interactivity_state('greeting-card-block', [
    'wantsCard'      => true,
    'selectedCardId' => '',
    'text'           => '',
    'validated'      => false,
]);
```

**Warum `$block->context['postId']`?** Der Block nutzt `"usesContext": ["postId"]` in `block.json`. Wenn der Block im Kontext eines WooCommerce-Produkts gerendert wird (z.B. innerhalb des `single-product`-Templates), übergibt WordPress automatisch die Produkt-ID. Das ist zuverlässiger als `get_the_ID()`, weil es auch bei eingebetteten Verwendungen funktioniert. Fallback auf `get_the_ID()` für den direkten Produktseiten-Kontext.

**`data-product-id` am Root-Element** überträgt die Produkt-ID in den Browser, wo `cart-sync.js` sie beim Add-to-Cart-Event abholt.

### 3.2 `view.js` – die Interactivity API

Die Interactivity API ist das WordPress-eigene reaktive System für interaktive Blöcke – ohne React, ohne jQuery. Der State wird in `wp_interactivity_state()` (PHP) initialisiert und im Browser per `store()` (JS) erweitert.

```js
const { state } = store('greeting-card-block', {
    state: {
        // Berechnete Werte (Getter)
        get isCardSelected() { return state.selectedCardId !== ''; },
        get isValid() {
            return !state.wantsCard || (state.isCardSelected && state.hasText);
        },
        get showCardError() {
            return state.wantsCard && state.validated && !state.isCardSelected;
        },
    },
    actions: {
        selectCard() {
            const { ref } = getElement();
            // Toggle: erneutes Klicken hebt Auswahl auf
            state.selectedCardId =
                state.selectedCardId === ref.dataset.cardId ? '' : ref.dataset.cardId;
        },
    },
    callbacks: {
        initSwiper() { /* Swiper-Instanz initialisieren */ },
    },
});
```

**Wichtig:** Die Direktiven im HTML (`data-wp-bind--checked`, `data-wp-on--click`, `data-wp-class--has-error`) verbinden den State mit dem DOM deklarativ. Kein manuelles DOM-Manipulation nötig.

**Warum `loop: false` im Swiper?** Swiper klont bei aktiviertem Loop Slides für den Endlos-Effekt. Geklonte Elemente werden von der Interactivity API nicht hydratisiert – `data-wp-on--click` hätte keine Wirkung. Loop ist daher deaktiviert.

### 3.3 Formular-Blockierung vor dem Add-to-Cart

`view.js` registriert einen `submit`-Listener in der Capture-Phase (läuft vor WooCommerce):

```js
document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!form.matches('form.wp-block-woocommerce-add-to-cart-with-options, form.cart')) {
        return;
    }
    state.validated = true;     // Fehler einblenden
    if (!state.isValid) {
        event.preventDefault(); // Submit blockieren
        event.stopImmediatePropagation();
    }
}, true); // true = Capture-Phase
```

Dadurch können Fehlermeldungen (Karte nicht ausgewählt, kein Text) angezeigt werden, bevor WooCommerce den Warenkorb verändert.

### 3.4 Interactivity API vs. klassisches WP-Script

| Eigenschaft | Interactivity API (`viewScriptModule`) | Klassisches Script (`viewScript`) |
|---|---|---|
| Format | ES-Modul | Klassisches Script |
| Imports | `import` aus `@wordpress/interactivity` | `window.wc.*`-Globals |
| State | Reaktiv, deklarativ per `data-wp-*` | Manuell / imperativ |
| WC-Globals | Nicht verfügbar | Verfügbar (`extensionCartUpdate`, etc.) |
| Wann nutzen | Block-UI, Formular-State, Validierung | WooCommerce-Cart/Checkout-API-Aufrufe |

Das ist der Grund, warum das Plugin zwei JS-Dateien hat: `view.js` (Modul) für die UI, `cart-sync.js` (klassisch) für den Cart-API-Aufruf.

---

## 4. Schicht 2: WooCommerce Cart-Integration

### 4.1 `cart-sync.js` – der Brücken-Layer

`cart-sync.js` lauscht auf das WooCommerce-Event `wc-blocks_added_to_cart`. Dieses Event wird von WooCommerce **nach** erfolgreichem Add-to-Cart ausgelöst.

```js
document.body.addEventListener('wc-blocks_added_to_cart', () => {
    // State aus dem DOM lesen (Single Source of Truth)
    const checkbox = document.getElementById('isGreetingCardChecked');
    const wantsCard = checkbox?.checked ?? false;

    const selectedCard = document.querySelector(
        '.greeting-card-block__card[aria-pressed="true"]'
    );
    const selectedCardId = selectedCard?.dataset.cardId ?? '';

    const text = document.getElementById('greetingCardMessage')?.value.trim() ?? '';

    if (!wantsCard || !selectedCardId || !text) return;

    // Produkt-ID des gerade gekauften Straußes aus dem Block-Attribut lesen
    const block = document.querySelector('[data-wp-interactive="greeting-card-block"]');
    const bouquetProductId = block?.dataset.productId ?? '';

    extensionCartUpdate({
        namespace: 'greeting-card-block',
        data: { action: 'add', card_id: selectedCardId, text, bouquet_product_id: bouquetProductId },
    }).catch((error) => processErrorResponse(error));
});
```

**Warum DOM statt State lesen?** `cart-sync.js` ist ein klassisches Script und hat keinen Zugriff auf den Interactivity-API-Store von `view.js`. Das DOM ist die gemeinsame Schnittstelle – es spiegelt den State von `view.js` bereits wider (`aria-pressed`, `checked`, `.value`). Diese Entkopplung ist bewusst: weder Modul noch klassisches Script müssen voneinander wissen.

### 4.2 `woocommerce-hooks.php` – der Server-Empfänger

#### Hook-Übersicht

| Hook | Aufgabe |
|---|---|
| `woocommerce_get_cart_item_from_session` | `gcb_meta` aus der Session in die geladenen Cart-Items injizieren |
| `woocommerce_blocks_loaded` → `woocommerce_store_api_register_update_callback` | `extensionCartUpdate`-Request empfangen, Karte in `gcb_meta` ablegen |
| `woocommerce_before_calculate_totals` / `woocommerce_after_calculate_totals` | Kartenpreis auf den Strauß addieren bzw. für die Stückpreis-Anzeige zurücksetzen |
| `woocommerce_cart_item_removed` / `woocommerce_cart_emptied` | Verwaiste `gcb_meta`-Einträge aufräumen |
| `woocommerce_get_item_data` | Karte (Bild, Name, Preis) + Grußtext im Warenkorb anzeigen |
| `woocommerce_checkout_create_order_line_item` | Grußkarte + Text als Meta der Strauß-Bestellposition speichern |
| `woocommerce_payment_complete` / `woocommerce_order_status_processing` | Lagerbestand der Karte reduzieren |
| `woocommerce_order_status_cancelled` / `woocommerce_order_status_refunded` | Lagerbestand der Karte wiederherstellen |

#### Der `extensionCartUpdate`-Callback

```php
woocommerce_store_api_register_update_callback([
    'namespace' => 'greeting-card-block',
    'callback'  => function ($data) {
        if (($data['action'] ?? '') !== 'add') return;

        $card_id            = absint($data['card_id'] ?? 0);
        $text               = mb_substr(sanitize_textarea_field($data['text'] ?? ''), 0, 300);
        $bouquet_product_id = absint($data['bouquet_product_id'] ?? 0);

        // Validierung: Vollständigkeit (card_id + text)
        // Validierung: Karte muss aus Kategorie "grusskarte" sein

        // Strauß-Item per product_id finden und Karte als Session-Meta ablegen
        foreach (WC()->cart->get_cart() as $key => $cart_item) {
            if ((int)($cart_item['product_id'] ?? 0) !== $bouquet_product_id) continue;

            $card_price = (float)$card->get_price();
            $base_price = isset($cart_item['_bouquet_base_price'])
                ? (float)$cart_item['_bouquet_base_price']
                : (float)$cart_item['data']->get_price();

            // 1. Persistent: separater Session-Key, NICHT cart_contents
            $gcb_meta       = WC()->session->get('gcb_meta', []);
            $gcb_meta[$key] = [
                'id'         => $card->get_id(),
                'text'       => $text,
                'price'      => $card_price,
                'base_price' => $base_price,
            ];
            WC()->session->set('gcb_meta', $gcb_meta);

            // 2. In-Memory für die aktuelle Store-API-Antwort
            WC()->cart->cart_contents[$key]['_greeting_card_id']   = $card->get_id();
            WC()->cart->cart_contents[$key]['_greeting_card_text']  = $text;
            WC()->cart->cart_contents[$key]['_greeting_card_price'] = $card_price;
            WC()->cart->cart_contents[$key]['_bouquet_base_price']  = $base_price;
            WC()->cart->cart_contents[$key]['data']->set_price($base_price + $card_price);
            return;
        }
    },
]);
```

Die Auswahl wird also nicht als eigenes Item hinzugefügt, sondern dem **bestehenden Strauß-Item** zugeordnet: persistent im Session-Key `gcb_meta` (geschlüsselt nach Cart-Item-Key) und zusätzlich direkt im In-Memory-Cart, damit die unmittelbare Store-API-Antwort bereits den korrekten Gesamtpreis enthält. Beim nächsten Laden des Warenkorbs injiziert `woocommerce_get_cart_item_from_session` die Werte wieder als `_greeting_card_*`-Meta.

**Wichtig:** Eine `RouteException` aus dem Callback wird von der Store API abgefangen und dem Kunden als Inline-Fehlermeldung im Cart/Checkout-Block angezeigt. Es ist kein eigenes Error-Handling nötig.

---

## 5. Das "Eine Karte pro Strauß"-Konzept

### 5.1 Session-Meta statt eigenes Cart-Item

Die Kartenauswahl wird **nicht** in `cart_contents` geschrieben (das destabilisiert die Store API, siehe Einleitung), sondern in einem eigenen Session-Speicher abgelegt:

```php
WC()->session->get('gcb_meta'); // [ cart_item_key => [ id, text, price, base_price ], ... ]
```

Der Speicher ist nach dem **Cart-Item-Key** des Straußes geschlüsselt. Bei jedem Laden des Warenkorbs injiziert `woocommerce_get_cart_item_from_session` diese Werte als Cart-Item-Meta in das Strauß-Item:

| Meta-Feld (am Strauß-Item) | Typ | Zweck |
|---|---|---|
| `_greeting_card_id` | `int` | Produkt-ID der gewählten Grußkarte |
| `_greeting_card_text` | `string` | Die Kundennachricht (max. 300 Zeichen) |
| `_greeting_card_price` | `float` | Einzelpreis der Karte (wird auf den Strauß addiert) |
| `_bouquet_base_price` | `float` | Original-Straußpreis ohne Karte |

Der Unterstrich-Präfix hält diese Felder aus der automatischen Item-Data-Anzeige heraus – die sichtbare Darstellung erfolgt kontrolliert über den `woocommerce_get_item_data`-Filter (Abschnitt 5.5).

### 5.2 Verknüpfungsmodell

```
Warenkorb-Position A:  Strauß "Rosen"     cart_item_key = "abc123"   product_id = 42
   └─ gcb_meta["abc123"] = { id: 88, text: "Alles Gute!",  price: 1.50, base_price: 49.00 }
      → injiziert als _greeting_card_id=88, _greeting_card_text="Alles Gute!", …

Warenkorb-Position B:  Strauß "Tulpen"    cart_item_key = "def456"   product_id = 57
   └─ gcb_meta["def456"] = { id: 91, text: "Glückwunsch!", price: 1.50, base_price: 39.00 }
```

Jede Karte gehört über den Cart-Item-Key genau einem Strauß-Eintrag. Wird für denselben Strauß erneut eine Karte gesendet, überschreibt der Callback den bestehenden `gcb_meta`-Eintrag (= Bearbeiten). Wird der Strauß entfernt, wird der Eintrag aufgeräumt (Abschnitt 5.3).

### 5.3 Bekannte Einschränkung

Der `extensionCartUpdate`-Callback findet den Strauß-Eintrag über die **Produkt-ID** (`bouquet_product_id`) und ordnet die Karte dem **ersten** passenden Cart-Item-Key zu. Liegt derselbe Strauß als zwei getrennte Einträge im Warenkorb, erhält nur der erste Eintrag die Karte. Für ein Blumengeschäft ist das der erwartete Anwendungsfall: ein Strauß, eine Karte.

### 5.4 Automatisches Aufräumen beim Warenkorb-Cleanup

```php
add_action('woocommerce_cart_item_removed', function ($removed_key, $cart) {
    if (! WC()->session) return;
    $gcb_meta = WC()->session->get('gcb_meta', []);
    if (isset($gcb_meta[$removed_key])) {
        unset($gcb_meta[$removed_key]);
        WC()->session->set('gcb_meta', $gcb_meta);
    }
}, 10, 2);

add_action('woocommerce_cart_emptied', function () {
    if (WC()->session) WC()->session->set('gcb_meta', []);
});
```

Weil `gcb_meta` direkt nach dem Cart-Item-Key geschlüsselt ist, genügt zum Aufräumen ein einfaches `unset($gcb_meta[$removed_key])` – es ist kein Rückverweis über Produkt-IDs nötig.

### 5.5 Preisberechnung: Karte auf den Strauß addieren

Der Kartenpreis wird nicht als eigene Position geführt, sondern in den Strauß-Preis eingerechnet. Dafür arbeiten zwei Hooks zusammen:

```php
// VOR der Berechnung: Kartenpreis aufschlagen (für korrekte Zeilensumme)
add_action('woocommerce_before_calculate_totals', function ($cart) {
    foreach ($cart->get_cart() as $cart_item) {
        if (empty($cart_item['_greeting_card_price'])) continue;
        $base = (float)($cart_item['_bouquet_base_price'] ?? $cart_item['data']->get_price());
        $cart_item['data']->set_price($base + (float)$cart_item['_greeting_card_price']);
    }
}, 10, 1);

// NACH der Berechnung: auf den Original-Straußpreis zurücksetzen
add_action('woocommerce_after_calculate_totals', function ($cart) {
    foreach ($cart->get_cart() as $cart_item) {
        if (empty($cart_item['_bouquet_base_price'])) continue;
        $cart_item['data']->set_price((float)$cart_item['_bouquet_base_price']);
    }
}, 10, 1);
```

`_bouquet_base_price` hält den Original-Straußpreis fest und verhindert ein kumuliertes Addieren bei mehrfacher Neuberechnung. Das Zurücksetzen danach sorgt für eine saubere Trennung in der Store-API-Antwort:

- `prices.price` (= `get_price()` **nach** der Berechnung) → Straußpreis **ohne** Karte (Stückpreis-Anzeige)
- `totals.line_total` (bereits in `cart_contents` gespeichert) → Strauß **+** Karte (Zeilensumme & Zwischensumme)

> Alternativ wird der Preis bereits in `woocommerce_get_cart_item_from_session` per `set_price()` gesetzt, weil dieser Filter garantiert vor `calculate_totals()` läuft. Nur `set_price()` verwenden – `set_regular_price()` kann die Preisberechnung in WooCommerce Blocks stören.

### 5.6 Anzeige im Warenkorb (`woocommerce_get_item_data`)

Der Filter fügt dem Strauß-Item zwei sichtbare Einträge hinzu: einen formatierten Karten-Block (Bild, Label, Name, Preis) und den Grußtext. Jeder Eintrag hat ein `display`-Feld (HTML) und ein `value`-Feld (Plaintext-Fallback für E-Mails).

```php
$display = sprintf(
    '<span class="gcb-card-meta">'
        . '<img src="%s" alt="" class="gcb-card-meta__img">'
        . '<span class="gcb-card-meta__info">'
            . '<span class="gcb-card-meta__label">%s</span>'
            . '<span class="gcb-card-meta__name">%s</span>'
            . '<span class="gcb-card-meta__price">%s</span>'
        . '</span>'
    . '</span>',
    esc_url($image_url),
    esc_html__('Grußkarte', 'greeting-card-block'),
    esc_html($card->get_name()),
    $price_html
);
```

> **⚠️ WooCommerce-Token-Limit (15 Wörter):** Der Cart-/Mini-Cart-Block kürzt **jeden** `item_data`-Wert clientseitig auf die ersten 15 durch Whitespace getrennten Tokens und hängt "…" an (`mini-cart.js`: `slice(0, 15).join(" ") + "…"`). Das HTML enthält viele Leerzeichen (Tag-Attribute, Bild-URL, Kartenname), daher wurde der Preis früher mitten abgeschnitten ("CHF…"). Zwei Maßnahmen halten den Wert sicher unter 15 Tokens:
>
> - `alt=""` – das Bild ist dekorativ (der Name steht direkt daneben), kein Alt-Text → weniger Tokens.
> - `&nbsp;` zwischen Währungssymbol und Betrag, damit "CHF 1.50" **ein** Token bleibt statt zwei.
>
> `$price_html` wird bewusst **nicht** durch `esc_html()` geschickt, sonst würde `&nbsp;` zu `&amp;nbsp;` und das geschützte Leerzeichen ginge verloren. Währungssymbol (aus WooCommerce) und numerischer Betrag sind sicheres HTML. Nur `<span>`-Elemente verwenden – ein `<div>` in einem `<span>` ist ungültiges HTML und führt zu Darstellungsfehlern im Mini-Warenkorb.

Die Optik (`.gcb-card-meta*`-Klassen) wird per Inline-CSS im `wp_head`-Hook ausgegeben.

---

## 6. Daten in der Bestellung speichern

Weil die Karte kein eigenes Cart-Item ist, werden ihre Daten als Meta der **Strauß-Bestellposition** gespeichert:

```php
add_action('woocommerce_checkout_create_order_line_item',
    function ($item, $cart_item_key, $values, $order) {
        if (empty($values['_greeting_card_id'])) return;

        $card = wc_get_product($values['_greeting_card_id']);
        if ($card) {
            // Lesbarer Schlüssel → sichtbar in Admin, E-Mail, Kundenbereich
            $item->add_meta_data(__('Grußkarte', 'greeting-card-block'), $card->get_name(), true);
        }

        if (!empty($values['_greeting_card_text'])) {
            $item->add_meta_data(__('Grußtext', 'greeting-card-block'), $values['_greeting_card_text'], true);
        }

        // Interner Schlüssel fürs Stock-Management
        $item->add_meta_data('_greeting_card_id', (int)$values['_greeting_card_id'], true);
    },
10, 4);
```

**Warum am Line Item, nicht an der Bestellung?** `$item->add_meta_data()` speichert auf der **Bestellposition** des Straußes – semantisch richtig, weil Karte und Grußtext zu dieser Position gehören. WooCommerce zeigt Line-Item-Meta mit lesbarem Schlüssel automatisch in Admin und Bestell-E-Mails an. Der interne Schlüssel `_greeting_card_id` (Unterstrich-Präfix) bleibt verborgen und dient nur der Lagerverwaltung.

### 6.1 Lagerverwaltung der Karte

Da die Karte kein eigenes Order-Line-Item ist, verwaltet WooCommerce ihren Lagerbestand nicht automatisch – das Plugin erledigt es manuell anhand des `_greeting_card_id`-Meta der Strauß-Position:

| Hook | Funktion | Wirkung |
|---|---|---|
| `woocommerce_payment_complete` / `woocommerce_order_status_processing` | `_gcb_reduce_card_stock()` | Lagerbestand der Karte reduzieren |
| `woocommerce_order_status_cancelled` / `woocommerce_order_status_refunded` | `_gcb_restore_card_stock()` | Lagerbestand wiederherstellen |

Ein Bestell-Meta-Flag `_gcb_stock_reduced` verhindert Doppelbuchungen (z.B. wenn `payment_complete` **und** `status_processing` feuern). Reduziert/erhöht wird nur, wenn die Karte tatsächlich Lagerverwaltung aktiviert hat (`$card->managing_stock()`).

### Datenfluss von der Produktseite bis zur Bestellung

```
Produktseite (Browser)
  └─ Kunde wählt Karte + tippt Text
       ↓ (view.js verwaltet State)
  └─ Kunde klickt "In den Warenkorb"
       ↓ (view.js prüft Validierung, lässt Submit durch)
  └─ WooCommerce legt Strauß in Warenkorb
       ↓ (wc-blocks_added_to_cart Event)
  └─ cart-sync.js liest DOM:
       selectedCardId, text, bouquetProductId
       ↓ (extensionCartUpdate POST an /wc/store/v1/cart/extensions)
  └─ woocommerce-hooks.php (Callback):
       - Validierung (Karte gültig? Text vorhanden?)
       - Strauß-Item per product_id finden
       - Karte als gcb_meta[cart_item_key] in Session ablegen
       - Kartenpreis auf den Straußpreis aufschlagen
       ↓
Warenkorb enthält: Strauß-Item mit Karten-Meta (Bild/Name/Preis/Text)
       ↓ (Checkout)
  └─ woocommerce_checkout_create_order_line_item:
       Grußtext + Kartenname + _greeting_card_id → Meta der Strauß-Position
       ↓
Bestellung gespeichert: Grußkarte sichtbar im Admin + E-Mail
       ↓ (Zahlung abgeschlossen)
  └─ _gcb_reduce_card_stock: Lagerbestand der Karte reduzieren
```

---

## 7. `block.json` – Schlüsselfelder

```json
{
    "name": "greeting-card-block/greeting-card-block",
    "supports": {
        "interactivity": true
    },
    "attributes": {
        "order": { "type": "string", "default": "" }
    },
    "usesContext": ["postId"],
    "render": "file:./render.php",
    "viewScriptModule": "file:./view.js",
    "viewScript": "file:./cart-sync.js"
}
```

| Feld | Bedeutung |
|---|---|
| `"interactivity": true` | Aktiviert die WordPress Interactivity API; `data-wp-*`-Direktiven werden verarbeitet |
| `"usesContext": ["postId"]` | Block empfängt die Produkt-ID aus dem übergeordneten Block-Kontext → `$block->context['postId']` in PHP |
| `viewScriptModule` | Wird als ES-Modul geladen (`<script type="module">`); kann `import` nutzen |
| `viewScript` | Wird als klassisches Script geladen; hat Zugriff auf `window.wc.*`-Globals |
| `render` | PHP-Datei für Server-Side-Rendering; die `save`-Funktion in `edit.js` gibt `null` zurück |

---

## 8. Der Build-Prozess

```bash
npm run build
# → rimraf build (löscht alten Build)
# → wp-scripts build --webpack-copy-php --blocks-manifest --experimental-modules
```

**Was passiert beim Build:**

| Input | Output |
|---|---|
| `src/.../view.js` | `build/.../view.js` (ES-Modul, minimiert) + `view.asset.php` |
| `src/.../cart-sync.js` | `build/.../cart-sync.js` (klassisches Bundle) + `cart-sync.asset.php` |
| `src/.../edit.js` | `build/.../index.js` + `index.asset.php` |
| `src/.../render.php` | `build/.../render.php` (1:1 kopiert via `--webpack-copy-php`) |
| `src/.../block.json` | `build/.../block.json` + `build/blocks-manifest.php` |

**`--experimental-modules`** ist erforderlich, weil `viewScriptModule` (ES-Modul) in `block.json` genutzt wird. Ohne dieses Flag wird `view.js` nicht als Modul gebaut und die Interactivity API funktioniert nicht.

**`blocks-manifest.php`** ist eine Sammeldatei, die `wp_register_block_types_from_metadata_collection()` in `greeting-card-block.php` nutzt, um alle Blöcke auf einmal zu registrieren – effizienter als einzelne `register_block_type()`-Aufrufe.

---

## 9. `extensionCartUpdate` vs. `setExtensionData` – wann was?

Das ist die häufigste Verwechslung bei Plugins, die sowohl Produkt-Seiten-Blöcke als auch Checkout-Blöcke kombinieren.

| | `extensionCartUpdate` | `setExtensionData` |
|---|---|---|
| **Ziel** | Warenkorb verändern | Bestellmeta schreiben |
| **Endpoint** | `POST /wc/store/v1/cart/extensions` | Teil des Checkout-Submit (`POST /wc/store/v1/checkout`) |
| **PHP-Hook** | `woocommerce_store_api_register_update_callback` | `woocommerce_store_api_checkout_update_order_from_request` |
| **Schema nötig?** | Nein | Ja (`woocommerce_store_api_register_endpoint_data`) |
| **Wann aufrufen** | Nach Add-to-Cart (Produkt hinzufügen, Gebühr einfügen) | Beim Checkout-Abschluss (Kundeneingabe speichern) |
| **Ergebnis** | Cart-State aktualisiert | Order-Meta gespeichert |
| **Dieses Plugin nutzt** | ✓ | ✗ |

> **Merksatz:** Soll die Kundeneingabe den **Warenkorb** verändern (ein Produkt hinzufügen, eine Gebühr addieren, ein bestehendes Item modifizieren) → `extensionCartUpdate`. Soll sie mit der **Bestellung** gespeichert werden (Newsletter-Opt-in, Lieferhinweis) → `setExtensionData`. Dieses Plugin verändert über den Update-Callback ein bestehendes Warenkorb-Item (Karten-Meta + Preisaufschlag am Strauß) – deshalb `extensionCartUpdate`.

---

## 10. Validierung: zwei Schichten

Das Plugin validiert zweifach – einmal im Browser, einmal auf dem Server.

### 10.1 Client-seitige Validierung (view.js)

Der `submit`-Event-Listener blockiert den Form-Submit, wenn `state.isValid === false`. Gleichzeitig setzt er `state.validated = true`, was die Fehlermeldungen (`data-wp-bind--hidden="!state.showCardError"`) einblendet.

**Wichtig:** Diese Validierung verhindert den Warenkorb-Submit, nicht den `extensionCartUpdate`-Aufruf. Der Aufruf kommt erst nach erfolgtem Add-to-Cart. Die Client-Validierung stellt sicher, dass Add-to-Cart nur ausgelöst wird, wenn Karte und Text vorhanden sind.

### 10.2 Server-seitige Validierung (woocommerce-hooks.php)

```php
// Eingaben prüfen
if (!$card_id || '' === $text) {
    throw new RouteException('greeting_card_block_incomplete', '...', 400);
}

// Produktkategorie prüfen – verhindert dass eine beliebige Produkt-ID übergeben wird
if (!$card || !has_term('grusskarte', 'product_cat', $card->get_id())) {
    throw new RouteException('greeting_card_block_invalid_product', '...', 400);
}
```

Die Server-Validierung ist die eigentliche Sicherheitsschranke. Die Client-Validierung ist nur UX. Ohne Server-Validierung könnte jeder beliebige `card_id`-Wert per API-Request übergeben werden.

---

## 11. Debugging-Referenz

### 11.1 Interactivity API hydratisiert nicht

**Symptom:** Klick auf Karte macht nichts, Textarea löst keine Fehler aus.

**Ursache:** `"interactivity": true` fehlt in `block.json`, oder `viewScriptModule` ist nicht gesetzt, oder `--experimental-modules` fehlt beim Build.

**Check:**
```js
// Erscheint das in der Konsole?
console.log('[greeting-card][DEBUG] view.js Module geladen & ausgeführt');
// und:
console.log('[greeting-card][DEBUG] Interactivity hydratisiert. Root-Element:', ref);
```

### 11.2 `extensionCartUpdate` wird nicht aufgerufen

**Symptom:** Karte wird nicht in den Warenkorb gelegt, kein Netzwerk-Request sichtbar.

**Mögliche Ursachen:**
1. `cart-sync.js` wurde nicht geladen → `"viewScript"` in `block.json` prüfen
2. Event `wc-blocks_added_to_cart` feuert nicht → nur von WooCommerce-Blocks-Formular ausgelöst, nicht von klassischem `form.cart`-Submit
3. `wantsCard`, `selectedCardId` oder `text` sind leer → Guards im Callback greifen

**Check:**
```js
// Am Anfang des cart-sync.js Event-Listeners temporär einfügen:
console.log('[debug]', { wantsCard, selectedCardId, text, bouquetProductId });
```

### 11.3 Grußkarte landet nicht im Warenkorb (kein Fehler)

**Symptom:** Request wird gesendet (200 OK), aber im Warenkorb erscheint keine Karte.

**Mögliche Ursachen:**
1. `card_id` existiert nicht oder ist kein Produkt aus Kategorie `grusskarte`
2. WooCommerce-Cart-Session ist abgelaufen
3. Stock-Management: Karte ist ausverkauft

**Server-Debug (temporär in `woocommerce-hooks.php`):**
```php
error_log('[greeting-card][debug] add callback fired. data: ' . print_r($data, true));
```

### 11.4 Grußkarte bleibt nach Entfernen des Straußes im Warenkorb

**Symptom:** Strauß entfernt, Karten-Daten bleiben.

**Ursache:** Der `woocommerce_cart_item_removed`-Hook ist nicht aktiv, oder der entfernte Cart-Item-Key stimmt nicht mit dem Schlüssel in `gcb_meta` überein.

**Check:** Im Callback `woocommerce_cart_item_removed` den `$removed_key` und `WC()->session->get('gcb_meta')` loggen.

### 11.5 Validierungsfehler erscheinen nicht

**Symptom:** Kunde klickt "In den Warenkorb" ohne Karte – keine Fehlermeldung.

**Ursache:** `state.validated` wird nicht auf `true` gesetzt, weil der `submit`-Listener nicht greift.

**Check:** Stimmt der Form-Selector? `form.wp-block-woocommerce-add-to-cart-with-options` ist der Blocks-Checkout-Selektor; `form.cart` der klassische. Beides ist aktuell im Listener abgedeckt.

---

## 12. Erweiterungs-Checkliste

Wenn eine neue Funktion hinzugefügt werden soll, diese Reihenfolge einhalten:

### 12.1 Neues State-Feld in `view.js`

1. Initiales PHP: `wp_interactivity_state('greeting-card-block', [..., 'neueFeld' => ''])` in `render.php`
2. Getter/Setter in `store()` in `view.js`
3. Direktive im HTML von `render.php` (`data-wp-bind--`, `data-wp-on--`, etc.)
4. `npm run build`

### 12.2 Neue Daten zum Server senden (via `extensionCartUpdate`)

1. Wert in `cart-sync.js` aus DOM lesen und in `data`-Objekt einfügen
2. In `woocommerce-hooks.php` aus `$data` lesen und sanitieren
3. `npm run build`

### 12.3 Neues Karten-Meta-Feld am Strauß-Item

1. Im `extensionCartUpdate`-Callback in den `gcb_meta[$key]`-Eintrag aufnehmen
2. In `woocommerce_get_cart_item_from_session` als `_greeting_card_*`-Meta injizieren
3. Falls sichtbar im Warenkorb: `woocommerce_get_item_data`-Filter ergänzen
4. Falls in Bestellung speichern: `woocommerce_checkout_create_order_line_item` ergänzen

### 12.4 Neues Block-Attribut (Betreiber-Einstellung im Editor)

1. In `block.json` unter `"attributes"` eintragen
2. In `edit.js` ein UI-Element mit `setAttributes()` hinzufügen
3. In `render.php` über `$attributes['neuesAttribut']` verwenden
4. `npm run build`

---

## 13. Spickzettel: Alle Hooks auf einen Blick

### PHP-Hooks

| Hook | Datei | Zweck |
|---|---|---|
| `init` | `greeting-card-block.php` | Block-Types aus `blocks-manifest.php` registrieren |
| `woocommerce_get_cart_item_from_session` | `woocommerce-hooks.php` | `gcb_meta` aus Session als `_greeting_card_*`-Meta injizieren |
| `woocommerce_blocks_loaded` → `woocommerce_store_api_register_update_callback` | `woocommerce-hooks.php` | `extensionCartUpdate`-Callback registrieren (Karte in `gcb_meta` ablegen) |
| `woocommerce_before_calculate_totals` | `woocommerce-hooks.php` | Kartenpreis auf den Strauß addieren |
| `woocommerce_after_calculate_totals` | `woocommerce-hooks.php` | Straußpreis auf Originalwert zurücksetzen (Stückpreis-Anzeige) |
| `woocommerce_cart_item_removed` | `woocommerce-hooks.php` | `gcb_meta`-Eintrag des entfernten Straußes aufräumen |
| `woocommerce_cart_emptied` | `woocommerce-hooks.php` | Gesamtes `gcb_meta` leeren |
| `woocommerce_get_item_data` | `woocommerce-hooks.php` | Karte (Bild/Name/Preis) + Grußtext im Warenkorb anzeigen |
| `wp_head` | `woocommerce-hooks.php` | Inline-CSS für die Karten-Darstellung |
| `woocommerce_checkout_create_order_line_item` | `woocommerce-hooks.php` | Grußkarte + Text als Meta der Strauß-Position speichern |
| `woocommerce_payment_complete` / `woocommerce_order_status_processing` | `woocommerce-hooks.php` | Lagerbestand der Karte reduzieren |
| `woocommerce_order_status_cancelled` / `woocommerce_order_status_refunded` | `woocommerce-hooks.php` | Lagerbestand der Karte wiederherstellen |

### JS-Events & APIs

| Mechanismus | Datei | Zweck |
|---|---|---|
| `store('greeting-card-block', {...})` | `view.js` | Interactivity-API-State und Aktionen |
| `document.addEventListener('submit', ..., true)` | `view.js` | Add-to-Cart blockieren bei fehlender Kartenauswahl |
| `document.body.addEventListener('wc-blocks_added_to_cart', ...)` | `cart-sync.js` | Nach erfolgtem Add-to-Cart Grußkarte zum Warenkorb senden |
| `extensionCartUpdate({namespace, data})` | `cart-sync.js` | Grußkarte als Warenkorb-Position hinzufügen |
| `processErrorResponse(error)` | `cart-sync.js` | Server-Fehler aus `RouteException` dem Kunden anzeigen |

### Wichtige Imports

| Import | Paket | Datei |
|---|---|---|
| `store`, `getElement` | `@wordpress/interactivity` | `view.js` |
| `extensionCartUpdate` | `@woocommerce/blocks-checkout` | `cart-sync.js` |
| `processErrorResponse` | `@woocommerce/block-data` | `cart-sync.js` |
| `Swiper`, `Navigation`, `Pagination` | `swiper` | `view.js` |
| `wc_get_products()` | WooCommerce PHP | `render.php` |
| `has_term()` | WordPress PHP | `woocommerce-hooks.php` |
| `RouteException` | `Automattic\WooCommerce\StoreApi\Exceptions` | `woocommerce-hooks.php` |
