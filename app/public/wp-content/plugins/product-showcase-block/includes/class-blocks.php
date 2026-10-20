<?php

/**
 * Blöcke des Schaufensters: Registrierung, Kategorie im Einfügen-Menü und
 * Hilfsfunktionen für die render.php der Blöcke.
 *
 *   Schaufenster   product-showcase/showcase   (src/blocks/showcase)
 *   Zeile          product-showcase/row        (src/blocks/row)
 *
 * @package ProductShowcaseBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Alle Blöcke aus build/blocks-manifest.php registrieren (seit WordPress 6.8,
 * wie im Grusskarten-Plugin).
 */
add_action('init', function () {
    $dir = plugin_dir_path(__DIR__) . 'build/';
    if (file_exists($dir . 'blocks-manifest.php')) {
        wp_register_block_types_from_metadata_collection($dir . 'blocks', $dir . 'blocks-manifest.php');
    }
});

/**
 * Eigene Kategorie im Block-Einfügen-Menü, damit Rahmen und Zeile zusammen
 * auffindbar sind.
 */
add_filter('block_categories_all', function ($categories) {
    if (in_array('product-showcase', array_column($categories, 'slug'), true)) {
        return $categories;
    }

    $categories[] = [
        'slug'  => 'product-showcase',
        'title' => __('Schaufenster', 'product-showcase-block'),
        'icon'  => null,
    ];

    return $categories;
});

/**
 * Standard-Abstände (Attribut "style" in block.json) auch auf der Seite.
 *
 * Der Editor speichert ein Attribut nicht, solange es seinem Standardwert
 * entspricht. Die Abstands-Unterstützung von WordPress (layout, blockGap)
 * liest auf der Seite aber nur gespeicherte Werte -- ohne diesen Filter
 * gälte der Standard nur im Editor. Hier wird er vor dem Rendern eingesetzt;
 * im Editor geänderte Werte gehen vor.
 */
add_filter('render_block_data', function ($parsed_block) {
    $name = $parsed_block['blockName'] ?? '';
    if (! in_array($name, ['product-showcase/showcase', 'product-showcase/row'], true)) {
        return $parsed_block;
    }

    $type     = WP_Block_Type_Registry::get_instance()->get_registered($name);
    $defaults = $type->attributes['style']['default'] ?? [];
    $style    = $parsed_block['attrs']['style'] ?? [];

    $parsed_block['attrs']['style'] = array_replace_recursive($defaults, is_array($style) ? $style : []);

    return $parsed_block;
});

/**
 * Steht im fertigen Markup einer Zeile mindestens ein Produkt?
 *
 * Gesucht wird die Klasse, die WooCommerce jedem Produkt der Produktsammlung
 * gibt (<li class="wc-block-product …">). class_name vergleicht ganze
 * Klassennamen -- die Liste selbst (wc-block-product-template) zählt nicht.
 *
 * @param string $content Markup der Innenblöcke.
 * @return bool
 */
function psb_row_has_products($content)
{
    $p = new WP_HTML_Tag_Processor($content);

    return $p->next_tag(['class_name' => 'wc-block-product']);
}
