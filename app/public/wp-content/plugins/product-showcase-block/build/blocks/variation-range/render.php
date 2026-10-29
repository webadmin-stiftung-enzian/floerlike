<?php

/**
 * Block "Varianten-Spanne" auf der Seite, z. B. "Grösse: klein – gross"
 * oder als Einzelwert "ab CHF 35.00".
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

$psb_result = psb_variation_range_text(
    $psb_product,
    sanitize_key($attributes['attribute'] ?? ''),
    sanitize_key($attributes['value'] ?? 'term'),
    sanitize_key($attributes['display'] ?? 'range'),
    ! empty($attributes['includeSimple'])
);
if ('' === $psb_result['html']) {
    return;
}

$psb_label = trim((string) ($attributes['label'] ?? ''));

// Zusatztexte, z. B. "ab" vor dem kleinsten Preis. Standardmässig nur, wenn
// es verschiedene Werte gibt -- ein Produkt mit nur einem Preis zeigt dann
// "CHF 35.00" statt "ab CHF 35.00".
$psb_show_affix = $psb_result['multiple'] || empty($attributes['affixOnlyIfMultiple']);
$psb_prefix     = $psb_show_affix ? trim((string) ($attributes['prefix'] ?? '')) : '';
$psb_suffix     = $psb_show_affix ? trim((string) ($attributes['suffix'] ?? '')) : '';

?>
<p <?php echo get_block_wrapper_attributes(); ?>>
    <?php if ('' !== $psb_label) : ?>
        <span class="psb-variation-range__label"><?php echo esc_html($psb_label); ?>:</span>
    <?php endif; ?>
    <?php if ('' !== $psb_prefix) : ?>
        <span class="psb-variation-range__prefix"><?php echo esc_html($psb_prefix); ?></span>
    <?php endif; ?>
    <span class="psb-variation-range__value"><?php echo $psb_result['html']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- in psb_variation_range_text() escaped ?></span>
    <?php if ('' !== $psb_suffix) : ?>
        <span class="psb-variation-range__suffix"><?php echo esc_html($psb_suffix); ?></span>
    <?php endif; ?>
</p>
