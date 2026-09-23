<?php

/**
 * Einklinken in Warenkorb-, Mini-Cart- und Checkout-Block.
 *
 * Diese Blöcke laden ihre Skripte selbst; eigenes Frontend-JS kommt nur über
 * die offizielle IntegrationInterface hinein. Der passende Zeitpunkt sind die
 * Hooks `woocommerce_blocks_{cart|mini-cart|checkout}_block_registration`, die
 * WooCommerce beim Initialisieren der jeweiligen Integration-Registry feuert
 * (siehe IntegrationRegistry::initialize()).
 *
 * WICHTIG: Diese Hooks werden hier BEIM LADEN der Datei registriert, nicht erst
 * auf `woocommerce_blocks_loaded`. Die Registry kann bereits initialisiert sein,
 * bevor dieser Hook feuert — dann käme die Registrierung zu spät und das Skript
 * würde nie ausgeliefert.
 *
 * Die Integrationsklasse selbst lässt sich dagegen erst definieren, wenn die
 * IntegrationInterface geladen ist. Deshalb entsteht sie beim ersten Aufruf
 * innerhalb des Registrierungs-Callbacks.
 *
 * @package GreetingCardBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Liefert die Integrationsinstanz und definiert die Klasse beim ersten Aufruf.
 *
 * @return IntegrationInterface|null Null, wenn die Blocks-Infrastruktur fehlt.
 */
function gcb_get_checkout_blocks_integration()
{
    if (! interface_exists('Automattic\WooCommerce\Blocks\Integrations\IntegrationInterface')) {
        return null;
    }

    if (! class_exists('GCB_Checkout_Blocks_Integration')) {
        /**
         * Stellt Skript und Style für die Warenkorb-Darstellung bereit.
         */
        class GCB_Checkout_Blocks_Integration implements Automattic\WooCommerce\Blocks\Integrations\IntegrationInterface
        {
            public function get_name()
            {
                return 'greeting-card-block';
            }

            public function initialize()
            {
                $plugin_dir = dirname(__DIR__);
                $plugin_url = plugins_url('', $plugin_dir . '/greeting-card-block.php');

                $script_path = $plugin_dir . '/assets/js/checkout-blocks.js';
                $style_path  = $plugin_dir . '/assets/css/checkout-blocks.css';

                // Dateizeit als Version: der Browser holt sich die Datei nach
                // jeder Änderung neu, ohne dass die Plugin-Version hochgezählt
                // werden muss.
                wp_register_script(
                    'gcb-checkout-blocks',
                    $plugin_url . '/assets/js/checkout-blocks.js',
                    // 'wc-blocks-checkout' stellt window.wc.blocksCheckout samt
                    // registerCheckoutFilters bereit.
                    ['wc-blocks-checkout'],
                    file_exists($script_path) ? (string) filemtime($script_path) : '1',
                    true
                );

                wp_register_style(
                    'gcb-checkout-blocks',
                    $plugin_url . '/assets/css/checkout-blocks.css',
                    [],
                    file_exists($style_path) ? (string) filemtime($style_path) : '1'
                );

                wp_enqueue_style('gcb-checkout-blocks');
            }

            public function get_script_handles()
            {
                return ['gcb-checkout-blocks'];
            }

            public function get_editor_script_handles()
            {
                return [];
            }

            public function get_script_data()
            {
                return [];
            }
        }
    }

    static $instance = null;

    if (null === $instance) {
        $instance = new GCB_Checkout_Blocks_Integration();
    }

    return $instance;
}

foreach (['cart', 'mini-cart', 'checkout'] as $gcb_block) {
    add_action(
        'woocommerce_blocks_' . $gcb_block . '_block_registration',
        function ($registry) {
            $integration = gcb_get_checkout_blocks_integration();

            if ($integration) {
                $registry->register($integration);
            }
        }
    );
}

unset($gcb_block);
