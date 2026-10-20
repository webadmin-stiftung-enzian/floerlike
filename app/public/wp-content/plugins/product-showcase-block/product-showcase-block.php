<?php

/**
 * Plugin Name:       Produkt-Schaufenster
 * Description:       Shop-Seite mit Zeilen je Produktkategorie als Slider und einem Filter aus Schlagwörtern (z. B. Anlässe). Siehe product-showcase-spec_v1.md.
 * Version:           0.1.0
 * Requires at least: 6.8
 * Requires PHP:      7.4
 * Requires Plugins:  woocommerce
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       product-showcase-block
 *
 * @package ProductShowcaseBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/includes/class-filter-tags.php';
require_once __DIR__ . '/includes/class-slider.php';
require_once __DIR__ . '/includes/class-blocks.php';
