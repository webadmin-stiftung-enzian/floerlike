/**
 * Use this file for JavaScript code that you want to run in the front-end
 * on posts/pages that contain this block.
 *
 * When this file is defined as the value of the `viewScript` property
 * in `block.json` it will be enqueued on the front end of the site.
 *
 * Example:
 *
 * ```js
 * {
 *   "viewScript": "file:./view.js"
 * }
 * ```
 *
 * If you're not making any changes to this file because your project doesn't need any
 * JavaScript running in the front-end, then you should delete this file and remove
 * the `viewScript` property from `block.json`.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/#view-script
 */

// import Swiper JS
import Swiper from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';
// import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import { store, getElement } from '@wordpress/interactivity';

// [DEBUG] Wird ausgegeben, sobald das Interactivity-Module geladen/ausgeführt
// wird. Erscheint dies NICHT in der Konsole, wird das Module gar nicht
// enqueued (z. B. weil WordPress den Block nicht als interaktiv erkennt).
/* eslint-disable no-console */
console.log( '[greeting-card][DEBUG] view.js Module geladen & ausgeführt' );
/* eslint-enable no-console */

const MAX_LENGTH = 300;

const { state } = store('greeting-card-block', {
	state: {
		get charCounter() {
			return `Zeichen verbleibend: ${MAX_LENGTH - state.text.length}`;
		},
		get isCardPressed() {
			const { ref } = getElement();
			return state.selectedCardId === ref.dataset.cardId;
		},
		get isCardSelected() {
			return state.selectedCardId !== '';
		},
		get hasText() {
			return state.text.trim() !== '';
		},
		get isValid() {
			return ! state.wantsCard || ( state.isCardSelected && state.hasText );
		},
		get showCardError() {
			return state.wantsCard && state.validated && ! state.isCardSelected;
		},
		get showTextError() {
			return state.wantsCard && state.validated && ! state.hasText;
		},
	},
	actions: {
		toggleWantsCard( event ) {
			state.wantsCard = event.target.checked;
		},
		selectCard() {
			const { ref } = getElement();
			const cardId = ref.dataset.cardId;
			// Toggle: erneutes Klicken hebt die Auswahl auf.
			state.selectedCardId = state.selectedCardId === cardId ? '' : cardId;
		},
		updateText( event ) {
			state.text = event.target.value.substring( 0, MAX_LENGTH );
		},
	},
	callbacks: {
		// [DEBUG] Wird via data-wp-init am Root-Element aufgerufen. Erscheint dies,
		// dann hat die Interactivity API das DOM erfolgreich hydratisiert und die
		// Direktiven (data-wp-*) sind aktiv.
		debugInit() {
			const { ref } = getElement();
			/* eslint-disable no-console */
			console.log(
				'[greeting-card][DEBUG] Interactivity hydratisiert. Root-Element:',
				ref,
				'| Initial-State:',
				{
					wantsCard: state.wantsCard,
					selectedCardId: state.selectedCardId,
					text: state.text,
					validated: state.validated,
				}
			);
			/* eslint-enable no-console */
		},
		initSwiper() {
			const { ref } = getElement();
			new Swiper( ref, {
				modules: [ Navigation, Pagination ],
				// loop: false, da Swiper-Klone nicht von der Interactivity API
				// hydratisiert werden und dadurch Klicks auf geklonte Karten
				// die Auswahl nicht auslösen würden.
				loop: false,
				navigation: {
					nextEl: '.swiper-button-next',
					prevEl: '.swiper-button-prev',
				},
				pagination: {
					el: '.swiper-pagination',
					clickable: true,
				},
			} );
		},
	},
} );

// --- Übergreifende Concerns, die nicht deklarativ abgebildet werden können ---

// Add-to-Cart blockieren, solange die Grußkarte unvollständig ist.
// Capture-Phase, damit dieser Listener vor dem (gesperrten) Interactivity-
// Store von WooCommerce läuft.
document.addEventListener(
	'submit',
	( event ) => {
		const form = event.target;
		if (
			! ( form instanceof HTMLElement ) ||
			! form.matches(
				'form.wp-block-woocommerce-add-to-cart-with-options, form.cart'
			)
		) {
			return;
		}

		state.validated = true;

		if ( ! state.isValid ) {
			event.preventDefault();
			event.stopImmediatePropagation();
		}
	},
	true
);