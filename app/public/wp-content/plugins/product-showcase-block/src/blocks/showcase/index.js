/**
 * Rahmenblock "Schaufenster".
 *
 * Dynamischer Block mit Innenblöcken, gebaut wie der Rahmen
 * "Grusskarten-Kauf": render.php erzeugt die Ausgabe auf der Seite,
 * gespeichert werden nur die Innenblöcke (InnerBlocks.Content). Ohne diese
 * save-Funktion gingen sie beim Speichern verloren.
 */
import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';

import Edit from './edit';
import metadata from './block.json';
import './style.scss';

registerBlockType( metadata.name, {
	edit: Edit,
	save: () => <InnerBlocks.Content />,
} );
