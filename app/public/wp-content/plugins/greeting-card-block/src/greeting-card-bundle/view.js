// import Swiper JS
import Swiper from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';
// import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import { store, getContext, getElement } from '@wordpress/interactivity';

const MAX_LENGTH = 300;

/**
 * Zugangscode zum privaten WooCommerce-Store `woocommerce/products`, aus dem
 * der native Preis-Block seinen Preis liest (siehe callbacks.syncNativePrice
 * und die Erläuterung zu $native_price_sync in render.php).
 *
 * WooCommerce verlangt diesen Text wörtlich und warnt damit selbst, dass sich
 * der Store ändern kann. Passt er nach einem Update nicht mehr, wirft store()
 * einen Fehler -- der wird abgefangen, und der Preis-Block zeigt dann einfach
 * weiter die Preisspanne.
 */
const PRODUCTS_STORE_LOCK =
	'I acknowledge that using a private store means my plugin will inevitably break on the next store release.';

/**
 * Passt die Variante zu den Attributen? Leere Werte gelten auf beiden Seiten
 * als "beliebig": auf der Variante nach WooCommerce-Konvention ("Any …"), in
 * der Auswahl, solange das Attribut noch nicht gewählt ist.
 *
 * @param {Object} variation  Variante aus state.variationSelector.variations.
 * @param {Object} attributes Auswahl, Attributname => Wert.
 * @return {boolean} Ob die Variante zur Auswahl passt.
 */
function variationMatches( variation, attributes ) {
	return Object.entries( variation.attributes ).every(
		( [ name, value ] ) =>
			value === '' || ! attributes[ name ] || attributes[ name ] === value
	);
}

/**
 * Gruppen-ID für ein zusammengehörendes Paar aus Strauss und Grusskarte.
 *
 * Beide Warenkorb-Positionen bekommen denselben Wert als `gcb_group` mit; der
 * Server hält sie darüber zusammen (siehe includes/class-integration.php). Der
 * Warenkorb-Schlüssel der Elternposition taugt dafür nicht: er steht beim
 * Absenden noch gar nicht fest und ändert sich später bei jeder Mengenänderung.
 *
 * crypto.randomUUID() gibt es nur in sicheren Kontexten (HTTPS bzw. localhost);
 * der Rückfall erzeugt eine ausreichend eindeutige ID für denselben Zweck.
 */
function createGroupId() {
	const uuid =
		typeof crypto !== 'undefined' && crypto.randomUUID
			? crypto.randomUUID()
			: `${ Date.now().toString( 36 ) }${ Math.random()
					.toString( 36 )
					.slice( 2, 10 ) }`;

	// sanitize_key() auf PHP-Seite lässt nur Kleinbuchstaben, Ziffern,
	// Bindestriche und Unterstriche durch -- hier gleich passend erzeugen.
	return `gcb${ uuid.replace( /[^a-z0-9]/gi, '' ).toLowerCase() }`;
}

