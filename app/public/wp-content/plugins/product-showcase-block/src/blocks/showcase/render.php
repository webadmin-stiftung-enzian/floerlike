<?php

/**
 * Rahmen "Schaufenster" auf der Seite.
 *
 * Wird NACH seinen Innenblöcken gerendert; $content enthält deren fertiges
 * Markup (Filter, Zeilen und alles, was im Editor dazwischen gesetzt wurde).
 *
 * Der Rahmen hält den Zustand des Filters als Kontext (view.js) und blendet
 * Filter-Knöpfe aus, zu denen kein Produkt im Schaufenster steht -- erst hier
 * sind alle Produkte bekannt. Steht ein Filter in der Adresse, ist die Seite
 * schon gefiltert, wenn sie ankommt.
 *
 * Verfügbare Variablen: $attributes, $content, $block (WP_Block).
 *
 * @package ProductShowcaseBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

$content = psb_hide_unused_filter_buttons($content);

// Filter aus der Adresse (?filter=…), gleich auf dem Server angewendet.
$requested = psb_requested_filter_tag();
if ($requested) {
    $content = psb_apply_server_filter($content, psb_tag_class($requested));
}

// "Kein Treffer" zeigen, wenn der Filter aus der Adresse nichts übrig lässt.
$content = psb_set_empty_visibility($content, $requested && ! psb_has_visible_row($content));

?>
<div
    <?php echo get_block_wrapper_attributes(); ?>
    data-wp-interactive="product-showcase"
    <?php
    echo wp_interactivity_data_wp_context([
        'activeTag'   => $requested ? $requested->slug : null,
        'activeClass' => $requested ? psb_tag_class($requested) : null,
    ]);
    ?>
    data-wp-watch="callbacks.applyFilter">
    <?php
    // Von den Innenblöcken selbst escaped/aufgebaut, wie bei core/group
    // unverändert ausgegeben.
    echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
    ?>
    <?php // Ansage nach einem Filterklick (view.js), nur für Screenreader. ?>
    <p class="psb-showcase__announce" aria-live="polite"></p>
</div>
