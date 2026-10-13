<?php

/**
 * Block "Grusskarten-Auswahl" auf der Seite: Slider mit den verknüpften Karten.
 *
 * Eine Radio-Gruppe ("genau eine Karte"), jede Karte ein <label> mit den
 * Theme-Klassen "button outline tile". Abwählen geht über die Checkbox
 * "Grusskarte hinzufügen", nicht über die Karte selbst.
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

if (! $data['cardsEnabled'] || ! $data['isAvailable']) {
    return;
}

?>
<div
    <?php echo get_block_wrapper_attributes(); ?>
    data-wp-interactive="greeting-card-bundle"
    data-wp-bind--hidden="!state.wantsCard"
    hidden>
    <fieldset class="greeting-card-bundle__cards" data-wp-class--has-error="state.showCardError">
        <legend class="greeting-card-bundle__visually-hidden"><?php esc_html_e('Grusskarte wählen', 'greeting-card-block'); ?></legend>
        <?php
        // Gleiche Struktur wie der Slider-Block, damit main.css beide gleich
        // gestaltet: Pfeile und Punkte liegen NEBEN dem Swiper. Theme-Klasse
        // "slider" statt "cb-carousel-block" -- sonst würde das Carousel-Plugin
        // diesen Slider ein zweites Mal starten.
        ?>
        <div class="greeting-card-bundle__cards-slider slider" data-wp-init="callbacks.initSwiper">
            <div class="swiper">
                <div class="swiper-wrapper">
                    <?php foreach ($data['cards'] as $card) : ?>
                        <div class="swiper-slide">
                            <label
                                class="greeting-card-bundle__card button outline tile"
                                <?php echo wp_interactivity_data_wp_context(['cardId' => $card['productId']]); ?>
                                data-wp-class--is-selected="state.isCardSelected">
                                <input
                                    type="radio"
                                    class="greeting-card-bundle__visually-hidden"
                                    name="gcb-card"
                                    value="<?php echo esc_attr($card['productId']); ?>"
                                    data-wp-on--change="actions.selectCard"
                                    data-wp-bind--checked="state.isCardSelected" />
                                <img
                                    src="<?php echo esc_url($card['image']); ?>"
                                    alt="<?php echo esc_attr($card['name']); ?>" />
                                <span class="greeting-card-bundle__card-price"><?php echo wp_kses_post(wc_price($card['price'])); ?></span>
                            </label>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
            <div class="swiper-pagination"></div>
            <div class="swiper-button-prev"></div>
            <div class="swiper-button-next"></div>
        </div>
        <div
            class="wc-block-components-notice-banner is-error"
            role="alert"
            data-wp-bind--hidden="!state.showCardError"
            hidden>
            <div class="wc-block-components-notice-banner__content"><?php esc_html_e('Bitte wählen Sie eine Grusskarte aus.', 'greeting-card-block'); ?></div>
        </div>
    </fieldset>
</div>
