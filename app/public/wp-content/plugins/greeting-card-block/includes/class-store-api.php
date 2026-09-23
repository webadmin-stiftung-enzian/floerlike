<?php

/**
 * Store-API-Erweiterung für den Grusskarten-Block.
 *
 * Warenkorb- und Checkout-Block sind React-Anwendungen mit eigenem Data Store:
 * sie kennen von einer Warenkorb-Position nur das, was die Store API ausliefert.
 * Die Zusammengehörigkeit von Strauss und Grusskarte steckt aber in eigenen
 * `cart_item_data`-Feldern (`_gcb_group`, `_gcb_role`, siehe
 * class-integration.php) und wäre dort sonst unsichtbar.
 *
 * Deshalb hängen wir sie unter `extensions['greeting-card-block']` an jede
 * Warenkorb-Position. Das Frontend-Skript (assets/js/checkout-blocks.js) macht
 * daraus die Einrückung der Karte unter ihrem Strauss.
 *
 * Reine Anzeige-Information: Verhalten (Mitentfernen, Mengenangleichung)
 * steckt ausschliesslich in den PHP-Hooks in class-integration.php.
 *
 * Vorbild für Aufbau und Hook-Reihenfolge ist WooCommerce Product Bundles
 * (includes/api/class-wc-pb-store-api.php).
 *
 * @package GreetingCardBlock
 */

use Automattic\WooCommerce\StoreApi\Schemas\V1\CartItemSchema;

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Registriert die Zusatzdaten am Warenkorb-Positions-Schema.
 *
 * `woocommerce_store_api_register_endpoint_data()` existiert erst, wenn die
 * Blocks-Infrastruktur geladen ist — daher der Hook auf
 * `woocommerce_blocks_loaded`.
 */
add_action('woocommerce_blocks_loaded', function () {
    if (! function_exists('woocommerce_store_api_register_endpoint_data')) {
        return;
    }

    woocommerce_store_api_register_endpoint_data([
        'endpoint'        => CartItemSchema::IDENTIFIER,
        'namespace'       => 'greeting-card-block',
        'data_callback'   => 'gcb_extend_cart_item_data',
        'schema_callback' => 'gcb_extend_cart_item_schema',
        'schema_type'     => ARRAY_A,
    ]);
});

/**
 * Zusatzdaten einer Warenkorb-Position.
 *
 * `parentKey` wird bei jedem Abruf frisch aufgelöst statt gespeichert — siehe
 * gcb_find_parent_key(). Positionen ohne Gruppe bekommen leere Werte, damit das
 * Frontend nicht auf fehlende Felder prüfen muss.
 *
 * @param array $cart_item Warenkorb-Position.
 * @return array
 */
function gcb_extend_cart_item_data($cart_item)
{
    $group = $cart_item['_gcb_group'] ?? '';
    $role  = $cart_item['_gcb_role'] ?? '';

    $data = [
        'group'     => (string) $group,
        'role'      => (string) $role,
        'parentKey' => '',
        'hasCard'   => false,
        'text'      => (string) ($cart_item['_greeting_card_text'] ?? ''),
    ];

    if ('' === $group) {
        return $data;
    }

    if ('card' === $role) {
        $data['parentKey'] = gcb_find_parent_key($group);
    } elseif ('parent' === $role) {
        $data['hasCard'] = ! empty(gcb_find_card_keys($group));
    }

    return $data;
}

/**
 * Schema der Zusatzdaten.
 *
 * @return array
 */
function gcb_extend_cart_item_schema()
{
    return [
        'group'     => [
            'description' => __('Gruppen-ID, die Produkt und Grusskarte zusammenhält.', 'greeting-card-block'),
            'type'        => 'string',
            'readonly'    => true,
        ],
        'role'      => [
            'description' => __('Rolle innerhalb der Gruppe: "parent" oder "card".', 'greeting-card-block'),
            'type'        => 'string',
            'readonly'    => true,
        ],
        'parentKey' => [
            'description' => __('Warenkorb-Schlüssel des Produkts, zu dem diese Grusskarte gehört.', 'greeting-card-block'),
            'type'        => 'string',
            'readonly'    => true,
        ],
        'hasCard'   => [
            'description' => __('Ob zu diesem Produkt eine Grusskarte im Warenkorb liegt.', 'greeting-card-block'),
            'type'        => 'boolean',
            'readonly'    => true,
        ],
        'text'      => [
            'description' => __('Grusstext auf der Karte.', 'greeting-card-block'),
            'type'        => 'string',
            'readonly'    => true,
        ],
    ];
}
