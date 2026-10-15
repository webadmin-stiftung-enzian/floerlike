<?php

/**
 * Eigenes Feld "Durchmesser" an jeder Variation.
 *
 * Steht im Admin unter Produktdaten → Variationen direkt unter
 * "Abmessungen" und erscheint im Block "Variantenauswahl" im Knopf unter dem
 * Wert, z. B. "ca. 35 cm Ø". Bisher stand diese Angabe in der Beschreibung
 * der Variante -- die bleibt damit frei für einen echten Beschreibungstext.
 *
 * Gespeichert als Meta-Feld _gcb_diameter an der Variation. Der Unterstrich
 * hält es aus der allgemeinen Box "Individuelle Felder" heraus.
 *
 * @package GreetingCardBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

const GCB_DIAMETER_META = '_gcb_diameter';

/**
 * Durchmesser-Angabe einer Variation, wie im Admin eingetragen.
 *
 * @param int $variation_id
 * @return string Leer, wenn nichts eingetragen ist.
 */
function gcb_get_variation_diameter($variation_id)
{
    $variation = wc_get_product($variation_id);

    return $variation ? trim((string) $variation->get_meta(GCB_DIAMETER_META)) : '';
}

/**
 * Eingabefeld in jeder Variation. WooCommerce ruft diesen Hook direkt nach
 * dem Feld "Abmessungen" auf (bei abgeschalteten Abmessungen nach
 * "Gewicht"), noch vor "Versandklasse". Volle Breite, damit es unter den
 * beiden halben Feldern Gewicht/Abmessungen eine eigene Zeile bekommt.
 */
add_action('woocommerce_variation_options_dimensions', function ($loop, $variation_data, $variation) {
    woocommerce_wp_text_input([
        'id'            => "gcb_diameter_{$loop}",
        // Ein Eintrag je Variation -- WooCommerce speichert alle Variationen
        // in einem Request, $loop ist die Position.
        'name'          => "gcb_diameter[{$loop}]",
        'value'         => gcb_get_variation_diameter($variation->ID),
        'label'         => __('Durchmesser', 'greeting-card-block'),
        'placeholder'   => __('z. B. ca. 35 cm Ø', 'greeting-card-block'),
        'desc_tip'      => true,
        'description'   => __('Erscheint im Block „Variantenauswahl“ im Knopf unter dem Wert.', 'greeting-card-block'),
        'wrapper_class' => 'form-row form-row-full',
    ]);
}, 10, 3);

/**
 * Beim Speichern übernehmen. Läuft für jede Variation kurz bevor WooCommerce
 * sie speichert -- deshalb reicht update_meta_data(), ohne eigenes save().
 * Den Nonce der Variationen prüft WooCommerce vorher selbst.
 */
add_action('woocommerce_admin_process_variation_object', function ($variation, $i) {
    // phpcs:ignore WordPress.Security.NonceVerification.Missing -- prüft WooCommerce (save-variations)
    $raw   = isset($_POST['gcb_diameter'][$i]) ? wp_unslash($_POST['gcb_diameter'][$i]) : '';
    $value = mb_substr(sanitize_text_field((string) $raw), 0, 100);

    if ('' === $value) {
        $variation->delete_meta_data(GCB_DIAMETER_META);
    } else {
        $variation->update_meta_data(GCB_DIAMETER_META, $value);
    }
}, 10, 2);
