<?php

/**
 * "Zeile" im Schaufenster auf der Seite.
 *
 * Wird NACH ihren Innenblöcken gerendert; $content enthält deren fertiges
 * Markup, die Produktsammlung samt Produkten eingeschlossen.
 *
 * Steht darin kein einziges Produkt (leere Kategorie, keine Kategorie
 * gewählt), gibt die Zeile gar nichts aus -- auch ihre Überschrift nicht
 * (Spezifikation, Kapitel 5.3). Im Editor bleibt sie sichtbar, dort zeigt
 * WooCommerce selbst, dass die Sammlung leer ist.
 *
 * Verfügbare Variablen: $attributes, $content, $block (WP_Block).
 *
 * @package ProductShowcaseBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

if (! psb_row_has_products($content)) {
    return;
}

?>
<section <?php echo get_block_wrapper_attributes(); ?>>
    <?php
    // Von den Innenblöcken selbst escaped/aufgebaut, wie bei core/group
    // unverändert ausgegeben.
    echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
    ?>
</section>
