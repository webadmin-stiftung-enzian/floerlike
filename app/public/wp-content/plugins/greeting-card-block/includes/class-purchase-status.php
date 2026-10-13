<?php

/**
 * Vollständigkeit des Rahmens "Grusskarten-Kauf".
 *
 * Der Rahmen (greeting-card-block/card-purchase) hält die fünf Kauf-Blöcke
 * zusammen. Ob sein Satz vollständig ist, entscheidet, was auf der Seite
 * passiert (Spezifikation v4, Kapitel 5):
 *
 *   canPurchase   Kauf überhaupt möglich -- "In den Warenkorb" ist da, bei
 *                 variablen Produkten auch die Variantenauswahl. Sonst rendert
 *                 der Rahmen nichts, und die native WooCommerce-Form springt ein.
 *   cardsEnabled  Grusskarten möglich -- zusätzlich Checkbox, Kartenauswahl
 *                 und Grusstext vorhanden, und das Produkt hat Karten.
 *
 * Welche Blöcke wesentlich sind, steht in includes/purchase-blocks.json --
 * derselben Datei, die auch der Editor liest.
 *
 * Zeitpunkt: WordPress rendert erst die Innenblöcke, dann den Rahmen. Die
 * Innenblöcke müssen das Ergebnis aber schon kennen. Deshalb wird der
 * Innenblock-Baum über den Filter render_block_data gelesen -- der läuft,
 * BEVOR ein Block samt Innenblöcken gerendert wird.
 *
 * @package GreetingCardBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Inhalt von includes/purchase-blocks.json.
 *
 * @return array{frame: string, purchase: string[], variable: string[], cards: string[], template: string[]}
 */
function gcb_purchase_definition()
{
    static $definition = null;

    if (null === $definition) {
        $json       = file_get_contents(__DIR__ . '/purchase-blocks.json');
        $definition = json_decode((string) $json, true) ?: [];
    }

    return $definition;
}

/**
 * Blöcke, auf die ein Block nur verweist, statt sie selbst zu enthalten.
 *
 * Drei Fälle, in denen der eigentliche Inhalt woanders steht:
 *   core/block          synchronisierte Vorlage (gespeichert als wp_block)
 *   core/template-part  Template-Teil (z. B. ein ausgelagerter Kaufbereich)
 *   core/pattern        registriertes Muster des Themes oder eines Plugins
 *
 * $seen verhindert Endlosschleifen, falls ein Verweis (auf Umwegen) sich
 * selbst enthält.
 *
 * @param array $block Ein geparster Block.
 * @param array $seen  Bereits aufgelöste Verweise.
 * @return array Geparste Blöcke des Verweisziels, leer wenn keins.
 */
function gcb_resolve_block_reference(array $block, array &$seen)
{
    $name  = $block['blockName'] ?? '';
    $attrs = $block['attrs'] ?? [];

    if ('core/block' === $name && ! empty($attrs['ref'])) {
        $key = 'block:' . (int) $attrs['ref'];
        if (isset($seen[$key])) {
            return [];
        }
        $seen[$key] = true;
        $post       = get_post((int) $attrs['ref']);

        return ($post && 'wp_block' === $post->post_type) ? parse_blocks($post->post_content) : [];
    }

    if ('core/template-part' === $name && ! empty($attrs['slug'])) {
        $id  = ($attrs['theme'] ?? get_stylesheet()) . '//' . $attrs['slug'];
        $key = 'part:' . $id;
        if (isset($seen[$key])) {
            return [];
        }
        $seen[$key] = true;
        $part       = get_block_template($id, 'wp_template_part');

        return ($part && ! empty($part->content)) ? parse_blocks($part->content) : [];
    }

    if ('core/pattern' === $name && ! empty($attrs['slug'])) {
        $key = 'pattern:' . $attrs['slug'];
        if (isset($seen[$key])) {
            return [];
        }
        $seen[$key] = true;
        $pattern    = WP_Block_Patterns_Registry::get_instance()->get_registered($attrs['slug']);

        return ($pattern && ! empty($pattern['content'])) ? parse_blocks($pattern['content']) : [];
    }

    return [];
}

/**
 * Alle Blocknamen in einem Block-Baum, beliebig tief (Gruppen, Spalten …),
 * Verweise aufgelöst (gcb_resolve_block_reference): Steht ein Teil des
 * Satzes in einer synchronisierten Vorlage oder einem Muster, zählt er
 * trotzdem.
 *
 * @param array $blocks Geparste Blöcke (parse_blocks() bzw. innerBlocks).
 * @param array $seen   Bereits aufgelöste Verweise.
 * @return string[]
 */
