<?php
// This file is generated. Do not modify it manually.
return array(
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
		'render' => 'file:./render.php'
	),
	'greeting-card-bundle' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'greeting-card-block/greeting-card-bundle',
		'version' => '0.3.0',
		'title' => 'Grusskarte + Produkt in den Warenkorb',
		'category' => 'widgets',
		'description' => 'Auswahl-UI für die optionale Grusskarte (verknüpft über "Bundle-sells") und Add-to-Cart über die Store API.',
		'example' => array(
			
		),
		'supports' => array(
			'html' => false,
			'interactivity' => true
		),
		'usesContext' => array(
			'postId'
		),
		'textdomain' => 'greeting-card-block',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php',
		'viewScriptModule' => array(
			'greeting-card-block/store',
			'file:./view.js'
		)
	)
);
