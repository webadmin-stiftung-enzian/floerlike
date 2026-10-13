<?php

/**
 * Block "In den Warenkorb" auf der Seite.
 *
 * Ist das Produkt nicht kaufbar (ausverkauft, ohne Preis …), zeigt der Block
 * statt des Knopfs den Lagerhinweis -- die native Form würde sich ebenso
 * verhalten, und ein Knopf, dessen Request garantiert scheitert, hilft
 * niemandem.
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

if (! $data['isAvailable']) {
    // wc_get_stock_html() liefert den nativen Lagerhinweis ("Nicht vorrätig"),
    // sofern WooCommerce einen hat; sonst ein eigener, allgemeiner Hinweis.
    $stock_html = $data['variationSelector'] ? '' : wc_get_stock_html($product);
    ?>
    <div <?php echo get_block_wrapper_attributes(); ?>>
        <?php if ('' !== trim($stock_html)) : ?>
            <?php echo wp_kses_post($stock_html); ?>
        <?php else : ?>
            <p class="stock out-of-stock"><?php esc_html_e('Dieses Produkt ist derzeit nicht verfügbar.', 'greeting-card-block'); ?></p>
        <?php endif; ?>
    </div>
    <?php
    return;
}

?>
<div
    <?php echo get_block_wrapper_attributes(); ?>
    data-wp-interactive="greeting-card-bundle">
    <div
        class="wc-block-components-notice-banner is-error"
        role="alert"
        data-wp-bind--hidden="!state.errorMessage"
        hidden>
        <div class="wc-block-components-notice-banner__content" data-wp-text="state.errorMessage"></div>
    </div>

    <button
        type="button"
        class="greeting-card-bundle__submit button outline"
        data-wp-on--click="actions.addToCart"
        data-wp-bind--disabled="state.isAdding">
        <span data-wp-bind--hidden="state.isAdding"><?php esc_html_e('In den Warenkorb', 'greeting-card-block'); ?></span>
        <span data-wp-bind--hidden="!state.isAdding"><?php esc_html_e('Wird hinzugefügt …', 'greeting-card-block'); ?></span>
    </button>
</div>
