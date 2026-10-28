<?php
// This file is generated. Do not modify it manually.
return array(
	'empty' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'product-showcase/empty',
		'version' => '0.1.0',
		'title' => 'Kein Treffer',
		'category' => 'product-showcase',
		'icon' => 'dismiss',
		'description' => 'Erscheint nur, wenn beim gewählten Filter in keiner Zeile ein Produkt übrig bleibt. Inhalt frei, dazu ein Knopf, der den Filter aufhebt.',
		'keywords' => array(
			'leer',
			'filter',
			'hinweis'
		),
		'textdomain' => 'product-showcase-block',
		'ancestor' => array(
			'product-showcase/showcase'
		),
		'attributes' => array(
			'resetLabel' => array(
				'type' => 'string',
				'default' => 'Filter aufheben'
			),
			'style' => array(
				'type' => 'object',
				'default' => array(
					'spacing' => array(
						'blockGap' => '1rem'
					)
				)
			)
		),
		'supports' => array(
			'html' => false,
			'multiple' => false,
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
	'filter' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'product-showcase/filter',
		'version' => '0.1.0',
		'title' => 'Filter',
		'category' => 'product-showcase',
		'icon' => 'filter',
		'description' => 'Knöpfe aus den Schlagwörtern mit „Im Filter zeigen“. Ein Klick zeigt nur Produkte mit diesem Schlagwort, ein zweiter hebt den Filter auf.',
		'keywords' => array(
			'filter',
			'schlagwort',
			'anlass'
		),
		'textdomain' => 'product-showcase-block',
		'usesContext' => array(
			'product-showcase/previewTag'
		),
		'ancestor' => array(
			'product-showcase/showcase'
		),
		'attributes' => array(
			'label' => array(
				'type' => 'string',
				'default' => 'Filter zur feineren Auswahl'
			)
		),
		'supports' => array(
			'html' => false,
			'multiple' => false,
			'spacing' => array(
				'margin' => true
			)
		),
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	),
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
			'previewTag' => array(
				'type' => 'string',
				'default' => ''
			),
			'style' => array(
				'type' => 'object',
				'default' => array(
					'spacing' => array(
						'blockGap' => '4rem'
					)
				)
			)
		),
		'providesContext' => array(
			'product-showcase/previewTag' => 'previewTag'
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
			),
			'interactivity' => true
		),
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php',
		'viewScriptModule' => 'file:./view.js'
	),
	'variation-range' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'product-showcase/variation-range',
		'version' => '0.1.0',
		'title' => 'Varianten-Spanne',
		'category' => 'product-showcase',
		'icon' => 'leftright',
		'description' => 'Werte der Varianten eines Produkts als Spanne, z. B. „Grösse: klein – gross“ oder „Grösse: ca. 35 – 55 cm Ø“. Für die Produktvorlage einer Produktsammlung oder die Produktseite.',
		'keywords' => array(
			'variante',
			'attribut',
			'grösse',
			'preis',
			'spanne'
		),
		'textdomain' => 'product-showcase-block',
		'usesContext' => array(
			'postId',
			'postType'
		),
		'attributes' => array(
			'label' => array(
				'type' => 'string',
				'default' => ''
			),
			'attribute' => array(
				'type' => 'string',
				'default' => ''
			),
			'value' => array(
				'type' => 'string',
				'default' => 'term'
			)
		),
		'supports' => array(
			'html' => false,
			'color' => array(
				'text' => true,
				'background' => false
			),
			'typography' => array(
				'fontSize' => true,
				'lineHeight' => true
			),
			'spacing' => array(
				'margin' => true
			)
		),
		'editorScript' => 'file:./index.js',
		'render' => 'file:./render.php'
	)
);
