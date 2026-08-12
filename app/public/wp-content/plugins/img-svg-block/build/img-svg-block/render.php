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

$img_url         = $attributes['img-url'] ?? '';
$img_alt          = $attributes['img-alt'] ?? '';
$img_width        = $attributes['img-width'] ?? 0;
$img_height       = $attributes['img-height'] ?? 0;
$svg_url          = $attributes['svg-url'] ?? '';
$svg_color        = $attributes['svg-fill-color'] ?? '#000000';
$svg_enable       = ! empty( $attributes['svg-enable'] );
$img_mask_enable  = ! empty( $attributes['img-mask-enable'] );
$svg_scale        = $attributes['svg-scale'] ?? 0;

if ( ! $img_url ) {
	return;
}

$mask_size = sprintf( 'auto calc(100%% + %d%%)', (int) $svg_scale );

$img_class = 'img-svg-block__image';
$img_style = '';

if ( $img_mask_enable && $svg_url ) {
	$img_class .= ' img-svg-block__image--masked';
	$img_style  = sprintf(
		"-webkit-mask-image: url('%1\$s'); mask-image: url('%1\$s'); -webkit-mask-size: %2\$s; mask-size: %2\$s;",
		esc_url( $svg_url ),
		esc_attr( $mask_size )
	);
}

$wrapper_style = '';
if ( $img_width && $img_height ) {
	$wrapper_style = sprintf( 'aspect-ratio: %d / %d;', (int) $img_width, (int) $img_height );
}

$wrapper_attributes = get_block_wrapper_attributes( array(
	'style' => $wrapper_style,
) );
?>
<figure <?php echo $wrapper_attributes; ?>>
	<?php if ( $svg_enable && $svg_url ) : ?>
		<span
			class="img-svg-block__shape"
			style="background-color: <?php echo esc_attr( $svg_color ); ?>; -webkit-mask-image: url('<?php echo esc_url( $svg_url ); ?>'); mask-image: url('<?php echo esc_url( $svg_url ); ?>'); -webkit-mask-size: <?php echo esc_attr( $mask_size ); ?>; mask-size: <?php echo esc_attr( $mask_size ); ?>;"
			aria-hidden="true"
		></span>
	<?php endif; ?>
	<img
		class="<?php echo esc_attr( $img_class ); ?>"
		src="<?php echo esc_url( $img_url ); ?>"
		alt="<?php echo esc_attr( $img_alt ); ?>"
		<?php if ( $img_style ) : ?>
		style="<?php echo esc_attr( $img_style ); ?>"
		<?php endif; ?>
	/>
</figure>
