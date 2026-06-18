<?php

use Automattic\WooCommerce\Blocks\Integrations\IntegrationInterface;

define('WooOrderExt_VERSION', '0.1.0');

/**
 * Class for integrating with WooCommerce Blocks
 * Brueckenklasse zur Einbindung unserer Custom Blocks und JavaScripts in WooCommerce Blocks (Warenkorb & Checkout).
 */
class WooOrderExt_Blocks_Integration implements IntegrationInterface
{

	/**
	 * The name of the integration.
	 * Aufgabe: Gibt den eindeutigen internen Namen dieser Integration an WooCommerce zurueck.
	 *
	 * @return string
	 */
	public function get_name()
	{
		return 'woo-order-ext';
	}

	/**
	 * When called invokes any initialization/setup for the integration.
	 * Aufgabe: Der "Bootstrap" dieser Registrierungsklasse. Haelt alle Initialisierungsschritte
	 * fuer Skripte und Styles bereit.
	 */
	public function initialize()
	{
		$this->register_newsletter_block_frontend_scripts();
		$this->register_newsletter_block_editor_scripts();
		$this->register_newsletter_block_editor_styles();

		$this->register_greeting_card_block_frontend_scripts();
		$this->register_greeting_card_block_editor_scripts();
		$this->register_greeting_card_block_editor_styles();

		$this->register_main_integration();
		$this->register_editor_integration();
	}

	/**
	 * Registers the main JS file required to add filters and Slot/Fills.
	 * Aufgabe: Registriert das Haupt-JavaScript-Bundle (/build/index.js) fuer den Kassenbereich,
	 * laedt zugehoehrige Stylesheets und verknuepft die automatisch generierte PHP-Assetdatei
	 * fuer Skript-Abhaengigkeiten. Ermoeglicht die Nutzung von Slot/Fill-Erweiterungen.
	 */
	public function register_main_integration()
	{
		$script_path = '/build/index.js';
		$style_path  = '/build/style-index.css';

		$script_url = plugins_url($script_path, __FILE__);
		$style_url  = plugins_url($style_path, __FILE__);

		$script_asset_path = dirname(__FILE__) . '/build/index.asset.php';
		$script_asset      = file_exists($script_asset_path)
			? require $script_asset_path
			: array(
				'dependencies' => array(),
				'version'      => $this->get_file_version($script_path),
			);

		wp_enqueue_style(
			'woo-order-ext-blocks-integration',
			$style_url,
			[],
			$this->get_file_version($style_path)
		);

		wp_register_script(
			'woo-order-ext-blocks-integration',
			$script_url,
			$script_asset['dependencies'],
			$script_asset['version'],
			true
		);
		wp_set_script_translations(
			'woo-order-ext-blocks-integration',
			'woo-order-ext',
			dirname(__FILE__) . '/languages'
		);
	}

	public function register_editor_integration()
	{
		$script_path       = '/build/editor.js';
		$script_url        = plugins_url($script_path, __FILE__);
		$script_asset_path = dirname(__FILE__) . '/build/editor.asset.php';
		$script_asset      = file_exists($script_asset_path)
			? require $script_asset_path
			: array('dependencies' => array(), 'version' => $this->get_file_version($script_path));

		wp_register_script(
			'woo-order-ext-editor-integration',
			$script_url,
			$script_asset['dependencies'],
			$script_asset['version'],
			true
		);
	}

	/**
	 * Returns an array of script handles to enqueue in the frontend context.
	 * Aufgabe: Liefert die Skript-Schluessel (Handles) zurueck, die WooCommerce
	 * im Frontend-Shop (Cart/Checkout) laden soll.
	 *
	 * @return string[]
	 */
	public function get_script_handles()
	{
		return array(
			'woo-order-ext-blocks-integration',
			'woo-order-ext-checkout-newsletter-subscription-block-frontend',
			'woo-order-ext-checkout-greeting-card-block-frontend',
		);
	}

	/**
	 * Returns an array of script handles to enqueue in the editor context.
	 * Aufgabe: Liefert die Skript-Schluessel zurueck, die WooCommerce im
	 * Gutenberg-Block-Editor (Backend) laden soll, damit Admins den Block konfigurieren koennen.
	 *
	 * @return string[]
	 */
	public function get_editor_script_handles()
	{
		return array(
			'woo-order-ext-editor-integration',
			'woo-order-ext-checkout-newsletter-subscription-block-editor',
			'woo-order-ext-checkout-greeting-card-block-editor',
		);
	}

	/**
	 * An array of key, value pairs of data made available to the block on the client side.
	 * Aufgabe: Gibt PHP-Daten an das Client-JavaScript weiter (unter window.wc.wcSettings verfügbar).
	 * Perfekt fuer Lokalisierungen, Server-Zustaende oder Default-Texte.
	 *
	 * @return array
	 */
	public function get_script_data()
	{
		$data = array(
			'woo-order-ext-active' => true,
			'example-data' => __('This is some example data from the server', 'woo-order-ext'),
			'optInDefaultText' => __('I want to receive updates about products and promotions.', 'woo-order-ext'),
		);

		return $data;
	}

