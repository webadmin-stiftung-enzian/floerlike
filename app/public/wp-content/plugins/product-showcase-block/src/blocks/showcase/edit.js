/**
 * Editor-Ansicht des Rahmens "Schaufenster".
 *
 * Beim Einfügen legt er Filter, zwei Zeilen und "Kein Treffer" an
 * (Spezifikation, Kapitel 5.1). Danach darf man frei umsortieren und
 * beliebige Blöcke dazwischensetzen, auch Gruppen und Spalten.
 *
 * Vorschau-Filter (Kapitel 9): In der Seitenleiste lässt sich ein
 * Filter-Schlagwort wählen. Was bei diesem Filter auf der Seite verschwinden
 * würde, wird ausgegraut, nicht versteckt -- man muss es ja noch bearbeiten
 * können:
 *
 *   - Zeilen ohne passendes Produkt (Inhalt und Listenansicht),
 *   - in den übrigen Zeilen die einzelnen unpassenden Produkte,
 *   - "Kein Treffer", solange noch eine Zeile übrig bliebe.
 *
 * Auf der Seite ändert die Einstellung nichts.
 */
import { __, sprintf } from '@wordpress/i18n';
import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

const TEMPLATE = [
	[ 'product-showcase/filter' ],
	[ 'product-showcase/row' ],
	[ 'product-showcase/row' ],
	[ 'product-showcase/empty' ],
];

/**
 * Filter-Schlagwörter für die Auswahl, vom Server mitgegeben (Ende von
 * includes/class-blocks.php) -- alle mit "Im Filter zeigen", auch
 * ausserhalb ihres Zeitraums.
 *
 * @type {Array<{id: number, slug: string, name: string, active: boolean}>}
 */
const FILTER_TAGS = window.psbEditorData?.filterTags || [];

/**
 * Zeilen und "Kein Treffer" unterhalb des Rahmens, beliebig tief, mit den
 * Kategorien der Produktsammlungen je Zeile.
 *
 * @param {Object[]} blocks Blöcke aus getBlocks().
 * @param {Object}   found  Sammelt rows und empties.
 * @param {?Object}  row    Zeile, in der wir gerade stehen.
 * @return {Object} found
 */
function collect( blocks, found = { rows: [], empties: [] }, row = null ) {
	blocks.forEach( ( block ) => {
		let current = row;
		if ( block.name === 'product-showcase/row' ) {
			current = { clientId: block.clientId, categories: [] };
			found.rows.push( current );
		} else if ( block.name === 'product-showcase/empty' ) {
			found.empties.push( block.clientId );
		} else if (
			block.name === 'woocommerce/product-collection' &&
			current
		) {
			current.categories.push(
				...( block.attributes.query?.taxQuery?.product_cat || [] )
			);
		}
		collect( block.innerBlocks || [], found, current );
	} );
	return found;
}

/**
 * Graut Blöcke aus -- im Inhalt über ein <style>, das hier im Block
 * gerendert wird und so im Editor-iframe landet; in der Listenansicht über
 * ein <style> im Hauptdokument, wie beim Grusskarten-Kauf. Beide treffen die
 * Blöcke über ihre clientId (data-block).
 *
 * Einzelne Produkte haben keine eigene clientId: Die Produktvorlage zeigt
 * im Editor dieselben Blöcke für jedes Produkt. Erkennbar ist ein Produkt
 * aber am Link seines Titels -- unpassende Produkte trifft deshalb eine
 * Regel "Karte, die keinen der passenden Links enthält". Karten ganz ohne
 * Link (Titel entfernt oder nicht verlinkt) bleiben unberührt.
 *
 * @param {string[]} clientIds  Auszugrauende Blöcke.
 * @param {string[]} rowIds     Zeilen, in denen Produkte geprüft werden.
 * @param {?string[]} links     Permalinks der passenden Produkte; null =
 *                              Produkte nicht prüfen.
 * @return {?Element} <style> für den Inhalt.
 */
function useDimming( clientIds, rowIds, links ) {
	const key = clientIds.join( ',' );

	useEffect( () => {
		if ( ! key ) {
			return undefined;
		}
		const style = document.createElement( 'style' );
		style.textContent = `${ key
			.split( ',' )
			.map(
				( id ) => `.block-editor-list-view-leaf[data-block="${ id }"]`
			)
			.join( ',\n' ) } { opacity: 0.45; }`;
		document.head.appendChild( style );

		return () => style.remove();
	}, [ key ] );

	const rules = [];
	if ( key ) {
		rules.push(
			`${ clientIds
				.map( ( id ) => `[data-block="${ id }"]` )
				.join( ',\n' ) } { opacity: 0.4; }`
		);
	}
	if ( links && rowIds.length ) {
		// JSON.stringify ergibt einen gültigen CSS-String in "…".
		const matching = links
			.map( ( link ) => `:has(a[href=${ JSON.stringify( link ) }])` )
			.join( ', ' );
		const notMatching = matching ? `:not(${ matching })` : '';
		rules.push(
			`${ rowIds
				.map(
					( id ) =>
						`[data-block="${ id }"] li.wc-block-product:has(a[href])${ notMatching }`
				)
				.join( ',\n' ) } { opacity: 0.4; }`
		);
	}

	return rules.length ? <style>{ rules.join( '\n' ) }</style> : null;
}

/**
 * Permalinks aller Produkte mit dem Schlagwort (Store API, wie das Ausdünnen
 * auf der Seite: Schlagwort am Produkt).
 *
 * @param {?number} tagId Schlagwort, null = kein Vorschau-Filter.
 * @return {?string[]} Permalinks; null, solange nichts zu prüfen ist oder es
 *                     lädt.
 */
