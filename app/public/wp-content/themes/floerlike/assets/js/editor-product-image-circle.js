/**
 * Block "Produktbild" (woocommerce/product-image): Kreis hinter dem Bild.
 *
 * Fügt in der Seitenleiste ein Panel "Kreis im Hintergrund" hinzu:
 *
 *   Kreis anzeigen   an/aus (Standard aus)
 *   Farbe            eine Farbe der Palette (Standard main-2-deluge)
 *   Grösse           in Prozent der Bildbreite (Standard 75)
 *
 * Gespeichert wird der Slug der Farbe, nicht ihr Wert: Ändert sich die Farbe
 * in der theme.json, ändern sich alle Kreise mit. Gezeichnet wird der Kreis
 * nur per CSS (main.css, "Kreis hinter dem Produktbild") aus einer Klasse und
 * zwei CSS-Variablen:
 *
 *   - Editor: an der Block-Hülle (editor.BlockListBlock, unten),
 *   - Seite:  am Produktbild, gesetzt von functions.php.
 *
 * Steht der Block in einer Produktvorlage, gilt die Einstellung für alle
 * Produkte der Sammlung.
 *
 * Aufbau wie assets/js/editor-product-variation.js, nach
 * https://developer.wordpress.org/news/2024/08/how-to-extend-a-wordpress-block/
 */
( () => {
	const { addFilter } = wp.hooks;
	const { createHigherOrderComponent } = wp.compose;
	const { createElement: el, Fragment } = wp.element;
	const { InspectorControls, useSettings } = wp.blockEditor;
	const { PanelBody, ToggleControl, ColorPalette, RangeControl, BaseControl } =
		wp.components;

	const BLOCK = 'woocommerce/product-image';

	// Standardwerte -- gleich in functions.php (floerlike_image_circle_*).
	const DEFAULT_COLOR = 'main-2-deluge';
	const DEFAULT_SIZE = 75;
	const MIN_SIZE = 30;
	const MAX_SIZE = 100;

	// 1. Neue Attribute. Muss stehen, bevor WooCommerce den Block registriert,
	//    sonst speichert der Editor sie nicht (Skript lädt deshalb im <head>).
	addFilter(
		'blocks.registerBlockType',
		'floerlike/product-image-circle/attributes',
		( settings, name ) =>
			name !== BLOCK
				? settings
				: {
						...settings,
						attributes: {
							...settings.attributes,
							floerlikeCircle: { type: 'boolean', default: false },
							floerlikeCircleColor: {
								type: 'string',
								default: DEFAULT_COLOR,
							},
							floerlikeCircleSize: {
								type: 'number',
								default: DEFAULT_SIZE,
							},
						},
				  }
	);

	// Klasse und Variablen für den Kreis -- dieselben, die functions.php auf
	// der Seite setzt.
	const circleStyle = ( attributes ) => ( {
		'--floerlike-circle-color': `var(--wp--preset--color--${ attributes.floerlikeCircleColor })`,
		'--floerlike-circle-size': `${ attributes.floerlikeCircleSize }%`,
	} );

	const CirclePanel = ( { attributes, setAttributes } ) => {
		// Farben wie in den übrigen Farbfeldern des Editors: die des Themes,
		// darunter die Standardfarben von WordPress (falls eingeschaltet).
		const [ themeColors = [], defaultColors = [], showDefaults ] =
			useSettings(
				'color.palette.theme',
				'color.palette.default',
				'color.defaultPalette'
			);
		const groups = [
			{ name: 'Theme', colors: themeColors },
			...( showDefaults === false
				? []
				: [ { name: 'Standard', colors: defaultColors } ] ),
		].filter( ( group ) => group.colors && group.colors.length );
		const all = groups.flatMap( ( group ) => group.colors );
		const current = all.find(
			( color ) => color.slug === attributes.floerlikeCircleColor
		);

		return el(
			InspectorControls,
			null,
			el(
				PanelBody,
				{ title: 'Kreis im Hintergrund', initialOpen: false },
				el( ToggleControl, {
					__nextHasNoMarginBottom: true,
					label: 'Kreis anzeigen',
					help: 'Ein Kreis mittig hinter dem Produktbild. In einer Produktvorlage für alle Produkte der Sammlung.',
					checked: attributes.floerlikeCircle,
					onChange: ( floerlikeCircle ) =>
						setAttributes( { floerlikeCircle } ),
				} ),
				attributes.floerlikeCircle &&
					el(
						BaseControl,
						{
							__nextHasNoMarginBottom: true,
							label: 'Farbe',
							id: 'floerlike-circle-color',
						},
						el( ColorPalette, {
							colors: groups,
							value: current ? current.color : undefined,
							disableCustomColors: true,
							clearable: false,
							// ColorPalette liefert den Farbwert -- gespeichert
							// wird der Slug.
							onChange: ( value ) => {
								const picked = all.find(
									( color ) => color.color === value
								);
								if ( picked ) {
									setAttributes( {
										floerlikeCircleColor: picked.slug,
									} );
								}
							},
						} )
					),
				attributes.floerlikeCircle &&
					el( RangeControl, {
						__nextHasNoMarginBottom: true,
						__next40pxDefaultSize: true,
						label: 'Grösse (% der Bildbreite)',
						min: MIN_SIZE,
						max: MAX_SIZE,
						step: 5,
						value: attributes.floerlikeCircleSize,
						onChange: ( value ) =>
							setAttributes( {
								floerlikeCircleSize: value ?? DEFAULT_SIZE,
							} ),
					} )
			)
		);
	};

	// 2. Panel in der Seitenleiste.
	addFilter(
		'editor.BlockEdit',
		'floerlike/product-image-circle/edit',
		createHigherOrderComponent(
			( BlockEdit ) => ( props ) =>
				props.name !== BLOCK
					? el( BlockEdit, props )
					: el(
							Fragment,
							null,
							el( BlockEdit, props ),
							props.isSelected && el( CirclePanel, props )
					  ),
			'withProductImageCircle'
		)
	);

	// 3. Kreis auch im Editor zeigen: Klasse und Variablen an der Block-Hülle.
	//    Gilt auch für die Vorschau der übrigen Produkte in einer
	//    Produktvorlage -- sie zeigt dieselben Blöcke.
	addFilter(
		'editor.BlockListBlock',
		'floerlike/product-image-circle/wrapper',
		createHigherOrderComponent(
			( BlockListBlock ) => ( props ) => {
				if ( props.name !== BLOCK || ! props.attributes.floerlikeCircle ) {
					return el( BlockListBlock, props );
				}
				const wrapperProps = props.wrapperProps || {};
				return el( BlockListBlock, {
					...props,
					className: [ props.className, 'floerlike-image-circle' ]
						.filter( Boolean )
						.join( ' ' ),
					wrapperProps: {
						...wrapperProps,
						style: {
							...( wrapperProps.style || {} ),
							...circleStyle( props.attributes ),
						},
					},
				} );
			},
			'withProductImageCircleWrapper'
		)
	);
} )();
