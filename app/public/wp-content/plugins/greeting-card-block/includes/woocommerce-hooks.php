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
 *
 * Hier findet auch die SERVERSEITIGE VALIDIERUNG statt: Dies ist der einzige
 * Request, in dem die Grußkarten-Daten (card_id, text) den Server erreichen.
 * Eine geworfene RouteException wird von der CartExtensions-Route abgefangen
 * und dem Kunden im Cart/Checkout-Block nativ als Fehlermeldung angezeigt.
 */
add_action('woocommerce_blocks_loaded', function () {
    woocommerce_store_api_register_update_callback([
        'namespace' => 'greeting-card-block',
        'callback'  => function ($data) {
            if (($data['action'] ?? '') !== 'add') {
                return;
            }

            $card_id = absint($data['card_id'] ?? 0);
            $text    = sanitize_textarea_field($data['text'] ?? '');

            // Vollständigkeit der Eingaben prüfen.
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
