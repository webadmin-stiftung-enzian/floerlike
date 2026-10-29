<?php

/**
 * Block "Produktangabe" (früher "Varianten-Spanne"; intern weiter
 * product-showcase/variation-range): Werte der Varianten eines Produkts als
 * Spanne, z. B. "Grösse: klein – gross" oder "Grösse: ca. 35 – 55 cm Ø" --
 * oder als Einzelwert mit Zusatztext, z. B. "ab CHF 35.00" (Block-Variante
 * "Ab-Preis", src/blocks/variation-range/index.js). Bei einfachen Produkten
 * auf Wunsch der Wert des Produkts selbst (Preis, Durchmesser).
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
 * sortieren. Es zählen alle kaufbaren Varianten (veröffentlicht, mit Preis),
 * auch ausverkaufte.
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

    // Preise wie WooCommerce sie anzeigt (wc_get_price_to_display): mit der
    // Steuer-Einstellung des Shops (inkl./exkl. MwSt.) und nie negativ --
    // so stimmt der Block mit dem Preis-Block von WooCommerce überein.
    $values = [
        'regular_price' => [
            'label'  => __('Regulärer Preis', 'product-showcase-block'),
            'value'  => static function (WC_Product $variation) {
                $value = $variation->get_regular_price();

                return '' === $value ? null : (float) wc_get_price_to_display($variation, ['price' => $value]);
            },
            'format' => $price,
        ],
        'price'         => [
            'label'  => __('Preis (aktuell)', 'product-showcase-block'),
            'value'  => static function (WC_Product $variation) {
                $value = $variation->get_price();

                return '' === $value ? null : (float) wc_get_price_to_display($variation);
            },
            'format' => $price,
        ],
    ];

    return (array) apply_filters('psb_variation_range_values', $values);
}

/**
 * Die aktiven Varianten eines Produkts in ihrer Reihenfolge am Produkt --
 * nur die, die das Attribut tragen, oder ohne Attribut alle.
 *
 * @param WC_Product $product   Variables Produkt.
 * @param string     $attribute z. B. "pa_strauss-variation-groesse"; leer = alle.
 * @return array<int, array{variation: WC_Product, slug: string}>
 */
function psb_variations_with_attribute(WC_Product $product, $attribute)
{
    if ('' !== $attribute) {
        $attributes = $product->get_attributes();
        if (! isset($attributes[$attribute]) || ! $attributes[$attribute]->get_variation()) {
            return [];
        }
    }

    $list = [];
    // get_children() ist nach der Reihenfolge im Tab "Variationen" sortiert.
    foreach ($product->get_children() as $id) {
        $variation = wc_get_product($id);
        // Nur kaufbare Varianten (veröffentlicht, mit Preis) -- dieselben,
        // die auch die Variantenauswahl anbietet. Ausverkaufte zählen mit.
        if (! $variation || ! $variation->is_purchasable()) {
            continue;
        }
        $list[] = [
            'variation' => $variation,
            // Leer = "Beliebig" (WooCommerce-Variante für jeden Wert).
            'slug'      => '' === $attribute ? '' : (string) ($variation->get_attributes()[$attribute] ?? ''),
        ];
    }

    return $list;
}

/**
 * Der Wert als Text, ohne Beschriftung und Zusatztexte.
 *
 * Darstellung:
 *   range  Spanne, "klein – gross" bzw. "CHF 35.00 – CHF 55.00"
 *   min    kleinster Wert (bei Attributwerten: der erste), z. B. für "ab CHF 35.00"
 *   max    grösster Wert (bei Attributwerten: der letzte)
 *
 * Attributwerte brauchen ein Attribut. Zahlen (Preise, Durchmesser) gehen
 * auch ohne: dann zählen alle Varianten.
 *
 * Welche Produkte ($products):
 *   variable  nur Produkte mit Varianten (Standard) -- neben dem Preis-Block
 *             von WooCommerce steht so kein Preis doppelt
 *   all       auch einfache Produkte mit ihrem eigenen Wert: So ersetzt ein
 *             "Ab-Preis" den Preis-Block ganz ("ab CHF 35.00" bei Varianten,
 *             "CHF 55.00" bei einfachen Produkten)
 *   simple    nur einfache Produkte, z. B. der Durchmesser, den variable
 *             Produkte schon in der Variantenauswahl zeigen
 * Attributwerte gibt es nur bei Varianten -- dort zählt $products nicht.
 *
 * @param WC_Product $product
 * @param string     $attribute Leer = alle Varianten (nur bei Zahlen).
 * @param string     $value     "term" oder ein Schlüssel aus psb_variation_range_values().
 * @param string     $display   range | min | max.
 * @param string     $products  variable | all | simple.
 * @return array{html: string, multiple: bool} html leer = nichts anzeigen;
 *                                             multiple = es gibt verschiedene Werte.
 */
function psb_variation_range_text(WC_Product $product, $attribute, $value, $display = 'range', $products = 'variable')
{
    $none = ['html' => '', 'multiple' => false];

    // Welche Werte?
    if ('term' === $value) {
        if ('' === $attribute || ! $product->is_type('variable')) {
            return $none;
        }
        $values = [];
        foreach (psb_variations_with_attribute($product, $attribute) as $item) {
            if ('' === $item['slug']) {
                continue;
            }
            $term = get_term_by('slug', $item['slug'], $attribute);
            // Eigene Attribute (nicht global) haben keinen Begriff, nur den Text.
            $values[] = $term ? $term->name : $item['slug'];
        }
        $values = array_values(array_unique($values));
        if (! $values) {
            return $none;
        }

        $first = reset($values);
        $last  = end($values);
        $text  = 'min' === $display ? $first : ('max' === $display ? $last : ($first === $last ? $first : $first . ' – ' . $last));

        return ['html' => esc_html($text), 'multiple' => count($values) > 1];
    }

    $definition = psb_variation_range_values()[$value] ?? null;
    if (! $definition) {
        return $none;
    }

    if ($product->is_type('variable')) {
        if ('simple' === $products) {
            return $none;
        }
        $items = array_column(psb_variations_with_attribute($product, $attribute), 'variation');
    } elseif (in_array($products, ['all', 'simple'], true)) {
        $items = [$product];
    } else {
        return $none;
    }

    $numbers = [];
    foreach ($items as $item) {
        $number = call_user_func($definition['value'], $item);
        if (null !== $number) {
            $numbers[] = (float) $number;
        }
    }
    if (! $numbers) {
        return $none;
    }

    $min = min($numbers);
    $max = max($numbers);
    if ('min' === $display) {
        $max = $min;
    } elseif ('max' === $display) {
        $min = $max;
    }

    return [
        'html'     => wp_kses_post(call_user_func($definition['format'], $min, $max)),
        'multiple' => count(array_unique($numbers)) > 1,
    ];
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
