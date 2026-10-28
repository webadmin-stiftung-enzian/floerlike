<?php

/**
 * Block "Varianten-Spanne" auf der Seite, z. B. "Grösse: klein – gross".
 *
 * Das Produkt kommt aus dem Kontext der Produktvorlage (postId). In der
 * Editor-Vorschau (ServerSideRender, edit.js) gibt es keinen Kontext -- dort
 * reicht der Editor die Produkt-ID als post_id mit, und WordPress setzt sie
 * als aktuellen Beitrag.
 *
 * Ohne passendes Produkt, Attribut oder Werte gibt der Block nichts aus
 * (z. B. bei einfachen Produkten oder Grusskarten).
 *
 * Verfügbare Variablen: $attributes, $content, $block (WP_Block).
 *
 * @package ProductShowcaseBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

$psb_product_id = (int) ($block->context['postId'] ?? 0) ?: get_the_ID();
$psb_product    = $psb_product_id ? wc_get_product($psb_product_id) : null;
if (! $psb_product) {
    return;
}

$psb_text = psb_variation_range_text(
    $psb_product,
    sanitize_key($attributes['attribute'] ?? ''),
    sanitize_key($attributes['value'] ?? 'term')
);
if ('' === $psb_text) {
    return;
}

$psb_label = trim((string) ($attributes['label'] ?? ''));

?>
<p <?php echo get_block_wrapper_attributes(); ?>>
    <?php if ('' !== $psb_label) : ?>
        <span class="psb-variation-range__label"><?php echo esc_html($psb_label); ?>:</span>
    <?php endif; ?>
    <span class="psb-variation-range__value"><?php echo $psb_text; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- in psb_variation_range_text() escaped ?></span>
</p>
