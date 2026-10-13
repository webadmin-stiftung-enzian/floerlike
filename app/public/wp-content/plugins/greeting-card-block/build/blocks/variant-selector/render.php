<?php

/**
 * Block "Variantenauswahl" auf der Seite.
 *
 * Je Attribut eine Knopfgruppe. Technisch echte Radio-Buttons, nur als Knöpfe
 * gestaltet: "genau einer ausgewählt" garantiert der Browser, Pfeiltasten
 * wechseln die Auswahl, Screenreader lesen die Gruppe samt Überschrift
 * (legend) korrekt vor.
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

// Daten aufbereiten bzw. aus dem Zwischenspeicher holen (class-state.php).
$data               = gcb_prepare_state($product);
$variation_selector = $data['variationSelector'];

// Einfache Produkte haben keine Varianten. Ist nichts kaufbar, zeigt der
// Block "In den Warenkorb" den Lagerhinweis -- hier dann nichts.
if (! $variation_selector || ! $data['isAvailable']) {
    return;
}

?>
<div
    <?php echo get_block_wrapper_attributes(['class' => 'greeting-card-bundle__variations']); ?>
    data-wp-interactive="greeting-card-bundle"
    data-wp-watch="callbacks.syncNativePrice">
    <?php foreach ($variation_selector['attributes'] as $attribute) : ?>
        <fieldset class="greeting-card-bundle__variation-attribute">
            <legend class="greeting-card-bundle__variation-label"><?php echo esc_html($attribute['label']); ?></legend>
            <div class="greeting-card-bundle__options">
                <?php foreach ($attribute['options'] as $option) : ?>
                    <?php
                    // Aussehen über die Theme-Klassen "button outline" (main.css),
                    // wie jeder andere Button der Seite.
                    ?>
                    <label
                        class="greeting-card-bundle__option button outline"
                        <?php
                        // wp_interactivity_data_wp_context() escapt den JSON-Kontext
                        // korrekt fürs Attribut -- Attributwerte können Anführungs-
                        // zeichen enthalten (eigene, nicht-taxonomische Attribute).
                        echo wp_interactivity_data_wp_context(
                            [
                                'attributeName' => $attribute['name'],
                                'value'         => $option['value'],
                            ]
                        );
                        ?>
                        data-wp-class--is-selected="state.isOptionSelected"
                        data-wp-class--is-disabled="!state.isOptionAvailable">
                        <input
                            type="radio"
                            class="greeting-card-bundle__visually-hidden"
                            name="gcb-attribute-<?php echo esc_attr($attribute['name']); ?>"
                            value="<?php echo esc_attr($option['value']); ?>"
                            data-wp-on--change="actions.selectAttribute"
                            data-wp-bind--checked="state.isOptionSelected"
                            data-wp-bind--disabled="!state.isOptionAvailable" />
                        <?php
                        // Wert und darunter die Beschreibung der Variante (z. B.
                        // "ca. 35 cm Ø") -- zwei Elemente statt <br>, CSS stellt sie
                        // untereinander. Die Beschreibung kommt aus dem Admin: esc_html().
                        ?>
                        <span class="greeting-card-bundle__option-text">
                            <span class="greeting-card-bundle__option-label"><?php echo esc_html($option['label']); ?></span>
                            <?php if ('' !== $option['description']) : ?>
                                <span class="greeting-card-bundle__option-description"><?php echo esc_html($option['description']); ?></span>
                            <?php endif; ?>
                        </span>
                    </label>
                <?php endforeach; ?>
            </div>
        </fieldset>
    <?php endforeach; ?>

    <?php if (! $data['nativePriceSync']) : ?>
        <?php // Rückfall: der native Preis-Block kann nicht mitspringen (class-state.php). ?>
        <p
            class="greeting-card-bundle__variation-price"
            data-wp-text="state.matchedVariationPriceText"></p>
    <?php endif; ?>

    <div
        class="wc-block-components-notice-banner is-error"
        role="alert"
        data-wp-bind--hidden="!state.showVariationError"
        hidden>
        <div class="wc-block-components-notice-banner__content"><?php esc_html_e('Bitte wählen Sie eine Option.', 'greeting-card-block'); ?></div>
    </div>
    <div
        class="wc-block-components-notice-banner is-error"
        role="alert"
        data-wp-bind--hidden="!state.matchedVariationUnavailable"
        hidden>
        <div class="wc-block-components-notice-banner__content"><?php esc_html_e('Diese Auswahl ist leider nicht verfügbar.', 'greeting-card-block'); ?></div>
    </div>
</div>
