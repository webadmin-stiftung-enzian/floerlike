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

// Einstellungen des Blocks (Seitenleiste im Editor).
$label       = trim((string) ($attributes['label'] ?? ''));
$label       = '' !== $label ? $label : __('Nachricht auf der Grusskarte:', 'greeting-card-block');
$placeholder = (string) ($attributes['placeholder'] ?? '');

// Höchstlänge: eingestellt, aber nie über 300 -- mehr nimmt der Server nicht
// an (class-integration.php kürzt hart auf 300). Sie geht in den State, damit
// Zähler und Eingabe im Browser (store.js, view.js) mit derselben Zahl rechnen.
$max_length = max(1, min(300, (int) ($attributes['maxLength'] ?? 300)));
wp_interactivity_state('greeting-card-bundle', ['maxLength' => $max_length]);

// Auf der Seite erst sichtbar, wenn eine Karte gewünscht ist. In der
// Editor-Vorschau immer sichtbar, damit man den Block sieht und anordnen kann.
$visibility = gcb_is_editor_preview() ? '' : 'data-wp-bind--hidden="!state.wantsCard" hidden';

?>
<div
    <?php echo get_block_wrapper_attributes(['class' => 'greeting-card-bundle__message']); ?>
    data-wp-interactive="greeting-card-bundle"
    <?php echo $visibility; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- feste Zeichenkette ?>>
    <label for="greetingCardMessage"><?php echo esc_html($label); ?></label>
    <div class="greeting-card-bundle__message-wrapper">
        <textarea
            id="greetingCardMessage"
            name="greeting_card_message"
            rows="4"
            cols="50"
            <?php if ('' !== $placeholder) : ?>placeholder="<?php echo esc_attr($placeholder); ?>"<?php endif; ?>
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
