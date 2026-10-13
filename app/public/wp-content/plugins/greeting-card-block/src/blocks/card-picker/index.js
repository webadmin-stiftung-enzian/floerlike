/**
 * Block "Grusskarten-Auswahl" -- einer der Kauf-Blöcke im Rahmen "Grusskarten-Kauf".
 *
 * Dynamischer Block: render.php erzeugt die Ausgabe -- auf der Seite ebenso wie
 * im Editor (BlockPreview in edit.js), damit beide gleich aussehen.
 */
import { registerBlockType } from '@wordpress/blocks';

import { flowerIcon } from '../../shared/icon';
import Edit from './edit';
import metadata from './block.json';
// Swiper-Styles auch im Editor (index.css = editorStyle): Die Vorschau zeigt den
// Slider im Ruhezustand, ohne dass Swiper dort läuft.
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import './editor.scss';
import './style.scss';

registerBlockType( metadata.name, {
	icon: flowerIcon,
	edit: Edit,
	save: () => null,
} );
