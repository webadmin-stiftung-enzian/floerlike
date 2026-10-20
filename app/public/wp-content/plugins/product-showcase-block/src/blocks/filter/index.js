/**
 * Block "Filter" im Schaufenster. Rein dynamisch: kein save, die Knöpfe
 * erzeugt render.php aus den aktuellen Filter-Schlagwörtern.
 */
import { registerBlockType } from '@wordpress/blocks';

import Edit from './edit';
import metadata from './block.json';
import './style.scss';

registerBlockType( metadata.name, {
	edit: Edit,
} );
