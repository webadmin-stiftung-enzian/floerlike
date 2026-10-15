/**
 * Block "Produkt" (woocommerce/single-product): eine feste Variante zeigen.
 *
 * WooCommerce lässt dort nur ein Produkt wählen. Bei einem variablen Strauss
 * zeigt der Preis-Block darin dann die Preisspanne. Diese Erweiterung fügt in
 * der Seitenleiste ein Feld "Variante" hinzu und speichert die Wahl im neuen
 * Attribut variationId.
 *
 * Gespeichert bleibt productId = der Strauss. Die Produktauswahl von
 * WooCommerce kennt nur Produkte; stünde dort eine Varianten-ID, liesse sich
 * der Block nicht mehr sauber bearbeiten. Stattdessen:
 *
 *   - Editor: Die Hülle reicht dem WooCommerce-Block beim Anzeigen die
 *     Varianten-ID weiter. Preis, Bild und Knopf holen ihre Daten über die
 *     Store API, die Varianten kennt. Nur der Titel-Block fragt
 *     /wp/v2/product/<id> ab, und das gibt es für Varianten nicht -- dafür
 *     legt die Hülle den Titel der Variante selbst im Datenspeicher ab.
 *   - Seite: Ein Filter in functions.php tauscht productId gegen die
 *     Variante, bevor WooCommerce den Block rendert.
 *
 * Aufbau nach https://developer.wordpress.org/news/2024/08/how-to-extend-a-wordpress-block/
 */
