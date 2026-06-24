# greeting-card-block: Architektur & Entwicklerdokumentation

Eine vollständige Referenz für das Plugin – von der Produktseite bis zur gespeicherten Bestellung.

---

## Bevor du anfängst: Was macht dieses Plugin genau?

Das Plugin fügt auf der WooCommerce-Produktseite eines Straußes einen Block ein, der dem Kunden erlaubt, eine Grußkarte auszuwählen und eine persönliche Nachricht einzugeben. Wenn der Strauß in den Warenkorb gelegt wird, wird die Karte automatisch als eigene Warenkorb-Position hinzugefügt – verknüpft mit dem Strauß-Produkt. Pro Strauß-Produkt kann maximal eine Grußkarte im Warenkorb liegen; wird der Strauß entfernt, verschwindet die Karte automatisch mit.

Das ist konzeptionell anders als ein normaler WooCommerce-Checkout-Block (wie in `woo-order-ext`): Dieser Block lebt auf der **Produktseite**, nicht im Checkout. Der Checkout-Mechanismus (`setExtensionData` → Bestellmeta) wird hier **nicht** verwendet – stattdessen wird die Grußkarte als eigenständiges Produkt mit `extensionCartUpdate` in den Warenkorb gelegt.

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
│                          legt Karte in Warenkorb    │
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
| `woocommerce_blocks_loaded` → `woocommerce_store_api_register_update_callback` | `extensionCartUpdate`-Request empfangen |
| `woocommerce_cart_item_removed` | Grußkarte entfernen wenn Strauß entfernt wird |
| `woocommerce_get_item_data` | Grußtext im Warenkorb anzeigen |
| `woocommerce_checkout_create_order_line_item` | Grußkarte + Text in Bestellung übernehmen |

#### Der `extensionCartUpdate`-Callback

```php
woocommerce_store_api_register_update_callback([
    'namespace' => 'greeting-card-block',
    'callback'  => function ($data) {
        if (($data['action'] ?? '') !== 'add') return;

        $card_id            = absint($data['card_id'] ?? 0);
        $text               = sanitize_textarea_field($data['text'] ?? '');
        $bouquet_product_id = absint($data['bouquet_product_id'] ?? 0);

        // Validierung: Vollständigkeit
        // Validierung: Karte muss aus Kategorie "grusskarte" sein

        // Bestehende Karte für diesen Strauß ersetzen
        foreach (WC()->cart->get_cart() as $key => $item) {
            if (
                !empty($item['_is_greeting_card']) &&
                (int)($item['_linked_bouquet_product_id'] ?? 0) === $bouquet_product_id
            ) {
                WC()->cart->remove_cart_item($key);
            }
        }

        WC()->cart->add_to_cart($card->get_id(), 1, 0, [], [
            '_is_greeting_card'          => true,
            'greeting_card_text'         => $text,
            '_linked_bouquet_product_id' => $bouquet_product_id,
        ]);
    },
]);
```

**Wichtig:** Eine `RouteException` aus dem Callback wird von der Store API abgefangen und dem Kunden als Inline-Fehlermeldung im Cart/Checkout-Block angezeigt. Es ist kein eigenes Error-Handling nötig.

---

## 5. Das "Eine Karte pro Strauß"-Konzept

### 5.1 Warum Cart Item Meta, kein Produkt-Meta?

WooCommerce speichert für jeden Warenkorb-Eintrag ein PHP-Array (`$cart_item`). Dieses Array kann beliebige Zusatzdaten enthalten – ohne Datenbankschema-Änderungen, ohne neue Tabellen, ohne Produkt-Umbau.

Das Plugin nutzt drei eigene Felder:

| Meta-Feld | Typ | Zweck |
|---|---|---|
| `_is_greeting_card` | `bool` | Markiert den Eintrag als Grußkarte (kein normaler Kauf) |
| `greeting_card_text` | `string` | Die Kundennachricht |
| `_linked_bouquet_product_id` | `int` | Produkt-ID des zugehörigen Straußes |

Das Unterstrich-Präfix bei `_is_greeting_card` und `_linked_bouquet_product_id` ist Konvention: diese Felder sind intern und sollen nicht als sichtbare Item-Data im Warenkorb erscheinen. `greeting_card_text` hat kein Präfix, weil er via `woocommerce_get_item_data` angezeigt wird.

### 5.2 Verknüpfungsmodell

```
Warenkorb-Position A:  Strauß "Rosen"          product_id = 42
Warenkorb-Position B:  Grußkarte "Herz"        _is_greeting_card = true
                                                _linked_bouquet_product_id = 42
                                                greeting_card_text = "Alles Gute!"

Warenkorb-Position C:  Strauß "Tulpen"         product_id = 57
Warenkorb-Position D:  Grußkarte "Streifen"    _is_greeting_card = true
                                                _linked_bouquet_product_id = 57
                                                greeting_card_text = "Herzlichen Glückwunsch!"
```

Jede Grußkarte ist über `_linked_bouquet_product_id` genau einem Strauß-Produkt zugeordnet. Beim Hinzufügen einer neuen Karte für denselben Strauß wird die alte ersetzt. Beim Entfernen des Straußes wird die Karte automatisch mitentfernt.

### 5.3 Bekannte Einschränkung

