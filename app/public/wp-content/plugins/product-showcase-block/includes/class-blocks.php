<?php

/**
 * Blöcke des Schaufensters: Registrierung, Kategorie im Einfügen-Menü und
 * Hilfsfunktionen für die render.php der Blöcke.
 *
 *   Schaufenster   product-showcase/showcase   (src/blocks/showcase)
 *   Zeile          product-showcase/row        (src/blocks/row)
 *   Filter         product-showcase/filter     (src/blocks/filter)
 *   Kein Treffer   product-showcase/empty      (src/blocks/empty)
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
    if (! in_array($name, ['product-showcase/showcase', 'product-showcase/row', 'product-showcase/empty'], true)) {
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

/**
 * CSS-Klasse, die WooCommerce Produkten mit diesem Schlagwort gibt.
 *
 * Nachgebaut aus wc_get_product_taxonomy_class() (WooCommerce 11.1): Slug,
 * bei Slugs ohne verwertbare Zeichen die ID. Ändert WooCommerce das, findet
 * der Filter keine Produkte mehr -- siehe Update-Checkliste (Kapitel 8.4).
 *
 * @param WP_Term $term Schlagwort.
 * @return string z. B. "product_tag-valentinstag".
 */
function psb_tag_class($term)
{
    $term_class = sanitize_html_class($term->slug, $term->term_id);
    if (is_numeric($term_class) || ! trim($term_class, '-')) {
        $term_class = $term->term_id;
    }

    return sanitize_html_class($term->taxonomy . '-' . $term_class, $term->taxonomy . '-' . $term->term_id);
}

/**
 * Filter-Knöpfe ausblenden, zu denen im Schaufenster kein Produkt steht --
 * sie führten immer ins Leere (Spezifikation, Kapitel 3). Bleibt keiner
 * übrig, verschwindet der ganze Filter.
 *
 * @param string $content Markup der Innenblöcke des Rahmens.
 * @return string
 */
function psb_hide_unused_filter_buttons($content)
{
    if (false === strpos($content, 'psb-filter__button')) {
        return $content;
    }

    // 1. Welche Schlagwort-Klassen tragen die Produkte?
    $present = [];
    $p       = new WP_HTML_Tag_Processor($content);
    while ($p->next_tag(['class_name' => 'wc-block-product'])) {
        foreach ($p->class_list() as $class) {
            if (0 === strpos($class, 'product_tag-')) {
                $present[$class] = true;
            }
        }
    }

    // 2. Wie viele Knöpfe bleiben?
    $visible = 0;
    $p       = new WP_HTML_Tag_Processor($content);
    while ($p->next_tag(['class_name' => 'psb-filter__button'])) {
        if (isset($present[(string) $p->get_attribute('data-psb-tag-class')])) {
            ++$visible;
        }
    }

    // 3. Ausblenden: einzelne Knöpfe, oder den ganzen Filter.
    $p = new WP_HTML_Tag_Processor($content);
    while ($p->next_tag()) {
        if (0 === $visible && $p->has_class('wp-block-product-showcase-filter')) {
            $p->set_attribute('hidden', true);
        } elseif ($p->has_class('psb-filter__button') && ! isset($present[(string) $p->get_attribute('data-psb-tag-class')])) {
            $p->set_attribute('hidden', true);
        }
    }

    return $p->get_updated_html();
}

/** Name des Parameters in der Adresse (Spezifikation, Kapitel 7). */
const PSB_FILTER_PARAM = 'filter';

/**
 * Das Filter-Schlagwort aus der Adresse (?filter=valentinstag).
 *
 * Gilt nur, wenn es gerade ein Filter-Schlagwort ist (Im Filter zeigen,
 * Zeitraum, psb_get_filter_tags()) -- sonst wird der Parameter übergangen
 * und die Seite ungefiltert ausgeliefert.
 *
 * @return WP_Term|null
 */
function psb_requested_filter_tag()
{
    // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- nur lesen, ändert nichts
    $slug = isset($_GET[PSB_FILTER_PARAM]) ? sanitize_title(wp_unslash($_GET[PSB_FILTER_PARAM])) : '';
    if ('' === $slug) {
        return null;
    }

    foreach (psb_get_filter_tags() as $tag) {
        if ($tag->slug === $slug) {
            return $tag;
        }
    }

    return null;
}

