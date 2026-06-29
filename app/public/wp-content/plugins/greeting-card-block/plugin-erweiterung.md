# Plugin-Erweiterung: Cart-Item bearbeiten

Ziel: Benutzer können ein Warenkorb-Item (Strauß + Grußkarte) vollständig bearbeiten — Größe wechseln, Karte tauschen, Karte entfernen. Das Ergebnis ersetzt das alte Item im Warenkorb.

## Kontext

- Plugin: `greeting-card-block`
- Relevante Dateien:
  - `includes/woocommerce-hooks.php` — alle PHP-Hooks
  - `src/greeting-card-block/render.php` — Server-Side-Rendering des Blocks
  - `src/greeting-card-block/cart-sync.js` — klassisches Script für WooCommerce Blocks Store API
  - `src/greeting-card-block/view.js` — WP Interactivity Store
- Nach Änderungen an JS-Dateien muss `npm run build` im Plugin-Verzeichnis ausgeführt werden.

## Architektur-Entscheidungen

- Die Grußkarte ist kein eigenes Cart-Item. Ihre Daten liegen im Session-Key `gcb_meta`, indexiert nach Cart-Item-Key des Straußes.
- Variation wechseln = neuer Cart-Item-Key → altes Item muss entfernt werden.
- "Bearbeiten" = Produktseite mit vorausgefülltem Formular aufrufen, Submit entfernt altes Item und fügt neues hinzu.
- Kein eigener JS für Variations-Vorauswahl nötig: WooCommerce liest `?attribute_pa_groesse=klein` aus der URL automatisch.

---

## Aufgabe 1 — "Ändern"-Link im Warenkorb

**Datei:** `includes/woocommerce-hooks.php`

**Ziel:** Jedem Warenkorb-Item eines Produkts, das den `greeting-card-block` enthält, einen "Ändern"-Link hinzufügen. Der Link führt zur Produktseite mit vorausgefüllter Variation und öffnet den Edit-Modus.