Das Modell nutzt die **Produkt-ID**, nicht den Cart Item Key. Wenn ein Kunde denselben Strauß zweimal im Warenkorb hat (z.B. Menge 2 als separate Einträge), teilen beide Einträge dieselbe Produkt-ID – eine Grußkarte gilt dann für beide. Für ein Blumengeschäft ist das der erwartete Anwendungsfall: ein Strauß, eine Karte.

Müsste man zwei identische Sträuße mit unterschiedlichen Karten verknüpfen, bräuchte man den Cart Item Key als Verknüpfungsschlüssel. Das ist technisch möglich, aber erheblich komplexer (der Key des neu hinzugefügten Items muss aus der Store-API-Response ausgelesen werden).

### 5.4 Automatisches Entfernen beim Warenkorb-Cleanup

```php
add_action('woocommerce_cart_item_removed', function ($removed_key, $cart) {
    $removed = $cart->removed_cart_contents[$removed_key] ?? null;

    // Nur reagieren wenn ein Nicht-Grußkarten-Item entfernt wurde
    if (!$removed || !empty($removed['_is_greeting_card'])) return;

    $removed_product_id = (int)($removed['product_id'] ?? 0);

    foreach ($cart->get_cart() as $key => $item) {
        if (
            !empty($item['_is_greeting_card']) &&
            (int)($item['_linked_bouquet_product_id'] ?? 0) === $removed_product_id
        ) {
            $cart->remove_cart_item($key);
        }
    }
}, 10, 2);
```

Der entfernte Eintrag ist nach dem Removal in `$cart->removed_cart_contents` verfügbar – deshalb wird `$removed_key` genutzt, um die Produkt-ID des entfernten Straußes zu ermitteln.

---

## 6. Daten in der Bestellung speichern

Grußkarten-Positionen werden als normale Bestellpositionen gespeichert – WooCommerce erledigt das automatisch. Zusätzliche Daten (Grußtext, Karten-Label) werden per Hook als Order-Item-Meta gespeichert:

```php
add_action('woocommerce_checkout_create_order_line_item',
    function ($item, $cart_item_key, $values, $order) {
        if (empty($values['_is_greeting_card'])) return;

        // Sichtbar im Admin und in E-Mails
        $item->add_meta_data(__('Grußkarte', 'greeting-card-block'), $item->get_name(), true);

        if (!empty($values['greeting_card_text'])) {
            $item->add_meta_data(__('Grußtext', 'greeting-card-block'), $values['greeting_card_text'], true);
        }
    },
10, 4);
```

**Unterschied zu `update_meta_data` auf `$order`:** `$item->add_meta_data()` speichert auf der **Bestellposition** (Order Line Item), nicht auf der Bestellung selbst. Das ist semantisch richtig: Grußtext und Kartenname gehören zur Position, nicht zur Bestellung. WooCommerce zeigt Order-Item-Meta automatisch im Admin und in Bestell-E-Mails an – kein weiterer Hook nötig.

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
       - Alte Karte für diesen Strauß entfernen
       - Neue Karte als Cart Item hinzufügen
       - _linked_bouquet_product_id in Cart Item Meta
       ↓
Warenkorb enthält: Strauß + Grußkarte (verknüpft)
       ↓ (Checkout)
  └─ woocommerce_checkout_create_order_line_item:
       Grußtext + Kartenname → Order Item Meta
       ↓
Bestellung gespeichert: Grußkarte sichtbar im Admin + E-Mail
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

> **Merksatz:** Soll die Kundeneingabe den **Warenkorb** verändern (ein Produkt hinzufügen, eine Gebühr addieren) → `extensionCartUpdate`. Soll sie mit der **Bestellung** gespeichert werden (Newsletter-Opt-in, Lieferhinweis) → `setExtensionData`. Dieses Plugin legt eine echte Warenkorb-Position an – deshalb `extensionCartUpdate`.

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

**Symptom:** Strauß entfernt, Karte bleibt.

**Ursache:** `_linked_bouquet_product_id` stimmt nicht mit der Produkt-ID des Straußes überein, oder der `woocommerce_cart_item_removed`-Hook ist nicht aktiv.

**Check:** Im Callback `woocommerce_cart_item_removed` die `$removed_product_id` und die Meta-Werte aller Karten-Items loggen.

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

### 12.3 Neues Cart-Item-Meta-Feld

1. In `woocommerce-hooks.php` beim `add_to_cart`-Aufruf hinzufügen
2. Falls sichtbar im Warenkorb: `woocommerce_get_item_data`-Filter ergänzen
3. Falls in Bestellung speichern: `woocommerce_checkout_create_order_line_item` ergänzen

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
| `woocommerce_blocks_loaded` → `woocommerce_store_api_register_update_callback` | `woocommerce-hooks.php` | `extensionCartUpdate`-Callback registrieren |
| `woocommerce_cart_item_removed` | `woocommerce-hooks.php` | Verknüpfte Grußkarte entfernen wenn Strauß entfernt wird |
| `woocommerce_get_item_data` | `woocommerce-hooks.php` | Grußtext unter der Karte im Warenkorb anzeigen |
| `woocommerce_checkout_create_order_line_item` | `woocommerce-hooks.php` | Grußkarte + Text in Bestellposition-Meta speichern |

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
