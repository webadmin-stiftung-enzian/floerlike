<?php

/**
 * Rahmen "Grusskarten-Kauf" auf der Seite.
 *
 * Wird NACH seinen Innenblöcken gerendert; $content enthält deren fertiges
 * Markup. Ob der Satz vollständig ist, hat class-purchase-status.php schon
 * vorher ermittelt (render_block_data), damit die Innenblöcke es kennen.
 *
 * Verfügbare Variablen: $attributes, $content, $block (WP_Block).
 *
 * @package GreetingCardBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

$product = wc_get_product(absint($block->context['postId'] ?? get_the_ID()));

// Bundles, gruppierte und externe Produkte: dafür ist der Rahmen nicht
// zuständig, die native WooCommerce-Form bleibt (siehe class-integration.php).
if (! gcb_handles_product($product)) {
    return;
}

$status         = gcb_get_purchase_status($product);
$can_edit_theme = current_user_can('edit_theme_options');

// Ohne "In den Warenkorb" (bzw. ohne Variantenauswahl bei variablen
// Produkten) ist mit diesem Rahmen kein Kauf möglich. Dann gar nichts
// ausgeben -- die native WooCommerce-Form übernimmt (Spezifikation v4, 5.2 und
// 8). Kund:innen sehen nichts Halbfertiges; wer das Template bearbeiten darf,
// bekommt einen Hinweis, warum hier nichts erscheint.
if (! $status || ! $status['canPurchase']) {
    if ($status && $can_edit_theme) {
        printf(
            '<div class="wc-block-components-notice-banner is-warning" role="note"><div class="wc-block-components-notice-banner__content">%s</div></div>',
            esc_html(sprintf(
                /* translators: %s: Liste fehlender Blöcke */
                __('Hinweis für Redakteur:innen: Der Grusskarten-Kauf ist unvollständig – es fehlt %s. Kund:innen sehen stattdessen das normale WooCommerce-Formular.', 'greeting-card-block'),
                gcb_block_titles($status['missingPurchase'])
            ))
        );
    }
    return;
}

?>
<div <?php echo get_block_wrapper_attributes(); ?>>
    <?php if ($can_edit_theme && ! empty($status['missingCards']) && gcb_is_card_parent($product)) : ?>
        <div class="wc-block-components-notice-banner is-warning" role="note">
            <div class="wc-block-components-notice-banner__content">
                <?php
                echo esc_html(sprintf(
                    /* translators: %s: Liste fehlender Blöcke */
                    __('Hinweis für Redakteur:innen: Grusskarten sind aus – es fehlt %s.', 'greeting-card-block'),
                    gcb_block_titles($status['missingCards'])
                ));
                ?>
            </div>
        </div>
    <?php endif; ?>
    <?php
    // $content = bereits gerendertes Markup der Innenblöcke (unsere fünf
    // Blöcke und alles, was im Editor dazwischen gesetzt wurde). Es wurde von
    // den jeweiligen Blöcken selbst escaped/aufgebaut und wird hier wie bei
    // core/group unverändert ausgegeben.
    echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
    ?>
</div>
