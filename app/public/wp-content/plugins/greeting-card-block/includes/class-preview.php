<?php

/**
 * Vorschau der Kauf-Blöcke im Editor.
 *
 * Im Editor zeigen die Blöcke ihre echte Ausgabe -- derselbe render.php wie
 * auf der Seite, abgefragt über den REST-Endpunkt /wp/v2/block-renderer
 * (ServerSideRender in edit.js). Damit ist die Ansicht im Editor deckungsgleich
 * mit der Seite.
 *
 * Problem: Im Template steht kein bestimmtes Produkt. Für die Vorschau wird
 * deshalb ein Produkt gewählt -- im Rahmen einstellbar ("Vorschau-Produkt"),
 * sonst automatisch eins, das möglichst viel zeigt (variabel und mit Karten).
 *
 * @package GreetingCardBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Wird gerade einer unserer Blöcke für die Editor-Vorschau gerendert?
 *
 * Erkennbar an der REST-Route des Block-Renderers. Den Endpunkt dürfen nur
 * angemeldete Nutzer:innen mit Bearbeitungsrechten aufrufen (WordPress prüft
 * das selbst) -- Kund:innen bekommen die Vorschau-Ausgabe also nie zu sehen.
 *
 * @return bool
 */
function gcb_is_editor_preview()
{
    if (! defined('REST_REQUEST') || ! REST_REQUEST) {
        return false;
    }

    $route = $GLOBALS['wp']->query_vars['rest_route'] ?? '';

    return 0 === strpos($route, '/wp/v2/block-renderer/greeting-card-block/');
}

/**
 * Produkt für die Editor-Vorschau.
 *
 * Reihenfolge: das im Rahmen eingestellte Produkt (Query-Parameter
 * gcb_preview_product, gesetzt von edit.js) -- sonst das erste veröffentlichte
 * variable Produkt mit Grusskarten, denn das zeigt alle Blöcke -- sonst irgendein
 * variables, sonst irgendein einfaches Produkt.
 *
 * @return int Produkt-ID, 0 wenn es keins gibt.
 */
function gcb_preview_product_id()
{
    // Nur ID, nur in der Vorschau gelesen, und nur gültig, wenn unsere Blöcke
    // für das Produkt zuständig sind.
    $requested = isset($_GET['gcb_preview_product']) ? absint(wp_unslash($_GET['gcb_preview_product'])) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
    if ($requested && gcb_handles_product($requested)) {
        return $requested;
    }

    static $auto = null;
    if (null !== $auto) {
        return $auto;
    }

    $variable = wc_get_products([
        'type'   => 'variable',
        'status' => 'publish',
        'limit'  => 50,
        'return' => 'ids',
    ]);

    foreach ($variable as $id) {
        if (gcb_is_card_parent($id)) {
            return $auto = (int) $id;
        }
    }

    if ($variable) {
        return $auto = (int) $variable[0];
    }

    $simple = wc_get_products([
        'type'   => 'simple',
        'status' => 'publish',
        'limit'  => 1,
        'return' => 'ids',
    ]);

    return $auto = $simple ? (int) $simple[0] : 0;
}

/**
 * Das Produkt, für das ein Kauf-Block rendert.
 *
 * Auf der Seite: das Produkt aus dem Block-Kontext (Produkt-Template, Block
 * "Einzelnes Produkt"). In der Editor-Vorschau ohne passendes Produkt im
 * Kontext: das Vorschau-Produkt.
 *
 * @param WP_Block $block
 * @return WC_Product|false|null
 */
function gcb_block_product($block)
{
    $product = wc_get_product(absint($block->context['postId'] ?? get_the_ID()));

    if (gcb_handles_product($product) || ! gcb_is_editor_preview()) {
        return $product;
    }

    $preview_id = gcb_preview_product_id();

    return $preview_id ? wc_get_product($preview_id) : null;
}
