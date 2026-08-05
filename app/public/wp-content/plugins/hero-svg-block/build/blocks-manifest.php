<?php
// This file is generated. Do not modify it manually.
return array(
	'hero-svg-block' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'stiftung-enzian/hero-svg-block',
		'version' => '0.1.0',
		'title' => 'Hero SVG Block',
		'category' => 'widgets',
		'description' => 'A block that displays a hero section with an SVG background and customizable text.',
		'example' => array(
			
		),
		'attributes' => array(
			'background-color' => array(
				'type' => 'string'
			),
			'background-image' => array(
				'type' => 'string'
			),
			'foreground-color' => array(
				'type' => 'string'
			),
			'path-text' => array(
				'type' => 'string'
			)
		),
		'supports' => array(
			'html' => false
		),
		'textdomain' => 'hero-svg-block',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php',
		'viewScript' => 'file:./view.js'
	)
);
