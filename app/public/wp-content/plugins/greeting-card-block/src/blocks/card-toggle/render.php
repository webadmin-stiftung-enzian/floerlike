<?php

/**
 * Block "Grusskarte hinzufügen" auf der Seite: die Checkbox, die Kartenauswahl
 * und Grusstext einblendet.
 *
 * Verfügbare Variablen: $attributes, $content, $block (WP_Block).
 *
 * @package GreetingCardBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

$product = wc_get_product(absint($block->context['postId'] ?? get_the_ID()));

if (! gcb_handles_product($product)) {
    return;
}

$data = gcb_prepare_state($product);

// Grusskarten nur, wenn der Satz im Rahmen vollständig ist und das Produkt
// Karten hat (class-purchase-status.php, Spezifikation v4, 5.2).
if (! $data['cardsEnabled'] || ! $data['isAvailable']) {
    return;
}

?>
<div
    <?php echo get_block_wrapper_attributes(['class' => 'greeting-card-bundle__checkbox']); ?>
    data-wp-interactive="greeting-card-bundle">
    <input
        type="checkbox"
        id="wantsGreetingCard"
        name="wantsGreetingCard"
        data-wp-on--change="actions.toggleWantsCard"
        data-wp-bind--checked="state.wantsCard" />
    <label for="wantsGreetingCard"><?php esc_html_e('Möchten Sie eine Grusskarte hinzufügen?', 'greeting-card-block'); ?></label>
</div>
