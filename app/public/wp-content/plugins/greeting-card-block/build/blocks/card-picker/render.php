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

// Produkt der Seite -- bzw. in der Editor-Vorschau das Vorschau-Produkt
// (includes/class-preview.php).
$product = gcb_block_product($block);

if (! gcb_handles_product($product)) {
    return;
}

$data = gcb_prepare_state($product);

if (! $data['cardsEnabled'] || ! $data['isAvailable']) {
    return;
}

// Auf der Seite erst sichtbar, wenn eine Karte gewünscht ist. In der
// Editor-Vorschau immer sichtbar, damit man den Block sieht und anordnen kann.
$is_preview = gcb_is_editor_preview();
$visibility = $is_preview ? '' : 'data-wp-bind--hidden="!state.wantsCard" hidden';

// Pfeil-Symbol, wie Swiper es selbst in die Knöpfe einsetzt (swiper/modules/
// navigation.mjs). Im Editor läuft kein Swiper -- damit die Vorschau trotzdem
// genauso aussieht wie die Seite, wird es dort vom Server mitgeliefert.
$arrow_svg = '<svg class="swiper-navigation-icon" width="11" height="20" viewBox="0 0 11 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M0.38296 20.0762C0.111788 19.805 0.111788 19.3654 0.38296 19.0942L9.19758 10.2796L0.38296 1.46497C0.111788 1.19379 0.111788 0.754138 0.38296 0.482966C0.654131 0.211794 1.09379 0.211794 1.36496 0.482966L10.4341 9.55214C10.8359 9.9539 10.8359 10.6053 10.4341 11.007L1.36496 20.0762C1.09379 20.3474 0.654131 20.3474 0.38296 20.0762Z" fill="currentColor"/></svg>';

?>
<div
    <?php echo get_block_wrapper_attributes(); ?>
    data-wp-interactive="greeting-card-bundle"
    <?php echo $visibility; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- feste Zeichenkette ?>>
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
            <?php if ($is_preview) : ?>
                <?php
                // Editor-Vorschau: Punkte und Pfeile so, wie Swiper sie auf der
                // Seite erzeugt (erste Karte aktiv, "zurück" gesperrt).
                ?>
                <div class="swiper-pagination swiper-pagination-bullets swiper-pagination-horizontal">
                    <?php foreach ($data['cards'] as $index => $card) : ?>
                        <span class="swiper-pagination-bullet<?php echo 0 === $index ? ' swiper-pagination-bullet-active' : ''; ?>"></span>
                    <?php endforeach; ?>
                </div>
                <div class="swiper-button-prev swiper-button-disabled"><?php echo $arrow_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- feste Zeichenkette ?></div>
                <div class="swiper-button-next<?php echo count($data['cards']) < 2 ? ' swiper-button-disabled' : ''; ?>"><?php echo $arrow_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- feste Zeichenkette ?></div>
            <?php else : ?>
                <div class="swiper-pagination"></div>
                <div class="swiper-button-prev"></div>
                <div class="swiper-button-next"></div>
            <?php endif; ?>
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