	/**
	 * Aufgabe: Registriert und laedt Stylesheets fuer die Darstellung des
	 * Newsletter-Abonnement-Blocks innerhalb des Editoren-Backends (Gutenberg).
	 */
	public function register_newsletter_block_editor_styles()
	{
		$style_path  = '/build/style-woo-order-ext-checkout-newsletter-subscription-block.css';

		$style_url  = plugins_url($style_path, __FILE__);
		wp_enqueue_style(
			'woo-order-ext-checkout-newsletter-subscription-block',
			$style_url,
			[],
			$this->get_file_version($style_path)
		);
	}

	public function register_greeting_card_block_editor_styles()
	{
		$style_path = '/build/style-woo-order-ext-checkout-greeting-card-block.css';
		$style_url  = plugins_url($style_path, __FILE__);

		wp_enqueue_style(
			'woo-order-ext-checkout-greeting-card-block',
			$style_url,
			[],
			$this->get_file_version($style_path)
		);
	}

	/**
	 * Aufgabe: Registriert das JavaScript-Bundle, das den Newsletter-Block im
	 * Gutenberg-Backend steuert und editierbar macht.
	 */
	public function register_newsletter_block_editor_scripts()
	{
		$script_path       = '/build/woo-order-ext-checkout-newsletter-subscription-block.js';
		$script_url        = plugins_url($script_path, __FILE__);
		$script_asset_path = dirname(__FILE__) . '/build/woo-order-ext-checkout-newsletter-subscription-block.asset.php';
		$script_asset      = file_exists($script_asset_path)
			? require $script_asset_path
			: array(
				'dependencies' => array(),
				'version'      => $this->get_file_version($script_path),
			);

		wp_register_script(
			'woo-order-ext-checkout-newsletter-subscription-block-editor',
			$script_url,
			$script_asset['dependencies'],
			$script_asset['version'],
			true
		);

		wp_set_script_translations(
			'woo-order-ext-newsletter-block-editor', // script handle
			'woo-order-ext', // text domain
			dirname(__FILE__) . '/languages'
		);
	}

	public function register_greeting_card_block_editor_scripts()
	{
		$script_path       = '/build/woo-order-ext-checkout-greeting-card-block.js';
		$script_url        = plugins_url($script_path, __FILE__);
		$script_asset_path = dirname(__FILE__) . '/build/woo-order-ext-checkout-greeting-card-block.asset.php';
		$script_asset      = file_exists($script_asset_path)
			? require $script_asset_path
			: array(
				'dependencies' => array(),
				'version'      => $this->get_file_version($script_path),
			);

		wp_register_script(
			'woo-order-ext-checkout-greeting-card-block-editor',
			$script_url,
			$script_asset['dependencies'],
			$script_asset['version'],
			true
		);

		wp_set_script_translations(
			'woo-order-ext-checkout-greeting-card-block-editor',
			'woo-order-ext',
			dirname(__FILE__) . '/languages'
		);
	}

	/**
	 * Aufgabe: Registriert das JavaScript-Bundle fuer die Frontend-Logik des Newsletter-Blocks,
	 * welches ausgefuehrt wird, wenn Kunden das Formular ansehen oder ausfuellen.
	 */
	public function register_newsletter_block_frontend_scripts()
	{
		$script_path       = '/build/woo-order-ext-checkout-newsletter-subscription-block-frontend.js';
		$script_url        = plugins_url($script_path, __FILE__);
		$script_asset_path = dirname(__FILE__) . '/build/woo-order-ext-checkout-newsletter-subscription-block-frontend.asset.php';
		$script_asset      = file_exists($script_asset_path)
			? require $script_asset_path
			: array(
				'dependencies' => array(),
				'version'      => $this->get_file_version($script_asset_path),
			);

		wp_register_script(
			'woo-order-ext-checkout-newsletter-subscription-block-frontend',
			$script_url,
			$script_asset['dependencies'],
			$script_asset['version'],
			true
		);
		wp_set_script_translations(
			'woo-order-ext-checkout-newsletter-subscription-block-frontend', // script handle
			'woo-order-ext', // text domain
			dirname(__FILE__) . '/languages'
		);
	}

	public function register_greeting_card_block_frontend_scripts()
	{
		$script_path       = '/build/woo-order-ext-checkout-greeting-card-block-frontend.js';
		$script_url        = plugins_url($script_path, __FILE__);
		$script_asset_path = dirname(__FILE__) . '/build/woo-order-ext-checkout-greeting-card-block-frontend.asset.php';
		$script_asset      = file_exists($script_asset_path)
			? require $script_asset_path
			: array(
				'dependencies' => array(),
				'version'      => $this->get_file_version($script_asset_path),
			);

		wp_register_script(
			'woo-order-ext-checkout-greeting-card-block-frontend',
			$script_url,
			$script_asset['dependencies'],
			$script_asset['version'],
			true
		);

		wp_set_script_translations(
			'woo-order-ext-checkout-greeting-card-block-frontend',
			'woo-order-ext',
			dirname(__FILE__) . '/languages'
		);
	}

	/**
	 * Get the file modified time as a cache buster if we're in dev mode.
	 * Aufgabe: Verhindert Browser-Caching im Entwicklungs-Modus (SCRIPT_DEBUG=true),
	 * indem der Timestamp der Dateiaenderung an die Dateiversion angehaengt wird.
	 *
	 * @param string $file Local path to the file.
	 * @return string The cache buster value to use for the given file.
	 */
	protected function get_file_version($file)
	{
		if (defined('SCRIPT_DEBUG') && SCRIPT_DEBUG && file_exists($file)) {
			return filemtime($file);
		}
		return WooOrderExt_VERSION;
	}
}
