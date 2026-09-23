/**
 * Darstellung der Grusskarte im Warenkorb-, Mini-Cart- und Checkout-Block.
 *
 * Diese Blöcke sind React-Anwendungen; ihr Markup lässt sich nur über die
 * offiziellen "Checkout Filters" beeinflussen. Wir setzen damit eine Klasse auf
 * die Kartenposition, der Rest ist CSS (assets/css/checkout-blocks.css).
 *
 * Die Daten stammen aus der Store-API-Erweiterung in includes/class-store-api.php
 * und liegen unter `extensions['greeting-card-block']`.
 *
 * Bewusst ohne Build-Schritt geschrieben: das Skript nutzt nur `wc.blocksCheckout`
 * aus dem globalen Namensraum (Abhängigkeit `wc-blocks-checkout`, siehe
 * includes/class-checkout-blocks-integration.php) und braucht damit weder einen
 * Bundler noch zusätzliche npm-Pakete.
 */
( function ( wc ) {
	if ( ! wc || ! wc.blocksCheckout || ! wc.blocksCheckout.registerCheckoutFilters ) {
		return;
	}

	var NAMESPACE = 'greeting-card-block';

	wc.blocksCheckout.registerCheckoutFilters( NAMESPACE, {
		/**
		 * @param {string} classList   Bisherige Klassen der Position.
		 * @param {Object} extensions  Zusatzdaten aller Erweiterungen.
		 * @return {string} Ergänzte Klassenliste.
		 */
		cartItemClass: function ( classList, extensions ) {
			var data = extensions && extensions[ NAMESPACE ];

			if ( ! data || ! data.group ) {
				return classList;
			}

			if ( 'card' === data.role && data.parentKey ) {
				return classList + ' gcb-item gcb-item--card';
			}

			if ( 'parent' === data.role && data.hasCard ) {
				return classList + ' gcb-item gcb-item--parent';
			}

			return classList;
		},
	} );
} )( window.wc );
