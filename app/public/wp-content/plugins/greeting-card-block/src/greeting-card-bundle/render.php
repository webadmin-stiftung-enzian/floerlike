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
// unser Block rendert NUR auf Produkten, die unter "Bundle-sells" verknüpfte
// Grusskarten haben. Auf allen anderen bleibt die native Add-to-Cart-Form
// zuständig — siehe die Koexistenz-Weiche dort.
if (! gcb_is_card_parent($product)) {
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
// WICHTIG zur Preisanzeige: Der separate native "Preis"-Block auf der
// Produktseite (woocommerce/product-price) reagiert NICHT auf unsere eigene
// Attributauswahl -- er ist an WooCommerce's natives Variationsformular
// gekoppelt, das wir hier bewusst nicht verwenden. Deshalb liefern wir pro
// Variante einen eigenen `priceText` mit, den view.js reaktiv anzeigt
// (state.matchedVariationPriceText).
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
			'name'    => $raw_name, // Schlüssel für data-wp-context / attributes-Payload
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
		];
	}

	$variation_selector = [
		'name'       => $product->get_name(),
		'attributes' => $variation_attributes,
		'variations' => $variations,
	];
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
