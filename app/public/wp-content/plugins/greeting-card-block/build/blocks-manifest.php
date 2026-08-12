<?php
// This file is generated. Do not modify it manually.
return array(
	'greeting-card-bundle' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'greeting-card-block/greeting-card-bundle',
		'version' => '0.2.0',
		'title' => 'Grusskarte + Bundle in den Warenkorb',
		'category' => 'widgets',
		'description' => 'Auswahl-UI für die optionale Grusskarte (WooCommerce Product Bundle) und Add-to-Cart über die Store API.',
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
		'viewScriptModule' => 'file:./view.js'
	)
);