( () => {
	const { addFilter } = wp.hooks;
	const { createHigherOrderComponent } = wp.compose;
	const { createElement: el, Fragment, useEffect, useRef, useState } =
		wp.element;
	const { InspectorControls } = wp.blockEditor;
	const { PanelBody, SelectControl, Notice, Spinner } = wp.components;
	const { dispatch } = wp.data;
	const apiFetch = wp.apiFetch;

	const BLOCK = 'woocommerce/single-product';

	// 1. Neues Attribut. Muss stehen, bevor WooCommerce den Block registriert,
	//    sonst speichert der Editor es nicht (Skript lädt deshalb im <head>).
	addFilter(
		'blocks.registerBlockType',
		'floerlike/product-variation/attribute',
		( settings, name ) =>
			name !== BLOCK
				? settings
				: {
						...settings,
						attributes: {
							...settings.attributes,
							variationId: { type: 'number' },
						},
				  }
	);

	// Preis aus der Store API ("3500", 2 Nachkommastellen) lesbar machen.
	const formatPrice = ( prices ) => {
		const minor = prices.currency_minor_unit;
		const value = ( Number( prices.price ) / 10 ** minor ).toFixed( minor );
		return `${ prices.currency_prefix }${ value }${ prices.currency_suffix }`;
	};

	// Varianten eines Produkts, in der Reihenfolge aus dem Produkt (Tab
	// "Variationen"). Je Variante: id, name ("klein"), title wie auf der
	// Seite ("Lorem Strauss – klein"), price. Bei einfachen Produkten leer.
	const loadVariations = async ( productId ) => {
		const product = await apiFetch( {
			path: `/wc/store/v1/products/${ productId }`,
		} );
		if ( product.type !== 'variable' || ! product.variations.length ) {
			return [];
		}

		// Store API liefert bei Varianten den Slug ("klein"), der Name des
		// Werts steht bei den Attributen des Produkts.
		const termNames = {};
		product.attributes.forEach( ( attribute ) =>
			attribute.terms.forEach( ( term ) => {
				termNames[ `${ attribute.name }|${ term.slug }` ] = term.name;
			} )
		);

		const ids = product.variations.map( ( variation ) => variation.id );
		const details = await apiFetch( {
			path: `/wc/store/v1/products?type=variation&per_page=100&include=${ ids.join(
				','
			) }`,
		} );
		const prices = {};
		details.forEach( ( variation ) => {
			prices[ variation.id ] = formatPrice( variation.prices );
		} );

		return product.variations.map( ( variation ) => {
			const name = variation.attributes
				.map(
					( { name: attribute, value } ) =>
						termNames[ `${ attribute }|${ value }` ] || value || '…'
				)
				.join( ', ' );
			return {
				id: variation.id,
				name,
				// So bildet WooCommerce den Namen einer Variante (bis zu zwei
				// Attribute), wptexturize macht aus " - " dann " – ".
				title: `${ product.name } – ${ name }`,
				price: prices[ variation.id ] || '',
			};
		} );
	};

	// Jedes Produkt nur einmal laden, auch bei mehreren Blöcken.
	const cache = new Map();
	const getVariations = ( productId ) => {
		if ( ! cache.has( productId ) ) {
			cache.set(
				productId,
				loadVariations( productId ).catch( ( error ) => {
					cache.delete( productId );
					throw error;
				} )
			);
		}
		return cache.get( productId );
	};

	const useVariations = ( productId ) => {
		const [ state, setState ] = useState( { list: null, failed: false } );
		useEffect( () => {
			setState( { list: null, failed: false } );
			if ( ! productId ) {
				return;
			}
			let active = true;
			getVariations( productId )
				.then( ( list ) => active && setState( { list, failed: false } ) )
				.catch( () => active && setState( { list: null, failed: true } ) );
			return () => {
				active = false;
			};
		}, [ productId ] );
		return state;
	};

	const VariationPanel = ( { variationId, list, failed, missing, onChange } ) =>
		el(
			InspectorControls,
			null,
			el(
				PanelBody,
				{ title: 'Variante', initialOpen: true },
				failed &&
					el(
						Notice,
						{ status: 'error', isDismissible: false },
						'Die Varianten konnten nicht geladen werden.'
					),
				! list && ! failed && el( Spinner ),
				missing &&
					el(
						Notice,
						{ status: 'warning', isDismissible: false },
						'Die gewählte Variante gibt es nicht mehr. Auf der Seite erscheint das Produkt mit Preisspanne.'
					),
				list &&
					el( SelectControl, {
						__nextHasNoMarginBottom: true,
						__next40pxDefaultSize: true,
						label: 'Variante',
						hideLabelFromVision: true,
						value: variationId ? String( variationId ) : '',
						options: [
							{ value: '', label: 'Alle Varianten (Preisspanne)' },
							...list.map( ( variation ) => ( {
								value: String( variation.id ),
								label: variation.price
									? `${ variation.name } – ${ variation.price }`
									: variation.name,
							} ) ),
						],
						onChange: ( value ) =>
							onChange( value ? Number( value ) : undefined ),
						help: 'Titel, Preis, Bild und Warenkorb-Knopf zeigen dann diese Variante statt der Preisspanne.',
					} )
			)
		);

	const ProductBlockEdit = ( { BlockEdit, ...props } ) => {
		const { attributes, setAttributes, isSelected } = props;
		const { productId, variationId } = attributes;
		const { list, failed } = useVariations( productId );
		const previousProductId = useRef( productId );

		// Anderes Produkt gewählt: Die Variante gehört nicht mehr dazu.
		useEffect( () => {
			if ( previousProductId.current !== productId ) {
				previousProductId.current = productId;
				if ( variationId ) {
					setAttributes( { variationId: undefined } );
				}
			}
		}, [ productId ] );

		const variation =
			list && variationId
				? list.find( ( item ) => item.id === variationId )
				: null;

		// Titel der Variante dort ablegen, wo der Titel-Block nachsieht.
		// Nur zum Anzeigen: Bearbeiten lässt sich der Titel einer Variante
		// im Editor ohnehin nicht (dafür fehlt die Berechtigungs-Antwort).
		useEffect( () => {
			if ( variation ) {
				dispatch( 'core' ).receiveEntityRecords( 'postType', 'product', [
					{
						id: variation.id,
						title: { raw: variation.title, rendered: variation.title },
					},
				] );
			}
		}, [ variation?.id, variation?.title ] );

		// Erst tauschen, wenn die Variante bestätigt zum Produkt gehört --
		// sonst bliebe der Block bei einer gelöschten Variante leer.
		const editProps = variation
			? {
					...props,
					attributes: { ...attributes, productId: variation.id },
					// Die Produktauswahl von WooCommerce darf ein anderes
					// Produkt setzen, aber nie die Variante als productId.
					setAttributes: ( next ) => {
						if ( next.productId === variation.id ) {
							const { productId: ignored, ...rest } = next;
							if ( Object.keys( rest ).length ) {
								setAttributes( rest );
							}
							return;
						}
						setAttributes( next );
					},
			  }
			: props;

		// Feld nur bei variablen Produkten (oder wenn noch eine Variante
		// gespeichert ist, die es nicht mehr gibt).
		const showPanel =
			isSelected &&
			productId &&
			( failed || ! list || list.length || variationId );

		return el(
			Fragment,
			null,
			el( BlockEdit, editProps ),
			showPanel &&
				el( VariationPanel, {
					variationId,
					list,
					failed,
					missing: !! ( list && variationId && ! variation ),
					onChange: ( value ) => setAttributes( { variationId: value } ),
				} )
		);
	};

	// 2. Hülle um die Bearbeitungsansicht, nur beim Block "Produkt".
	addFilter(
		'editor.BlockEdit',
		'floerlike/product-variation/edit',
		createHigherOrderComponent(
			( BlockEdit ) => ( props ) =>
				props.name !== BLOCK
					? el( BlockEdit, props )
					: el( ProductBlockEdit, { ...props, BlockEdit } ),
			'withProductVariation'
		)
	);
} )();
