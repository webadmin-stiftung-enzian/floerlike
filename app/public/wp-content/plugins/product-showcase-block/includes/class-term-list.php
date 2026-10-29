<?php

/**
 * Block "Begriffsliste": Begriffe eines Produkts als Liste, z. B. die Werte
 * des globalen Attributs "Blumen" -- "Dahlien, Rosen, Sonnenhut".
 *
 * Ein Produktblock wie die "Produktangabe": funktioniert in jeder
 * Produktvorlage (Schaufenster, Produktsammlung) und auf der Produktseite.
 *
 * Quelle: jede Taxonomie am Produkt -- globale Attribute (pa_…),
 * Kategorien, Schlagwörter. Sortierung:
 *
 *   source      wie beim Attribut eingestellt (Produkte → Attribute →
 *               "Standard-Sortierung"); Kategorien/Schlagwörter nach Name
 *   menu_order  eigene Reihenfolge (Werte per Ziehen sortiert)
 *   name_asc    Name A–Z -- Umlaute wie ihr Grundbuchstabe (ö wie o), Zahlen
 *               im Namen natürlich ("2" vor "10")
 *   name_desc   Name Z–A
 *
 * Die Begriffe holt wc_get_product_terms() -- dieselbe Funktion, die
 * WooCommerce für "Zusätzliche Informationen" auf der Produktseite nutzt,
 * inklusive der eigenen Reihenfolge der Attributwerte.
 *
 * @package ProductShowcaseBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Taxonomien, die als Quelle zur Wahl stehen.
 *
 * @return array<int, array{value: string, label: string}>
 */
function psb_term_list_sources()
{
    $sources = [];
    foreach (wc_get_attribute_taxonomies() as $taxonomy) {
        $sources[] = [
            'value' => wc_attribute_taxonomy_name($taxonomy->attribute_name),
            /* translators: %s: Name des Attributs, z. B. "Blumen" */
            'label' => sprintf(__('Attribut: %s', 'product-showcase-block'), $taxonomy->attribute_label),
        ];
    }
    $sources[] = ['value' => 'product_cat', 'label' => __('Kategorien', 'product-showcase-block')];
    $sources[] = ['value' => 'product_tag', 'label' => __('Schlagwörter', 'product-showcase-block')];

    return $sources;
}

/**
 * Die Liste als HTML.
 *
 * @param int    $product_id
 * @param string $taxonomy   z. B. "pa_blumen".
 * @param string $order_by   source | menu_order | name_asc | name_desc.
 * @param string $separator  z. B. ", ".
 * @param bool   $link       Begriffe verlinken (nur wenn sie eine Übersichtsseite haben).
 * @return string Leer, wenn das Produkt keine Begriffe dieser Taxonomie hat.
 */
function psb_term_list_html($product_id, $taxonomy, $order_by, $separator, $link)
{
    if ('' === $taxonomy || ! taxonomy_exists($taxonomy) || ! in_array($taxonomy, wp_list_pluck(psb_term_list_sources(), 'value'), true)) {
        return '';
    }

    $is_attribute = taxonomy_is_product_attribute($taxonomy);
    $args         = [];
    switch ($order_by) {
        case 'menu_order':
            $args = ['orderby' => 'menu_order'];
            break;
        case 'name_asc':
        case 'name_desc':
            // Sortiert wird unten selbst: name_num von WooCommerce ist für
            // Zahlen im Namen gedacht und ordnet Namen wie "Löwenmäulchen"
            // falsch ein.
            $args = ['orderby' => 'name'];
            break;
        default:
            $args = ['orderby' => $is_attribute ? wc_attribute_orderby($taxonomy) : 'name'];
    }

    $terms = wc_get_product_terms($product_id, $taxonomy, $args);
    if (is_wp_error($terms) || ! $terms) {
        return '';
    }
    if (in_array($order_by, ['name_asc', 'name_desc'], true)) {
        usort($terms, static function ($a, $b) {
            return strnatcasecmp(remove_accents($a->name), remove_accents($b->name));
        });
        if ('name_desc' === $order_by) {
            $terms = array_reverse($terms);
        }
    }

    $link = $link && is_taxonomy_viewable($taxonomy);
    $items = array_map(static function ($term) use ($link) {
        $name = esc_html($term->name);
        if (! $link) {
            return $name;
        }
        $url = get_term_link($term);

        return is_wp_error($url) ? $name : sprintf('<a href="%s" rel="tag">%s</a>', esc_url($url), $name);
    }, $terms);

    return implode(esc_html($separator), $items);
}

/**
 * Daten für den Editor (term-list/edit.js): die möglichen Quellen.
 */
add_action('enqueue_block_editor_assets', function () {
    wp_add_inline_script(
        generate_block_asset_handle('product-showcase/term-list', 'editorScript'),
        'window.psbTermList = ' . wp_json_encode(['sources' => psb_term_list_sources()]) . ';',
        'before'
    );
});