function gcb_collect_block_names(array $blocks, array &$seen = [])
{
    $names = [];

    foreach ($blocks as $block) {
        if (empty($block['blockName'])) {
            continue;
        }

        $names[] = $block['blockName'];

        if (! empty($block['innerBlocks'])) {
            $names = array_merge($names, gcb_collect_block_names($block['innerBlocks'], $seen));
        }

        $referenced = gcb_resolve_block_reference($block, $seen);
        if ($referenced) {
            $names = array_merge($names, gcb_collect_block_names($referenced, $seen));
        }
    }

    return array_values(array_unique($names));
}

/**
 * Was ist mit diesen Blöcken möglich?
 *
 * @param string[]        $names   Blocknamen im Rahmen.
 * @param WC_Product|null $product Das Produkt der Seite. null = unbekannt (z. B.
 *                                 Template für alle Produkte): dann gilt die
 *                                 Variantenauswahl immer als wesentlich.
 * @return array{canPurchase: bool, cardsEnabled: bool, missingPurchase: string[], missingCards: string[]}
 */
function gcb_evaluate_purchase(array $names, $product = null)
{
    $definition = gcb_purchase_definition();

    $required = $definition['purchase'];
    if (null === $product || $product->is_type('variable')) {
        $required = array_merge($required, $definition['variable']);
    }

    $missing_purchase = array_values(array_diff($required, $names));
    $missing_cards    = array_values(array_diff($definition['cards'], $names));
    $can_purchase     = empty($missing_purchase);
    $has_cards        = null === $product || gcb_is_card_parent($product);

    return [
        'canPurchase'     => $can_purchase,
        'cardsEnabled'    => $can_purchase && empty($missing_cards) && $has_cards,
        'missingPurchase' => $missing_purchase,
        'missingCards'    => $missing_cards,
    ];
}

/**
 * Blocknamen des Rahmens, der gerade gerendert wird (null = keiner).
 *
 * Gesetzt von render_block_data, bevor der Rahmen seine Innenblöcke rendert;
 * zurückgesetzt von render_block, nachdem er fertig ist. Pro Seite ist nur
 * ein Rahmen erlaubt (supports.multiple = false), ein einfacher Wert genügt.
 *
 * @param string[]|null|false $set Neuer Wert; false = nur lesen.
 * @return string[]|null
 */
function gcb_current_frame_blocks($set = false)
{
    static $names = null;

    if (false !== $set) {
        $names = $set;
    }

    return $names;
}

add_filter('render_block_data', function ($parsed_block) {
    if (($parsed_block['blockName'] ?? '') === gcb_purchase_definition()['frame']) {
        gcb_current_frame_blocks(gcb_collect_block_names($parsed_block['innerBlocks'] ?? []));
    }

    return $parsed_block;
});

add_filter('render_block', function ($content, $block) {
    if (($block['blockName'] ?? '') === gcb_purchase_definition()['frame']) {
        gcb_current_frame_blocks(null);
    }

    return $content;
}, 10, 2);

/**
 * Standard-Blockabstand des Rahmens auch auf der Seite anwenden.
 *
 * Das Theme setzt den Abstand im Fliess-Layout auf 0; der Rahmen bringt
 * deshalb einen eigenen Standard mit (block.json: attributes.style.default).
 * Im Editor greift er, auf der Seite aber nicht: WordPress berechnet das
 * Layout aus den GESPEICHERTEN Attributen (wp_render_layout_support_flag liest
 * $block['attrs']), und Standardwerte werden nicht gespeichert. Ohne diesen
 * Filter klebten die Kauf-Blöcke auf der Seite aneinander, im Editor nicht.
 *
 * render_block_data läuft vor der Layout-Berechnung. Wer im Editor einen
 * eigenen Blockabstand einstellt, behält ihn -- ergänzt wird nur, was fehlt.
 */
add_filter('render_block_data', function ($parsed_block) {
    $frame = gcb_purchase_definition()['frame'];

    if (($parsed_block['blockName'] ?? '') !== $frame || isset($parsed_block['attrs']['style']['spacing']['blockGap'])) {
        return $parsed_block;
    }

    $type    = WP_Block_Type_Registry::get_instance()->get_registered($frame);
    $default = $type->attributes['style']['default']['spacing']['blockGap'] ?? null;

    if ($default) {
        $parsed_block['attrs']['style']['spacing']['blockGap'] = $default;
    }

    return $parsed_block;
});

/**
 * Vollständigkeit für das Produkt der Seite -- nur innerhalb eines Rahmens.
 *
 * @param WC_Product $product
 * @return array|null Ergebnis von gcb_evaluate_purchase(), oder null, wenn
 *                    gerade kein Rahmen gerendert wird -- z. B. in der
 *                    Editor-Vorschau, die jeden Kauf-Block einzeln rendert
 *                    (class-preview.php).
 */
