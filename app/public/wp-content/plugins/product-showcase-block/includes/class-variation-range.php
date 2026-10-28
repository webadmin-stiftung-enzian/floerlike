<?php

/**
 * Block "Varianten-Spanne": Werte der Varianten eines Produkts als Spanne,
 * z. B. "Grösse: klein – gross" oder "Grösse: ca. 35 – 55 cm Ø".
 *
 * Ein Produktblock wie "Preis" oder "Titel": funktioniert in jeder
 * Produktvorlage (Schaufenster, Produktsammlung, Templates), das Produkt
 * kommt aus dem Block-Kontext (postId).
 *
 * Einstellungen (src/blocks/variation-range):
 *   label      Beschriftung, z. B. "Grösse" (leer = keine)
 *   attribute  Attribut, nach dem die Varianten gebildet sind (pa_…)
 *   value      was aus jeder Variante gezeigt wird:
 *                term           der Attributwert (klein, mittel, gross)
 *                regular_price  regulärer Preis
 *                price          aktueller Preis (mit Rabatt, falls einer läuft)
 *                weitere        über den Filter psb_variation_range_values,
 *                               z. B. "Durchmesser" aus dem Grusskarten-Plugin
 *
 * Zahlen (Preis, Durchmesser): kleinster bis grösster Wert. Attributwerte:
 * erster bis letzter in der Reihenfolge der Varianten am Produkt (Tab
 * "Variationen") -- Werte wie "klein" lassen sich nicht der Grösse nach
 * sortieren. Es zählen alle aktiven Varianten, auch ausverkaufte.
 *
 * @package ProductShowcaseBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Was sich aus einer Variante zeigen lässt.
 *
 * Jeder Eintrag: label (für die Auswahl im Editor), value (Callable: Variante
 * → Zahl oder null) und format (Callable: min, max → Text). "term" ist kein
 * Eintrag hier, sondern ein Sonderfall in psb_variation_range_text().
 *
 * Plugins ergänzen eigene Werte über den Filter psb_variation_range_values
 * (Schlüssel => Eintrag wie unten).
 *
 * @return array<string, array{label: string, value: callable, format: callable}>
 */
function psb_variation_range_values()
{
    $price = static function ($min, $max) {
        return (float) $min === (float) $max ? wc_price($min) : wc_price($min) . ' – ' . wc_price($max);
    };

    $values = [
        'regular_price' => [
            'label'  => __('Regulärer Preis', 'product-showcase-block'),
            'value'  => static function (WC_Product $variation) {
                $value = $variation->get_regular_price();

                return '' === $value ? null : (float) $value;
            },
            'format' => $price,
        ],
        'price'         => [
            'label'  => __('Preis (aktuell)', 'product-showcase-block'),
            'value'  => static function (WC_Product $variation) {
                $value = $variation->get_price();

                return '' === $value ? null : (float) $value;
            },
            'format' => $price,
        ],
    ];

    return (array) apply_filters('psb_variation_range_values', $values);
}

/**
 * Die aktiven Varianten eines Produkts, die das Attribut tragen, in ihrer
 * Reihenfolge am Produkt.
 *
 * @param WC_Product $product   Variables Produkt.
 * @param string     $attribute z. B. "pa_strauss-variation-groesse".
 * @return array<int, array{variation: WC_Product, slug: string}>
 */
function psb_variations_with_attribute(WC_Product $product, $attribute)
{
    $attributes = $product->get_attributes();
    if (! isset($attributes[$attribute]) || ! $attributes[$attribute]->get_variation()) {
        return [];
    }

    $list = [];
    // get_children() ist nach der Reihenfolge im Tab "Variationen" sortiert.
    foreach ($product->get_children() as $id) {
        $variation = wc_get_product($id);
        if (! $variation || 'publish' !== $variation->get_status()) {
            continue;
        }
        $list[] = [
            'variation' => $variation,
            // Leer = "Beliebig" (WooCommerce-Variante für jeden Wert).
            'slug'      => (string) ($variation->get_attributes()[$attribute] ?? ''),
        ];
    }

    return $list;
}

/**
 * Die Spanne als Text, ohne Beschriftung.
 *
 * @param WC_Product $product
 * @param string     $attribute
 * @param string     $value     "term" oder ein Schlüssel aus psb_variation_range_values().
 * @return string HTML (Preise enthalten Markup von wc_price()); leer = nichts anzeigen.
 */
function psb_variation_range_text(WC_Product $product, $attribute, $value)
{
    if (! $product->is_type('variable') || '' === $attribute) {
        return '';
    }

    $variations = psb_variations_with_attribute($product, $attribute);
    if (! $variations) {
        return '';
    }

    if ('term' === $value) {
        $names = [];
        foreach ($variations as $item) {
            if ('' === $item['slug']) {
                continue;
            }
            $term = get_term_by('slug', $item['slug'], $attribute);
            // Eigene Attribute (nicht global) haben keinen Begriff, nur den Text.
            $names[] = $term ? $term->name : $item['slug'];
        }
        $names = array_values(array_unique($names));
        if (! $names) {
            return '';
        }

        $first = reset($names);
        $last  = end($names);

        return esc_html($first === $last ? $first : $first . ' – ' . $last);
    }

    $definition = psb_variation_range_values()[$value] ?? null;
    if (! $definition) {
        return '';
    }

    $numbers = [];
    foreach ($variations as $item) {
        $number = call_user_func($definition['value'], $item['variation']);
        if (null !== $number) {
            $numbers[] = (float) $number;
        }
    }
    if (! $numbers) {
        return '';
    }

    return wp_kses_post(call_user_func($definition['format'], min($numbers), max($numbers)));
}

/**
 * Daten für den Editor (variation-range/edit.js): globale Attribute und die
 * möglichen Werte.
 */
add_action('enqueue_block_editor_assets', function () {
    $attributes = [];
    foreach (wc_get_attribute_taxonomies() as $taxonomy) {
        $attributes[] = [
            'value' => wc_attribute_taxonomy_name($taxonomy->attribute_name),
            'label' => $taxonomy->attribute_label,
        ];
    }

    $values = [['value' => 'term', 'label' => __('Attributwert', 'product-showcase-block')]];
    foreach (psb_variation_range_values() as $key => $definition) {
        $values[] = ['value' => $key, 'label' => $definition['label']];
    }

    wp_add_inline_script(
        generate_block_asset_handle('product-showcase/variation-range', 'editorScript'),
        'window.psbVariationRange = ' . wp_json_encode(['attributes' => $attributes, 'values' => $values]) . ';',
        'before'
    );
});
