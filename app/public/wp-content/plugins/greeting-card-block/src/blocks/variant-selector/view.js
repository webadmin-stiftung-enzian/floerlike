/**
 * Block "Variantenauswahl": Auswahl der Variante und Kopplung an den nativen
 * Preis-Block.
 *
 * Getter (isOptionSelected, matchedVariation …) stehen im gemeinsamen Store
 * src/shared/store.js -- bewusst KEIN import von dort, siehe Hinweis in der
 * Datei.
 */
import { store, getContext } from '@wordpress/interactivity';

/**
 * Zugangscode zum privaten WooCommerce-Store `woocommerce/products`, aus dem
 * der native Preis-Block seinen Preis liest.
 *
 * WooCommerce verlangt diesen Text wörtlich und warnt damit selbst, dass sich
 * der Store ändern kann. Passt er nach einem Update nicht mehr, wirft store()
 * einen Fehler -- der wird abgefangen, und der Preis-Block zeigt dann einfach
 * weiter die Preisspanne.
 */
const PRODUCTS_STORE_LOCK =
	'I acknowledge that using a private store means my plugin will inevitably break on the next store release.';

const { state } = store( 'greeting-card-bundle', {
	actions: {
		// Wert aus dem Kontext statt aus event.target: der Kontext ist die eine
		// Quelle, aus der auch isOptionSelected/isOptionAvailable lesen.
		selectAttribute() {
			const { attributeName, value } = getContext();
			state.selectedAttributes = {
				...state.selectedAttributes,
				[ attributeName ]: value,
			};
		},
	},
	callbacks: {
		/**
		 * Gibt die gewählte Variante an den nativen Preis-Block weiter.
		 *
		 * Läuft als data-wp-watch am Block, also bei jeder Änderung der
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
	},
} );
