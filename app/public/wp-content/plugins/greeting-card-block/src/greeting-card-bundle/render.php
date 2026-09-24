<?php

/**
 * PHP file to use when rendering the block type on the server to show on the front end.
 *
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @see https://github.com/WordPress/gutenberg/blob/trunk/docs/reference-guides/block-api/block-metadata.md#render
 */

if (! defined('ABSPATH')) {
	exit;
}

$product_id = absint($block->context['postId'] ?? get_the_ID());
$product    = wc_get_product($product_id);

// Gemeinsames Zuständigkeits-Prädikat (siehe includes/class-integration.php):
// unser Block ist der Warenkorb-Button für alle einfachen und variablen
// Produkte. Die Kartenauswahl erscheint nur, wenn unter "Bundle-sells" Karten
// verknüpft sind. Für Bundle-, Grouped- und External-Produkte bleibt die native
// Add-to-Cart-Form zuständig — siehe die Koexistenz-Weiche dort.
if (! gcb_handles_product($product)) {
	return;
}

$cards = [];
foreach (gcb_get_card_ids($product) as $card_id) {
	$card = wc_get_product($card_id);

	$cards[] = [
		'productId' => $card->get_id(),
		'name'      => $card->get_name(),
		'price'     => $card->get_price(),
		'image'     => wp_get_attachment_image_url($card->get_image_id(), 'woocommerce_thumbnail')
			?: wc_placeholder_img_src(),
	];
}

// Variantenauswahl für variable Produkte (z. B. Strauss-Grösse). Einfache
// Produkte haben keine, dann bleibt dieser ganze Abschnitt aus und der Block
// legt direkt die Produkt-ID in den Warenkorb.
//
// Zur Preisanzeige siehe weiter unten ($native_price_sync): im Normalfall
// springt der native Preis-Block (woocommerce/product-price) mit der Auswahl
// um; `priceText` ist nur die Rückfallebene für eine eigene Preiszeile.
$variation_selector = null;

if ($product->is_type('variable')) {
	/** @var WC_Product_Variable $variable_product */
	$variable_product = $product;

	$variation_attributes = [];
	foreach ($variable_product->get_variation_attributes() as $raw_name => $raw_options) {
		$taxonomy    = wc_variation_attribute_name($raw_name);
		$is_taxonomy = taxonomy_exists($taxonomy);
		$options     = [];

		foreach ($raw_options as $option) {
			if ($is_taxonomy) {
				$term  = get_term_by('slug', $option, $taxonomy);
				$label = $term ? $term->name : $option;
			} else {
				$label = $option;
			}
			$options[] = ['value' => $option, 'label' => $label];
		}

		$variation_attributes[] = [
			// Derselbe Schlüssel, den get_available_variations() nach dem
			// "attribute_"-Präfix verwendet: bei Taxonomie-Attributen ohnehin
			// "pa_…", bei eigenen Attributen aber der bereinigte Name ("Farbe"
			// -> "farbe"). Mit dem Rohnamen fände view.js dort nie eine Variante.
			'name'    => sanitize_title($raw_name),
			'label'   => wc_attribute_label($raw_name, $product),
			'options' => $options,
		];
	}

	$variations = [];
	foreach ($variable_product->get_available_variations() as $variation_data) {
		// WC liefert Attribut-Keys als "attribute_{name}" -- Präfix entfernen,
		// damit sie zu den Keys in $variation_attributes/selectedAttributes passen.
		$variation_attrs = [];
		foreach ($variation_data['attributes'] as $key => $value) {
			$variation_attrs[substr($key, strlen('attribute_'))] = $value;
		}

		$variations[] = [
			'variationId' => $variation_data['variation_id'],
			'attributes'  => $variation_attrs,
			// Reiner Text (keine Preis-HTML-Spans) fürs Interactivity-API-
			// data-wp-text -- siehe Hintergrund zur Preisanzeige oben.
			// html_entity_decode ist nötig, weil wc_price() Währungssymbole/
			// -leerzeichen als HTML-Entities ausgibt (z. B. "&#67;&#72;&#70;"
			// für "CHF", "&nbsp;"); data-wp-text setzt textContent und würde
			// diese Entities sonst wörtlich anzeigen statt sie darzustellen.
			'priceText'   => html_entity_decode(
				wp_strip_all_tags($variation_data['price_html']),
				ENT_QUOTES,
				'UTF-8'
			),
			'inStock'     => (bool) $variation_data['is_in_stock'],
			// Deaktiviert o. Ä.: taucht in der Auswahl auf, lässt sich aber
			// nicht kaufen (view.js blockiert dann den Button).
			'purchasable' => (bool) $variation_data['is_purchasable'],
		];
	}

	// Nur Attributwerte anbieten, zu denen es mindestens eine verfügbare
	// Variante gibt. get_variation_attributes() liefert ALLE Werte, auch solche,
	// deren Variante WooCommerce aus get_available_variations() aussortiert hat
	// (z. B. Variante ohne Preis). Ohne diesen Filter liesse sich z. B. "gross"
	// wählen, obwohl es dazu nichts zu kaufen gibt.
	//
	// Ein leerer Wert auf einer Variante heisst "beliebig" (WooCommerce-
	// Konvention) -- dann bleiben für dieses Attribut alle Werte erlaubt.
	foreach ($variation_attributes as $index => $attribute) {
		$used = array_column(array_column($variations, 'attributes'), $attribute['name']);

		if (in_array('', $used, true)) {
			continue;
		}

		$variation_attributes[$index]['options'] = array_values(array_filter(
			$attribute['options'],
			static function ($option) use ($used) {
				return in_array($option['value'], $used, true);
			}
		));
	}

	$variation_selector = [
		'name'       => $product->get_name(),
		'attributes' => $variation_attributes,
		'variations' => $variations,
	];
}

