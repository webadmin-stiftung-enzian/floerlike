<?php

/**
 * WooCommerce-Integration für den Grußkarten-Block.
 *
 * Die Grußkarte ist kein eigenes Warenkorb-Item. Die Kartenauswahl wird
 * in einem separaten Session-Key (gcb_meta) gespeichert und beim Laden
 * des Warenkorbs per Filter in die Cart-Items injiziert.
 *
 * Warum separater Session-Key statt direkter cart_contents-Modifikation:
 * Direktes Schreiben in cart_contents + set_session() destabilisiert die
 * WooCommerce Blocks Store API und führt zu "Cart item does not exist"-Fehlern,
 * weil die Blocks-interne Darstellung des Warenkorbs inkonsistent wird.
 *
 * @package GreetingCardBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Grußkarten-Meta aus dem Session-Key in die geladenen Cart-Items injizieren.
 *
 * Läuft bei jeder Warenkorb-Initialisierung aus der Session, sodass die Meta-Felder
 * (_greeting_card_id etc.) in allen nachgelagerten Hooks verfügbar sind.
 */
add_filter('woocommerce_get_cart_item_from_session', function ($cart_item, $values, $key) {
    if (! WC()->session) {
        return $cart_item;
    }

    $gcb_meta = WC()->session->get('gcb_meta', []);
    if (! isset($gcb_meta[$key])) {
        return $cart_item;
    }

    $meta = $gcb_meta[$key];
    $cart_item['_greeting_card_id']    = $meta['id'];
    $cart_item['_greeting_card_text']  = $meta['text'];
    $cart_item['_greeting_card_price'] = $meta['price'];
    $cart_item['_bouquet_base_price']  = $meta['base_price'];

    // Preis direkt am Produkt-Objekt setzen — zuverlässiger als woocommerce_before_calculate_totals,
    // weil dieser Filter garantiert vor calculate_totals() läuft.
    // Nur set_price(), kein set_regular_price(): set_regular_price() kann die
    // Preisberechnung in WooCommerce Blocks stören.
    if (! empty($cart_item['data']) && is_a($cart_item['data'], 'WC_Product')) {
        $cart_item['data']->set_price((float)$meta['base_price'] + (float)$meta['price']);
    }

    return $cart_item;
}, 10, 3);

/**
 * 1. Grußkarten-Auswahl als Meta auf dem Strauß-Item speichern.
 *
 * Speichert in einen separaten Session-Key (gcb_meta) — NICHT in cart_contents.
 * Zusätzlich wird das In-Memory-Cart für die aktuelle Antwort aktualisiert,
 * damit Preis und Anzeige sofort korrekt sind.
 * Beim erneuten Senden (= Bearbeiten) werden die Werte überschrieben.
 */
add_action('woocommerce_blocks_loaded', function () {
    woocommerce_store_api_register_update_callback([
        'namespace' => 'greeting-card-block',
        'callback'  => function ($data) {
            if (($data['action'] ?? '') !== 'add') {
                return;
            }

            $card_id            = absint($data['card_id'] ?? 0);
            $text               = mb_substr(sanitize_textarea_field($data['text'] ?? ''), 0, 300);
            $bouquet_product_id = absint($data['bouquet_product_id'] ?? 0);

            if (! $card_id || '' === $text) {
                throw new \Automattic\WooCommerce\StoreApi\Exceptions\RouteException(
                    'greeting_card_block_incomplete',
                    esc_html__('Bitte wählen Sie eine Grußkarte aus und geben Sie einen Grußtext ein.', 'greeting-card-block'),
                    400
                );
            }

            $card = wc_get_product($card_id);
            if (! $card || ! has_term('grusskarte', 'product_cat', $card->get_id())) {
                throw new \Automattic\WooCommerce\StoreApi\Exceptions\RouteException(
                    'greeting_card_block_invalid_product',
                    esc_html__('Die gewählte Grußkarte ist ungültig.', 'greeting-card-block'),
                    400
                );
            }

            foreach (WC()->cart->get_cart() as $key => $cart_item) {
                if ((int)($cart_item['product_id'] ?? 0) !== $bouquet_product_id) {
                    continue;
                }

                $card_price = (float)$card->get_price();

                // _bouquet_base_price verwenden wenn vorhanden (Wiederauswahl nach Session-Load),
                // sonst get_price() — bei Erst-Auswahl ist noch kein gcb_meta gesetzt, daher
                // gibt get_price() den originalen Straußpreis zurück.
                $base_price = isset($cart_item['_bouquet_base_price'])
                    ? (float)$cart_item['_bouquet_base_price']
                    : (float)$cart_item['data']->get_price();

                // Separat in der Session persistieren (kein cart_contents-Write).
                $gcb_meta       = WC()->session->get('gcb_meta', []);
                $gcb_meta[$key] = [
                    'id'         => $card->get_id(),
                    'text'       => $text,
                    'price'      => $card_price,
                    'base_price' => $base_price,
                ];
                WC()->session->set('gcb_meta', $gcb_meta);

                // In-Memory für die aktuelle Response aktualisieren.
                WC()->cart->cart_contents[$key]['_greeting_card_id']    = $card->get_id();
                WC()->cart->cart_contents[$key]['_greeting_card_text']  = $text;
                WC()->cart->cart_contents[$key]['_greeting_card_price'] = $card_price;
                WC()->cart->cart_contents[$key]['_bouquet_base_price']  = $base_price;

                // Produkt-Preis sofort am Objekt setzen, damit die Store-API-Antwort
                // den korrekten Gesamtpreis enthält (ohne Warten auf calculate_totals).
                WC()->cart->cart_contents[$key]['data']->set_price($base_price + $card_price);

                return;
            }
        },
    ]);
});

