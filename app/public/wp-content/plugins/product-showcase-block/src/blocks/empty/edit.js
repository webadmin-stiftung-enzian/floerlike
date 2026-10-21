/**
 * Editor-Ansicht von "Kein Treffer".
 *
 * Im Editor immer sichtbar, damit man den Inhalt bearbeiten kann -- auf der
 * Seite erscheint der Block nur, wenn beim gewählten Filter alle Zeilen leer
 * sind. Vorlage: ein Absatz mit dem Hinweis aus der Spezifikation (Kapitel 1).
 * Der Knopf ist hier nur Vorschau; seine Beschriftung steht in der
 * Seitenleiste.
 */
import { __ } from '@wordpress/i18n';
import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

const TEMPLATE = [
	[
		'core/paragraph',
		{
			content: __(
				'Für diesen Anlass haben wir gerade nichts – schau bald wieder vorbei.',
				'product-showcase-block'
			),
		},
	],
];

export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps();
	const { children, ...innerBlocksProps } = useInnerBlocksProps( blockProps, {
		template: TEMPLATE,
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Kein Treffer', 'product-showcase-block' ) }>
					<p>
						{ __(
							'Erscheint auf der Seite nur, wenn beim gewählten Filter in keiner Zeile ein Produkt übrig bleibt.',
							'product-showcase-block'
						) }
					</p>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Beschriftung des Knopfs', 'product-showcase-block' ) }
						value={ attributes.resetLabel }
						onChange={ ( resetLabel ) => setAttributes( { resetLabel } ) }
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...innerBlocksProps }>
				{ children }
				<p className="psb-empty__actions">
					<span className="psb-empty__reset button outline">
						{ attributes.resetLabel }
					</span>
				</p>
			</div>
		</>
	);
}
