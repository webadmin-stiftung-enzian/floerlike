/**
 * Block "Grusskarten-Auswahl" -- einer der Kauf-Blöcke im Rahmen "Grusskarten-Kauf".
 *
 * Dynamischer Block: render.php erzeugt die Ausgabe -- auf der Seite ebenso wie
 * im Editor (BlockPreview), damit beide gleich aussehen.
 */
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

import { flowerIcon } from '../../shared/icon';
import { BlockPreview } from '../../shared/placeholder';
import metadata from './block.json';
// Swiper-Styles auch im Editor (index.css = editorStyle): Die Vorschau zeigt den
// Slider im Ruhezustand, ohne dass Swiper dort läuft.
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import './style.scss';

registerBlockType( metadata.name, {
	icon: flowerIcon,
	edit: ( { attributes, context } ) => (
		<BlockPreview
			name={ metadata.name }
			title={ metadata.title }
			description={ __(
				'Hier erscheint der Slider mit den Grusskarten, sobald „Grusskarte hinzufügen“ angehakt ist.',
				'greeting-card-block'
			) }
			attributes={ attributes }
			context={ context }
		/>
	),
	save: () => null,
} );
