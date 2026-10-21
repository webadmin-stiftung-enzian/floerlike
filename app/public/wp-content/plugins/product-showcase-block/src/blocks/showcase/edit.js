/**
 * Editor-Ansicht des Rahmens "Schaufenster".
 *
 * Beim Einfügen legt er Filter, zwei Zeilen und "Kein Treffer" an
 * (Spezifikation, Kapitel 5.1). Danach darf man frei umsortieren und
 * beliebige Blöcke dazwischensetzen, auch Gruppen und Spalten.
 */
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

const TEMPLATE = [
	[ 'product-showcase/filter' ],
	[ 'product-showcase/row' ],
	[ 'product-showcase/row' ],
	[ 'product-showcase/empty' ],
];

export default function Edit() {
	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		template: TEMPLATE,
	} );

	return <div { ...innerBlocksProps } />;
}
