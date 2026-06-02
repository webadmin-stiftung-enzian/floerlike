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

?>
<div <?php echo get_block_wrapper_attributes(); ?>>
	<div class="greeting-card-block__checkbox">
		<input type="checkbox" id="isGreetingCardChecked" name="isGreetingCardChecked" checked />
		<label for="isGreetingCardChecked">Möchten Sie eine Grußkarte hinzufügen?</label>
	</div>
	<div class="greeting-card-block__content">
		<div class="greeting-card-block__cards">
			<input type="hidden" name="greeting_card_id">
			<div class="greeting-card-block__cards-slider swiper">
				<div class="swiper-wrapper">
					<?php foreach ($cards as $card) : ?>
						<button type="button" aria-pressed="false" class="swiper-slide" data-card-id="<?php echo esc_attr($card->get_id()); ?>">
							<?php echo esc_html($card->get_name()); ?>
							<img src="<?php echo esc_url(wp_get_attachment_image_url($card->get_image_id(), 'woocommerce_thumbnail')); ?>" alt="<?php echo esc_attr($card->get_name()); ?>" />
							<p><?php echo esc_html($card->get_price()); ?></p>
						</button>
					<?php endforeach; ?>
				</div>
				<div class="swiper-button-next"></div>
				<div class="swiper-button-prev"></div>
				<div class="swiper-pagination"></div>
			</div>
		</div>
		<div class="greeting-card-block__message">
			<label for="greetingCardMessage">Nachricht auf der Grußkarte:</label>
			<textarea id="greetingCardMessage" name="greeting_card_message" rows="4" cols="50"></textarea>
		</div>
	</div>
</div>