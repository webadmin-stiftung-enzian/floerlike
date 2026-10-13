/**
 * Rahmenblock "Grusskarten-Kauf".
 *
 * Dynamischer Block mit Innenblöcken: render.php erzeugt die Ausgabe auf der
 * Seite, gespeichert werden nur die Innenblöcke selbst (InnerBlocks.Content).
 * Ohne diese save-Funktion gingen die Innenblöcke beim Speichern verloren.
 */
import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';

import { flowerIcon } from '../../shared/icon';
import Edit from './edit';
import metadata from './block.json';
import './style.scss';
import './editor.scss';

registerBlockType( metadata.name, {
	icon: flowerIcon,
	edit: Edit,
	save: () => <InnerBlocks.Content />,
} );
