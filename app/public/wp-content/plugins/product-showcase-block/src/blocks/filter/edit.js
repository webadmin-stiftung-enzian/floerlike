/**
 * Editor-Ansicht des Filters: die echte Ausgabe von render.php (Spezifikation,
 * Kapitel 9 -- "Filter zeigt die echten Filter-Tags"). Im Editor sind die
 * Knöpfe nur zum Ansehen; filtern lässt sich auf der Seite.
 *
 * Anders als auf der Seite erscheinen hier alle Filter-Schlagwörter, auch
 * solche, zu denen im Schaufenster (noch) kein Produkt steht -- das prüft
 * erst der Rahmen beim Ausliefern der Seite.
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';

const Empty = () => (
	<p className="psb-filter__empty">
		{ __(
			'Filter: Noch kein Schlagwort im Filter. Unter Produkte → Schlagwörter bei einem Schlagwort „Im Filter zeigen“ einschalten.',
			'product-showcase-block'
		) }
	</p>
);

export default function Edit( { attributes, setAttributes, name } ) {
	const blockProps = useBlockProps();

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Filter', 'product-showcase-block' ) }>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Beschriftung', 'product-showcase-block' ) }
						value={ attributes.label }
						onChange={ ( label ) => setAttributes( { label } ) }
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<ServerSideRender
					block={ name }
					attributes={ attributes }
					EmptyResponsePlaceholder={ Empty }
				/>
			</div>
		</>
	);
}
