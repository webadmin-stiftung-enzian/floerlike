<?php

/**
 * Eigenes Feld "Durchmesser" an jeder Variation -- und an einfachen Produkten.
 *
 * Steht im Admin unter Produktdaten → Variationen direkt unter
 * "Abmessungen", bei einfachen Produkten im Tab "Versand" ebenfalls unter
 * "Abmessungen". Eingetragen wird nur die Zahl (z. B. 35), die Einheit
 * kommt aus den WooCommerce-Einstellungen (Produkte → Allgemein →
 * Abmessungen, hier cm). Mit einer Zahl lässt sich rechnen -- der Block
 * "Varianten-Spanne" im Schaufenster-Plugin zeigt z. B. "ca. 35 – 55 cm Ø".
 *
 * Angezeigt wird der Wert als "ca. 35 cm Ø" (gcb_format_diameter()), im
 * Block "Variantenauswahl" im Knopf unter dem Wert.
 *
 * Gespeichert als Meta-Feld _gcb_diameter an der Variation bzw. am einfachen
 * Produkt, als Zahl mit Punkt ("35", "37.5"). Der Unterstrich hält es aus
 * der allgemeinen Box "Individuelle Felder" heraus. Früher stand dort freier Text ("ca. 35 cm
 * Ø") -- solche Werte liest gcb_get_variation_diameter() weiterhin und
 * stellt sie einmalig auf die Zahl um (unten).
 *
 * @package GreetingCardBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

const GCB_DIAMETER_META = '_gcb_diameter';

/**
 * Zahl aus einer Eingabe wie "35", "37,5", "ca. 35 cm Ø".
 *
 * @param mixed $raw
 * @return string Zahl mit Punkt, z. B. "37.5"; leer, wenn keine Zahl drinsteht.
 */
function gcb_parse_diameter($raw)
{
    if (! preg_match('/\d+(?:[.,]\d+)?/', (string) $raw, $match)) {
        return '';
    }

    return (string) (float) str_replace(',', '.', $match[0]);
}

/**
 * Durchmesser einer Variation als Zahl.
 *
 * @param int $variation_id
 * @return string z. B. "35"; leer, wenn nichts eingetragen ist.
 */
function gcb_get_variation_diameter($variation_id)
{
    $variation = wc_get_product($variation_id);

    return $variation ? gcb_parse_diameter($variation->get_meta(GCB_DIAMETER_META)) : '';
}

/**
 * Einheit des Durchmessers: die Abmessungs-Einheit von WooCommerce.
 *
 * @return string z. B. "cm".
 */
function gcb_diameter_unit()
{
    return (string) get_option('woocommerce_dimension_unit', 'cm');
}

/**
 * Durchmesser für die Anzeige: "ca. 35 cm Ø", bei zwei Werten als Spanne
 * "ca. 35 – 55 cm Ø". Dezimaltrennzeichen wie in WooCommerce eingestellt.
 *
 * @param string|float      $min Zahl.
 * @param string|float|null $max Zweite Zahl für eine Spanne; null oder gleich = ein Wert.
 * @return string Leer, wenn $min leer ist.
 */
function gcb_format_diameter($min, $max = null)
{
    if ('' === (string) $min) {
        return '';
    }

    $number = static function ($value) {
        return wc_format_localized_decimal((string) (float) $value);
    };

    $value = $number($min);
    if (null !== $max && '' !== (string) $max && (float) $max !== (float) $min) {
        $value .= ' – ' . $number($max);
    }

    /* translators: 1: Durchmesser, z. B. "35" oder "35 – 55", 2: Einheit, z. B. "cm" */
    return sprintf(__('ca. %1$s %2$s Ø', 'greeting-card-block'), $value, gcb_diameter_unit());
}

/**
 * Eingabefeld in jeder Variation. WooCommerce ruft diesen Hook direkt nach
 * dem Feld "Abmessungen" auf (bei abgeschalteten Abmessungen nach
 * "Gewicht"), noch vor "Versandklasse". Volle Breite, damit es unter den
 * beiden halben Feldern Gewicht/Abmessungen eine eigene Zeile bekommt.
 */