function gcb_get_purchase_status(WC_Product $product)
{
    $names = gcb_current_frame_blocks();

    return null === $names ? null : gcb_evaluate_purchase($names, $product);
}

/**
 * Lesbare Titel fehlender Blöcke, für Hinweise an Redakteur:innen.
 *
 * @param string[] $names Blocknamen.
 * @return string Z. B. "„Grusstext“, „In den Warenkorb“".
 */
function gcb_block_titles(array $names)
{
    $registry = WP_Block_Type_Registry::get_instance();
    $titles   = [];

    foreach ($names as $name) {
        $type     = $registry->get_registered($name);
        $titles[] = '„' . ($type && $type->title ? $type->title : $name) . '“';
    }

    return implode(', ', $titles);
}

/* ---------------------------------------------------------------------------
   Native WooCommerce-Form: wann ausblenden? (Spezifikation v4, Kapitel 8)
   ---------------------------------------------------------------------------
   Die Form darf nur verschwinden, wenn auf der Seite tatsächlich etwas steht,
   mit dem man stattdessen kaufen kann. Sonst hätte ein Produkt gar keinen
   Kaufen-Knopf -- z. B. wenn im Template der Rahmen fehlt oder in ihm
   "In den Warenkorb" gelöscht wurde.

   Die Form kann im Template VOR unserem Rahmen stehen und wird dann zuerst
   gerendert. Auf das Rendern des Rahmens zu warten geht also nicht; stattdessen
   wird vorab der Inhalt der Seite durchsucht. Im Zweifel -- nichts gefunden --
   wird NICHT ausgeblendet: lieber zwei Kaufen-Knöpfe als keiner. */

/**
 * Durchsucht einen Block-Baum nach einem Rahmen "Grusskarten-Kauf", der für
 * das Produkt kaufen kann (vollständiger Kauf-Satz).
 *
 * @param array      $blocks  Geparste Blöcke.
 * @param WC_Product $product
 * @param array      $seen    Bereits aufgelöste Verweise.
 * @return bool
 */
function gcb_tree_can_purchase(array $blocks, WC_Product $product, array &$seen = [])
{
    $frame = gcb_purchase_definition()['frame'];

    foreach ($blocks as $block) {
        $name = $block['blockName'] ?? '';

        if ($frame === $name) {
            $names = gcb_collect_block_names($block['innerBlocks'] ?? []);
            if (gcb_evaluate_purchase($names, $product)['canPurchase']) {
                return true;
            }
            // Ein unvollständiger Rahmen zählt nicht -- weitersuchen.
            continue;
        }

        if (! empty($block['innerBlocks']) && gcb_tree_can_purchase($block['innerBlocks'], $product, $seen)) {
            return true;
        }

        $referenced = gcb_resolve_block_reference($block, $seen);
        if ($referenced && gcb_tree_can_purchase($referenced, $product, $seen)) {
            return true;
        }
    }

    return false;
}

/**
 * Steht auf der aktuellen Seite eine Kauf-Oberfläche, die dieses Produkt
 * kaufen kann?
 *
 * Durchsucht werden das Template, das gerade gerendert wird
 * ($_wp_current_template_content, von WordPress gesetzt), und der Inhalt des
 * aufgerufenen Beitrags (z. B. eine Landingpage mit dem Block "Einzelnes
 * Produkt"). Ergebnis je Produkt zwischengespeichert -- mehrere Abfragen pro
 * Seitenaufruf kosten nichts.
 *
 * @param WC_Product $product
 * @return bool
 */
function gcb_page_can_purchase(WC_Product $product)
{
    static $cache = [];

    $id = $product->get_id();
    if (isset($cache[$id])) {
        return $cache[$id];
    }

    $sources = [];

    if (! empty($GLOBALS['_wp_current_template_content'])) {
        $sources[] = $GLOBALS['_wp_current_template_content'];
    }

    $queried = get_queried_object();
    if ($queried instanceof WP_Post && has_blocks($queried->post_content)) {
        $sources[] = $queried->post_content;
    }

    $seen = [];
    foreach ($sources as $source) {
        if (gcb_tree_can_purchase(parse_blocks($source), $product, $seen)) {
            return $cache[$id] = true;
        }
    }

    return $cache[$id] = false;
}

/**
 * Soll die native WooCommerce-Form für dieses Produkt ausgeblendet werden?
 *
 * Nur, wenn unsere Blöcke für das Produkt zuständig sind (einfach/variabel)
 * UND auf der Seite tatsächlich damit gekauft werden kann.
 *
 * @param WC_Product|int|null $product
 * @return bool
 */
function gcb_should_hide_native_form($product)
{
    if (! $product instanceof WC_Product) {
        $product = $product ? wc_get_product($product) : null;
    }

    return gcb_handles_product($product) && gcb_page_can_purchase($product);
}
