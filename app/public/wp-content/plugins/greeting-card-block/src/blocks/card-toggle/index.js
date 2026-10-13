/**
 * Block "Grusskarte hinzufügen" -- einer der Kauf-Blöcke im Rahmen "Grusskarten-Kauf".
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
				'Hier erscheint die Checkbox „Möchten Sie eine Grusskarte hinzufügen?“. Nur bei Produkten mit verknüpften Grusskarten.',
				'greeting-card-block'
			) }
			attributes={ attributes }
			context={ context }
		/>
	),
	save: () => null,
} );
