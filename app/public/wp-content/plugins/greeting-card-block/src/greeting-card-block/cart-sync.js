/**
 * Klassisches viewScript für die WooCommerce-Blocks-Integration.
 *
 * Die WooCommerce-Blocks-APIs (extensionCartUpdate, processErrorResponse)
 * stehen nur als klassische Script-Globals (window.wc.*) zur Verfügung und
 * können daher NICHT aus dem Interactivity-Module (view.js) importiert werden.
 * Deshalb läuft die Cart-Schreiblogik in diesem separaten klassischen Script.
 *
 * Die Auswahl wird bewusst aus dem DOM gelesen (Single Source of Truth), das
 * vom Interactivity-Store in view.js gepflegt wird – so bleiben beide Welten
 * entkoppelt.
 */

import { extensionCartUpdate } from '@woocommerce/blocks-checkout';
import { processErrorResponse } from '@woocommerce/block-data';

// [DEBUG] Bestätigt, dass das klassische viewScript geladen wurde und die
// WooCommerce-Globals verfügbar sind.
/* eslint-disable no-console */
console.log(
	'[greeting-card][DEBUG] cart-sync.js geladen. extensionCartUpdate=',
	typeof extensionCartUpdate
);
/* eslint-enable no-console */

document.body.addEventListener( 'wc-blocks_added_to_cart', () => {
	const checkbox = document.getElementById( 'isGreetingCardChecked' );
	const wantsCard = checkbox ? checkbox.checked : false;

	const selectedCard = document.querySelector(
		'.greeting-card-block__card[aria-pressed="true"]'
	);
	const selectedCardId = selectedCard ? selectedCard.dataset.cardId : '';

	const messageElement = document.getElementById( 'greetingCardMessage' );
	const text = messageElement ? messageElement.value.trim() : '';

	if ( ! wantsCard || ! selectedCardId || ! text ) {
		return;
	}

	extensionCartUpdate( {
		namespace: 'greeting-card-block',
		data: {
			action: 'add',
			card_id: selectedCardId,
			text,
		},
	} ).catch( ( error ) => processErrorResponse( error ) );
} );
