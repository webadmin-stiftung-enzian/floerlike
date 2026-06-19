<?php

/**
 * Plugin Name:     Woo Order Ext
 * Version:         0.1.0
 * Author:          The WordPress Contributors
 * License:         GPL-2.0-or-later
 * License URI:     https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:     woo-order-ext
 *
 * @package         create-block
 */

/**
 * Hook 'init': Registriert den Newsletter-Block im WordPress-Editor auf Basis seiner block.json.
 */

defined('ABSPATH') || exit;

add_action(
	'init',
	function () {
		register_block_type_from_metadata(__DIR__ . '/src/js/checkout-newsletter-subscription-block');
		register_block_type_from_metadata(
			__DIR__ . '/src/js/checkout-greeting-card-block'
		);
	}
);

/**
 * Hook 'woocommerce_blocks_loaded': Integriert das Plugin in die moderne WooCommerce-Blocks-Umgebung,
 * sobald die notwendigen Blocks-APIs geladen wurden. Hierdurch wird unsere Integrationsklasse
 * sowohl fuer den Cart- als auch den Checkout-Block registriert.
 */
add_action(
	'woocommerce_blocks_loaded',
	function () {
		require_once __DIR__ . '/woo-order-ext-blocks-integration.php';

		// Registrierung der Integration fuer den Warenkorb-Block (Cart)
		add_action(
			'woocommerce_blocks_cart_block_registration',
			function ($integration_registry) {
				$integration_registry->register(new WooOrderExt_Blocks_Integration());
			}
		);

		// Registrierung der Integration fuer den Kassenbereich-Block (Checkout)
		add_action(
			'woocommerce_blocks_checkout_block_registration',
			function ($integration_registry) {
				$integration_registry->register(new WooOrderExt_Blocks_Integration());
			}
		);
	}
);

/**
 * Registers the slug as a block category with WordPress.
 * Erstellt eine neue Block-Kategorie "WooOrderExt Blocks" im Gutenberg-Editor.
 */
function register_WooOrderExt_block_category($categories)
{
	return array_merge(
		$categories,
		[
			[
				'slug'  => 'woo-order-ext',
				'title' => __('WooOrderExt Blocks', 'woo-order-ext'),
			],
		]
	);
}

// Hook 'block_categories_all': Haengt unsere eigene Kategorie in die Liste aller Block-Kategorien ein.
add_action('block_categories_all', 'register_WooOrderExt_block_category', 10, 2);


// Hook 'woocommerce_init': Registriert alle benutzerdefinierten Checkout-Felder in WooCommerce.
add_action('woocommerce_init', 'WooOrderExt_register_custom_checkout_fields');

/**
 * Registers custom checkout fields for the WooCommerce checkout form.
 * Registriert drei zusaetzliche Felder in der WooCommerce Store-API, die automatisch im Blocks-Checkout erscheinen.
 *
 * @return void
 * @throws Exception If there is an error during the registration of the checkout fields.
 */
function WooOrderExt_register_custom_checkout_fields()
{

	if (! function_exists('woocommerce_register_additional_checkout_field')) {
		return;
	}

	// 1. Eine Checkbox im Kontakt-Bereich (z.B. AGB/Newsletter)
	// woocommerce_register_additional_checkout_field(
	// 	array(
	// 		'id'       => 'woo-order-ext/custom-checkbox',
	// 		'label'    => 'Check this box to see a custom field on the order.',
	// 		'location' => 'contact',
	// 		'type'     => 'checkbox',
	// 	)
	// );

	// 2. Ein herkoemmliches Textfeld im Adresszeilen-Bereich
	// woocommerce_register_additional_checkout_field(
	// 	array(
	// 		'id'       => 'woo-order-ext/custom-text-input',
	// 		'label'    => "WooOrderExt's example text input",
	// 		'location' => 'address',
	// 		'type'     => 'text',
	// 	)
	// );

	/**
	 * Sanitizes the value of the custom text input field. For demo purposes we will just turn it to all caps.
	 * Hook 'woocommerce_sanitize_additional_field': Validiert/Bereinigt den eingegebenen Wert fuer das Textfeld.
	 * In diesem Beispiel wird der eingegebene Text komplett in Grossbuchstaben umgewandelt.
	 */
	add_action(
		'woocommerce_sanitize_additional_field',
		function ($value, $key) {
			if ('woo-order-ext/custom-text-input' === $key) {
				return strtoupper($value);
			}
			return $value;
		},
		10,
		2
	);

	/**
	 * Validates the custom text input field. For demo purposes we will not accept the string 'INVALID'.
	 * Hook 'woocommerce_blocks_validate_location_address_fields': Serverseitige Validierung der Adress-Zusatzfelder.
	 * Verhindert das Abschicken der Bestellung, wenn der Text exakt 'INVALID' lautet.
	 */
	add_action(
		'woocommerce_blocks_validate_location_address_fields',
		function (\WP_Error $errors, $fields) {
			if (isset($fields['woo-order-ext/custom-text-input']) && 'INVALID' === $fields['woo-order-ext/custom-text-input']) {
				$errors->add('invalid_text_detected', 'Please ensure your custom text input is not "INVALID".');
			}
		},
		10,
		2
	);

	// 3. Ein weiteres Textfeld im Adresszeilen-Bereich, aber mit einem speziellen Typ "string", damit es automatisch im Blocks-Checkout gerendert wird.
	// woocommerce_register_additional_checkout_field(
	// 	array(
	// 		'id'       => 'woo-order-ext/subscribe-newsletter',
	// 		'label'    => "Möchten Sie unseren Newsletter abonnieren?",
	// 		'location' => 'order',
	// 		'type'     => 'string', // Nur als Datentyp registrieren, ohne Location (kein automatisches Rendering)
	// 	)
	// );

	woocommerce_register_additional_checkout_field(
		array(
			'id'       => 'woo-order-ext/delivery-date',
			'label'    => 'Gewünschtes Lieferdatum',
			'type'     => 'string', // Nur als Datentyp registrieren, ohne Location (kein automatisches Rendering)
		)
	);

	add_action(
		'woocommerce_blocks_validate_location_address_fields', // Oder ein anderer Checkout-Validierungs-Hook
		function (\WP_Error $errors, $fields) {
			if (isset($fields['woo-order-ext/delivery-date'])) {
				$chosen_date = $fields['woo-order-ext/delivery-date'];
				$day_of_week = date('N', strtotime($chosen_date));

				// Wenn der gewählte Tag ein Sonntag (7) ist, Fehlermeldung ausgeben
				if ('7' === $day_of_week) {
					$errors->add('no_sunday_delivery', 'Sonntags ist leider keine Lieferung möglich.');
				}
			}
		},
		10,
		2
	);

	woocommerce_register_additional_checkout_field(
		array(
			'id'       => 'test/custom-select-input',
			'label'    => "Test's example select input",
			'location' => 'order',
			'type'     => 'select',
			'options'  => [
				[
					'label' => 'Option 1',
					'value' => 'option1',
				],
				[
					'label' => 'Option 2',
					'value' => 'option2',
				],
			],
		)
	);
}
