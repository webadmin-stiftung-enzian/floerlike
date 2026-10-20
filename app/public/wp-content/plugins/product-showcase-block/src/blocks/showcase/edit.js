/**
 * Editor-Ansicht des Rahmens "Schaufenster".
 *
 * Beim Einfügen legt er den Filter und zwei Zeilen an (Spezifikation,
 * Kapitel 5.1). Danach darf man frei umsortieren und beliebige Blöcke
 * dazwischensetzen, auch Gruppen und Spalten. "Kein Treffer" kommt in
 * Stufe 6 in die Vorlage.
 */
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

const TEMPLATE = [
	[ 'product-showcase/filter' ],
	[ 'product-showcase/row' ],
	[ 'product-showcase/row' ],
];

export default function Edit() {
	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		template: TEMPLATE,
	} );

	return <div { ...innerBlocksProps } />;
}
