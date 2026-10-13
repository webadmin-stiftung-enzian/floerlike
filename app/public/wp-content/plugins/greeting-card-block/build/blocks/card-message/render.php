<?php

/**
 * Block "Grusstext" auf der Seite: Textfeld für die Nachricht auf der Karte.
 *
 * Pflicht, sobald eine Karte gewünscht ist (Spezifikation v4, Entscheidung
 * 14.3) -- die Prüfung steht im gemeinsamen Store (textMissing).
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

// Höchstlänge aus dem State (class-state.php) -- dieselbe Zahl, mit der auch
// der Zähler und view.js rechnen. Der Server kürzt unabhängig davon hart auf
// 300 (class-integration.php).
$max_length = (int) (wp_interactivity_state('greeting-card-bundle')['maxLength'] ?? 300);

// Auf der Seite erst sichtbar, wenn eine Karte gewünscht ist. In der
// Editor-Vorschau immer sichtbar, damit man den Block sieht und anordnen kann.
$visibility = gcb_is_editor_preview() ? '' : 'data-wp-bind--hidden="!state.wantsCard" hidden';

?>
<div
    <?php echo get_block_wrapper_attributes(['class' => 'greeting-card-bundle__message']); ?>
    data-wp-interactive="greeting-card-bundle"
    <?php echo $visibility; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- feste Zeichenkette ?>>
    <label for="greetingCardMessage"><?php esc_html_e('Nachricht auf der Grusskarte:', 'greeting-card-block'); ?></label>
    <div class="greeting-card-bundle__message-wrapper">
        <textarea
            id="greetingCardMessage"
            name="greeting_card_message"
            rows="4"
            cols="50"
            maxlength="<?php echo esc_attr($max_length); ?>"
            data-wp-on--input="actions.updateText"
            data-wp-class--has-error="state.showTextError"></textarea>
        <span class="greeting-card-bundle__char-counter" data-wp-text="state.charCounter"><?php
            echo esc_html(sprintf(
                /* translators: %d: verbleibende Zeichen */
                __('Zeichen verbleibend: %d', 'greeting-card-block'),
                $max_length
            ));
        ?></span>
    </div>
    <div
        class="wc-block-components-notice-banner is-error"
        role="alert"
        data-wp-bind--hidden="!state.showTextError"
        hidden>
        <div class="wc-block-components-notice-banner__content"><?php esc_html_e('Bitte geben Sie einen Grusstext ein.', 'greeting-card-block'); ?></div>
    </div>
</div>
