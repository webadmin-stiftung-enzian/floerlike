<?php

/**
 * Block "Kein Treffer" auf der Seite.
 *
 * Kommt immer mit hidden: Sichtbar macht ihn nur der Rahmen -- auf dem Server
 * bei ?filter= ohne Treffer (psb_set_empty_visibility()), im Browser nach
 * einem Filterklick (showcase/view.js). Ausserhalb eines Schaufensters
 * bleibt er so unsichtbar.
 *
 * Verfügbare Variablen: $attributes, $content, $block (WP_Block).
 *
 * @package ProductShowcaseBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

?>
<div <?php echo get_block_wrapper_attributes(['hidden' => 'hidden']); ?>>
    <?php
    // Von den Innenblöcken selbst escaped/aufgebaut, wie bei core/group
    // unverändert ausgegeben.
    echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
    ?>
    <p class="psb-empty__actions">
        <button
            type="button"
            class="psb-empty__reset button outline"
            data-wp-on--click="actions.resetFilter"><?php echo esc_html($attributes['resetLabel'] ?? ''); ?></button>
    </p>
</div>
