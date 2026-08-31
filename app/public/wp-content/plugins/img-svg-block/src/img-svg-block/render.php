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

if ( ! function_exists( 'img_svg_block_counter_scale_factor' ) ) {
	/**
	 * Inverse of a scale factor, for cancelling out a parent's
	 * `transform: scale()` on a child element (e.g. so a photo doesn't
	 * visually zoom while the mask "window" revealing it grows/shrinks).
	 * Guards against dividing by zero when the parent is fully scaled down
	 * to invisible.
	 *
	 * @param float $factor Scale factor (as returned by img_svg_block_scale_factor()).
	 * @return float Counter-scale factor.
	 */
	function img_svg_block_counter_scale_factor( $factor ) {
		return $factor > 0 ? 1 / $factor : 1;
	}
}

if ( ! function_exists( 'img_svg_block_mask_box_style' ) ) {
	/**
	 * Builds the style for a mask "box" element sized to fill its container
	 * exactly. `mask-size: contain` fits the SVG entirely within it at 0 %
	 * scale, whichever axis is the limiting one — unlike forcing the height
	 * to 100 % (which clips the sides of an SVG whose aspect ratio is wider
	 * than the container's), this never crops anything, regardless of the
	 * SVG's proportions. The whole box is then grown/shrunk via
	 * `transform: scale()` anchored at the focal point, so it stays
	 * proportionally consistent across screen sizes while still being able
	 * to bleed past the container's edges.
	 *
	 * @param string     $url         Mask image URL.
	 * @param array|null $focal_point Focal point with 'x' and 'y' keys (0-1).
	 * @param int|float  $scale       Scale attribute value.
	 * @return string Inline CSS declarations.
	 */
	function img_svg_block_mask_box_style( $url, $focal_point, $scale ) {
		$position = img_svg_block_focal_point_position( $focal_point );

		return sprintf(
			" position: absolute; inset: 0; z-index: 1; -webkit-mask-image: url('%1\$s'); mask-image: url('%1\$s'); -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-size: contain; mask-size: contain; -webkit-mask-position: %2\$s; mask-position: %2\$s; transform: scale(%3\$s); transform-origin: %2\$s;",
			esc_url( $url ),
			esc_attr( $position ),
			esc_attr( img_svg_block_scale_factor( $scale ) )
		);
	}
}

if ( ! function_exists( 'img_svg_block_shape_style' ) ) {
	/**
	 * Builds the style for a solid-color mask "shape" element (background
	 * shape or standalone foreground SVG) — a mask box filled with a flat
	 * color.
	 *
	 * @param string     $url         Mask image URL.
	 * @param string     $fill_color  CSS color.
	 * @param array|null $focal_point Focal point with 'x' and 'y' keys (0-1).
	 * @param int|float  $scale       Scale attribute value.
	 * @return string Inline CSS declarations.
	 */
	function img_svg_block_shape_style( $url, $fill_color, $focal_point, $scale ) {
		return sprintf( ' background-color: %s;', esc_attr( $fill_color ) ) . img_svg_block_mask_box_style( $url, $focal_point, $scale );
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

$fg_position = img_svg_block_focal_point_position( $fg_focal_point );

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
		<?php if ( $img_mask_enable && $svg_url ) : ?>
			<span
				class="img-svg-block__mask-wrapper"
				style="<?php echo esc_attr( img_svg_block_mask_box_style( $svg_url, $svg_focal_point, $svg_scale ) ); ?>"
			>
				<img
					class="img-svg-block__image img-svg-block__image--masked"
					src="<?php echo esc_url( $img_url ); ?>"
					alt="<?php echo esc_attr( $img_alt ); ?>"
					style="position: absolute; inset: 0; object-position: <?php echo esc_attr( $fg_position ); ?>; transform: scale(<?php echo esc_attr( img_svg_block_counter_scale_factor( img_svg_block_scale_factor( $svg_scale ) ) ); ?>); transform-origin: <?php echo esc_attr( img_svg_block_focal_point_position( $svg_focal_point ) ); ?>;"
				/>
			</span>
		<?php else : ?>
			<img
				class="img-svg-block__image"
				src="<?php echo esc_url( $img_url ); ?>"
				alt="<?php echo esc_attr( $img_alt ); ?>"
				style="object-position: <?php echo esc_attr( $fg_position ); ?>;"
			/>
		<?php endif; ?>
	<?php else : ?>
		<span
			class="img-svg-block__image img-svg-block__image--svg"
			style="<?php echo esc_attr( img_svg_block_shape_style( $fg_svg_url, $fg_svg_color, $fg_focal_point, $fg_svg_scale ) ); ?>"
			role="img"
			aria-label="<?php echo esc_attr( $fg_svg_alt ); ?>"
		></span>
	<?php endif; ?>
</figure>