add_action('woocommerce_variation_options_dimensions', function ($loop, $variation_data, $variation) {
    $value = gcb_get_variation_diameter($variation->ID);

    woocommerce_wp_text_input([
        'id'                => "gcb_diameter_{$loop}",
        // Ein Eintrag je Variation -- WooCommerce speichert alle Variationen
        // in einem Request, $loop ist die Position.
        'name'              => "gcb_diameter[{$loop}]",
        'value'             => '' === $value ? '' : wc_format_localized_decimal($value),
        /* translators: %s: Einheit, z. B. "cm" */
        'label'             => sprintf(__('Durchmesser (%s)', 'greeting-card-block'), gcb_diameter_unit()),
        'placeholder'       => __('z. B. 35', 'greeting-card-block'),
        'desc_tip'          => true,
        'description'       => __('Nur die Zahl. Erscheint im Block „Variantenauswahl“ als „ca. 35 cm Ø“.', 'greeting-card-block'),
        'wrapper_class'     => 'form-row form-row-full',
        // Wie die Abmessungsfelder von WooCommerce: Dezimalzahl mit dem
        // eingestellten Trennzeichen, Prüfung im Browser durch WooCommerce.
        'class'             => 'short wc_input_decimal',
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
    $value = gcb_parse_diameter(wc_format_decimal(sanitize_text_field((string) $raw)));

    if ('' === $value) {
        $variation->delete_meta_data(GCB_DIAMETER_META);
    } else {
        $variation->update_meta_data(GCB_DIAMETER_META, $value);
    }
}, 10, 2);

/**
 * Dasselbe Feld bei einfachen Produkten: Tab "Versand", direkt unter
 * "Abmessungen". show_if_simple: WooCommerce blendet es bei anderen
 * Produkttypen aus -- bei variablen Produkten gehört der Durchmesser in die
 * Variationen.
 */
add_action('woocommerce_product_options_dimensions', function () {
    global $product_object;

    $value = $product_object ? gcb_get_variation_diameter($product_object->get_id()) : '';

    woocommerce_wp_text_input([
        'id'            => 'gcb_product_diameter',
        'value'         => '' === $value ? '' : wc_format_localized_decimal($value),
        /* translators: %s: Einheit, z. B. "cm" */
        'label'         => sprintf(__('Durchmesser (%s)', 'greeting-card-block'), gcb_diameter_unit()),
        'placeholder'   => __('z. B. 35', 'greeting-card-block'),
        'desc_tip'      => true,
        'description'   => __('Nur die Zahl. Erscheint im Block „Varianten-Spanne“ / „Ab-Preis“ als „ca. 35 cm Ø“.', 'greeting-card-block'),
        'wrapper_class' => 'show_if_simple',
        'class'         => 'short wc_input_decimal',
    ]);
});

/**
 * Speichern beim einfachen Produkt. Nur dort: Bei anderen Typen ist das Feld
 * ausgeblendet, sein Wert bliebe sonst unbemerkt am Produkt hängen.
 */
add_action('woocommerce_admin_process_product_object', function ($product) {
    if (! $product->is_type('simple')) {
        return;
    }

    // phpcs:ignore WordPress.Security.NonceVerification.Missing -- prüft WooCommerce (Produkt speichern)
    $raw   = isset($_POST['gcb_product_diameter']) ? wp_unslash($_POST['gcb_product_diameter']) : '';
    $value = gcb_parse_diameter(wc_format_decimal(sanitize_text_field((string) $raw)));

    if ('' === $value) {
        $product->delete_meta_data(GCB_DIAMETER_META);
    } else {
        $product->update_meta_data(GCB_DIAMETER_META, $value);
    }
});

/**
 * Einmalige Umstellung alter Freitext-Werte ("ca. 35 cm Ø" → "35"). Läuft
 * beim ersten Aufruf des Admins nach dem Update und merkt sich das in einer
 * Option. Werte ohne Zahl bleiben stehen (und werden als leer gelesen).
 */
add_action('admin_init', function () {
    if (get_option('gcb_diameter_numeric')) {
        return;
    }

    global $wpdb;
    $rows = $wpdb->get_results($wpdb->prepare("SELECT meta_id, meta_value FROM {$wpdb->postmeta} WHERE meta_key = %s", GCB_DIAMETER_META)); // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- einmalig

    foreach ($rows as $row) {
        $number = gcb_parse_diameter($row->meta_value);
        if ('' !== $number && $number !== $row->meta_value) {
            $wpdb->update($wpdb->postmeta, ['meta_value' => $number], ['meta_id' => $row->meta_id]); // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- einmalig
        }
    }

    wp_cache_flush_group('post_meta');
    update_option('gcb_diameter_numeric', 1, false);
});

/**
 * Den Durchmesser beim Block "Varianten-Spanne" (Plugin
 * product-showcase-block) als Wert anmelden. Ein Filter statt eines direkten
 * Aufrufs: Die beiden Plugins kennen sich nicht -- ist das Schaufenster aus,
 * passiert hier nichts.
 */
add_filter('psb_variation_range_values', function ($values) {
    $values['gcb_diameter'] = [
        'label'  => __('Durchmesser', 'greeting-card-block'),
        'value'  => static function (WC_Product $variation) {
            $value = gcb_get_variation_diameter($variation->get_id());

            return '' === $value ? null : (float) $value;
        },
        'format' => 'gcb_format_diameter',
    ];

    return $values;
});
