/**
 * Editor-Ansicht der "Produktangabe" (früher "Varianten-Spanne").
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

const PRODUCTS_HELP = {
	variable: __(
		'Einfache Produkte zeigen nichts – neben dem Preis-Block von WooCommerce steht so kein Preis doppelt.',
		'product-showcase-block'
	),
	all: __(
		'Einfache Produkte zeigen ihren eigenen Wert. So ersetzt der Block z. B. den Preis-Block.',
		'product-showcase-block'
	),
	simple: __(
		'Produkte mit Varianten zeigen nichts – z. B. für den Durchmesser, den bei ihnen schon die Variantenauswahl zeigt.',
		'product-showcase-block'
	),
};

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
		products,
	} = attributes;
	// Attributwerte gibt es nur bei Varianten und brauchen ein Attribut.
	// Zahlen (Preise, Durchmesser) gehen ohne -- und auch bei einfachen
	// Produkten.
	const isTerm = value === 'term';
	// Nur einfache Produkte: ein einziger Wert, Attribut und Darstellung
	// spielen keine Rolle.
	const onlySimple = ! isTerm && products === 'simple';

	let preview;
	if ( isTerm && ! attribute ) {
		preview = (
			<Hint>
				{ __(
					'Produktangabe: In der Seitenleiste ein Attribut wählen.',
					'product-showcase-block'
				) }
			</Hint>
		);
	} else if ( ! context.postId ) {
		preview = (
			<Hint>
				{ __(
					'Produktangabe: erscheint in der Produktvorlage einer Produktsammlung oder auf der Produktseite.',
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
							'Produktangabe: bei diesem Produkt nichts anzuzeigen.',
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
					title={ __( 'Produktangabe', 'product-showcase-block' ) }
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
						label={ __( 'Wert', 'product-showcase-block' ) }
						help={
							isTerm
								? __(
										'Die Werte des Attributs (klein, mittel, gross) – gibt es nur bei Produkten mit Varianten.',
										'product-showcase-block'
								  )
								: __(
										'Bei Varianten: kleinster bis grösster Wert. Bei einfachen Produkten: der Wert des Produkts selbst.',
										'product-showcase-block'
								  )
						}
						value={ value }
						options={ DATA.values }
						onChange={ ( next ) =>
							setAttributes( { value: next } )
						}
					/>
					{ ! isTerm && (
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __( 'Produkte', 'product-showcase-block' ) }
							help={ PRODUCTS_HELP[ products ] }
							value={ products }
							options={ [
								{
									value: 'variable',
									label: __(
										'Nur mit Varianten',
										'product-showcase-block'
									),
								},
								{
									value: 'all',
									label: __(
										'Alle Produkte',
										'product-showcase-block'
									),
								},
								{
									value: 'simple',
									label: __(
										'Nur einfache Produkte',
										'product-showcase-block'
									),
								},
							] }
							onChange={ ( next ) =>
								setAttributes( { products: next } )
							}
						/>
					) }
					{ ! onlySimple && (
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __( 'Attribut', 'product-showcase-block' ) }
							help={
								isTerm
									? __(
											'Das Attribut, nach dem die Varianten gebildet sind. Produkte ohne dieses Attribut zeigen nichts.',
											'product-showcase-block'
									  )
									: __(
											'Optional: nur Produkte, deren Varianten nach diesem Attribut gebildet sind. „Alle Varianten“: jede Variante zählt.',
											'product-showcase-block'
									  )
							}
							value={ attribute }
							options={ [
								{
									value: '',
									label: isTerm
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
					) }
					{ ! onlySimple && (
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __(
								'Darstellung bei Varianten',
								'product-showcase-block'
							) }
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
					) }
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
					{ /* Nur einfache Produkte haben nie mehrere Werte -- dort
					   stehen die Zusatztexte immer (render.php). */ }
					{ ! onlySimple && (
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
					) }
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>{ preview }</div>
		</>
	);
}
