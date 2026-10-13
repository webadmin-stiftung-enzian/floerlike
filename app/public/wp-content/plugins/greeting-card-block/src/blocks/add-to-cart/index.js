/**
 * Block "In den Warenkorb" -- einer der Kauf-Blöcke im Rahmen "Grusskarten-Kauf".
 *
 * Dynamischer Block: render.php erzeugt die Ausgabe -- auf der Seite ebenso wie
 * im Editor (BlockPreview), damit beide gleich aussehen.
 */
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

import { flowerIcon } from '../../shared/icon';
import { BlockPreview } from '../../shared/placeholder';
import metadata from './block.json';
import './style.scss';

registerBlockType( metadata.name, {
	icon: flowerIcon,
	edit: ( { attributes, context } ) => (
		<BlockPreview
			name={ metadata.name }
			title={ metadata.title }
			description={ __(
				'Hier erscheint der Knopf „In den Warenkorb“.',
				'greeting-card-block'
			) }
			attributes={ attributes }
			context={ context }
		/>
	),
	save: () => null,
} );
