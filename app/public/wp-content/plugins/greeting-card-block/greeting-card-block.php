<?php

/**
 * Plugin Name:       greeting-card-block
 * Description:       Optionale Grusskarte zu einem Produkt (verknüpft über "Bundle-sells") mit eigener Auswahl-UI
 * Version:           0.3.0
 * Requires at least: 6.8
 * Requires PHP:      7.4
 * Author:            The WordPress Contributors
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       greeting-card-block
 *
 * @package GreetingCardBlock
 */

if (! defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}
/**
 * Registers the block(s) metadata from the `blocks-manifest.php` and registers the block type(s)
 * based on the registered block metadata. Behind the scenes, it registers also all assets so they can be enqueued
 * through the block editor in the corresponding context.
 *
 * @see https://make.wordpress.org/core/2025/03/13/more-efficient-block-type-registration-in-6-8/
 * @see https://make.wordpress.org/core/2024/10/17/new-block-type-registration-apis-to-improve-performance-in-wordpress-6-7/
 */

require_once __DIR__ . '/includes/class-integration.php';
require_once __DIR__ . '/includes/class-purchase-status.php';
require_once __DIR__ . '/includes/class-state.php';
require_once __DIR__ . '/includes/class-variation-fields.php';
require_once __DIR__ . '/includes/class-preview.php';
require_once __DIR__ . '/includes/class-store-api.php';
require_once __DIR__ . '/includes/class-checkout-blocks-integration.php';

function greeting_card_block_greeting_card_block_block_init()
{
	// Gemeinsamer Store aller Grusskarten-Blöcke (src/shared/store.js). Muss
	// VOR den Blöcken registriert sein: deren block.json nennt ihn unter
	// "viewScriptModule" mit dieser ID, und WordPress löst die ID beim
	// Registrieren des Blocks auf.
	$store_asset_file = __DIR__ . '/build/shared/store.asset.php';
	$store_asset      = file_exists($store_asset_file) ? require $store_asset_file : ['dependencies' => [], 'version' => false];

	wp_register_script_module(
		'greeting-card-block/store',
		plugins_url('build/shared/store.js', __FILE__),
		$store_asset['dependencies'],
		$store_asset['version']
	);

	// Alle Blöcke liegen in build/blocks/<name>/. Das Manifest benennt jeden
	// Block nach seinem Ordnernamen, WordPress setzt den Pfad als
	// <Basisordner>/<Ordnername> zusammen -- daher build/blocks als Basis.
	wp_register_block_types_from_metadata_collection(__DIR__ . '/build/blocks', __DIR__ . '/build/blocks-manifest.php');
}
add_action('init', 'greeting_card_block_greeting_card_block_block_init');

/**
 * Eigene Kategorie im Block-Einfügen-Menü, damit der Rahmen und seine Blöcke
 * zusammen auffindbar sind.
 */
add_filter('block_categories_all', function ($categories) {
	if (in_array('greeting-card', array_column($categories, 'slug'), true)) {
		return $categories;
	}

	$categories[] = [
		'slug'  => 'greeting-card',
		'title' => __('Grusskarte & Kauf', 'greeting-card-block'),
		'icon'  => null,
	];

	return $categories;
});