// Vorauswahl wie in der nativen Form: die im Admin gesetzten Standardwerte
// ("Standard-Formularwerte" der Variationen), sofern sie noch angeboten werden.
// Hat ein Attribut nur einen einzigen Wert, gibt es nichts zu wählen -- dann
// wird er ebenfalls vorausgewählt.
$selected_attributes = [];

if ($variation_selector) {
	$defaults = $variable_product->get_default_attributes();

	foreach ($variation_selector['attributes'] as $attribute) {
		$offered = array_column($attribute['options'], 'value');
		$default = $defaults[$attribute['name']] ?? '';

		if ('' !== $default && in_array($default, $offered, true)) {
			$selected_attributes[$attribute['name']] = $default;
		} elseif (1 === count($offered)) {
			$selected_attributes[$attribute['name']] = $offered[0];
		} else {
			$selected_attributes[$attribute['name']] = '';
		}
	}
}

// Den nativen Preis-Block mit der Auswahl umspringen lassen.
//
// Der Block woocommerce/product-price ist bei variablen Produkten mit
// unterschiedlichen Preisen bereits interaktiv: er zeigt `price_html` von
// `state.productInContext` aus dem Store `woocommerce/products` -- ist dort
// `variationId` gesetzt, den Preis dieser Variante, sonst die Preisspanne.
// WooCommerce legt `productId` im Single-Product-Template selbst an, die
// Varianten lädt aber nur sein eigener "Add to Cart with Options"-Block, den
// unser Block ersetzt. Deshalb laden wir sie hier mit derselben Funktion nach;
// view.js setzt dann `variationId` (callbacks.syncNativePrice).
//
// ACHTUNG: WooCommerce kennzeichnet diese Schnittstelle ausdrücklich als
// experimentell (Zustimmungstext unten ist Pflicht). Fällt die Funktion bei
// einem Update weg oder lehnt sie den Text ab, zeigt der Block automatisch
// wieder seine eigene Preiszeile an. Nach WooCommerce-Updates prüfen, ob der
// Preis beim Wechsel der Variante noch mitspringt.
$native_price_sync = false;

if ($variation_selector && function_exists('wc_interactivity_api_load_variations')) {
	try {
		wc_interactivity_api_load_variations(
			'I acknowledge that using experimental APIs means my theme or plugin will inevitably break in the next version of WooCommerce',
			$product_id
		);
		$native_price_sync = true;
	} catch (\Throwable $e) {
		$native_price_sync = false;
	}
}

// Ist überhaupt etwas kaufbar? Die native Form blendet sich bei ausverkauften
// oder nicht kaufbaren Produkten selbst aus; da unser Block sie ersetzt, muss
// er das hier nachbilden — sonst bietet er einen Button an, dessen Request
// garantiert scheitert.
if ($variation_selector) {
	$is_available = (bool) array_filter(
		$variation_selector['variations'],
		static function ($variation) {
			return $variation['inStock'] && $variation['purchasable'];
		}
	);
} else {
	$is_available = $product->is_purchasable() && $product->is_in_stock();
}