const { state } = store( 'greeting-card-bundle', {
	state: {
		get cardMissing() {
			return state.wantsCard && ! state.selectedCardId;
		},
		get textMissing() {
			return state.wantsCard && state.text.trim() === '';
		},
		// Findet die zu den gewählten Attributen passende Variation (z. B.
		// Strauss-Grösse). Ein Attributwert von '' auf der Variation bedeutet
		// "Any" (WooCommerce-Konvention) und matcht jede Auswahl.
		get matchedVariation() {
			if ( ! state.variationSelector ) {
				return null;
			}
			return (
				state.variationSelector.variations.find( ( variation ) =>
					Object.entries( variation.attributes ).every(
						( [ name, value ] ) =>
							value === '' ||
							value === state.selectedAttributes[ name ]
					)
				) || null
			);
		},
		// Noch nicht jedes Attribut gewählt -- "Bitte wählen Sie eine Option."
		get variationMissing() {
			if ( ! state.variationSelector ) {
				return false;
			}
			return ! state.variationSelector.attributes.every(
				( attribute ) => state.selectedAttributes[ attribute.name ]
			);
		},
		// Eigene Preisanzeige für die gewählte Variante -- der separate native
		// Preis-Block auf der Produktseite reagiert nicht auf unsere Auswahl
		// (siehe Hintergrund in render.php).
		get matchedVariationPriceText() {
			return state.matchedVariation?.priceText ?? '';
		},
		// Alles gewählt, aber nichts Kaufbares dahinter: entweder gibt es die
		// Kombination nicht (bei mehreren Attributen möglich, render.php filtert
		// nur einzelne Werte) oder die Variante ist ausverkauft/nicht kaufbar.
		// Wird sofort angezeigt, nicht erst nach dem Klick -- die Auswahl ist
		// dann ohnehin eine Sackgasse.
		get matchedVariationUnavailable() {
			if ( ! state.variationSelector || state.variationMissing ) {
				return false;
			}
			const variation = state.matchedVariation;
			return (
				! variation || ! variation.inStock || ! variation.purchasable
			);
		},
		get isValid() {
			return (
				! state.cardMissing &&
				! state.textMissing &&
				! state.variationMissing &&
				! state.matchedVariationUnavailable
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
			return getContext().cardId === state.selectedCardId;
		},
		// Variantenknopf: ist dieser Wert für sein Attribut gewählt?
		get isOptionSelected() {
			const { attributeName, value } = getContext();
			return state.selectedAttributes[ attributeName ] === value;
		},
		// Variantenknopf: gibt es zu diesem Wert -- zusammen mit dem, was bei den
		// ANDEREN Attributen schon gewählt ist -- mindestens eine kaufbare
		// Variante? Sonst wird der Knopf ausgegraut und gesperrt. Das fängt
		// ausverkaufte Varianten ab und bei mehreren Attributen Kombinationen,
		// die es nicht gibt.
		get isOptionAvailable() {
			const { attributeName, value } = getContext();
			const candidate = {
				...state.selectedAttributes,
				[ attributeName ]: value,
			};
			return state.variationSelector.variations.some(
				( variation ) =>
					variation.inStock &&
					variation.purchasable &&
					variationMatches( variation, candidate )
			);
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
			const { cardId } = getContext();
			state.selectedCardId = state.selectedCardId === cardId ? 0 : cardId;
		},
		// Wert aus dem Kontext statt aus event.target: der Kontext ist die eine
		// Quelle, aus der auch isOptionSelected/isOptionAvailable lesen.
		selectAttribute() {
			const { attributeName, value } = getContext();
			state.selectedAttributes = {
				...state.selectedAttributes,
				[ attributeName ]: value,
			};
		},
		updateText( event ) {
			state.text = event.target.value.substring( 0, MAX_LENGTH );
		},

		/**
		 * Legt Strauss und (falls gewählt) Grusskarte in EINEM Request über
		 * /wc/store/v1/batch in den Warenkorb.
		 *
		 * Beide Teil-Anfragen tragen dieselbe `gcb_group`; daraus leitet der
		 * Server die Eltern-Kind-Beziehung ab. `validation:
		 * 'require-all-validate'` sorgt dafür, dass nicht der Strauss allein im
		 * Warenkorb landet, wenn die Karte abgewiesen wird.
		 *
		 * Achtung: Die Teil-Anfragen laufen serverseitig als Body-Params, nicht
		 * als JSON -- der Filter in class-integration.php liest deshalb beide
		 * Quellen.
		 */
		async addToCart() {
			state.submitAttempted = true;
			state.errorMessage = '';

			if ( ! state.isValid ) {
				return;
			}

			state.isAdding = true;

			try {
				const group = createGroupId();

				// Variables Produkt: die gewählte Variation kaufen. Einfaches
				// Produkt: das Produkt selbst.
				const parentId = state.variationSelector
					? state.matchedVariation.variationId
					: state.productId;

				// Jede Teil-Anfrage prüft den Nonce selbst
				// (AbstractCartRoute::check_nonce) und erbt die Header des
				// Batch-Requests NICHT -- ohne diesen Header antwortet sie mit
				// 401, während der Batch-Request selbst 200 meldet.
				const headers = { Nonce: state.nonce };

				const requests = [
					{
						path: '/wc/store/v1/cart/add-item',
						method: 'POST',
						headers,
						body: {
							id: parentId,
							quantity: state.quantity,
							gcb_group: group,
							gcb_role: 'parent',
						},
					},
				];

				if ( state.wantsCard && state.selectedCardId ) {
					requests.push( {
						path: '/wc/store/v1/cart/add-item',
						method: 'POST',
						headers,
						body: {
							id: state.selectedCardId,
							quantity: state.quantity,
							gcb_group: group,
							gcb_role: 'card',
							greeting_card_text: state.text.trim(),
						},
					} );
				}

				const response = await fetch( state.batchUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Nonce: state.nonce,
					},
					body: JSON.stringify( {
						requests,
						validation: 'require-all-validate',
					} ),
				} );

				const payload = await response.json().catch( () => null );

				if ( ! response.ok ) {
					throw new Error( payload?.message || 'Add to cart failed' );
				}

				// Der Batch-Endpunkt antwortet mit 200, auch wenn eine
				// Teil-Anfrage fehlgeschlagen ist -- deren Status steht nur in
				// der jeweiligen Antwort.
				const failed = ( payload?.responses || [] ).find(
					( item ) => item?.status && item.status >= 400
				);

				if ( failed ) {
					throw new Error(
						failed.body?.message || 'Add to cart failed'
					);
				}

				// Die letzte add-item-Antwort IST der komplette Warenkorb. Damit
				// Mini-Cart / Cart-Block (React-basiert, eigener Data Store) den
				// neuen Stand anzeigen, spielen wir ihn in deren Store zurück.
				const responses = payload?.responses || [];
				const cart = responses[ responses.length - 1 ]?.body;

				if ( cart ) {
					window.wp?.data
						?.dispatch( 'wc/store/cart' )
						?.receiveCart( cart );
				}

				// Fallback für Themes, die den Mini-Cart erst lazy laden.
				document.body.dispatchEvent(
					new Event( 'wc-blocks_added_to_cart' )
				);
			} catch ( error ) {
				state.errorMessage =
					error instanceof Error ? error.message : String( error );
			} finally {
				state.isAdding = false;
			}
		},
	},
	callbacks: {
		/**
		 * Gibt die gewählte Variante an den nativen Preis-Block weiter.
		 *
		 * Läuft als data-wp-watch am Block-Wrapper, also bei jeder Änderung der
		 * Auswahl erneut. `variationId` im Store `woocommerce/products` ist
		 * genau das, worauf der Preis-Block reagiert: gesetzt zeigt er den Preis
		 * dieser Variante, `null` wieder die Preisspanne. Auch ausverkaufte
		 * Varianten zeigen ihren Preis, wie in der nativen Form.
		 */
		syncNativePrice() {
			if ( ! state.nativePriceSync ) {
				return;
			}

			const variation = state.variationMissing
				? null
				: state.matchedVariation;

			try {
				const { state: productsState } = store(
					'woocommerce/products',
					{},
					{ lock: PRODUCTS_STORE_LOCK }
				);
				productsState.variationId = variation
					? variation.variationId
					: null;
			} catch ( error ) {
				// Store geändert oder gesperrt -- der Preis-Block bleibt bei
				// der Preisspanne, der Kauf funktioniert unverändert.
			}
		},
		initSwiper() {
			const { ref } = getElement();
			new Swiper( ref, {
				modules: [ Navigation, Pagination ],
				loop: false,
				navigation: {
					nextEl: ref.querySelector( '.swiper-button-next' ),
					prevEl: ref.querySelector( '.swiper-button-prev' ),
				},
				pagination: {
					el: ref.querySelector( '.swiper-pagination' ),
					clickable: true,
				},
			} );
		},
	},
} );
