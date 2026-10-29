<?php

/**
 * Block "Begriffsliste" auf der Seite, z. B. "Blumen: Dahlien, Rosen".
 *
 * Wie die "Varianten-Spanne": Das Produkt kommt aus dem Kontext der
 * Produktvorlage bzw. der Produktseite (postId), in der Editor-Vorschau als
 * post_id (edit.js). Ohne Begriffe gibt der Block nichts aus.
 *
 * Verfügbare Variablen: $attributes, $content, $block (WP_Block).
 *
 * @package ProductShowcaseBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

$psb_product_id = (int) ($block->context['postId'] ?? 0) ?: get_the_ID();
if (! $psb_product_id || 'product' !== get_post_type($psb_product_id)) {
    return;
}

$psb_list = psb_term_list_html(
    $psb_product_id,
    sanitize_key($attributes['taxonomy'] ?? ''),
    sanitize_key($attributes['orderBy'] ?? 'source'),
    (string) ($attributes['separator'] ?? ', '),
    ! empty($attributes['isLink'])
);
if ('' === $psb_list) {
    return;
}

$psb_label = trim((string) ($attributes['label'] ?? ''));

?>
<p <?php echo get_block_wrapper_attributes(); ?>>
    <?php if ('' !== $psb_label) : ?>
        <span class="psb-term-list__label"><?php echo esc_html($psb_label); ?></span>
    <?php endif; ?>
    <span class="psb-term-list__terms"><?php echo $psb_list; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- in psb_term_list_html() escaped ?></span>
</p>
