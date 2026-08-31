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

if ( ! function_exists( 'img_svg_block_focal_point_position' ) ) {
	/**
	 * Formats a focal point attribute as a CSS position string.
	 *
	 * @param array|null $focal_point Focal point with 'x' and 'y' keys (0-1).
	 * @return string CSS position, e.g. "50% 50%".
	 */
	function img_svg_block_focal_point_position( $focal_point ) {
		$x = isset( $focal_point['x'] ) ? (float) $focal_point['x'] : 0.5;
		$y = isset( $focal_point['y'] ) ? (float) $focal_point['y'] : 0.5;
		return sprintf( '%s%% %s%%', $x * 100, $y * 100 );
	}
}

if ( ! function_exists( 'img_svg_block_scale_factor' ) ) {
	/**
	 * Converts a "Größe" scale attribute (-200..200, 0 = container height) into
	 * a CSS transform scale factor, so the shape grows/shrinks as a whole and
	 * can overflow past the block's edges instead of just zooming inside a
	 * fixed mask.
	 *
	 * @param int|float|null $scale Scale attribute value.
	 * @return float Non-negative scale factor for `transform: scale()`.
	 */
	function img_svg_block_scale_factor( $scale ) {
		return max( 0, 1 + ( (float) $scale ) / 100 );
	}
}

if ( ! function_exists( 'img_svg_block_shape_style' ) ) {
	/**
	 * Builds the style for a solid-color mask "shape" element (background
	 * shape or standalone foreground SVG). The element fills its container
	 * exactly (0 % scale = container height, SVG's own aspect ratio preserved
	 * automatically via `mask-size: auto`), then is grown/shrunk as a whole
	 * via `transform: scale()` anchored at the focal point — so it stays
	 * proportionally consistent across screen sizes while still being able to
	 * bleed past the container's edges.
	 *
	 * @param string     $url         Mask image URL.
	 * @param string     $fill_color  CSS color.
	 * @param array|null $focal_point Focal point with 'x' and 'y' keys (0-1).
	 * @param int|float  $scale       Scale attribute value.
	 * @return string Inline CSS declarations.
	 */
	function img_svg_block_shape_style( $url, $fill_color, $focal_point, $scale ) {
		$position = img_svg_block_focal_point_position( $focal_point );

		return sprintf(
			" position: absolute; inset: 0; background-color: %s; -webkit-mask-image: url('%s'); mask-image: url('%s'); -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-size: auto 100%%; mask-size: auto 100%%; -webkit-mask-position: %s; mask-position: %s; transform: scale(%s); transform-origin: center;",
			esc_attr( $fill_color ),
			esc_url( $url ),
			esc_url( $url ),
			esc_attr( $position ),
			esc_attr( $position ),
			esc_attr( img_svg_block_scale_factor( $scale ) )
		);
	}
}

if ( ! function_exists( 'img_svg_block_masked_image_mask_style' ) ) {
	/**
	 * Builds the mask-related style for the foreground pixel image when it's
	 * cropped into the background shape. The image element itself stays
	 * pinned to the container (its photo content fills it via
	 * `object-fit: cover`) — only the mask "window" is resized/repositioned,
	 * relative to the container just like `img_svg_block_shape_style`. It can
	 * never bleed past the image's own bounds, since there's no photo content
	 * beyond that to reveal.
	 *
	 * @param string     $url         Background SVG URL.
	 * @param array|null $focal_point Background focal point with 'x' and 'y' keys (0-1).
	 * @param int|float  $scale       Background scale attribute value.
	 * @return string Inline CSS declarations.
	 */
	function img_svg_block_masked_image_mask_style( $url, $focal_point, $scale ) {
		$mask_size = sprintf( 'auto calc(100%% + %d%%)', (int) $scale );
		$position  = img_svg_block_focal_point_position( $focal_point );

		return sprintf(
			" -webkit-mask-image: url('%s'); mask-image: url('%s'); -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-size: %s; mask-size: %s; -webkit-mask-position: %s; mask-position: %s;",
			esc_url( $url ),
			esc_url( $url ),
			esc_attr( $mask_size ),
			esc_attr( $mask_size ),
			esc_attr( $position ),
			esc_attr( $position )
		);
	}
}

$fg_type          = $attributes['fg-type'] ?? 'pixel';
$is_pixel_fg      = 'svg' !== $fg_type;

$img_url          = $attributes['img-url'] ?? '';
$img_alt          = $attributes['img-alt'] ?? '';
$img_width        = $attributes['img-width'] ?? 0;
$img_height       = $attributes['img-height'] ?? 0;

$fg_svg_url       = $attributes['fg-svg-url'] ?? '';
$fg_svg_alt       = $attributes['fg-svg-alt'] ?? '';
$fg_svg_color     = $attributes['fg-svg-fill-color'] ?? '#000000';
$fg_svg_scale     = $attributes['fg-svg-scale'] ?? 0;
$fg_focal_point   = $attributes['fg-focal-point'] ?? array( 'x' => 0.5, 'y' => 0.5 );

$svg_url          = $attributes['svg-url'] ?? '';
$svg_color        = $attributes['svg-fill-color'] ?? '#000000';
$svg_enable       = ! empty( $attributes['svg-enable'] );
$img_mask_enable  = $is_pixel_fg && ! empty( $attributes['img-mask-enable'] );
$svg_scale        = $attributes['svg-scale'] ?? 0;
$svg_focal_point  = $attributes['svg-focal-point'] ?? array( 'x' => 0.5, 'y' => 0.5 );

$has_foreground = $is_pixel_fg ? (bool) $img_url : (bool) $fg_svg_url;

if ( ! $has_foreground ) {
	return;
}

$img_class = 'img-svg-block__image';
$img_style = sprintf( 'object-position: %s;', esc_attr( img_svg_block_focal_point_position( $fg_focal_point ) ) );

if ( $img_mask_enable && $svg_url ) {
	$img_class .= ' img-svg-block__image--masked';
	$img_style .= img_svg_block_masked_image_mask_style( $svg_url, $svg_focal_point, $svg_scale );
}

$wrapper_style = '';
if ( $is_pixel_fg && $img_width && $img_height ) {
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
			style="<?php echo esc_attr( img_svg_block_shape_style( $svg_url, $svg_color, $svg_focal_point, $svg_scale ) ); ?>"
			aria-hidden="true"
		></span>
	<?php endif; ?>
	<?php if ( $is_pixel_fg ) : ?>
		<img
			class="<?php echo esc_attr( $img_class ); ?>"
			src="<?php echo esc_url( $img_url ); ?>"
			alt="<?php echo esc_attr( $img_alt ); ?>"
			style="<?php echo esc_attr( $img_style ); ?>"
		/>
	<?php else : ?>
		<span
			class="img-svg-block__image img-svg-block__image--svg"
			style="<?php echo esc_attr( img_svg_block_shape_style( $fg_svg_url, $fg_svg_color, $fg_focal_point, $fg_svg_scale ) ); ?>"
			role="img"
			aria-label="<?php echo esc_attr( $fg_svg_alt ); ?>"
		></span>
	<?php endif; ?>
</figure>
