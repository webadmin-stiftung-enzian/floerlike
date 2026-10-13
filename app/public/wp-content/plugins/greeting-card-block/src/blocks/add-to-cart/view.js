/**
 * Block "In den Warenkorb": prüft die Eingaben aller Kauf-Blöcke und legt
 * Produkt und -- falls gewünscht -- Grusskarte in den Warenkorb.
 *
 * Die Prüfung (state.isValid) steht im gemeinsamen Store src/shared/store.js.
 * Die Fehlermeldungen zeigt jeder Block bei sich an (showVariationError,
 * showCardError, showTextError); hier wird nur submitAttempted gesetzt.
 */
import { store } from '@wordpress/interactivity';

/**
 * Gruppen-ID für ein zusammengehörendes Paar aus Produkt und Grusskarte.
 *
 * Beide Warenkorb-Positionen bekommen denselben Wert als `gcb_group` mit; der
 * Server hält sie darüber zusammen (includes/class-integration.php). Der
 * Warenkorb-Schlüssel der Elternposition taugt dafür nicht: er steht beim
 * Absenden noch gar nicht fest und ändert sich später bei jeder Mengenänderung.
 *
 * crypto.randomUUID() gibt es nur in sicheren Kontexten (HTTPS bzw. localhost);
 * der Rückfall erzeugt eine ausreichend eindeutige ID für denselben Zweck.
 *
 * @return {string} Gruppen-ID, nur aus Kleinbuchstaben und Ziffern.
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
	actions: {
		/**
		 * Legt Produkt und (falls gewählt) Grusskarte in EINEM Request über
		 * /wc/store/v1/batch in den Warenkorb.
		 *
		 * Beide Teil-Anfragen tragen dieselbe `gcb_group`; daraus leitet der
		 * Server die Eltern-Kind-Beziehung ab. `validation:
		 * 'require-all-validate'` sorgt dafür, dass nicht das Produkt allein im
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

				// Karte nur, wenn der Satz im Rahmen vollständig ist (cardsEnabled,
				// vom Server) und eine gewünscht und gewählt wurde.
				if (
					state.cardsEnabled &&
					state.wantsCard &&
					state.selectedCardId
				) {
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
} );
