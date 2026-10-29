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
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';

const DATA = window.psbVariationRange || { attributes: [], values: [] };

const Hint = ( { children } ) => (
	<p className="psb-variation-range__hint">{ children }</p>
);

export default function Edit( { attributes, setAttributes, context, name } ) {
	const blockProps = useBlockProps();
	const {
		label,
		attribute,
		value,
		display,
		prefix,
		suffix,
		affixOnlyIfMultiple,
		includeSimple,
	} = attributes;
	// Attributwerte brauchen ein Attribut, Zahlen (Preise …) nicht.
	const needsAttribute = value === 'term';

	let preview;
	if ( needsAttribute && ! attribute ) {
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
						onChange={ ( next ) =>
							setAttributes( { label: next } )
						}
					/>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Attribut', 'product-showcase-block' ) }
						help={
							needsAttribute
								? __(
										'Das Attribut, nach dem die Varianten gebildet sind. Produkte ohne dieses Attribut zeigen nichts.',
										'product-showcase-block'
								  )
								: __(
										'Optional: nur Produkte mit diesem Attribut. „Alle Varianten“ zeigt bei jedem Produkt einen Wert, bei einfachen Produkten den des Produkts selbst.',
										'product-showcase-block'
								  )
						}
						value={ attribute }
						options={ [
							{
								value: '',
								label: needsAttribute
									? __(
											'— wählen —',
											'product-showcase-block'
									  )
									: __(
											'Alle Varianten',
											'product-showcase-block'
									  ),
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
						onChange={ ( next ) =>
							setAttributes( { value: next } )
						}
					/>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Darstellung', 'product-showcase-block' ) }
						value={ display }
						options={ [
							{
								value: 'range',
								label: __(
									'Spanne (kleinster – grösster)',
									'product-showcase-block'
								),
							},
							{
								value: 'min',
								label: __(
									'Kleinster Wert (bei Attributwerten: erster)',
									'product-showcase-block'
								),
							},
							{
								value: 'max',
								label: __(
									'Grösster Wert (bei Attributwerten: letzter)',
									'product-showcase-block'
								),
							},
						] }
						onChange={ ( next ) =>
							setAttributes( { display: next } )
						}
					/>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Text davor', 'product-showcase-block' ) }
						help={ __(
							'Z. B. „ab“ oder „von“.',
							'product-showcase-block'
						) }
						value={ prefix }
						onChange={ ( next ) =>
							setAttributes( { prefix: next } )
						}
					/>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Text danach', 'product-showcase-block' ) }
						value={ suffix }
						onChange={ ( next ) =>
							setAttributes( { suffix: next } )
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __(
							'Zusatztext nur bei mehreren Werten',
							'product-showcase-block'
						) }
						help={ __(
							'Hat ein Produkt nur einen Preis, erscheint „CHF 35.00“ statt „ab CHF 35.00“.',
							'product-showcase-block'
						) }
						checked={ affixOnlyIfMultiple }
						onChange={ ( next ) =>
							setAttributes( { affixOnlyIfMultiple: next } )
						}
					/>
					{ ! needsAttribute && (
						<ToggleControl
							__nextHasNoMarginBottom
							label={ __(
								'Auch bei einfachen Produkten',
								'product-showcase-block'
							) }
							help={ __(
								'An: einfache Produkte zeigen ihren eigenen Wert – dann ersetzt der Block den Preis-Block. Aus: nur Produkte mit Varianten, neben dem Preis-Block steht kein Preis doppelt.',
								'product-showcase-block'
							) }
							checked={ includeSimple }
							onChange={ ( next ) =>
								setAttributes( { includeSimple: next } )
							}
						/>
					) }
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>{ preview }</div>
		</>
	);
}