if (! $is_available) {
	// wc_get_stock_html() liefert den nativen Lagerhinweis ("Nicht vorrätig"),
	// sofern WooCommerce einen hat; sonst ein eigener, allgemeiner Hinweis.
	$stock_html = $variation_selector ? '' : wc_get_stock_html($product);
?>
	<div <?php echo get_block_wrapper_attributes(); ?>>
		<?php if ('' !== trim($stock_html)) : ?>
			<?php echo wp_kses_post($stock_html); ?>
		<?php else : ?>
			<p class="stock out-of-stock"><?php esc_html_e('Dieses Produkt ist derzeit nicht verfügbar.', 'greeting-card-block'); ?></p>
		<?php endif; ?>
	</div>
<?php
	return;
}

wp_interactivity_state('greeting-card-bundle', [
	'productId'          => $product_id,
	'cards'              => $cards,
	'nonce'              => wp_create_nonce('wc_store_api'),
	// rest_url() statt hartkodiertem Pfad: funktioniert auch bei Unterverzeichnis-
	// Installationen oder abweichender REST-API-Basis.
	'batchUrl'           => rest_url('wc/store/v1/batch'),
	'wantsCard'          => false,
	'selectedCardId'     => 0,
	'text'               => '',
	'quantity'           => 1,
	'submitAttempted'    => false,
	'isAdding'           => false,
	'errorMessage'       => '',
	'variationSelector'  => $variation_selector,
	'selectedAttributes' => $selected_attributes,
	'nativePriceSync'    => $native_price_sync,

	// Serverseitige Gegenstücke zu den gleichnamigen Gettern in view.js.
	//
	// Ohne sie wären diese Werte beim Rendern auf dem Server undefiniert:
	// "!state.isOptionAvailable" ergäbe true, und jeder Knopf käme ausgegraut
	// und gesperrt beim Browser an, bis das Skript geladen ist. WordPress wertet
	// Closures im State beim Rendern aus und überlässt sie danach den
	// JS-Gettern (derivedStateClosures) -- dasselbe Muster wie WooCommerces
	// ProductsStore. Die Logik muss mit view.js übereinstimmen.
	'isOptionSelected'   => static function () {
		$context = wp_interactivity_get_context();
		$state   = wp_interactivity_state('greeting-card-bundle');

		return ($state['selectedAttributes'][$context['attributeName']] ?? '') === ($context['value'] ?? null);
	},
	'isOptionAvailable'  => static function () {
		$context   = wp_interactivity_get_context();
		$state     = wp_interactivity_state('greeting-card-bundle');
		$candidate = array_merge(
			$state['selectedAttributes'] ?? [],
			[$context['attributeName'] => $context['value']]
		);

		foreach ($state['variationSelector']['variations'] ?? [] as $variation) {
			if (! $variation['inStock'] || ! $variation['purchasable']) {
				continue;
			}

			$matches = true;
			foreach ($variation['attributes'] as $name => $value) {
				$wanted = $candidate[$name] ?? '';
				if ('' !== $value && '' !== $wanted && $wanted !== $value) {
					$matches = false;
					break;
				}
			}

			if ($matches) {
				return true;
			}
		}

		return false;
	},
]);

