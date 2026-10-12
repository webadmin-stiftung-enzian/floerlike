// import Swiper JS
import Swiper from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';
// import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import { store, getContext, getElement } from '@wordpress/interactivity';

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

/*
 * Actions und Callbacks dieses Blocks. Die abgeleiteten Werte (Getter) und die
 * Validierung stehen im gemeinsamen Store src/shared/store.js, den die
 * block.json als eigenes Skriptmodul vorab einbindet. Beide store()-Aufrufe
 * gelten demselben Namensraum; die Interactivity API führt sie zusammen.
 *
 * Bewusst KEIN import aus ../shared/store -- siehe Hinweis dort.
 */
const { state } = store( 'greeting-card-bundle', {
	actions: {
		toggleWantsCard( event ) {
			state.wantsCard = event.target.checked;
		},
		// Radio-Verhalten: eine Karte ist gewählt, bis eine andere gewählt wird.
		// Ganz ohne Karte geht es über die Checkbox "Grusskarte hinzufügen".
		selectCard() {
			state.selectedCardId = getContext().cardId;
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
			state.text = event.target.value.substring( 0, state.maxLength );
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
		// ref ist der äussere .slider; Swiper selbst läuft auf dem inneren
		// .swiper. Pfeile und Punkte liegen daneben (gleiche Struktur wie der
		// Slider-Block, siehe main.css "SLIDER") -- daher ":scope >", damit nur
		// die eigenen Elemente gefunden werden.
		initSwiper() {
			const { ref } = getElement();
			const swiper = new Swiper(
				ref.querySelector( ':scope > .swiper' ),
				{
					modules: [ Navigation, Pagination ],
					loop: false,
					navigation: {
						nextEl: ref.querySelector(
							':scope > .swiper-button-next'
						),
						prevEl: ref.querySelector(
							':scope > .swiper-button-prev'
						),
					},
					pagination: {
						el: ref.querySelector( ':scope > .swiper-pagination' ),
						clickable: true,
					},
				}
			);

			// Mit den Pfeiltasten wandert die Auswahl durch die Radio-Gruppe --
			// auch zu Karten, die gerade ausserhalb des Sliders liegen. Dann
			// den Slider mitziehen, damit die gewählte Karte sichtbar ist.
			ref.addEventListener( 'focusin', ( event ) => {
				const slide = event.target.closest( '.swiper-slide' );
				const index = swiper.slides.indexOf( slide );
				if ( index >= 0 && index !== swiper.activeIndex ) {
					swiper.slideTo( index );
				}
			} );
		},
	},
} );
