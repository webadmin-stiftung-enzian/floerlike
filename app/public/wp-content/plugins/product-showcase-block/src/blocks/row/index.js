/**
 * Block "Zeile" im Schaufenster: Überschrift + Produktsammlung einer
 * Kategorie. Dynamisch wie der Rahmen -- gespeichert werden nur die
 * Innenblöcke.
 */
import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';

import Edit from './edit';
import metadata from './block.json';

registerBlockType( metadata.name, {
	edit: Edit,
	save: () => <InnerBlocks.Content />,
} );
