/**
 * Block "Kein Treffer" im Schaufenster. Dynamisch wie Rahmen und Zeile --
 * gespeichert werden nur die Innenblöcke, den Knopf "Filter aufheben"
 * erzeugt render.php.
 */
import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';

import Edit from './edit';
import metadata from './block.json';

registerBlockType( metadata.name, {
	edit: Edit,
	save: () => <InnerBlocks.Content />,
} );
