/**
 * Block "Varianten-Spanne". Rein dynamisch: kein save, die Ausgabe erzeugt
 * render.php aus den Varianten des Produkts.
 */
import { registerBlockType } from '@wordpress/blocks';

import Edit from './edit';
import metadata from './block.json';

registerBlockType( metadata.name, {
	edit: Edit,
} );
