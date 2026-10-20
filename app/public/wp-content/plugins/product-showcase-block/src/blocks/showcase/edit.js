/**
 * Editor-Ansicht des Rahmens "Schaufenster".
 *
 * Beim Einfügen legt er zwei Zeilen an (Spezifikation, Kapitel 5.1). Danach
 * darf man frei umsortieren und beliebige Blöcke dazwischensetzen, auch
 * Gruppen und Spalten. Filter und "Kein Treffer" kommen in späteren Stufen
 * in die Vorlage.
 */
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

const TEMPLATE = [ [ 'product-showcase/row' ], [ 'product-showcase/row' ] ];

export default function Edit() {
	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		template: TEMPLATE,
	} );

	return <div { ...innerBlocksProps } />;
}
