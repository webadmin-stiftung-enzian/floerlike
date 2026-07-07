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

wp_interactivity_state('greeting-card-bundle', [
	'bundleId'        => $product_id,
	'cards'           => $cards,
	'nonce'           => wp_create_nonce('wc_store_api'),
	// rest_url() statt hartkodiertem Pfad: funktioniert auch bei Unterverzeichnis-
	// Installationen oder abweichender REST-API-Basis.
	'addItemUrl'      => rest_url('wc/store/v1/cart/add-item'),
	'wantsCard'       => false,
	'selectedItemId'  => 0,
	'text'            => '',
	'quantity'        => 1,
	'submitAttempted' => false,
	'isAdding'        => false,
	'errorMessage'    => '',
]);

?>
<div <?php echo get_block_wrapper_attributes(); ?> data-wp-interactive="greeting-card-bundle">
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
