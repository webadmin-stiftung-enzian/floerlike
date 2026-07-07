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
$bundle     = wc_get_product($product_id);

// Gemeinsames Zuständigkeits-Prädikat (siehe includes/class-integration.php):
// unser Block rendert NUR auf Grusskarten-Bundles. Auf allen anderen Produkten
// (Simple/Variable, oder Bundles ohne Grusskarte) bleibt die native
// Add-to-Cart-Form zuständig — siehe den render_block-Filter dort.
if (! gcb_is_greeting_card_bundle($bundle)) {
	return;
}

/** @var WC_Product_Bundle $bundle */
$cards = [];
foreach ($bundle->get_bundled_items() as $bundled_item) {
	$cp = $bundled_item->get_product();
	if (! $cp || ! has_term('grusskarte', 'product_cat', $cp->get_id())) {
		continue;
	}
	// Nur ECHT optionale Bundled Items in die Auswahl aufnehmen. Ein als
	// Pflicht (nicht optional) konfiguriertes Grusskarten-Item wird von
	// Product Bundles ohnehin immer automatisch hinzugefügt -- unabhängig
	// von Checkbox/Slider-Auswahl -- und gehört daher nicht in eine "Möchten
	// Sie...?"-Auswahl, die suggeriert, es liesse sich abwählen.
	if (! $bundled_item->is_optional()) {
		continue;
	}
	$cards[] = [
		'bundleItemId' => $bundled_item->get_id(), // Indexschlüssel der Store-API-configuration (nicht die Produkt-ID!)
		'productId'    => $cp->get_id(),
		'name'         => $cp->get_name(),
		// get_price() auf dem Bundled Item (nicht dem Produkt!) berücksichtigt
		// einen allfälligen "% Discount" aus den Item-Einstellungen.
		'price'        => $bundled_item->get_price(),
		'image'        => wp_get_attachment_image_url($cp->get_image_id(), 'woocommerce_thumbnail')
						  ?: wc_placeholder_img_src(),
	];
}

// "Weg 2" (siehe SETUP.md): der Strauss selbst ist ein variables Produkt und
// steckt als Pflicht-Bundled-Item in diesem Container. Dann brauchen wir
// zusätzlich zur Kartenauswahl eine Varianten-/Attributauswahl für dieses
// Pflicht-Item, deren variation_id/attributes ebenfalls in die
// bundle_configuration einfliessen (siehe view.js). Bei "Weg 1" (Strauss ist
// selbst das Bundle, keine Variationen) liefert die Helper-Funktion null und
// dieser ganze Block bleibt einfach aus.
//
// WICHTIG zur Preisanzeige: Der separate native "Preis"-Block auf der
// Produktseite (woocommerce/product-price) reagiert NICHT auf unsere eigene
// Attributauswahl -- er ist an WooCommerce's natives Variationsformular
// gekoppelt, das wir hier bewusst nicht verwenden. Deshalb liefern wir pro
// Variante einen eigenen `priceText` mit, den view.js reaktiv anzeigt
// (state.matchedVariationPriceText).
$main_item = gcb_get_variable_main_item($bundle);
$variation_selector = null;

if ($main_item) {
	$main_product = $main_item->get_product();

	$variation_attributes = [];
	foreach ($main_product->get_variation_attributes() as $raw_name => $raw_options) {
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
			'name'    => $raw_name, // Schlüssel für data-wp-context / attributes-Payload
			'label'   => wc_attribute_label($raw_name, $main_product),
			'options' => $options,
		];
	}

	$variations = [];
	foreach ($main_product->get_available_variations() as $variation_data) {
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
			// data-wp-text -- siehe Hintergrund zur Preisanzeige weiter unten.
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
		];
	}

	$variation_selector = [
		'bundleItemId' => $main_item->get_id(),
		'name'         => $main_product->get_name(),
		'attributes'   => $variation_attributes,
		'variations'   => $variations,
	];
}

