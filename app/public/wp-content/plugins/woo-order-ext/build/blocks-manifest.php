<?php
// This file is generated. Do not modify it manually.
return array(
	'checkout-greeting-card-block' => array(
		'apiVersion' => 3,
		'name' => 'woo-order-ext/checkout-greeting-card',
		'version' => '2.0.0',
		'title' => 'Add Greeting Card Option',
		'category' => 'woocommerce',
		'description' => 'Adds a greeting card option to the checkout.',
		'supports' => array(
			'html' => false,
			'align' => false,
			'multiple' => false,
			'reusable' => false
		),
		'attributes' => array(
			'lock' => array(
				'type' => 'object',
				'default' => array(
					'remove' => false,
					'move' => false
				)
			),
			'text' => array(
				'type' => 'string',
				'source' => 'html',
				'selector' => '.wp-block-woo-order-ext-checkout-greeting-card',
				'default' => ''
			)
		),
		'parent' => array(
			'woocommerce/checkout-fields-block',
			'woocommerce/checkout-totals-block'
		),
		'textdomain' => 'woo-order-ext',
		'editorStyle' => 'file:../../../build/style-woo-order-ext-checkout-greeting-card-block.css'
	),
	'checkout-newsletter-subscription-block' => array(
		'apiVersion' => 3,
		'name' => 'woo-order-ext/checkout-newsletter-subscription',
		'version' => '2.0.0',
		'title' => 'Newsletter Subscription!',
		'category' => 'woocommerce',
		'description' => 'Adds a newsletter subscription checkbox to the checkout.',
		'supports' => array(
			'html' => false,
			'align' => false,
			'multiple' => false,
			'reusable' => false
		),
		'attributes' => array(
			'lock' => array(
				'type' => 'object',
				'default' => array(
					'remove' => false,
					'move' => false
				)
			),
			'optInDefaultChecked' => array(
				'type' => 'boolean',
				'default' => false
			),
			'text' => array(
				'type' => 'string',
				'default' => 'Subscribe to our newsletter'
			),
			'privacyPolicyUrl' => array(
				'type' => 'string',
				'default' => ''
			)
		),
		'parent' => array(
			'woocommerce/checkout-fields-block',
			'woocommerce/checkout-totals-block'
		),
		'textdomain' => 'woo-order-ext',
		'editorStyle' => 'file:../../../build/style-woo-order-ext-checkout-newsletter-subscription-block.css'
	),
	'checkout-pickup-image-block' => array(
		'apiVersion' => 3,
		'name' => 'woo-order-ext/checkout-pickup-image',
		'version' => '1.0.0',
		'title' => 'Bild bei Abholung',
		'category' => 'woocommerce',
		'description' => 'Zeigt im Block „Abholart“ ein Bild, z. B. einen Kartenausschnitt mit dem Laden – nur wenn „Im Laden abholen“ gewählt ist.',
		'keywords' => array(
			'karte',
			'abholung',
			'pickup',
			'bild'
		),
		'supports' => array(
			'html' => false,
			'align' => false,
			'multiple' => false,
			'reusable' => false
		),
		'attributes' => array(
			'lock' => array(
				'type' => 'object',
				'default' => array(
					'remove' => false,
					'move' => false
				)
			),
			'enabled' => array(
				'type' => 'boolean',
				'default' => true
			),
			'mediaId' => array(
				'type' => 'number',
				'default' => 0
			),
			'url' => array(
				'type' => 'string',
				'default' => ''
			),
			'alt' => array(
				'type' => 'string',
				'default' => ''
			),
			'linkUrl' => array(
				'type' => 'string',
				'default' => ''
			)
		),
		'parent' => array(
			'woocommerce/checkout-pickup-options-block'
		),
		'textdomain' => 'woo-order-ext'
	),
	'placeholder-block' => array(
		'apiVersion' => 3,
		'name' => 'woo-order-ext/placeholder-block',
		'version' => '2.0.0',
		'title' => 'Placeholder Block',
		'category' => 'woocommerce',
		'description' => 'Placeholder for future checkout functionality.',
		'supports' => array(
			'html' => false,
			'align' => false,
			'multiple' => false,
			'reusable' => false
		),
		'attributes' => array(
			'lock' => array(
				'type' => 'object',
				'default' => array(
					'remove' => false,
					'move' => false
				)
			)
		),
		'parent' => array(
			'woocommerce/checkout-fields-block',
			'woocommerce/checkout-totals-block'
		),
		'textdomain' => 'woo-order-ext'
	)
);
