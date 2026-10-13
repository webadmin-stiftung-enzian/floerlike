/**
 * Block "In den Warenkorb" -- einer der Kauf-Blöcke im Rahmen "Grusskarten-Kauf".
 *
 * Dynamischer Block: render.php erzeugt die Ausgabe -- auf der Seite ebenso wie
 * im Editor (BlockPreview in edit.js), damit beide gleich aussehen.
 */
import { registerBlockType } from '@wordpress/blocks';

import { flowerIcon } from '../../shared/icon';
import Edit from './edit';
import metadata from './block.json';
import './style.scss';

registerBlockType( metadata.name, {
	icon: flowerIcon,
	edit: Edit,
	save: () => null,
} );
