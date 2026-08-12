<?php
// This file is generated. Do not modify it manually.
return array(
	'img-svg-block' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'stiftung-enzian/img-svg-block',
		'version' => '0.1.0',
		'title' => 'Bild mit SVG-Hintergrund',
		'category' => 'media',
		'icon' => 'smiley',
		'description' => 'Bild-Block mit optionalem SVG-Formhintergrund.',
		'example' => array(
			
		),
		'attributes' => array(
			'img-url' => array(
				'type' => 'string'
			),
			'img-alt' => array(
				'type' => 'string'
			),
			'img-id' => array(
				'type' => 'string'
			),
			'svg-url' => array(
				'type' => 'string'
			),
			'svg-alt' => array(
				'type' => 'string'
			),
			'svg-id' => array(
				'type' => 'string'
			),
			'svg-fill-color' => array(
				'type' => 'string'
			),
			'svg-enable' => array(
				'type' => 'boolean',
				'default' => false
			),
			'img-mask-enable' => array(
				'type' => 'boolean',
				'default' => false
			),
			'img-width' => array(
				'type' => 'number'
			),
			'img-height' => array(
				'type' => 'number'
			),
			'svg-scale' => array(
				'type' => 'number',
				'default' => 0
			)
		),
		'supports' => array(
			'align' => array(
				'wide',
				'full'
			),
			'anchor' => true
		),
		'textdomain' => 'img-svg-block',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php',
		'viewScript' => 'file:./view.js'
	)
);
