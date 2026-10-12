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

// Daten des Produkts (Karten, Varianten, Vorauswahl …) aufbereiten und als
// Interactivity-State ablegen -- gemeinsam für alle Grusskarten-Blöcke, siehe
// includes/class-state.php.
$data               = gcb_prepare_state($product);
$cards              = $data['cards'];
$variation_selector = $data['variationSelector'];
$native_price_sync  = $data['nativePriceSync'];
$is_available       = $data['isAvailable'];

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
							<?php
							// Aussehen über die Theme-Klassen "button outline" (main.css),
							// wie jeder andere Button der Seite. Das Plugin selbst legt nur
							// Ersatzwerte fest, falls das Theme fehlt (style.scss).
							?>
							<label
								class="greeting-card-bundle__option button outline"
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
								data-wp-class--is-disabled="!state.isOptionAvailable">
								<input
									type="radio"
									class="greeting-card-bundle__visually-hidden"
									name="gcb-attribute-<?php echo esc_attr($attribute['name']); ?>"
									value="<?php echo esc_attr($option['value']); ?>"
									data-wp-on--change="actions.selectAttribute"
									data-wp-bind--checked="state.isOptionSelected"
									data-wp-bind--disabled="!state.isOptionAvailable" />
								<?php
								// Zwei Zeilen über zwei Elemente statt <br>: Wert und darunter
								// die Beschreibung der Variante (z. B. "ca. 35 cm Ø"). CSS
								// stellt sie untereinander (style.scss). esc_html() bei beiden,
								// die Beschreibung kommt aus dem Admin.
								?>
								<span class="greeting-card-bundle__option-text">
									<span class="greeting-card-bundle__option-label"><?php echo esc_html($option['label']); ?></span>
									<?php if ('' !== $option['description']) : ?>
										<span class="greeting-card-bundle__option-description"><?php echo esc_html($option['description']); ?></span>
									<?php endif; ?>
								</span>
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
			<label for="wantsGreetingCard">Möchten Sie eine Grusskarte hinzufügen?</label>
		</div>

		<div class="greeting-card-bundle__content" data-wp-bind--hidden="!state.wantsCard">
			<?php
			// Kartenauswahl: dasselbe Muster wie die Variantenknöpfe -- eine
			// Radio-Gruppe ("genau eine Karte"), jede Karte ein <label> mit den
			// Theme-Klassen "button outline tile". Abwählen geht über die
			// Checkbox "Grusskarte hinzufügen", nicht über die Karte selbst.
			?>
			<fieldset class="greeting-card-bundle__cards" data-wp-class--has-error="state.showCardError">
				<legend class="greeting-card-bundle__visually-hidden"><?php esc_html_e('Grusskarte wählen', 'greeting-card-block'); ?></legend>
				<?php
				// Gleiche Struktur wie der Slider-Block, damit main.css beide
				// gleich gestaltet: Pfeile und Punkte liegen NEBEN dem Swiper.
				// Theme-Klasse "slider" statt "cb-carousel-block" -- sonst würde
				// das Carousel-Plugin diesen Slider ein zweites Mal starten.
				?>
				<div class="greeting-card-bundle__cards-slider slider" data-wp-init="callbacks.initSwiper">
					<div class="swiper">
						<div class="swiper-wrapper">
							<?php foreach ($cards as $card) : ?>
								<div class="swiper-slide">
									<label
										class="greeting-card-bundle__card button outline tile"
										<?php echo wp_interactivity_data_wp_context(['cardId' => $card['productId']]); ?>
										data-wp-class--is-selected="state.isCardSelected">
										<input
											type="radio"
											class="greeting-card-bundle__visually-hidden"
											name="gcb-card"
											value="<?php echo esc_attr($card['productId']); ?>"
											data-wp-on--change="actions.selectCard"
											data-wp-bind--checked="state.isCardSelected" />
										<img
											src="<?php echo esc_url($card['image']); ?>"
											alt="<?php echo esc_attr($card['name']); ?>" />
										<span class="greeting-card-bundle__card-price"><?php echo wp_kses_post(wc_price($card['price'])); ?></span>
									</label>
								</div>
							<?php endforeach; ?>
						</div>
					</div>
					<div class="swiper-pagination"></div>
					<div class="swiper-button-prev"></div>
					<div class="swiper-button-next"></div>
				</div>
				<div
					class="wc-block-components-notice-banner is-error"
					role="alert"
					data-wp-bind--hidden="!state.showCardError"
					hidden>
					<div class="wc-block-components-notice-banner__content"><?php esc_html_e('Bitte wählen Sie eine Grusskarte aus.', 'greeting-card-block'); ?></div>
				</div>
			</fieldset>

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
		class="greeting-card-bundle__submit button outline"
		data-wp-on--click="actions.addToCart"
		data-wp-bind--disabled="state.isAdding">
		<span data-wp-bind--hidden="state.isAdding"><?php esc_html_e('In den Warenkorb', 'greeting-card-block'); ?></span>
		<span data-wp-bind--hidden="!state.isAdding"><?php esc_html_e('Wird hinzugefügt …', 'greeting-card-block'); ?></span>
	</button>
</div>