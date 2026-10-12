/**
 * Editor-Ansicht des Rahmens "Grusskarten-Kauf".
 *
 * Verhält sich wie die Abfrage-Schleife: Beim Einfügen legt er die Vorlage an
 * (alle fünf Kauf-Blöcke). Danach darf man frei umsortieren und beliebige
 * Blöcke dazwischensetzen, auch Gruppen und Spalten.
 *
 * Fehlt ein wesentlicher Block, zeigt der Rahmen einen Hinweis mit
 * "Wiederherstellen" und graut die betroffenen Blöcke aus (Spezifikation v4,
 * Kapitel 5.3). Welche Blöcke wesentlich sind, steht in
 * includes/purchase-blocks.json -- dieselbe Datei liest der Server.
 */
import { __, sprintf } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { Notice } from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { createBlock, getBlockType } from '@wordpress/blocks';

import definition from '../../../includes/purchase-blocks.json';

/**
 * Alle Blocknamen unterhalb eines Blocks, beliebig tief.
 *
 * Synchronisierte Vorlagen (core/block) brauchen keine Sonderbehandlung: der
 * Editor führt ihren Inhalt als Innenblöcke, getBlocks() liefert ihn mit.
 *
 * @param {Object[]} blocks Blöcke aus getBlocks().
 * @return {string[]} Blocknamen.
 */
function collectNames( blocks ) {
	return blocks.flatMap( ( block ) => [
		block.name,
		...collectNames( block.innerBlocks || [] ),
	] );
}

/**
 * Nur Blöcke berücksichtigen, die auch registriert sind. So bleibt der Rahmen
 * benutzbar, solange ein Teil der Blöcke noch nicht existiert (Umbau in
 * Stufen), und "Wiederherstellen" fügt nie einen unbekannten Block ein.
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

export default function Edit( { clientId } ) {
	// Als Text statt als Array zurückgeben: useSelect vergleicht Rückgabewerte
	// per Referenz, ein jedes Mal neues Array würde unnötig neu rendern.
	const namesKey = useSelect(
		( select ) =>
			collectNames(
				select( blockEditorStore ).getBlocks( clientId )
			).join( ',' ),
		[ clientId ]
	);
	const names = namesKey ? namesKey.split( ',' ) : [];

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

	const { insertBlocks } = useDispatch( blockEditorStore );
	const restore = ( missing ) =>
		insertBlocks(
			missing.map( ( name ) => createBlock( name ) ),
			undefined,
			clientId
		);

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
		<div { ...innerBlocksProps }>
			{ notice }
			{ children }
		</div>
	);
}
