<?php

/**
 * WooCommerce-Integration für den Grußkarten-Block.
 *
 * Stellt drei Dinge bereit:
 *  1. Store-API Update-Callback: legt die Grußkarte als eigene Warenkorb-Position an.
 *  2. Anzeige des Grußtexts im Warenkorb (nativ, wie Variations-Meta).
 *  3. Übernahme von Grußkarte + Grußtext in die Bestellung.
 *
 * @package GreetingCardBlock
 */

if (! defined('ABSPATH')) {
    exit; // Direktzugriff verhindern.
}

/**
 * 1. Auswahl vom Client entgegennehmen und Grußkarte in den Warenkorb legen.
 *
 * Wird vom Frontend per `extensionCartUpdate({ namespace: 'greeting-card-block', ... })`
 * ausgelöst. Pro Namespace ist nur EIN Callback erlaubt – verschiedene Aktionen
 * werden über den `action`-Schlüssel unterschieden.
 */
add_action('woocommerce_blocks_loaded', function () {
    woocommerce_store_api_register_update_callback([
        'namespace' => 'greeting-card-block',
        'callback'  => function ($data) {
            if (($data['action'] ?? '') !== 'add' || empty($data['card_id'])) {
                return;
            }

            $card = wc_get_product(absint($data['card_id']));
            if (! $card || ! has_term('grusskarte', 'product_cat', $card->get_id())) {
                return; // Ungültige Eingabe still ignorieren.
            }

            $text = sanitize_textarea_field($data['text'] ?? '');

            // Sicherstellen, dass nur EINE Grußkarte im Warenkorb liegt:
            // vorhandene Grußkarten-Position(en) vor dem Hinzufügen entfernen.
            foreach (WC()->cart->get_cart() as $cart_item_key => $cart_item) {
                if (! empty($cart_item['_is_greeting_card'])) {
                    WC()->cart->remove_cart_item($cart_item_key);
                }
            }

            WC()->cart->add_to_cart(
                $card->get_id(),
                1,
                0,
                [],
                [
                    '_is_greeting_card'  => true,
                    'greeting_card_text' => $text,
                ]
            );
        },
    ]);
});

/**
 * 2. Grußtext im Warenkorb anzeigen.
 *
 * WooCommerce rendert das zurückgegebene `item_data` nativ unter dem Artikel –
 * genau so wie Variations-Attribute. Kein eigener Anzeige-Block nötig.
 */
add_filter('woocommerce_get_item_data', function ($item_data, $cart_item) {
    if (! empty($cart_item['_is_greeting_card']) && ! empty($cart_item['greeting_card_text'])) {
        $item_data[] = [
            'key'   => __('Grußtext', 'greeting-card-block'),
            'value' => wp_kses_post($cart_item['greeting_card_text']),
        ];
    }

    return $item_data;
}, 10, 2);

/**
 * 3. Grußkarte und Grußtext dauerhaft in der Bestellung speichern.
 *
 * Erscheint automatisch im Admin, in der Bestellbestätigungs-E-Mail und im
 * Kundenbereich.
 */
add_action('woocommerce_checkout_create_order_line_item', function ($item, $cart_item_key, $values, $order) {
    if (empty($values['_is_greeting_card'])) {
        return;
    }

    $item->add_meta_data(__('Grußkarte', 'greeting-card-block'), $item->get_name(), true);

    if (! empty($values['greeting_card_text'])) {
        $item->add_meta_data(__('Grußtext', 'greeting-card-block'), $values['greeting_card_text'], true);
    }
}, 10, 4);
