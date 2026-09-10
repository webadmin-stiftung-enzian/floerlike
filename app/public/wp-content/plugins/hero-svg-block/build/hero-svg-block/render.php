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

if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}

if (!function_exists('stiftung_enzian_hero_svg_block_color')) {
	/**
	 * Passes a color attribute through only when it is a color.
	 *
	 * The value is substituted into a `fill` attribute of the artwork, where
	 * escaping keeps it from breaking out of the attribute but not from being
	 * something other than a color — `url(…)` names a paint server rather than
	 * a color, for instance. The palette in theme.json holds hex values and one
	 * `rgba()`, so those are the two shapes a value may have; anything else is
	 * not something the block's own controls can produce and falls back to the
	 * default.
	 *
	 * @param mixed  $value    Attribute value.
	 * @param string $fallback Color to use when the value is not one.
	 * @return string A color.
	 */
	function stiftung_enzian_hero_svg_block_color($value, $fallback)
	{
		// A palette entry may carry stray whitespace — theme.json has one.
		$value = is_string($value) ? trim($value) : '';
		$hex   = sanitize_hex_color($value);

		if ($hex) {
			return $hex;
		}

		if (preg_match('/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/i', $value)) {
			return $value;
		}

		return $fallback;
	}
}

if (!function_exists('stiftung_enzian_hero_svg_block_render')) {
	/**
	 * Renders the hero: the theme's artwork with the block's colors and its
	 * line of text substituted into it.
	 *
	 * The artwork is a file of the theme's, not an upload, and it is only ever
	 * substituted into — never parsed — so what has to hold is that every
	 * attribute stays inside the attribute or text node it is placed in. Each
	 * placeholder sits in a quoted attribute value, save `{{PATH-TEXT}}` in the
	 * content of a `<textPath>`, which is why the colors are escaped for an
	 * attribute and the text for element content. `strtr()` replaces in one
	 * pass and does not rescan, so a value that looks like a placeholder is not
	 * substituted a second time.
	 *
	 * @param array $attributes Block attributes.
	 * @return string Markup, or an empty string when the artwork is missing.
	 */
	function stiftung_enzian_hero_svg_block_render($attributes)
	{
		$path = get_stylesheet_directory() . '/assets/files/hero-artwork.svg';

		if (!is_readable($path)) {
			return '';
		}

		$svg = file_get_contents($path); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Theme file, not a remote request.

		if (false === $svg) {
			return '';
		}

		$text = $attributes['path-text'] ?? '';
		$text = is_string($text) && '' !== trim($text) ? $text : 'Lorem ipsum dolor sit amet';

		$replacements = [
			'{{PATH-TEXT}}'        => esc_html($text),
			'{{BACKGROUND-COLOR}}' => esc_attr(stiftung_enzian_hero_svg_block_color($attributes['background-color'] ?? '', '#000000')),
			'{{BACKGROUND-IMAGE}}' => esc_attr(stiftung_enzian_hero_svg_block_color($attributes['background-image'] ?? '', '#afafaf')),
			'{{FOREGROUND-COLOR}}' => esc_attr(stiftung_enzian_hero_svg_block_color($attributes['foreground-color'] ?? '', '#ffffff')),
		];

		return sprintf(
			'<section %s>%s</section>',
			get_block_wrapper_attributes(),
			strtr($svg, $replacements)
		);
	}
}

echo stiftung_enzian_hero_svg_block_render($attributes); // phpcs:ignore WordPress.Security.EscapingOutput.OutputNotEscaped -- The theme's own artwork; every substituted value is escaped above.
