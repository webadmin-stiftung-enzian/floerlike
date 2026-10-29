/**
 * Block "Varianten-Spanne". Rein dynamisch: kein save, die Ausgabe erzeugt
 * render.php aus den Varianten des Produkts.
 *
 * Block-Variante "Ab-Preis": derselbe Block, fertig eingestellt auf den
 * kleinsten aktuellen Preis mit "ab" davor -- erscheint im Einfügen-Menü als
 * eigener Eintrag. isActive sorgt dafür, dass ein so eingestellter Block im
 * Editor auch als "Ab-Preis" angezeigt wird.
 */
import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';

import Edit from './edit';
import metadata from './block.json';

registerBlockType( metadata.name, {
	edit: Edit,
	variations: [
		{
			name: 'from-price',
			title: __( 'Ab-Preis', 'product-showcase-block' ),
			description: __(
				'Statt des Preis-Blocks: „ab CHF 35.00“ bei Varianten, der Preis bei einfachen Produkten.',
				'product-showcase-block'
			),
			icon: 'tag',
			attributes: {
				value: 'price',
				display: 'min',
				prefix: __( 'ab', 'product-showcase-block' ),
				affixOnlyIfMultiple: true,
				// Ersetzt den Preis-Block ganz: auch einfache Produkte
				// zeigen ihren Preis.
				includeSimple: true,
			},
			scope: [ 'inserter', 'transform' ],
			isActive: ( attributes ) =>
				attributes.value === 'price' && attributes.display === 'min',
		},
	],
} );
