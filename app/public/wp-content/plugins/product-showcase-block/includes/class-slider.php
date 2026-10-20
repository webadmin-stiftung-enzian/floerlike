<?php

/**
 * Produktsammlung als Slider (Block-Stil "Swiper Slider").
 *
 * Zog in Stufe 2 aus dem Theme hierher (Spezifikation, Kapitel 8.2): Der
 * Stil soll nur existieren, wenn es auch den Slider dazu gibt, und Swiper
 * soll nur auf Seiten mit Slider laden statt auf jeder.
 *
 *   Block-Stil       register_block_style()          (vorher functions.php)
 *   Einstellungen    Attribut psbSlider, Panel "Slider" im Editor
 *   Start            src/slider/view.js              (vorher product-slider.js)
 *
 * Die Optik von Pfeilen und Punkten bleibt im Theme (main.css, "SLIDER").
 *
 * @package ProductShowcaseBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

const PSB_SLIDER_STYLE = 'swiper';

/** Anteil der angeschnittenen Karte in Prozent (3 sichtbar → 3.3). */
const PSB_SLIDER_PEEK_PERCENT = 30;

add_action('init', function () {
    // Gleicher Name wie früher im Theme: bestehende Blöcke mit der Klasse
    // is-style-swiper behalten ihren Stil.
    register_block_style('woocommerce/product-collection', [
        'name'  => PSB_SLIDER_STYLE,
        'label' => __('Swiper Slider', 'product-showcase-block'),
    ]);

    $dir = plugin_dir_path(__DIR__) . 'build/slider/';
    $url = plugins_url('build/slider/', __DIR__);
    if (! file_exists($dir . 'view.asset.php')) {
        return;
    }
    $asset = require $dir . 'view.asset.php';

    wp_register_script_module('product-showcase-block/slider', $url . 'view.js', $asset['dependencies'], $asset['version']);
    // Enthält auch Swipers eigene CSS, eingeschlossen in .psb-slider
    // (src/slider/style.scss) -- damit sie den Block "Carousel" nicht trifft.
    wp_register_style('product-showcase-block-slider', $url . 'style-view.css', [], $asset['version']);
});

// Das Attribut auch auf dem Server bekannt machen (Editor-Seite: Filter in
// src/editor/product-collection.js).
add_filter('register_block_type_args', function ($args, $name) {
    if ('woocommerce/product-collection' === $name) {
        $args['attributes']['psbSlider'] = ['type' => 'object'];
    }

    return $args;
}, 10, 2);

/**
 * Hat die Produktsammlung den Stil "Swiper Slider"?
 *
 * @param array $attrs Block-Attribute.
 * @return bool
 */
function psb_is_slider(array $attrs)
{
    $classes = preg_split('/\s+/', (string) ($attrs['className'] ?? ''));

    return in_array('is-style-' . PSB_SLIDER_STYLE, $classes, true);
}

/**
 * Einstellungen des Sliders, fertig für Swiper.
 *
 * Ohne eigene Einstellungen verhält sich ein Slider wie vor dem Umzug ins
 * Plugin: Desktop = "Spalten" der Produktsammlung, Tablet höchstens 2,
 * Handy 1, Pfeile und Punkte an.
 *
 * @param array $attrs Block-Attribute der Produktsammlung.
 * Der Anschnitt kommt getrennt als ganze Prozentzahl (peekPercent) und wird
 * erst im Browser addiert: Diese PHP-Installation schreibt Kommazahlen mit
 * serialize_precision 17 ins JSON (0.3 → 0.29999999999999999).
 *
 * @return array{slidesPerView: array{mobile: int, tablet: int, desktop: int}, peekPercent: int, navigation: bool, pagination: bool}
 */
function psb_slider_config(array $attrs)
{
    $s       = is_array($attrs['psbSlider'] ?? null) ? $attrs['psbSlider'] : [];
    $columns = (int) ($attrs['displayLayout']['columns'] ?? 0);
    $clamp   = static function ($value, $max) {
        return max(1, min($max, (int) $value));
    };

    $desktop = $clamp($s['desktop'] ?? ($columns ?: 4), 8);
    $tablet  = $clamp($s['tablet'] ?? min(2, $desktop), 6);
    $mobile  = $clamp($s['mobile'] ?? 1, 4);
    $peek    = ! empty($s['peek']) ? PSB_SLIDER_PEEK_PERCENT : 0;

    return [
        'slidesPerView' => [
            'mobile'  => $mobile,
            'tablet'  => $tablet,
            'desktop' => $desktop,
        ],
        'peekPercent'   => $peek,
        'navigation'    => (bool) ($s['navigation'] ?? true),
        'pagination'    => (bool) ($s['pagination'] ?? true),
    ];
}

/**
 * Einstellungen an den Block hängen und die Dateien laden -- nur für
 * Produktsammlungen mit dem Stil, nur auf Seiten, auf denen sie stehen.
 */
add_filter('render_block_woocommerce/product-collection', function ($content, $block) {
    $attrs = $block['attrs'] ?? [];
    if (! psb_is_slider($attrs)) {
        return $content;
    }

    $p = new WP_HTML_Tag_Processor($content);
    if (! $p->next_tag(['class_name' => 'wp-block-woocommerce-product-collection'])) {
        return $content;
    }
    $p->set_attribute('data-psb-slider', wp_json_encode(psb_slider_config($attrs)));

    wp_enqueue_script_module('product-showcase-block/slider');
    wp_enqueue_style('product-showcase-block-slider');

    return $p->get_updated_html();
}, 10, 2);

/**
 * Editor: Panel "Slider" an der Produktsammlung. Im <head>, weil der
 * Attribut-Filter stehen muss, bevor WooCommerce den Block registriert.
 */
add_action('enqueue_block_editor_assets', function () {
    $dir = plugin_dir_path(__DIR__) . 'build/editor/';
    if (! file_exists($dir . 'product-collection.asset.php')) {
        return;
    }
    $asset = require $dir . 'product-collection.asset.php';

    wp_enqueue_script(
        'product-showcase-block-editor',
        plugins_url('build/editor/product-collection.js', __DIR__),
        $asset['dependencies'],
        $asset['version'],
        false
    );
});