/**
 * 2. Verwaiste Meta-Einträge aufräumen wenn ein Strauß entfernt wird.
 */
add_action('woocommerce_cart_item_removed', function ($removed_key, $_cart) {
    if (! WC()->session) {
        return;
    }
    $gcb_meta = WC()->session->get('gcb_meta', []);
    if (isset($gcb_meta[$removed_key])) {
        unset($gcb_meta[$removed_key]);
        WC()->session->set('gcb_meta', $gcb_meta);
    }
}, 10, 2);

add_action('woocommerce_cart_emptied', function () {
    if (WC()->session) {
        WC()->session->set('gcb_meta', []);
    }
});

/**
 * 3a. Grußkarten-Preis zum Straußpreis addieren (für korrekte Totals-Berechnung).
 *
 * _bouquet_base_price enthält den Original-Straußpreis und verhindert
 * kumuliertes Addieren bei mehrfacher Neuberechnung der Warenkorbsumme.
 */
add_action('woocommerce_before_calculate_totals', function ($cart) {
    if (is_admin() && ! defined('DOING_AJAX')) {
        return;
    }

    foreach ($cart->get_cart() as $cart_item) {
        if (empty($cart_item['_greeting_card_price'])) {
            continue;
        }
        $base = (float)($cart_item['_bouquet_base_price'] ?? $cart_item['data']->get_price());
        $cart_item['data']->set_price($base + (float)$cart_item['_greeting_card_price']);
    }
}, 10, 1);

/**
 * 3b. Straußpreis nach der Berechnung auf den Originalwert zurücksetzen.
 *
 * WooCommerce Store API liest prices.price = get_price() NACH calculate_totals().
 * Die line_total-Werte (= kombinierten Preis) sind bereits in cart_contents
 * gespeichert und bleiben korrekt. Durch das Zurücksetzen zeigt der Store API:
 *   prices.price    = Straußpreis ohne Karte  (für die Stückpreis-Anzeige)
 *   totals.line_total = Straußpreis + Karte    (für die Zeilensumme und Subtotal)
 */
add_action('woocommerce_after_calculate_totals', function ($cart) {
    if (is_admin() && ! defined('DOING_AJAX')) {
        return;
    }

    foreach ($cart->get_cart() as $cart_item) {
        if (empty($cart_item['_bouquet_base_price'])) {
            continue;
        }
        $cart_item['data']->set_price((float)$cart_item['_bouquet_base_price']);
    }
}, 10, 1);

/**
 * 4. Grußkarten-Info im Warenkorb und Checkout anzeigen.
 *
 * Im WooCommerce Cart Block wird das `display`-Feld als HTML gerendert
 * (dangerouslySetInnerHTML im ProductDetails-Component). Das `value`-Feld
 * dient als Plaintext-Fallback für Bestätigungs-E-Mails.
 *
 * Wichtig: Nur <span>-Elemente verwenden — <div> innerhalb eines <span>
 * ist ungültiges HTML und führt zu Darstellungsfehlern im Mini-Warenkorb.
 */
