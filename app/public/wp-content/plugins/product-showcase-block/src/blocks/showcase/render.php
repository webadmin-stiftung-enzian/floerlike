<?php

/**
 * Rahmen "Schaufenster" auf der Seite.
 *
 * Wird NACH seinen Innenblöcken gerendert; $content enthält deren fertiges
 * Markup (Zeilen und alles, was im Editor dazwischen gesetzt wurde). Ab
 * Stufe 4 hält der Rahmen hier auch den Zustand des Filters.
 *
 * Verfügbare Variablen: $attributes, $content, $block (WP_Block).
 *
 * @package ProductShowcaseBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

?>
<div <?php echo get_block_wrapper_attributes(); ?>>
    <?php
    // Von den Innenblöcken selbst escaped/aufgebaut, wie bei core/group
    // unverändert ausgegeben.
    echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
    ?>
</div>
