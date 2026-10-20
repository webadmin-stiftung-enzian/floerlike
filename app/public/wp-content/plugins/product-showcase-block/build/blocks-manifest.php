<?php
// This file is generated. Do not modify it manually.
return array(
	'row' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'product-showcase/row',
		'version' => '0.1.0',
		'title' => 'Zeile',
		'category' => 'product-showcase',
		'icon' => 'slides',
		'description' => 'Überschrift und Slider mit den Produkten einer Kategorie. Verschwindet samt Inhalt, wenn kein Produkt darin steht.',
		'keywords' => array(
			'kategorie',
			'slider',
			'produkte'
		),
		'textdomain' => 'product-showcase-block',
		'ancestor' => array(
			'product-showcase/showcase'
		),
		'attributes' => array(
			'style' => array(
				'type' => 'object',
				'default' => array(
					'spacing' => array(
						'blockGap' => '1.5rem'
					)
				)
			)
		),
		'supports' => array(
			'html' => false,
			'layout' => array(
				'allowSizingOnChildren' => true
			),
			'spacing' => array(
				'margin' => true,
				'padding' => true,
				'blockGap' => true
			)
		),
		'editorScript' => 'file:./index.js',
		'render' => 'file:./render.php'
	),
	'showcase' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'product-showcase/showcase',
		'version' => '0.1.0',
		'title' => 'Schaufenster',
		'category' => 'product-showcase',
		'icon' => 'store',
		'description' => 'Shop-Seite mit einer Zeile je Produktkategorie. Beim Einfügen werden zwei Zeilen angelegt; dazwischen sind beliebige Blöcke erlaubt.',
		'keywords' => array(
			'shop',
			'kategorie',
			'slider',
			'filter'
		),
		'textdomain' => 'product-showcase-block',
		'attributes' => array(
			'style' => array(
				'type' => 'object',
				'default' => array(
					'spacing' => array(
						'blockGap' => '4rem'
					)
				)
			)
		),
		'supports' => array(
			'html' => false,
			'multiple' => false,
			'align' => array(
				'wide',
				'full'
			),
			'layout' => array(
				'allowSizingOnChildren' => true
			),
			'spacing' => array(
				'margin' => true,
				'padding' => true,
				'blockGap' => true
			)
		),
		'editorScript' => 'file:./index.js',
		'render' => 'file:./render.php'
	)
);