add_filter('woocommerce_get_item_data', function ($item_data, $cart_item) {
    if (empty($cart_item['_greeting_card_id'])) {
        return $item_data;
    }

    $card = wc_get_product($cart_item['_greeting_card_id']);
    if (! $card) {
        return $item_data;
    }

    $card_price = (float)($cart_item['_greeting_card_price'] ?? $card->get_price());
    $image_url  = wp_get_attachment_image_url($card->get_image_id(), 'woocommerce_thumbnail')
        ?: wc_placeholder_img_src();

    // Preis als reinen Klartext (KEIN wc_price() nötig).
    $amount     = number_format(
        $card_price,
        wc_get_price_decimals(),
        wc_get_price_decimal_separator(),
        wc_get_price_thousand_separator()
    );
    $price_text = get_woocommerce_currency_symbol() . ' ' . $amount; // Plaintext für value/E-Mail.

    // WICHTIG – Token-Limit von WooCommerce:
    // Der Cart-/Mini-Cart-Block kürzt JEDEN item_data-Wert clientseitig auf die
    // ersten 15 durch Whitespace getrennten Tokens und hängt "…" an
    // (mini-cart.js:  const x = (t, e = 15) => …slice(0, e).join(" ") + "…").
    // Unser display-HTML enthält viele Leerzeichen (Tag-Attribute, Bild-URL,
    // Kartenname), daher wurde es mitten im Preis abgeschnitten ("CHF…").
    // Um sicher unter 15 Tokens zu bleiben:
    //   - alt="" (Bild ist dekorativ; der Kartenname steht direkt daneben),
    //   - &nbsp; im Preis, damit "CHF 1.50" EIN Token bleibt (statt zwei).
    $price_html = get_woocommerce_currency_symbol() . '&nbsp;' . $amount;

    // Nur <span>-Elemente: <div> innerhalb von <span> ist ungültiges HTML.
    // $price_html wird bewusst NICHT mit esc_html() behandelt, sonst würde
    // das &nbsp;-Entity zu "&amp;nbsp;" und das geschützte Leerzeichen ginge
    // verloren. Das Währungssymbol stammt aus WooCommerce, der Betrag ist
    // numerisch – beides ist sicheres HTML.
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

    // Leerer key → das externe Label-Element (<strong>) bleibt leer und
    // wird per CSS ausgeblendet; das Label ist im Display-HTML enthalten.
    $item_data[] = [
        'key'     => '',
        'value'   => sprintf(
            '%s: %s – %s',
            __('Grußkarte', 'greeting-card-block'),
            $card->get_name(),
            $price_text
        ),
        'display' => $display,
    ];

    if (! empty($cart_item['_greeting_card_text'])) {
        $item_data[] = [
            'key'   => __('Grußtext', 'greeting-card-block'),
            'value' => esc_html($cart_item['_greeting_card_text']),
        ];
    }

    return $item_data;
}, 10, 2);

/**
 * 4b. CSS für die Grußkarten-Darstellung im Warenkorb.
 *
 * Läuft auf allen Frontend-Seiten, da der Mini-Warenkorb auf jeder Seite
 * erscheinen kann (nicht nur auf is_cart()/is_checkout()).
 *
 * del/ins-Fix: WooCommerce Blocks zeigt einen Preisvergleich wenn
 * prices.price !== prices.regular_price. Da wir set_price() ohne
 * set_regular_price() aufrufen, bleibt der Regular-Preis auf dem
 * Ursprungswert — wir blenden den Vergleich per CSS aus.
 */
