<?php

/**
 * Block "Filter" auf der Seite: ein Knopf je Filter-Schlagwort.
 *
 * Welche Schlagwörter: die mit "Im Filter zeigen", deren Zeitraum gerade
 * gilt, in ihrer Reihenfolge (psb_get_filter_tags(), Kapitel 3). Knöpfe, zu
 * denen im Schaufenster kein Produkt steht, blendet danach der Rahmen aus
 * (psb_hide_unused_filter_buttons()) -- erst er kennt alle Produkte.
 *
 * <button aria-pressed> statt Radio-Buttons: Ein zweiter Klick soll den
 * Filter wieder aufheben, Radio-Buttons lassen sich nicht abwählen.
 * Gewählt wird im Store des Rahmens (showcase/view.js).
 *
 * Verfügbare Variablen: $attributes, $content, $block (WP_Block).
 *
 * @package ProductShowcaseBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

$tags = psb_get_filter_tags();
if (! $tags) {
    return;
}

$label_id = wp_unique_id('psb-filter-label-');

?>
<div <?php echo get_block_wrapper_attributes(['role' => 'group', 'aria-labelledby' => $label_id]); ?>>
    <p class="psb-filter__label heading mono-klein" id="<?php echo esc_attr($label_id); ?>"><?php echo esc_html($attributes['label'] ?? ''); ?></p>
    <div class="psb-filter__buttons">
        <?php foreach ($tags as $tag) : ?>
            <?php
            // Aussehen über die Theme-Klassen "button outline" (main.css),
            // gewählt mit "is-selected" -- wie die Variantenauswahl.
            ?>
            <button
                type="button"
                class="psb-filter__button button outline"
                aria-pressed="false"
                data-psb-tag-class="<?php echo esc_attr(psb_tag_class($tag)); ?>"
                <?php
                echo wp_interactivity_data_wp_context([
                    'tag'      => $tag->slug,
                    'tagClass' => psb_tag_class($tag),
                ]);
                ?>
                data-wp-on--click="actions.toggleTag"
                data-wp-bind--aria-pressed="state.isPressed"
                data-wp-class--is-selected="state.isPressed"><?php echo esc_html($tag->name); ?></button>
        <?php endforeach; ?>
    </div>
</div>