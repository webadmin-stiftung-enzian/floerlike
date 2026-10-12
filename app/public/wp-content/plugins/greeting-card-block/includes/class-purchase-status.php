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
 * Alle Blocknamen in einem Block-Baum, beliebig tief (Gruppen, Spalten …).
 *
 * Synchronisierte Vorlagen (core/block) werden aufgelöst: Steht ein Teil des
 * Satzes in einer solchen Vorlage, zählt er trotzdem. $seen verhindert eine
 * Endlosschleife, falls eine Vorlage sich selbst enthält.
 *
 * @param array $blocks Geparste Blöcke (parse_blocks() bzw. innerBlocks).
 * @param array $seen   Bereits aufgelöste Vorlagen-IDs.
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

        $ref = $block['attrs']['ref'] ?? 0;
        if ('core/block' === $block['blockName'] && $ref && ! isset($seen[$ref])) {
            $seen[$ref] = true;
            $pattern    = get_post($ref);
            if ($pattern && 'wp_block' === $pattern->post_type) {
                $names = array_merge($names, gcb_collect_block_names(parse_blocks($pattern->post_content), $seen));
            }
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
 * Vollständigkeit für das Produkt der Seite -- nur innerhalb eines Rahmens.
 *
 * @param WC_Product $product
 * @return array|null Ergebnis von gcb_evaluate_purchase(), oder null, wenn
 *                    gerade kein Rahmen gerendert wird (z. B. der bisherige
 *                    Einzelblock, der für sich vollständig ist).
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