wp_interactivity_state('greeting-card-bundle', [
	'bundleId'           => $product_id,
	'cards'              => $cards,
	'nonce'              => wp_create_nonce('wc_store_api'),
	// rest_url() statt hartkodiertem Pfad: funktioniert auch bei Unterverzeichnis-
	// Installationen oder abweichender REST-API-Basis.
	'addItemUrl'         => rest_url('wc/store/v1/cart/add-item'),
	'wantsCard'          => false,
	'selectedItemId'     => 0,
	'text'               => '',
	'quantity'           => 1,
	'submitAttempted'    => false,
	'isAdding'           => false,
	'errorMessage'       => '',
	'mainItem'           => $variation_selector,
	'selectedAttributes' => $variation_selector
		? array_fill_keys(array_column($variation_selector['attributes'], 'name'), '')
		: [],
]);

?>
<div <?php echo get_block_wrapper_attributes(); ?> data-wp-interactive="greeting-card-bundle">
	<?php if ($variation_selector) : ?>
		<div class="greeting-card-bundle__variations">
			<?php foreach ($variation_selector['attributes'] as $attribute) : ?>
				<div class="greeting-card-bundle__variation-attribute">
					<label for="gcb-attribute-<?php echo esc_attr($attribute['name']); ?>"><?php echo esc_html($attribute['label']); ?></label>
					<select
						id="gcb-attribute-<?php echo esc_attr($attribute['name']); ?>"
						data-wp-context='<?php echo wp_json_encode(['attributeName' => $attribute['name']]); ?>'
						data-wp-on--change="actions.selectAttribute">
						<option value=""><?php esc_html_e('Bitte wählen …', 'greeting-card-block'); ?></option>
						<?php foreach ($attribute['options'] as $option) : ?>
							<option value="<?php echo esc_attr($option['value']); ?>"><?php echo esc_html($option['label']); ?></option>
						<?php endforeach; ?>
					</select>
				</div>
			<?php endforeach; ?>
			<p
				class="greeting-card-bundle__variation-price"
				data-wp-text="state.matchedVariationPriceText"></p>
			<div
				class="wc-block-components-notice-banner is-error"
				role="alert"
				data-wp-bind--hidden="!state.showVariationError"
				hidden>
				<div class="wc-block-components-notice-banner__content"><?php esc_html_e('Bitte wählen Sie eine Option.', 'greeting-card-block'); ?></div>
			</div>
		</div>
	<?php endif; ?>

	<div class="greeting-card-bundle__checkbox">
		<input
			type="checkbox"
			id="wantsGreetingCard"
			name="wantsGreetingCard"
			data-wp-on--change="actions.toggleWantsCard" />
		<label for="wantsGreetingCard"><?php esc_html_e('Möchten Sie eine Grusskarte hinzufügen?', 'greeting-card-block'); ?></label>
	</div>

	<div class="greeting-card-bundle__content" data-wp-bind--hidden="!state.wantsCard">
		<?php if (empty($cards)) : ?>
			<p class="greeting-card-bundle__empty"><?php esc_html_e('Aktuell sind keine Grusskarten verfügbar.', 'greeting-card-block'); ?></p>
		<?php else : ?>
			<div class="greeting-card-bundle__cards" data-wp-class--has-error="state.showCardError">
				<div class="greeting-card-bundle__cards-slider swiper" data-wp-init="callbacks.initSwiper">
					<div class="swiper-wrapper">
						<?php foreach ($cards as $card) : ?>
							<div class="swiper-slide">
								<button
									type="button"
									class="greeting-card-bundle__card"
									data-wp-context='<?php echo wp_json_encode(['bundleItemId' => $card['bundleItemId']]); ?>'
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
		<?php endif; ?>

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

	<div
		class="wc-block-components-notice-banner is-error"
		role="alert"
		data-wp-bind--hidden="!state.errorMessage"
		hidden>
		<div class="wc-block-components-notice-banner__content" data-wp-text="state.errorMessage"></div>
	</div>

	<button
		type="button"
		class="wc-block-components-button wp-element-button greeting-card-bundle__submit"
		data-wp-on--click="actions.addToCart"
		data-wp-bind--disabled="state.isAdding">
		<span data-wp-bind--hidden="state.isAdding"><?php esc_html_e('In den Warenkorb', 'greeting-card-block'); ?></span>
		<span data-wp-bind--hidden="!state.isAdding"><?php esc_html_e('Wird hinzugefügt …', 'greeting-card-block'); ?></span>
	</button>
</div>
