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

		// Schema-Registrierung: Ohne diese Registrierung filtert die Store API
		// alle Extension-Daten aus dem Request, bevor der Hook sie sieht.
		woocommerce_store_api_register_endpoint_data(
			array(
				'endpoint'        => \Automattic\WooCommerce\StoreApi\Schemas\V1\CheckoutSchema::IDENTIFIER,
				'namespace'       => 'woo-order-ext',
				'schema_callback' => function () {
					return array(
						'newsletter_optin' => array(
							'description' => 'Newsletter opt-in',
							'type'        => 'boolean',
							'default'     => false,
							'context'     => array('view', 'edit'),
							'readonly'    => false,
						),
						'delivery-date' => array(
							'description' => 'Gewünschtes Lieferdatum (ISO: YYYY-MM-DD)',
							'type'        => array('string', 'null'),
							'default'     => '',
							'context'     => array('view', 'edit'),
							'readonly'    => false,
						),
					);
				},
				'schema_type'     => ARRAY_A,
			)
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

// Speichert Newsletter-Opt-in aus Extension-Daten in Order-Metadaten.
add_action(
	'woocommerce_store_api_checkout_update_order_from_request',
	function ($order, $request) {
		$extension_data = $request->get_param('extensions');
		if (isset($extension_data['woo-order-ext']['newsletter_optin'])) {
			$optin = $extension_data['woo-order-ext']['newsletter_optin'] ? '1' : '0';
			$order->update_meta_data('woo_order_ext_newsletter_optin', $optin);
			$order->save();
		}
	},
	10,
	2
);

// Validiert und speichert das Lieferdatum aus Extension-Daten.
add_action(
	'woocommerce_store_api_checkout_update_order_from_request',
	function ($order, $request) {
		$extension_data = $request->get_param('extensions');
		$date           = $extension_data['woo-order-ext']['delivery-date'] ?? '';

		if (empty($date)) {
			return;
		}

		$date      = sanitize_text_field($date);
		$timestamp = strtotime($date);

		if ($timestamp === false) {
			return;
		}

		if (date('N', $timestamp) === '7') {
			throw new \Automattic\WooCommerce\StoreApi\Exceptions\RouteException(
				'no_sunday_delivery',
				__('Sonntags ist leider keine Lieferung möglich.', 'woo-order-ext'),
				400
			);
		}

		$order->update_meta_data('woo-order-ext/delivery-date', $date);
		$order->save();
	},
	10,
	2
);

// =========================================================================
// Admin Order List: Lieferdatum-Spalte (HPOS + Legacy)
// =========================================================================

add_filter('woocommerce_shop_order_list_table_columns', 'WooOrderExt_add_delivery_date_column');
add_filter('manage_edit-shop_order_columns', 'WooOrderExt_add_delivery_date_column');

function WooOrderExt_add_delivery_date_column($columns)
{
	$reordered = array();
	foreach ($columns as $key => $value) {
		$reordered[$key] = $value;
		if ('order_status' === $key) {
			$reordered['delivery_date'] = __('Lieferdatum', 'woo-order-ext');
		}
	}
	return $reordered;
}

// HPOS: zweites Argument ist ein WC_Order-Objekt
add_action('woocommerce_shop_order_list_table_custom_column', 'WooOrderExt_render_delivery_date_column', 10, 2);
// Legacy: zweites Argument ist eine Post-ID (int)
add_action('manage_shop_order_posts_custom_column', 'WooOrderExt_render_delivery_date_column', 10, 2);

function WooOrderExt_render_delivery_date_column($column, $order_or_post_id)
{
	if ('delivery_date' !== $column) {
		return;
	}
	$order = is_object($order_or_post_id) ? $order_or_post_id : wc_get_order($order_or_post_id);
	if (! $order) {
		return;
	}
	$date = $order->get_meta('woo-order-ext/delivery-date');
	if ($date) {
		echo esc_html(date_i18n(get_option('date_format'), strtotime($date)));
	} else {
		echo '<span aria-hidden="true">—</span>';
	}
}

// =========================================================================
// E-Mail-Bestätigung: Lieferdatum im Meta-Bereich der E-Mail einfügen
// =========================================================================

add_action(
	'woocommerce_email_order_meta',
	function ($order, $sent_to_admin, $plain_text, $email) {
		$date = $order->get_meta('woo-order-ext/delivery-date');
		if (! $date) {
			return;
		}
		$formatted = date_i18n(get_option('date_format'), strtotime($date));
		if ($plain_text) {
			echo "\n" . __('Gewünschtes Lieferdatum', 'woo-order-ext') . ': ' . $formatted . "\n";
		} else {
			echo '<p><strong>' . esc_html__('Gewünschtes Lieferdatum', 'woo-order-ext') . ':</strong> ' . esc_html($formatted) . '</p>';
		}
	},
	10,
	4
);

// =========================================================================

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

	// Lieferdatum: kein woocommerce_register_additional_checkout_field nötig –
	// der Wert kommt via setExtensionData (extensions-Pfad) und wird im
	// woocommerce_store_api_checkout_update_order_from_request-Hook verarbeitet.

	// woocommerce_register_additional_checkout_field(
	// 	array(
	// 		'id'       => 'test/custom-select-input',
	// 		'label'    => "Test's example select input",
	// 		'location' => 'order',
	// 		'type'     => 'select',
	// 		'options'  => [
	// 			[
	// 				'label' => 'Option 1',
	// 				'value' => 'option1',
	// 			],
	// 			[
	// 				'label' => 'Option 2',
	// 				'value' => 'option2',
	// 			],
	// 		],
	// 	)
	// );
}

// Hook 'woocommerce_order_details_after_order_table': Zeigt Lieferdatum und Newsletter-Status auf Order received-Seite
add_action(
	'woocommerce_order_details_after_order_table',
	function ($order) {
		$delivery_date    = $order->get_meta('woo-order-ext/delivery-date');
		$newsletter_optin = $order->get_meta('woo_order_ext_newsletter_optin');

		if (! $delivery_date && $newsletter_optin === '') {
			return;
		}

		echo '<div style="margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 4px;">';

		if ($delivery_date) {
			$formatted = date_i18n(get_option('date_format'), strtotime($delivery_date));
			echo '<p style="margin: 4px 0;"><strong>' . esc_html__('Gewünschtes Lieferdatum', 'woo-order-ext') . ':</strong> ' . esc_html($formatted) . '</p>';
		}

		if ($newsletter_optin !== '') {
			echo '<p style="margin: 4px 0;"><strong>' . esc_html__('Newsletter', 'woo-order-ext') . ':</strong> ';
			echo $newsletter_optin ? esc_html__('Subscribed', 'woo-order-ext') : esc_html__('Not subscribed', 'woo-order-ext');
			echo '</p>';
		}

		echo '</div>';
	}
);
