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
?>

<?php
$cards = wc_get_products([
	'category' => ['grusskarte'],
	'limit'    => -1,
	'status'   => 'publish',
	'order'  => $attributes['order'] ?? 'ASC',
]);

// Initialer Server-State für die Interactivity API.
wp_interactivity_state('greeting-card-block', [
	'wantsCard'      => true,
	'selectedCardId' => '',
	'text'           => '',
	'validated'      => false,
]);

?>
<div
	<?php echo get_block_wrapper_attributes(); ?>
	data-wp-interactive="greeting-card-block"
	data-wp-init="callbacks.debugInit">
	<div class="greeting-card-block__checkbox">
		<input
			type="checkbox"
			id="isGreetingCardChecked"
			name="isGreetingCardChecked"
			data-wp-bind--checked="state.wantsCard"
			data-wp-on--change="actions.toggleWantsCard"
			checked />
		<label for="isGreetingCardChecked">Möchten Sie eine Grußkarte hinzufügen?</label>
	</div>
	<div class="greeting-card-block__content" data-wp-bind--hidden="!state.wantsCard">
		<div class="greeting-card-block__cards" data-wp-class--has-error="state.showCardError">
			<div class="greeting-card-block__cards-slider swiper" data-wp-init="callbacks.initSwiper">
				<div class="swiper-wrapper">
					<?php foreach ($cards as $card) : ?>
						<div class="swiper-slide">
							<button
								type="button"
								class="greeting-card-block__card"
								data-card-id="<?php echo esc_attr($card->get_id()); ?>"
								data-wp-on--click="actions.selectCard"
								data-wp-bind--aria-pressed="state.isCardPressed"
								aria-pressed="false">
								<!-- <?php echo esc_html($card->get_name()); ?> -->
								<img src="<?php echo esc_url(wp_get_attachment_image_url($card->get_image_id(), 'woocommerce_thumbnail')); ?>" alt="<?php echo esc_attr($card->get_name()); ?>" />
								<p>CHF <?php echo esc_html($card->get_price()); ?></p>
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
				<div class="wc-block-components-notice-banner__content">Bitte wählen Sie eine Grußkarte aus.</div>
			</div>
		</div>
		<div class="greeting-card-block__message">
			<label for="greetingCardMessage">Nachricht auf der Grußkarte:</label>
			<div class="greeting-card-block__message-wrapper">
				<textarea
					id="greetingCardMessage"
					name="greeting_card_message"
					rows="4"
					cols="50"
					maxlength="300"
					data-wp-on--input="actions.updateText"
					data-wp-class--has-error="state.showTextError"></textarea>
				<span class="greeting-card-block__char-counter" data-wp-text="state.charCounter">Zeichen verbleibend: 300</span>
			</div>
			<div
				class="wc-block-components-notice-banner is-error"
				role="alert"
				data-wp-bind--hidden="!state.showTextError"
				hidden>
				<div class="wc-block-components-notice-banner__content">Bitte geben Sie einen Grußtext ein.</div>
			</div>
		</div>
	</div>
</div>