**Wo einfügen:** Bestehenden Filter `woocommerce_get_item_data` (Hook #4, ab Zeile 204) anpassen.

**Änderungen:**

1. Scope des Filters ausweiten: bisher nur bei `!empty($cart_item['_greeting_card_id'])`. Neu: auch ausführen wenn `has_block('greeting-card-block/greeting-card-block', $cart_item['product_id'] ?? 0)` true ist — auch wenn (noch) keine Karte gewählt wurde.

2. Cart-Item-Key innerhalb des Filters ermitteln (der Key wird vom Filter nicht als Argument übergeben):
   ```php
   $my_key = '';
   foreach (WC()->cart->get_cart() as $key => $item) {
       if (
           ($item['product_id'] ?? 0) === ($cart_item['product_id'] ?? 0) &&
           ($item['variation_id'] ?? 0) === ($cart_item['variation_id'] ?? 0) &&
           ($item['_greeting_card_id'] ?? 0) === ($cart_item['_greeting_card_id'] ?? 0)
       ) {
           $my_key = $key;
           break;
       }
   }
   ```

3. Edit-URL bauen:
   ```php
   $variation_params = $cart_item['variation'] ?? [];
   // $variation enthält z.B. ['attribute_pa_groesse' => 'klein']
   $edit_url = add_query_arg(
       array_merge(['edit_cart_item' => $my_key], $variation_params),
       get_permalink($cart_item['product_id'] ?? 0)
   );
   ```

4. Link als letzten `item_data`-Eintrag anfügen (NUR wenn `$my_key` nicht leer):
   ```php
   $item_data[] = [
       'key'     => '',
       'value'   => '',
       'display' => sprintf(
           '<a href="%s" class="gcb-edit-link">%s</a>',
           esc_url($edit_url),
           esc_html__('Ändern', 'greeting-card-block')
       ),
   ];
   ```

5. CSS für den Link in den bestehenden `<style id="gcb-cart-styles">`-Block einfügen (Hook `wp_head`, ab Zeile 297):
   ```css
   .gcb-edit-link {
       display: inline-block;
       margin-top: 6px;
       font-size: 0.8em;
       color: #a07840;
       text-decoration: underline;
   }
   ```

---

## Aufgabe 2 — Produktseite: Edit-Modus erkennen

**Datei:** `src/greeting-card-block/render.php`

**Ziel:** Wenn `?edit_cart_item=<key>` in der URL steht, dieses spezifische Cart-Item zur Pre-Fill-Quelle machen und den Key für spätere Verarbeitung vorbereiten.

**Änderungen:**

1. Am Anfang der Datei (vor dem bestehenden `$current_card_id`-Block) den URL-Parameter auslesen und validieren:
   ```php
   $edit_cart_item_key = '';
   $raw_key = sanitize_key($_GET['edit_cart_item'] ?? '');
   if ($raw_key && function_exists('WC') && WC()->cart) {
       $cart = WC()->cart->get_cart();
       if (isset($cart[$raw_key])) {
           $edit_cart_item_key = $raw_key;
       }
   }
   ```

2. Den bestehenden Pre-Fill-Block (Zeilen 28–39) so anpassen, dass er im Edit-Modus den spezifischen Key verwendet:
   ```php
   $current_card_id = 0;
   $current_text    = '';
   if (function_exists('WC') && WC()->cart) {
       if ($edit_cart_item_key) {
           $edit_item = WC()->cart->get_cart_item($edit_cart_item_key);
           if ($edit_item) {
               $current_card_id = (int)($edit_item['_greeting_card_id'] ?? 0);
               $current_text    = $edit_item['_greeting_card_text'] ?? '';
           }
       } else {
           foreach (WC()->cart->get_cart() as $cart_item) {
               if (
                   (int)($cart_item['product_id'] ?? 0) === $product_id &&
                   !empty($cart_item['_greeting_card_id'])
               ) {
                   $current_card_id = (int)$cart_item['_greeting_card_id'];
                   $current_text    = $cart_item['_greeting_card_text'] ?? '';
                   break;
               }
           }
       }
   }
   ```

3. Den Edit-Key in der WC-Session speichern (nach dem Pre-Fill-Block, vor `wp_interactivity_state`):
   ```php
   if ($edit_cart_item_key && WC()->session) {
       WC()->session->set('gcb_edit_key', $edit_cart_item_key);
   }
   ```

4. Das `data-edit-cart-item-key`-Attribut zum Block-Wrapper hinzufügen (damit `cart-sync.js` es lesen kann). Den bestehenden `<div>`-Wrapper anpassen:
   ```php
   <div
       <?php echo get_block_wrapper_attributes(); ?>
       data-wp-interactive="greeting-card-block"
       data-product-id="<?php echo esc_attr($product_id); ?>"
       data-edit-cart-item-key="<?php echo esc_attr($edit_cart_item_key); ?>">
   ```

---

## Aufgabe 3 — `cart-sync.js`: Edit-Modus berücksichtigen

**Datei:** `src/greeting-card-block/cart-sync.js`

**Ziel:** Nach Add-to-Cart im Edit-Modus das alte Item via `extensionCartUpdate` entfernen lassen — entweder zusammen mit der Karte (`action: 'add'` + `old_key`) oder allein (`action: 'finish_edit'`).

**Änderungen:**

Den bestehenden Event-Listener `wc-blocks_added_to_cart` erweitern:

```js
document.body.addEventListener( 'wc-blocks_added_to_cart', () => {
    const checkbox = document.getElementById( 'isGreetingCardChecked' );
    const wantsCard = checkbox ? checkbox.checked : false;

    const selectedCard = document.querySelector(
        '.greeting-card-block__card[aria-pressed="true"]'
    );
    const selectedCardId = selectedCard ? selectedCard.dataset.cardId : '';

    const messageElement = document.getElementById( 'greetingCardMessage' );
    const text = messageElement ? messageElement.value.trim() : '';

    const block = document.querySelector(
        '[data-wp-interactive="greeting-card-block"]'
    );
    const bouquetProductId = block ? block.dataset.productId : '';
    const editCartItemKey = block ? ( block.dataset.editCartItemKey || '' ) : '';

    // Kein Edit-Modus, keine Karte → nichts zu tun
    if ( ! wantsCard && ! editCartItemKey ) {
        return;
    }

    // Edit-Modus, keine Karte gewünscht → altes Item entfernen
    if ( ! wantsCard && editCartItemKey ) {
        extensionCartUpdate( {
            namespace: 'greeting-card-block',
            data: {
                action: 'finish_edit',
                old_key: editCartItemKey,
            },
        } ).catch( ( error ) => processErrorResponse( error ) );
        return;
    }

    // Karte gewünscht (mit oder ohne Edit-Modus)
    if ( ! selectedCardId || ! text ) {
        return;
    }

    extensionCartUpdate( {
        namespace: 'greeting-card-block',
        data: {
            action: 'add',
            card_id: selectedCardId,
            text,
            bouquet_product_id: bouquetProductId,
            old_key: editCartItemKey, // leer wenn kein Edit-Modus
        },
    } ).catch( ( error ) => processErrorResponse( error ) );
} );
```

---

## Aufgabe 4 — PHP Callback: altes Item ersetzen

**Datei:** `includes/woocommerce-hooks.php`

**Ziel:** Im `woocommerce_blocks_loaded`-Callback (ab Zeile 63) zwei Fälle behandeln:
- `action: 'add'` mit `old_key` → nach gcb_meta setzen das alte Item entfernen
- Neuer `action: 'finish_edit'` → nur altes Item entfernen

**Änderungen:**

1. In der `action === 'add'`-Behandlung nach dem `return;` am Ende des `foreach`-Blocks (Zeile 126) folgenden Block einfügen (VOR dem `return`):
   ```php
   // Altes Item im Edit-Modus entfernen.
   $old_key = sanitize_key($data['old_key'] ?? '');
   if ($old_key && $old_key !== $key) {
       WC()->cart->remove_cart_item($old_key);
       WC()->session->set('gcb_edit_key', null);
   } elseif ($old_key === $key) {
       // Gleiches Item (Karte geändert, Größe gleich) → nur Session aufräumen.
       WC()->session->set('gcb_edit_key', null);
   }
   ```

2. Neuen Case `'finish_edit'` in der Callback-Funktion hinzufügen (nach dem bestehenden `action === 'add'`-Block, vor der schließenden Klammer des Callbacks):
   ```php
   if (($data['action'] ?? '') === 'finish_edit') {
       $old_key = sanitize_key($data['old_key'] ?? '');
       if ($old_key) {
           WC()->cart->remove_cart_item($old_key);
           WC()->session->set('gcb_edit_key', null);
       }
       return;
   }
   ```

---

## Aufgabe 5 — Build ausführen

Nach allen Code-Änderungen im Plugin-Verzeichnis:

```bash
npm run build
```

Sicherstellen, dass `build/greeting-card-block/cart-sync.js` und `build/greeting-card-block/view.js` aktualisiert wurden.

---

## Kantenfälle — nicht extra behandeln, aber im Review prüfen

- **User bricht Edit ab (Browser-Zurück-Button):** `gcb_edit_key` bleibt in Session. Schadet nicht — `remove_cart_item()` mit altem Key ist no-op wenn das Item weg ist; Session wird beim nächsten erfolgreichen Edit gecleart.
- **Zwei gleiche Sträuße im Warenkorb:** Jeder hat seinen eigenen Key. Die Key-Matching-Logik in Aufgabe 1 nutzt auch `_greeting_card_id` zur Unterscheidung.
- **Größe NICHT geändert:** `old_key === new_key` → `remove_cart_item()` wird nicht aufgerufen, nur gcb_meta wird überschrieben.
- **`old_key` existiert nicht mehr im Warenkorb:** `remove_cart_item()` gibt `false` zurück, kein Fehler.
