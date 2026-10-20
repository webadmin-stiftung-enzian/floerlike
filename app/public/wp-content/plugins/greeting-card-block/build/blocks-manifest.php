<?php
// This file is generated. Do not modify it manually.
return array(
	'add-to-cart' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'greeting-card-block/add-to-cart',
		'version' => '0.4.0',
		'title' => 'In den Warenkorb',
		'category' => 'greeting-card',
		'description' => 'Knopf, der das Produkt – und die Grusskarte, falls gewünscht – in den Warenkorb legt.',
		'keywords' => array(
			'warenkorb',
			'kaufen',
			'button'
		),
		'attributes' => array(
			'label' => array(
				'type' => 'string',
				'default' => ''
			),
			'buttonStyle' => array(
				'type' => 'string',
				'enum' => array(
					'outline',
					'solid'
				),
				'default' => 'outline'
			),
			'showIcon' => array(
				'type' => 'boolean',
				'default' => true
			)
		),
		'ancestor' => array(
			'greeting-card-block/card-purchase'
		),
		'textdomain' => 'greeting-card-block',
		'usesContext' => array(
			'postId',
			'greeting-card-block/previewProductId'
		),
		'supports' => array(
			'html' => false,
			'multiple' => false,
			'reusable' => false,
			'interactivity' => true
		),
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php',
		'viewScriptModule' => array(
			'greeting-card-block/store',
			'file:./view.js'
		)
	),
	'card-message' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'greeting-card-block/card-message',
		'version' => '0.4.0',
		'title' => 'Grusstext',
		'category' => 'greeting-card',
		'description' => 'Textfeld für die Nachricht auf der Grusskarte.',
		'keywords' => array(
			'grusskarte',
			'text',
			'nachricht'
		),
		'attributes' => array(
			'titel' => array(
				'type' => 'string',
				'default' => ''
			),
			'label' => array(
				'type' => 'string',
				'default' => ''
			),
			'placeholder' => array(
				'type' => 'string',
				'default' => ''
			),
			'maxLength' => array(
				'type' => 'number',
				'default' => 300
			)
		),
		'ancestor' => array(
			'greeting-card-block/card-purchase'
		),
		'textdomain' => 'greeting-card-block',
		'usesContext' => array(
			'postId',
			'greeting-card-block/previewProductId'
		),
		'supports' => array(
			'html' => false,
			'multiple' => false,
			'reusable' => false,
			'interactivity' => true
		),
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php',
		'viewScriptModule' => array(
			'greeting-card-block/store',
			'file:./view.js'
		)
	),
	'card-picker' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'greeting-card-block/card-picker',
		'version' => '0.4.0',
		'title' => 'Grusskarten-Auswahl',
		'category' => 'greeting-card',
		'description' => 'Slider mit den verknüpften Grusskarten.',
		'keywords' => array(
			'grusskarte',
			'slider',
			'karte'
		),
		'attributes' => array(
			'titel' => array(
				'type' => 'string',
				'default' => ''
			),
			'slidesPerView' => array(
				'type' => 'number',
				'default' => 1
			),
			'slidesPerViewMobile' => array(
				'type' => 'number',
				'default' => 1
			),
			'showPrice' => array(
				'type' => 'boolean',
				'default' => true
			),
			'showNavigation' => array(
				'type' => 'boolean',
				'default' => true
			),
			'showPagination' => array(
				'type' => 'boolean',
				'default' => false
			)
		),
		'ancestor' => array(
			'greeting-card-block/card-purchase'
		),
		'textdomain' => 'greeting-card-block',
		'usesContext' => array(
			'postId',
			'greeting-card-block/previewProductId'
		),
		'supports' => array(
			'html' => false,
			'multiple' => false,
			'reusable' => false,
			'interactivity' => true
		),
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php',
		'viewScriptModule' => array(
			'greeting-card-block/store',
			'file:./view.js'
		)
	),
	'card-purchase' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'greeting-card-block/card-purchase',
		'version' => '0.4.0',
		'title' => 'Grusskarten-Kauf',
		'category' => 'greeting-card',
		'description' => 'Kaufbereich mit Variantenauswahl, optionaler Grusskarte und Warenkorb-Knopf. Beim Einfügen werden alle nötigen Blöcke angelegt; dazwischen sind beliebige Blöcke erlaubt.',
		'keywords' => array(
			'grusskarte',
			'warenkorb',
			'kaufen',
			'variante'
		),
		'textdomain' => 'greeting-card-block',
		'attributes' => array(
			'previewProductId' => array(
				'type' => 'number',
				'default' => 0
			),
			'style' => array(
				'type' => 'object',
				'default' => array(
					'spacing' => array(
						'blockGap' => '1.5rem'
					)
				)
			)
		),
		'providesContext' => array(
			'greeting-card-block/previewProductId' => 'previewProductId'
		),
		'usesContext' => array(
			'postId'
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
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	),
	'card-toggle' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'greeting-card-block/card-toggle',
		'version' => '0.4.0',
		'title' => 'Grusskarte hinzufügen',
		'category' => 'greeting-card',
		'description' => 'Checkbox, mit der Kund:innen eine Grusskarte dazunehmen.',
		'keywords' => array(
			'grusskarte',
			'checkbox'
		),
		'attributes' => array(
			'label' => array(
				'type' => 'string',
				'default' => ''
			)
		),
		'ancestor' => array(
			'greeting-card-block/card-purchase'
		),
		'textdomain' => 'greeting-card-block',
		'usesContext' => array(
			'postId',
			'greeting-card-block/previewProductId'
		),
		'supports' => array(
			'html' => false,
			'multiple' => false,
			'reusable' => false,
			'interactivity' => true
		),
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php',
		'viewScriptModule' => array(
			'greeting-card-block/store',
			'file:./view.js'
		)
	),
	'variant-selector' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'greeting-card-block/variant-selector',
		'version' => '0.4.0',
		'title' => 'Variantenauswahl',
		'category' => 'greeting-card',
		'description' => 'Knöpfe für Grösse, Farbe o. Ä. des Produkts. Der Preis-Block springt mit der Auswahl um.',
		'keywords' => array(
			'variante',
			'grösse',
			'auswahl'
		),
		'attributes' => array(
			'showDiameter' => array(
				'type' => 'boolean',
				'default' => true
			),
			'showOwnPrice' => array(
				'type' => 'boolean',
				'default' => false
			)
		),
		'ancestor' => array(
			'greeting-card-block/card-purchase'
		),
		'textdomain' => 'greeting-card-block',
		'usesContext' => array(
			'postId',
			'greeting-card-block/previewProductId'
		),
		'supports' => array(
			'html' => false,
			'multiple' => false,
			'reusable' => false,
			'interactivity' => true
		),
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php',
		'viewScriptModule' => array(
			'greeting-card-block/store',
			'file:./view.js'
		)
	)
);