add_action('wp_head', function () {
    if (is_admin()) {
        return;
    }
?>
    <style id="gcb-cart-styles">
        /* Leeres Label-<strong> ausblenden (key = '' im item_data) */
        .wc-block-components-product-details__name:empty {
            display: none;
        }

        /* Grußkarten-Block: Eltern-Kind-Optik mit Randlinie.
     * display:flex (nicht inline-flex) damit width:100% im Inline-<span>-Elternteil
     * korrekt greift und der Container nicht auf Content-Breite schrumpft. */
        .gcb-card-meta {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            padding: 6px 10px 6px 8px;
            margin-top: 6px;
            background: #f8f5f1;
            border-left: 3px solid #c8a97a;
            border-radius: 0 4px 4px 0;
        }

        .gcb-card-meta__img {
            width: 40px;
            height: 40px;
            object-fit: cover;
            border-radius: 3px;
            flex-shrink: 0;
            margin-top: 2px;
        }

        .gcb-card-meta__info {
            display: flex;
            flex-direction: column;
            gap: 1px;
            flex: 1;
            min-width: 0;
        }

        .gcb-card-meta__label {
            font-size: 0.7em;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #a07840;
            font-weight: 700;
        }

        .gcb-card-meta__name {
            font-size: 0.875em;
            font-weight: 500;
            color: #333;
            word-break: break-word;
        }

        .gcb-card-meta__price {
            font-size: 0.8em;
            color: #777;
            white-space: nowrap;
        }

        /* del/ins Preisvergleich für Strauss-Items mit Grußkarte unterdrücken.
     * Ohne set_regular_price() bleibt der Originalpreis als "Normalpreis"
     * im Store API — wir blenden den Vergleich aus statt PHP zu manipulieren. */
        .wc-block-cart-item__product:has(.gcb-card-meta) .wc-block-components-product-price del {
            display: none;
        }

        .wc-block-cart-item__product:has(.gcb-card-meta) .wc-block-components-product-price ins {
            text-decoration: none;
            font-style: normal;
        }

        /* WooCommerce kürzt den Wert-<span> mit text-overflow ab wenn unser flex-Display
     * die inline-Breite sprengt. Überschreiben für Spans die unsere Karten-Meta enthalten. */
        .wc-block-components-product-details__value:has(.gcb-card-meta) {
            overflow: visible;
            text-overflow: unset;
            white-space: normal;
        }
    </style>
<?php
});

/**
 * 5. Grußkarten-Meta dauerhaft in der Bestellung am Strauß-Item speichern.
 *
 * 'Grußkarte' und 'Grußtext' sind lesbare Schlüssel → erscheinen automatisch
 * in Admin-Ansicht, Bestätigungs-E-Mail und Kundenbereich.
 * '_greeting_card_id' ist intern für das Stock-Management.
 */
add_action('woocommerce_checkout_create_order_line_item', function ($item, $cart_item_key, $values, $order) {
    if (empty($values['_greeting_card_id'])) {
        return;
    }

    $card = wc_get_product($values['_greeting_card_id']);
    if ($card) {
        $item->add_meta_data(__('Grußkarte', 'greeting-card-block'), $card->get_name(), true);
    }

    if (! empty($values['_greeting_card_text'])) {
        $item->add_meta_data(__('Grußtext', 'greeting-card-block'), $values['_greeting_card_text'], true);
    }

    $item->add_meta_data('_greeting_card_id', (int)$values['_greeting_card_id'], true);
}, 10, 4);

/**
 * 6. Lagerbestand der Grußkarte beim Bezahlvorgang reduzieren.
 *
 * WooCommerce verwaltet nur den Stock von Order-Line-Items automatisch.
 * Da die Karte kein eigenes Line-Item ist, tun wir es manuell.
 * Das Flag _gcb_stock_reduced verhindert Doppelreduzierung.
 */
add_action('woocommerce_payment_complete',        '_gcb_reduce_card_stock');
add_action('woocommerce_order_status_processing', '_gcb_reduce_card_stock');

function _gcb_reduce_card_stock(int $order_id): void
{
    $order = wc_get_order($order_id);
    if (! $order || $order->get_meta('_gcb_stock_reduced')) {
        return;
    }

    foreach ($order->get_items() as $item) {
        $card_id = (int)$item->get_meta('_greeting_card_id');
        if (! $card_id) {
            continue;
        }
        $card = wc_get_product($card_id);
        if ($card && $card->managing_stock()) {
            wc_update_product_stock($card, $item->get_quantity(), 'decrease');
        }
    }

    $order->update_meta_data('_gcb_stock_reduced', '1');
    $order->save_meta_data();
}

/**
 * 7. Lagerbestand wiederherstellen wenn Bestellung storniert oder rückerstattet.
 */
add_action('woocommerce_order_status_cancelled', '_gcb_restore_card_stock');
add_action('woocommerce_order_status_refunded',  '_gcb_restore_card_stock');

function _gcb_restore_card_stock(int $order_id): void
{
    $order = wc_get_order($order_id);
    if (! $order || ! $order->get_meta('_gcb_stock_reduced')) {
        return;
    }

    foreach ($order->get_items() as $item) {
        $card_id = (int)$item->get_meta('_greeting_card_id');
        if (! $card_id) {
            continue;
        }
        $card = wc_get_product($card_id);
        if ($card && $card->managing_stock()) {
            wc_update_product_stock($card, $item->get_quantity(), 'increase');
        }
    }

    $order->delete_meta_data('_gcb_stock_reduced');
    $order->save_meta_data();
}