function useMatchingLinks( tagId ) {
	const [ links, setLinks ] = useState( null );

	useEffect( () => {
		setLinks( null );
		if ( ! tagId ) {
			return undefined;
		}

		let cancelled = false;
		apiFetch( {
			path: `/wc/store/v1/products?tag=${ tagId }&per_page=100`,
		} )
			.then( ( products ) => products.map( ( p ) => p.permalink ) )
			// Abfrage fehlgeschlagen: keine Produkte ausgrauen.
			.catch( () => null )
			.then( ( result ) => {
				if ( ! cancelled ) {
					setLinks( result );
				}
			} );

		return () => {
			cancelled = true;
		};
	}, [ tagId ] );

	return links;
}

/**
 * Welche Zeilen hätten beim Schlagwort noch Produkte? Fragt WooCommerce
 * (Store API) je Zeile: Kategorie der Zeile und Schlagwort, ein Treffer
 * genügt.
 *
 * @param {Object[]} rows  Zeilen aus collect().
 * @param {?number}  tagId Schlagwort, null = kein Vorschau-Filter.
 * @return {?Object<string, boolean>} clientId => hat Produkte; null, solange
 *                                    nichts zu prüfen ist oder es lädt.
 */
function useRowHits( rows, tagId ) {
	const rowsKey = rows
		.map( ( row ) => `${ row.clientId }:${ row.categories.join( '.' ) }` )
		.join( ',' );
	const [ hits, setHits ] = useState( null );

	useEffect( () => {
		setHits( null );
		if ( ! tagId || ! rowsKey ) {
			return undefined;
		}

		let cancelled = false;
		Promise.all(
			rowsKey.split( ',' ).map( ( entry ) => {
				const [ rowId, categories ] = entry.split( ':' );
				const params = new URLSearchParams( {
					tag: String( tagId ),
					per_page: '1',
				} );
				if ( categories ) {
					params.set(
						'category',
						categories.split( '.' ).join( ',' )
					);
				}
				return (
					apiFetch( { path: `/wc/store/v1/products?${ params }` } )
						.then( ( products ) => [ rowId, products.length > 0 ] )
						// Abfrage fehlgeschlagen: lieber nicht ausgrauen.
						.catch( () => [ rowId, true ] )
				);
			} )
		).then( ( entries ) => {
			if ( ! cancelled ) {
				setHits( Object.fromEntries( entries ) );
			}
		} );

		return () => {
			cancelled = true;
		};
	}, [ rowsKey, tagId ] );

	return hits;
}

export default function Edit( { attributes, setAttributes, clientId } ) {
	const previewTag = FILTER_TAGS.find(
		( tag ) => tag.slug === attributes.previewTag
	);

	// Als Text statt als Objekt: useSelect vergleicht per Referenz, ein jedes
	// Mal neues Objekt würde unnötig neu rendern.
	const foundKey = useSelect(
		( select ) =>
			JSON.stringify(
				collect( select( blockEditorStore ).getBlocks( clientId ) )
			),
		[ clientId ]
	);
	const { rows, empties } = JSON.parse( foundKey );

	const hits = useRowHits( rows, previewTag?.id ?? null );
	const links = useMatchingLinks( previewTag?.id ?? null );

	const emptyRows = hits
		? rows
				.filter( ( row ) => ! hits[ row.clientId ] )
				.map( ( row ) => row.clientId )
		: [];
	// "Kein Treffer" erscheint nur, wenn alle Zeilen leer wären.
	const dimmed =
		hits && emptyRows.length < rows.length
			? [ ...emptyRows, ...empties ]
			: emptyRows;
	// Produkte nur in Zeilen prüfen, die nicht schon ganz ausgegraut sind --
	// sonst würde die Deckkraft doppelt wirken.
	const keptRows = hits
		? rows
				.filter( ( row ) => hits[ row.clientId ] )
				.map( ( row ) => row.clientId )
		: [];
	const dimStyle = useDimming( dimmed, keptRows, links );

	const blockProps = useBlockProps();
	const { children, ...innerBlocksProps } = useInnerBlocksProps( blockProps, {
		template: TEMPLATE,
	} );

	let help = __(
		'Nur im Editor: graut aus, was bei diesem Filter auf der Seite verschwinden würde.',
		'product-showcase-block'
	);
	if ( previewTag && hits ) {
		help = sprintf(
			/* translators: 1: Zeilen mit Produkten, 2: Zeilen insgesamt */
			__(
				'%1$d von %2$d Zeilen hätten Produkte. Ausgegraute Blöcke erscheinen bei diesem Filter nicht.',
				'product-showcase-block'
			),
			rows.length - emptyRows.length,
			rows.length
		);
	} else if ( previewTag ) {
		help = __( 'Wird geprüft …', 'product-showcase-block' );
	}

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Vorschau', 'product-showcase-block' ) }>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __(
							'Vorschau-Filter',
							'product-showcase-block'
						) }
						help={ help }
						value={ attributes.previewTag }
						options={ [
							{
								value: '',
								label: __(
									'Kein Filter',
									'product-showcase-block'
								),
							},
							...FILTER_TAGS.map( ( tag ) => ( {
								value: tag.slug,
								label: tag.active
									? tag.name
									: sprintf(
											/* translators: %s: Name des Schlagworts */
											__(
												'%s (gerade ausserhalb des Zeitraums)',
												'product-showcase-block'
											),
											tag.name
									  ),
							} ) ),
						] }
						onChange={ ( value ) =>
							setAttributes( { previewTag: value } )
						}
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...innerBlocksProps }>
				{ dimStyle }
				{ children }
			</div>
		</>
	);
}
