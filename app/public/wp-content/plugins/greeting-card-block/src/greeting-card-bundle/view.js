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
		// "Weg 2": findet die zu den gewählten Attributen passende Variation
		// des eingehüllten Hauptprodukts (z. B. Strauss-Grösse). Ein Attribut-
		// wert von '' auf der Variation bedeutet "Any" (WooCommerce-Konvention)
		// und matcht jede Auswahl.
		get matchedVariation() {
			if ( ! state.mainItem ) {
				return null;
			}
			return (
				state.mainItem.variations.find( ( variation ) =>
					Object.entries( variation.attributes ).every(
						( [ name, value ] ) =>
							value === '' ||
							value === state.selectedAttributes[ name ]
					)
				) || null
			);
		},
		get variationMissing() {
			if ( ! state.mainItem ) {
				return false;
			}
			const allSelected = state.mainItem.attributes.every(
				( attribute ) => state.selectedAttributes[ attribute.name ]
			);
			return ! allSelected || ! state.matchedVariation;
		},
		// Eigene Preisanzeige für die gewählte Variante -- der separate native
		// Preis-Block auf der Produktseite reagiert nicht auf unsere Auswahl
		// (siehe Hintergrund in render.php).
		get matchedVariationPriceText() {
			return state.matchedVariation?.priceText ?? '';
		},
		get isValid() {
			return (
				! state.cardMissing &&
				! state.textMissing &&
				! state.variationMissing
			);
		},
		get showCardError() {
			return state.submitAttempted && state.cardMissing;
		},
		get showTextError() {
			return state.submitAttempted && state.textMissing;
		},
		get showVariationError() {
			return state.submitAttempted && state.variationMissing;
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
		selectAttribute( event ) {
			const { attributeName } = getContext();
			state.selectedAttributes = {
				...state.selectedAttributes,
				[ attributeName ]: event.target.value,
			};
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
		 *
		 * "Weg 2" (Strauss als eingehülltes Bundled Item, siehe SETUP.md):
		 * Wird KEINE Karte gewählt, wird das Bundle-Produkt komplett umgangen
		 * und die Strauss-Variante direkt gekauft -- ein ganz normaler,
		 * bundle-loser Store-API-Aufruf. Grund: WooCommerce's Cart-Block
		 * blendet das (per "Faked Parent Item" eigentlich unsichtbar gedachte)
		 * Bundle-Container-Item in der Praxis nicht zuverlässig aus, was ohne
		 * gewählte Karte zu einer für Kund:innen verwirrenden, inhaltlich
		 * unnötigen Eltern-Kind-Anzeige führen würde. Nur wenn tatsächlich eine
		 * Karte gewählt wird, ist eine Bundle-Beziehung im Warenkorb fachlich
		 * begründet -- dann läuft der Request wie gehabt über das Bundle.
		 */
		async addToCart() {
			state.submitAttempted = true;
			state.errorMessage = '';

			if ( ! state.isValid ) {
				return;
			}

			state.isAdding = true;

			try {
				const wantsBundle =
					( state.wantsCard && state.selectedItemId ) ||
					! state.mainItem;

				let body;

				if ( wantsBundle ) {
					const bundleConfiguration = [];

					if ( state.wantsCard && state.selectedItemId ) {
						bundleConfiguration.push( {
							bundled_item_id: state.selectedItemId,
							quantity: 1,
							optional_selected: 'yes',
						} );
					}

					// Variante des eingehüllten Hauptprodukts (z. B.
					// Strauss-Grösse) mit in die Konfiguration aufnehmen. Durch
					// die isValid-Prüfung oben ist state.matchedVariation an
					// dieser Stelle garantiert nicht null.
					if ( state.mainItem ) {
						bundleConfiguration.push( {
							bundled_item_id: state.mainItem.bundleItemId,
							quantity: 1,
							variation_id: state.matchedVariation.variationId,
							attributes: Object.entries(
								state.selectedAttributes
							).map( ( [ name, option ] ) => ( {
								name,
								option,
							} ) ),
						} );
					}

					body = {
						id: state.bundleId,
						quantity: state.quantity,
						bundle_configuration: bundleConfiguration,
						greeting_card_text: state.wantsCard
							? state.text.trim()
							: '',
					};
				} else {
					// Keine Karte gewünscht: Bundle umgehen, Strauss-Variante
					// direkt kaufen (siehe Hintergrund oben).
					body = {
						id: state.matchedVariation.variationId,
						quantity: state.quantity,
					};
				}

				const response = await fetch( state.addItemUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Nonce: state.nonce,
					},
					body: JSON.stringify( body ),
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
