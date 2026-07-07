// import Swiper JS
import Swiper from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';
// import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import { store, getContext, getElement } from '@wordpress/interactivity';

const MAX_LENGTH = 300;

const { state } = store( 'greeting-card-bundle', {
	state: {
		get cardMissing() {
			return state.wantsCard && ! state.selectedItemId;
		},
		get textMissing() {
			return state.wantsCard && state.text.trim() === '';
		},
		get isValid() {
			return ! state.cardMissing && ! state.textMissing;
		},
		get showCardError() {
			return state.submitAttempted && state.cardMissing;
		},
		get showTextError() {
			return state.submitAttempted && state.textMissing;
		},
		get isCardPressed() {
			return getContext().bundleItemId === state.selectedItemId;
		},
		get charCounter() {
			return `Zeichen verbleibend: ${ MAX_LENGTH - state.text.length }`;
		},
	},
	actions: {
		toggleWantsCard( event ) {
			state.wantsCard = event.target.checked;
		},
		selectCard() {
			const { bundleItemId } = getContext();
			state.selectedItemId =
				state.selectedItemId === bundleItemId ? 0 : bundleItemId;
		},
		updateText( event ) {
			state.text = event.target.value.substring( 0, MAX_LENGTH );
		},

		/**
		 * Sendet die Bundle-Konfiguration (welche Karte, falls gewählt) plus den
		 * Grusstext über die Store API an cart/add-item. Die Struktur von
		 * `bundle_configuration` (Array von { bundled_item_id, quantity,
		 * optional_selected }, NICHT ein nach bundle_item_id indiziertes Objekt)
		 * ist gegen den Quellcode der installierten Product-Bundles-Version
		 * verifiziert (WC_PB_Cart::map_store_api_bundle_configuration).
		 */
		async addToCart() {
			state.submitAttempted = true;
			state.errorMessage = '';

			if ( ! state.isValid ) {
				return;
			}

			state.isAdding = true;

			try {
				const bundleConfiguration = [];

				if ( state.wantsCard && state.selectedItemId ) {
					bundleConfiguration.push( {
						bundled_item_id: state.selectedItemId,
						quantity: 1,
						optional_selected: 'yes',
					} );
				}

				const response = await fetch( state.addItemUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Nonce: state.nonce,
					},
					body: JSON.stringify( {
						id: state.bundleId,
						quantity: state.quantity,
						bundle_configuration: bundleConfiguration,
						greeting_card_text: state.wantsCard
							? state.text.trim()
							: '',
					} ),
				} );

				if ( ! response.ok ) {
					const err = await response.json().catch( () => null );
					throw new Error(
						err?.message || 'Add to cart failed'
					);
				}

				// Die add-item-Antwort IST der komplette Warenkorb. Damit Mini-Cart /
				// Cart-Block (React-basiert, eigener Data Store) den neuen Stand
				// anzeigen, spielen wir ihn in deren Store zurück.
				const cart = await response.json();
				window.wp?.data
					?.dispatch( 'wc/store/cart' )
					?.receiveCart( cart );

				// Fallback für Themes, die den Mini-Cart erst lazy laden.
				document.body.dispatchEvent(
					new Event( 'wc-blocks_added_to_cart' )
				);
			} catch ( error ) {
				state.errorMessage =
					error instanceof Error
						? error.message
						: String( error );
			} finally {
				state.isAdding = false;
			}
		},
	},
	callbacks: {
		initSwiper() {
			const { ref } = getElement();
			new Swiper( ref, {
				modules: [ Navigation, Pagination ],
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
