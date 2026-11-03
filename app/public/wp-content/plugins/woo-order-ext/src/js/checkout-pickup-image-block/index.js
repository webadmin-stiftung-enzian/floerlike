/**
 * Block "Bild bei Abholung" im Editor.
 *
 * Ein Kind-Block des WooCommerce-Blocks "Lieferung"
 * (woocommerce/checkout-shipping-method-block, siehe "parent" in
 * block.json). Dieser Block hat einen eigenen Platz für Erweiterungen unter
 * den Knöpfen "Versand" / "Im Laden abholen" -- dort lässt er sich einfügen.
 */
import { registerBlockType } from '@wordpress/blocks';
import { Icon, mapMarker } from '@wordpress/icons';

import { Edit, Save } from './edit';
import metadata from './block.json';

registerBlockType( metadata, {
	icon: {
		src: <Icon icon={ mapMarker } />,
		foreground: '#874FB9',
	},
	edit: Edit,
	save: Save,
} );
