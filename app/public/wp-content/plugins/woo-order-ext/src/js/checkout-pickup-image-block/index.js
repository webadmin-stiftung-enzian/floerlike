/**
 * Block "Bild bei Abholung" im Editor.
 *
 * Ein Kind-Block des WooCommerce-Blocks "Abholart"
 * (woocommerce/checkout-pickup-options-block, siehe "parent" in block.json).
 * Dieser Block zeigt die Abholorte und erscheint nur, wenn "Im Laden
 * abholen" gewählt ist. Unter den Abholorten hat er einen eigenen Platz für
 * Erweiterungen -- dort lässt sich das Bild einfügen. Im Editor dazu im
 * Block "Lieferung" auf "Im Laden abholen" schalten.
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
