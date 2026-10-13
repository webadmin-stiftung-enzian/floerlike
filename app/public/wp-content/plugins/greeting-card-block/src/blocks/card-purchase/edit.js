/**
 * Editor-Ansicht des Rahmens "Grusskarten-Kauf".
 *
 * Verhält sich wie die Abfrage-Schleife: Beim Einfügen legt er die Vorlage an
 * (alle fünf Kauf-Blöcke). Danach darf man frei umsortieren und beliebige
 * Blöcke dazwischensetzen, auch Gruppen und Spalten.
 *
 * Fehlt ein wesentlicher Block, zeigt der Rahmen einen Hinweis mit
 * "Wiederherstellen" und graut die betroffenen Blöcke aus -- im Inhalt und in
 * der Listenansicht (Spezifikation v4, Kapitel 5.3). Welche Blöcke wesentlich
 * sind, steht in includes/purchase-blocks.json -- dieselbe Datei liest der
 * Server.
 *
 * In der Seitenleiste lässt sich das Vorschau-Produkt wählen, mit dem die
 * Kauf-Blöcke im Editor ihre echte Ausgabe zeigen (includes/class-preview.php).
 */
import { __, sprintf } from '@wordpress/i18n';
import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { ComboboxControl, Notice, PanelBody } from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { createBlock, getBlockType } from '@wordpress/blocks';
import { useEffect, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

import definition from '../../../includes/purchase-blocks.json';

/**
 * Alle Blöcke unterhalb eines Blocks, beliebig tief, als [Name, clientId].
 *
 * Synchronisierte Vorlagen (core/block) brauchen keine Sonderbehandlung: der
 * Editor führt ihren Inhalt als Innenblöcke, getBlocks() liefert ihn mit.
 *
 * @param {Object[]} blocks Blöcke aus getBlocks().
 * @return {Array<[string, string]>} Name und clientId je Block.
 */
function collectBlocks( blocks ) {
	return blocks.flatMap( ( block ) => [
		[ block.name, block.clientId ],
		...collectBlocks( block.innerBlocks || [] ),
	] );
}

/**
 * Nur Blöcke berücksichtigen, die auch registriert sind. So fügt
 * "Wiederherstellen" nie einen unbekannten Block ein.
 *
 * @param {string} name Blockname.
 * @return {boolean} Ob der Block registriert ist.
 */
const isRegistered = ( name ) => !! getBlockType( name );

/**
 * Lesbare Liste von Blocktiteln: „Grusstext“, „In den Warenkorb“.
 *
 * @param {string[]} names Blocknamen.
 * @return {string} Titel, durch Komma getrennt.
 */
const titles = ( names ) =>
	names
		.map( ( name ) => `„${ getBlockType( name )?.title || name }“` )
		.join( ', ' );

const TEMPLATE = definition.template
	.filter( isRegistered )
	.map( ( name ) => [ name ] );

const ALL_PURCHASE_BLOCKS = [
	...definition.variable,
	...definition.cards,
	...definition.purchase,
];

/**
 * Graut Zeilen der Listenansicht aus.
 *
 * Die Listenansicht liegt ausserhalb des Inhalts (nicht im Editor-iframe) und
 * kennt keine Blocknamen als CSS-Klassen -- jede Zeile trägt aber die
 * clientId ihres Blocks als data-block. Deshalb ein kleines <style> im
 * Hauptdokument, das genau diese Zeilen trifft; es verschwindet wieder, sobald
 * der Satz vollständig ist oder der Rahmen entfernt wird.
 *
 * @param {string[]} clientIds Auszugrauende Blöcke.
 */
function useListViewDimming( clientIds ) {
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
}

/**
 * Produkte für die Auswahl "Vorschau-Produkt" -- über die Store API, die
 * ohnehin öffentlich ist und Typ und Name liefert.
 *
 * @return {Array<{value: string, label: string}>} Auswahlliste.
 */
function useProductOptions() {
	const [ options, setOptions ] = useState( [] );

	useEffect( () => {
		apiFetch( { path: '/wc/store/v1/products?per_page=100' } )
			.then( ( products ) =>
				setOptions(
					products
						.filter( ( product ) =>
							[ 'simple', 'variable' ].includes( product.type )
						)
						.map( ( product ) => ( {
							value: String( product.id ),
							label:
								product.type === 'variable'
									? sprintf(
											/* translators: %s: Produktname */
											__(
												'%s (variabel)',
												'greeting-card-block'
											),
											product.name
									  )
									: product.name,
						} ) )
				)
			)
			.catch( () => setOptions( [] ) );
	}, [] );

	return options;
}

export default function Edit( { attributes, setAttributes, clientId } ) {
	// Als Text statt als Array zurückgeben: useSelect vergleicht Rückgabewerte
	// per Referenz, ein jedes Mal neues Array würde unnötig neu rendern.
	const blocksKey = useSelect(
		( select ) =>
			collectBlocks( select( blockEditorStore ).getBlocks( clientId ) )
				.map( ( [ name, id ] ) => `${ name }|${ id }` )
				.join( ',' ),
		[ clientId ]
	);
	const blocks = blocksKey
		? blocksKey.split( ',' ).map( ( entry ) => entry.split( '|' ) )
		: [];
	const names = blocks.map( ( [ name ] ) => name );

	// Im Editor ist das Produkt unbekannt (dasselbe Template gilt für alle
	// Produkte) -- die Variantenauswahl gilt deshalb immer als wesentlich.
	const missingPurchase = [ ...definition.purchase, ...definition.variable ]
		.filter( isRegistered )
		.filter( ( name ) => ! names.includes( name ) );
	const missingCards = definition.cards
		.filter( isRegistered )
		.filter( ( name ) => ! names.includes( name ) );

	const canPurchase = missingPurchase.length === 0;
	const cardsEnabled = canPurchase && missingCards.length === 0;

	// Welche vorhandenen Blöcke gerade nicht wirken: ohne Kauf alle
	// Kauf-Blöcke, ohne vollständige Karten nur die Kartenblöcke.
	let dimmedNames = [];
	if ( ! canPurchase ) {
		dimmedNames = ALL_PURCHASE_BLOCKS;
	} else if ( ! cardsEnabled ) {
		dimmedNames = definition.cards;
	}
	useListViewDimming(
		blocks
			.filter( ( [ name ] ) => dimmedNames.includes( name ) )
			.map( ( [ , id ] ) => id )
	);

	const { insertBlocks } = useDispatch( blockEditorStore );
	const restore = ( missing ) =>
		insertBlocks(
			missing.map( ( name ) => createBlock( name ) ),
			undefined,
			clientId
		);

	const productOptions = useProductOptions();

	const blockProps = useBlockProps( {
		className: [
			! canPurchase && 'is-purchase-disabled',
			canPurchase && ! cardsEnabled && 'is-cards-disabled',
		]
			.filter( Boolean )
			.join( ' ' ),
	} );
	const { children, ...innerBlocksProps } = useInnerBlocksProps( blockProps, {
		template: TEMPLATE,
		templateLock: false,
	} );

	let notice = null;
	if ( ! canPurchase ) {
		notice = (
			<Notice
				status="error"
				isDismissible={ false }
				className="greeting-card-purchase__notice"
				actions={ [
					{
						label: __( 'Wiederherstellen', 'greeting-card-block' ),
						onClick: () =>
							restore( [ ...missingPurchase, ...missingCards ] ),
						variant: 'primary',
					},
				] }
			>
				{ sprintf(
					/* translators: %s: Liste fehlender Blöcke */
					__(
						'Kaufen ist so nicht möglich – es fehlt: %s. Auf der Seite erscheint stattdessen das normale WooCommerce-Formular, ohne Grusskarte.',
						'greeting-card-block'
					),
					titles( missingPurchase )
				) }
			</Notice>
		);
	} else if ( ! cardsEnabled ) {
		notice = (
			<Notice
				status="warning"
				isDismissible={ false }
				className="greeting-card-purchase__notice"
				actions={ [
					{
						label: __( 'Wiederherstellen', 'greeting-card-block' ),
						onClick: () => restore( missingCards ),
						variant: 'primary',
					},
				] }
			>
				{ sprintf(
					/* translators: %s: Liste fehlender Blöcke */
					__(
						'Grusskarten sind deaktiviert – es fehlt: %s. Kaufen ohne Karte funktioniert weiterhin.',
						'greeting-card-block'
					),
					titles( missingCards )
				) }
			</Notice>
		);
	}

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Vorschau', 'greeting-card-block' ) }>
					<ComboboxControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __(
							'Vorschau-Produkt',
							'greeting-card-block'
						) }
						help={ __(
							'Nur für die Ansicht im Editor. Leer = automatisch ein variables Produkt mit Grusskarten.',
							'greeting-card-block'
						) }
						value={
							attributes.previewProductId
								? String( attributes.previewProductId )
								: null
						}
						options={ productOptions }
						onChange={ ( value ) =>
							setAttributes( {
								previewProductId: value ? Number( value ) : 0,
							} )
						}
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...innerBlocksProps }>
				{ notice }
				{ children }
			</div>
		</>
	);
}
