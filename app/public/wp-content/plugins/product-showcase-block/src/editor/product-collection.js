/**
 * Produktsammlung, Stil "Swiper Slider": Panel "Slider" in der Seitenleiste.
 *
 * Gleiche Bauweise wie das Feld "Variante" am Block "Produkt" im Theme
 * (https://developer.wordpress.org/news/2024/08/how-to-extend-a-wordpress-block/):
 *
 *   1. blocks.registerBlockType  neues Attribut psbSlider
 *   2. editor.BlockEdit          Panel, nur wenn der Stil gewählt ist
 *
 * Ausgewertet wird das Attribut auf dem Server (includes/class-slider.php,
 * psb_slider_config()) -- dort stehen auch die Standardwerte, hier werden
 * sie nur zur Anzeige nachgebildet.
 */
import { __ } from '@wordpress/i18n';
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, RangeControl, ToggleControl } from '@wordpress/components';

const BLOCK = 'woocommerce/product-collection';
const STYLE_CLASS = 'is-style-swiper';

addFilter(
	'blocks.registerBlockType',
	'product-showcase-block/slider-attribute',
	( settings, name ) =>
		name !== BLOCK
			? settings
			: {
					...settings,
					attributes: {
						...settings.attributes,
						psbSlider: { type: 'object' },
					},
			  }
);

const isSlider = ( className = '' ) =>
	className.split( /\s+/ ).includes( STYLE_CLASS );

const SliderPanel = ( { attributes, setAttributes } ) => {
	const slider = attributes.psbSlider || {};
	const columns = attributes.displayLayout?.columns || 4;

	// Wie psb_slider_config(): ohne eigene Werte wie vor dem Umzug ins Plugin.
	const desktop = slider.desktop ?? columns;
	const tablet = slider.tablet ?? Math.min( 2, desktop );
	const mobile = slider.mobile ?? 1;

	const update = ( key ) => ( value ) =>
		setAttributes( { psbSlider: { ...slider, [ key ]: value } } );

	return (
		<InspectorControls>
			<PanelBody title={ __( 'Slider', 'product-showcase-block' ) }>
				<p>
					{ __(
						'„Produkte pro Seite“ in den Einstellungen der Abfrage ist hier die Anzahl der Produkte im Slider insgesamt.',
						'product-showcase-block'
					) }
				</p>
				<RangeControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __(
						'Sichtbare Produkte – Desktop',
						'product-showcase-block'
					) }
					help={ __( 'ab 1024px Breite', 'product-showcase-block' ) }
					min={ 1 }
					max={ 8 }
					value={ desktop }
					onChange={ update( 'desktop' ) }
				/>
				<RangeControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __(
						'Sichtbare Produkte – Tablet',
						'product-showcase-block'
					) }
					help={ __( '640–1023px', 'product-showcase-block' ) }
					min={ 1 }
					max={ 6 }
					value={ tablet }
					onChange={ update( 'tablet' ) }
				/>
				<RangeControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __(
						'Sichtbare Produkte – Handy',
						'product-showcase-block'
					) }
					help={ __( 'schmaler als 640px', 'product-showcase-block' ) }
					min={ 1 }
					max={ 4 }
					value={ mobile }
					onChange={ update( 'mobile' ) }
				/>
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __(
						'Letzte Karte anschneiden',
						'product-showcase-block'
					) }
					help={ __(
						'Die nächste Karte schaut am Rand hervor und zeigt, dass es weitergeht.',
						'product-showcase-block'
					) }
					checked={ !! slider.peek }
					onChange={ update( 'peek' ) }
				/>
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Pfeile anzeigen', 'product-showcase-block' ) }
					checked={ slider.navigation ?? true }
					onChange={ update( 'navigation' ) }
				/>
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Punkte anzeigen', 'product-showcase-block' ) }
					checked={ slider.pagination ?? true }
					onChange={ update( 'pagination' ) }
				/>
				<p>
					<em>
						{ __(
							'Im Editor bleibt die Vorschau ein Raster; der Slider läuft auf der Seite.',
							'product-showcase-block'
						) }
					</em>
				</p>
			</PanelBody>
		</InspectorControls>
	);
};

addFilter(
	'editor.BlockEdit',
	'product-showcase-block/slider-panel',
	createHigherOrderComponent(
		( BlockEdit ) => ( props ) => (
			<>
				<BlockEdit { ...props } />
				{ props.name === BLOCK &&
					props.isSelected &&
					isSlider( props.attributes.className ) && (
						<SliderPanel { ...props } />
					) }
			</>
		),
		'withProductShowcaseSlider'
	)
);