?>
<div
	<?php echo get_block_wrapper_attributes(); ?>
	data-wp-interactive="greeting-card-bundle"
	data-wp-watch="callbacks.syncNativePrice">
	<?php if ($variation_selector) : ?>
		<div class="greeting-card-bundle__variations">
			<?php foreach ($variation_selector['attributes'] as $attribute) : ?>
				<?php
				// Echte Radio-Buttons, nur als Knöpfe gestaltet: damit ist
				// "genau einer ausgewählt" vom Browser garantiert, Pfeiltasten
				// wechseln die Auswahl, und Screenreader lesen die Gruppe samt
				// Überschrift (legend) korrekt vor.
				?>
				<fieldset class="greeting-card-bundle__variation-attribute">
					<legend class="greeting-card-bundle__variation-label"><?php echo esc_html($attribute['label']); ?></legend>
					<div class="greeting-card-bundle__options">
						<?php foreach ($attribute['options'] as $option) : ?>
							<label
								class="greeting-card-bundle__option"
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
								data-wp-class--is-unavailable="!state.isOptionAvailable">
								<input
									type="radio"
									class="greeting-card-bundle__option-input"
									name="gcb-attribute-<?php echo esc_attr($attribute['name']); ?>"
									value="<?php echo esc_attr($option['value']); ?>"
									data-wp-on--change="actions.selectAttribute"
									data-wp-bind--checked="state.isOptionSelected"
									data-wp-bind--disabled="!state.isOptionAvailable" />
								<span class="greeting-card-bundle__option-text"><?php echo esc_html($option['label']); ?></span>
							</label>
						<?php endforeach; ?>
					</div>
				</fieldset>
			<?php endforeach; ?>
			<?php if (! $native_price_sync) : ?>
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
	<?php endif; ?>

	<?php if ($cards) : ?>
		<div class="greeting-card-bundle__checkbox">
			<input
				type="checkbox"
				id="wantsGreetingCard"
				name="wantsGreetingCard"
				data-wp-on--change="actions.toggleWantsCard" />
			<label for="wantsGreetingCard"><?php echo esc_html(gcb_get_cards_title($product)); ?></label>
		</div>

		<div class="greeting-card-bundle__content" data-wp-bind--hidden="!state.wantsCard">
			<div class="greeting-card-bundle__cards" data-wp-class--has-error="state.showCardError">
				<div class="greeting-card-bundle__cards-slider swiper" data-wp-init="callbacks.initSwiper">
					<div class="swiper-wrapper">
						<?php foreach ($cards as $card) : ?>
							<div class="swiper-slide">
								<button
									type="button"
									class="greeting-card-bundle__card"
									data-wp-context='<?php echo wp_json_encode(['cardId' => $card['productId']]); ?>'
									data-wp-on--click="actions.selectCard"
									data-wp-bind--aria-pressed="state.isCardPressed"
									aria-pressed="false">
									<img
										src="<?php echo esc_url($card['image']); ?>"
										alt="<?php echo esc_attr($card['name']); ?>" />
									<p><?php echo wp_kses_post(wc_price($card['price'])); ?></p>
								</button>
							</div>
						<?php endforeach; ?>
					</div>
					<div class="swiper-button-next"></div>
					<div class="swiper-button-prev"></div>
					<div class="swiper-pagination"></div>
				</div>
				<div
					class="wc-block-components-notice-banner is-error"
					role="alert"
					data-wp-bind--hidden="!state.showCardError"
					hidden>
					<div class="wc-block-components-notice-banner__content"><?php esc_html_e('Bitte wählen Sie eine Grusskarte aus.', 'greeting-card-block'); ?></div>
				</div>
			</div>

			<div class="greeting-card-bundle__message">
				<label for="greetingCardMessage"><?php esc_html_e('Nachricht auf der Grusskarte:', 'greeting-card-block'); ?></label>
				<div class="greeting-card-bundle__message-wrapper">
					<textarea
						id="greetingCardMessage"
						name="greeting_card_message"
						rows="4"
						cols="50"
						maxlength="300"
						data-wp-on--input="actions.updateText"
						data-wp-class--has-error="state.showTextError"></textarea>
					<span class="greeting-card-bundle__char-counter" data-wp-text="state.charCounter"><?php esc_html_e('Zeichen verbleibend: 300', 'greeting-card-block'); ?></span>
				</div>
				<div
					class="wc-block-components-notice-banner is-error"
					role="alert"
					data-wp-bind--hidden="!state.showTextError"
					hidden>
					<div class="wc-block-components-notice-banner__content"><?php esc_html_e('Bitte geben Sie einen Grusstext ein.', 'greeting-card-block'); ?></div>
				</div>
			</div>
		</div>
	<?php endif; ?>

	<div
		class="wc-block-components-notice-banner is-error"
		role="alert"
		data-wp-bind--hidden="!state.errorMessage"
		hidden>
		<div class="wc-block-components-notice-banner__content" data-wp-text="state.errorMessage"></div>
	</div>

	<button
		type="button"
		class="wc-block-components-button wp-element-button greeting-card-bundle__submit button outline"
		data-wp-on--click="actions.addToCart"
		data-wp-bind--disabled="state.isAdding">
		<span data-wp-bind--hidden="state.isAdding"><?php esc_html_e('In den Warenkorb', 'greeting-card-block'); ?></span>
		<span data-wp-bind--hidden="!state.isAdding"><?php esc_html_e('Wird hinzugefügt …', 'greeting-card-block'); ?></span>
	</button>
</div>