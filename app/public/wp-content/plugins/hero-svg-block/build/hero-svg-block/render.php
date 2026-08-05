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

if (!function_exists('render_hero_block')) {
	function render_hero_block($attributes)
	{
		$path = get_stylesheet_directory() . '/assets/files/hero-artwork.svg';
		$svg = file_get_contents($path);

		$replacements = [
			'{{PATH-TEXT}}'     => esc_html($attributes['path-text'] ?? 'Lorem ipsum dolor sit amet'),
			'{{BACKGROUND-COLOR}}' => esc_attr($attributes['background-color'] ?? '#000000'),
			'{{BACKGROUND-IMAGE}}' => esc_attr($attributes['background-image'] ?? '#afafaf'),
			'{{FOREGROUND-COLOR}}'    => esc_attr($attributes['foreground-color'] ?? '#ffffff'),
		];

		$svg = strtr($svg, $replacements);

		return sprintf(
			'<section %s>%s</section>',
			get_block_wrapper_attributes(),
			$svg
		);
	}
}

echo render_hero_block($attributes);
