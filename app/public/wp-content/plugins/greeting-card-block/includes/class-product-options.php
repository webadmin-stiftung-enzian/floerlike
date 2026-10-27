<?php

/**
 * Schalter "Grusskarte" am Produkt: Bietet dieses Produkt die Option
 * "Grusskarte hinzufügen" an?
 *
 * Steht im Admin oben im Kasten "Produktdaten", neben "Virtuell" und
 * "Herunterladbar" (nur bei einfachen und variablen Produkten). Welche
 * Karten zur Wahl stehen, bleibt wie bisher unter Verknüpfte Produkte →
 * Bundle-sells.
 *
 * Gespeichert als Meta _gcb_offer_cards ("yes"/"no"). Ausgewertet an einer
 * einzigen Stelle, gcb_get_card_ids() (class-integration.php): Ist der
 * Schalter aus, hat das Produkt keine Karten -- im Kaufbereich, in der
 * Editor-Vorschau und bei der Prüfung im Warenkorb gleichermassen.
 *
 * Ohne gespeicherten Wert (Produkte von vor diesem Schalter) gilt das
 * bisherige Verhalten: angeboten, sobald Karten verknüpft sind. Neue
 * Produkte starten deshalb mit dem Schalter aus, bestehende mit verknüpften
 * Karten mit dem Schalter an.
 *
 * @package GreetingCardBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

const GCB_OFFER_CARDS_META = '_gcb_offer_cards';

/**
 * Bietet das Produkt die Grusskarte an?
 *
 * @param WC_Product $product
 * @return bool
 */
function gcb_offers_cards(WC_Product $product)
{
    $value = $product->get_meta(GCB_OFFER_CARDS_META, true);

    if ('yes' === $value) {
        return true;
    }
    if ('no' === $value) {
        return false;
    }

    // Noch nie gespeichert: wie vor dem Schalter.
    return ! empty(gcb_get_bundle_sell_ids($product));
}

/**
 * Schalter in der Zeile oben im Kasten "Produktdaten". WooCommerce zeigt ihn
 * angehakt, wenn die Meta "yes" ist -- und ohne Meta nach "default". Der
 * Standard richtet sich deshalb nach gcb_offers_cards(), damit Anzeige und
 * Verhalten bei alten Produkten übereinstimmen.
 */
add_filter('product_type_options', function ($options) {
    $product = wc_get_product(get_the_ID());

    $options['gcb_offer_cards'] = [
        'id'            => GCB_OFFER_CARDS_META,
        'wrapper_class' => 'show_if_simple show_if_variable',
        'label'         => __('Grusskarte', 'greeting-card-block'),
        'description'   => __('Auf der Produktseite die Option „Grusskarte hinzufügen“ anbieten. Welche Karten zur Wahl stehen: Verknüpfte Produkte → Bundle-sells.', 'greeting-card-block'),
        'default'       => $product && gcb_offers_cards($product) ? 'yes' : 'no',
    ];

    return $options;
});

/**
 * Beim Speichern übernehmen. Den Nonce des Produktformulars prüft
 * WooCommerce vorher selbst. Ein nicht angehakter Kasten fehlt im Formular
 * ganz -- dann "no".
 */
add_action('woocommerce_admin_process_product_object', function ($product) {
    // phpcs:ignore WordPress.Security.NonceVerification.Missing -- prüft WooCommerce (woocommerce_meta_nonce)
    $product->update_meta_data(GCB_OFFER_CARDS_META, isset($_POST[GCB_OFFER_CARDS_META]) ? 'yes' : 'no');
});
