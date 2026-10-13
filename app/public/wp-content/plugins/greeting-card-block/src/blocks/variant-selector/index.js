/**
 * Block "Variantenauswahl" -- einer der Kauf-Blöcke im Rahmen "Grusskarten-Kauf".
 *
 * Dynamischer Block: render.php erzeugt die Ausgabe, im Editor steht ein
 * Platzhalter (eine echte Vorschau hängt vom Produkt ab).
 */
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

import { flowerIcon } from '../../shared/icon';
import { BlockPlaceholder } from '../../shared/placeholder';
import metadata from './block.json';
import './style.scss';

registerBlockType( metadata.name, {
	icon: flowerIcon,
	edit: () => (
		<BlockPlaceholder
			title={ metadata.title }
			description={ __(
				'Hier erscheinen die Varianten des Produkts als Knöpfe (z. B. klein, mittel, gross). Nur bei variablen Produkten.',
				'greeting-card-block'
			) }
		/>
	),
	save: () => null,
} );