/**
 * Filter schon auf dem Server anwenden: unpassende Produkte und Zeilen ohne
 * passendes Produkt bekommen hidden -- so blitzen sie beim Laden nicht auf.
 * Im Browser nimmt applyFilter() (showcase/view.js) die Produkte danach aus
 * den Listen, damit Swiper sie nicht mitzählt.
 *
 * @param string $content   Markup der Innenblöcke des Rahmens.
 * @param string $tag_class Klasse der passenden Produkte (psb_tag_class()).
 * @return string
 */
function psb_apply_server_filter($content, $tag_class)
{
    // 1. Welche Zeilen haben ein passendes Produkt? Zeilen in Zeilen kommen
    //    nicht vor -- ein Produkt zählt zur zuletzt begonnenen Zeile.
    $row     = -1;
    $has_hit = [];
    $p       = new WP_HTML_Tag_Processor($content);
    while ($p->next_tag()) {
        if ($p->has_class('wp-block-product-showcase-row')) {
            $has_hit[++$row] = false;
        } elseif ($row >= 0 && $p->has_class('wc-block-product') && $p->has_class($tag_class)) {
            $has_hit[$row] = true;
        }
    }

    // 2. Ausblenden.
    $row = -1;
    $p   = new WP_HTML_Tag_Processor($content);
    while ($p->next_tag()) {
        if ($p->has_class('wp-block-product-showcase-row')) {
            if (! $has_hit[++$row]) {
                $p->set_attribute('hidden', true);
            }
        } elseif ($p->has_class('wc-block-product') && ! $p->has_class($tag_class)) {
            $p->set_attribute('hidden', true);
        }
    }

    return $p->get_updated_html();
}

/**
 * Abgeleiteter Wert state.isPressed auch auf dem Server, damit der gewählte
 * Knopf schon beim Laden gedrückt aussieht (aria-pressed, is-selected).
 * Gleiche Logik wie der Getter in showcase/view.js.
 */
add_action('init', function () {
    wp_interactivity_state('product-showcase', [
        // Textbausteine der Ansage nach einem Filterklick (showcase/view.js).
        'messages'  => [
            /* translators: Ansage für Screenreader, Anfang: "1 Produkt" */
            'productOne'  => __('1 Produkt', 'product-showcase-block'),
            /* translators: Ansage für Screenreader, Anfang; %d: Anzahl */
            'productMany' => __('%d Produkte', 'product-showcase-block'),
            /* translators: Ansage für Screenreader, Ende: "in 1 Kategorie" */
            'rowOne'      => __('in 1 Kategorie', 'product-showcase-block'),
            /* translators: Ansage für Screenreader, Ende; %d: Anzahl */
            'rowMany'     => __('in %d Kategorien', 'product-showcase-block'),
            'none'        => __('Keine Produkte für diesen Filter.', 'product-showcase-block'),
            'reset'       => __('Filter aufgehoben.', 'product-showcase-block'),
        ],
        'isPressed' => static function () {
            $context = wp_interactivity_get_context();

            return ! empty($context['tag']) && ($context['activeTag'] ?? null) === $context['tag'];
        },
    ]);
});

/**
 * Bleibt im Schaufenster eine Zeile sichtbar (ohne hidden)?
 *
 * @param string $content Markup der Innenblöcke des Rahmens.
 * @return bool
 */
function psb_has_visible_row($content)
{
    $p = new WP_HTML_Tag_Processor($content);
    while ($p->next_tag(['class_name' => 'wp-block-product-showcase-row'])) {
        if (null === $p->get_attribute('hidden')) {
            return true;
        }
    }

    return false;
}

/**
 * "Kein Treffer" zeigen oder verstecken. Der Block kommt immer versteckt
 * (empty/render.php); nur hier wird er sichtbar.
 *
 * @param string $content Markup der Innenblöcke des Rahmens.
 * @param bool   $show    Sichtbar machen?
 * @return string
 */
function psb_set_empty_visibility($content, $show)
{
    if (! $show) {
        return $content;
    }

    $p = new WP_HTML_Tag_Processor($content);
    while ($p->next_tag(['class_name' => 'wp-block-product-showcase-empty'])) {
        $p->remove_attribute('hidden');
    }

    return $p->get_updated_html();
}
