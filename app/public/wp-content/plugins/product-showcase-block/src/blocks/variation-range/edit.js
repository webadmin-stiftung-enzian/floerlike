/**
 * Editor-Ansicht der "Varianten-Spanne".
 *
 * Zeigt die echte Ausgabe von render.php für das Produkt, das die
 * Produktvorlage gerade darstellt (Kontext postId). ServerSideRender kennt
 * keinen Block-Kontext -- die Produkt-ID geht deshalb als post_id mit, die
 * der Endpunkt als aktuellen Beitrag setzt.
 *
 * Attribute und Werte für die Auswahl gibt der Server mit
 * (window.psbVariationRange, includes/class-variation-range.php).
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, SelectControl, TextControl } from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';

const DATA = window.psbVariationRange || { attributes: [], values: [] };

const Hint = ( { children } ) => (
	<p className="psb-variation-range__hint">{ children }</p>
);

export default function Edit( { attributes, setAttributes, context, name } ) {
	const blockProps = useBlockProps();
	const { label, attribute, value } = attributes;

	let preview;
	if ( ! attribute ) {
		preview = (
			<Hint>
				{ __(
					'Varianten-Spanne: In der Seitenleiste ein Attribut wählen.',
					'product-showcase-block'
				) }
			</Hint>
		);
	} else if ( ! context.postId ) {
		preview = (
			<Hint>
				{ __(
					'Varianten-Spanne: erscheint in der Produktvorlage einer Produktsammlung oder auf der Produktseite.',
					'product-showcase-block'
				) }
			</Hint>
		);
	} else {
		preview = (
			<ServerSideRender
				block={ name }
				attributes={ attributes }
				urlQueryArgs={ { post_id: context.postId } }
				// Kein passender Wert bei diesem Produkt: wie auf der Seite
				// nichts, aber im Editor ein leiser Hinweis.
				EmptyResponsePlaceholder={ () => (
					<Hint>
						{ __(
							'Varianten-Spanne: bei diesem Produkt nichts anzuzeigen.',
							'product-showcase-block'
						) }
					</Hint>
				) }
			/>
		);
	}

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Varianten-Spanne', 'product-showcase-block' ) }
				>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Beschriftung', 'product-showcase-block' ) }
						help={ __(
							'Z. B. „Grösse“. Leer = ohne Beschriftung.',
							'product-showcase-block'
						) }
						value={ label }
						onChange={ ( next ) => setAttributes( { label: next } ) }
					/>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Attribut', 'product-showcase-block' ) }
						help={ __(
							'Das Attribut, nach dem die Varianten gebildet sind. Produkte ohne dieses Attribut zeigen nichts.',
							'product-showcase-block'
						) }
						value={ attribute }
						options={ [
							{
								value: '',
								label: __( '— wählen —', 'product-showcase-block' ),
							},
							...DATA.attributes,
						] }
						onChange={ ( next ) =>
							setAttributes( { attribute: next } )
						}
					/>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __(
							'Wert aus der Variante',
							'product-showcase-block'
						) }
						help={ __(
							'Zahlen: kleinster bis grösster Wert. Attributwert: erster bis letzter in der Reihenfolge der Varianten am Produkt.',
							'product-showcase-block'
						) }
						value={ value }
						options={ DATA.values }
						onChange={ ( next ) => setAttributes( { value: next } ) }
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>{ preview }</div>
		</>
	);
}
