/**
 * Gemeinsamer Store aller Grusskarten-Blöcke.
 *
 * Wird als eigenes Skriptmodul "greeting-card-block/store" registriert
 * (greeting-card-block.php) und von jedem Block über seine block.json
 * eingebunden:
 *
 *     "viewScriptModule": [ "greeting-card-block/store", "file:./view.js" ]
 *
 * Hier steht nur, was mehrere Blöcke brauchen: die abgeleiteten Werte
 * (Getter) und die Validierungsregeln. Actions und Callbacks stehen in der
 * view.js des jeweiligen Blocks und ergänzen denselben Store -- mehrere
 * store()-Aufrufe für denselben Namensraum führt die Interactivity API
 * zusammen.
 *
 * Die Daten selbst (Varianten, Karten, Auswahl …) kommen vom Server, siehe
 * gcb_prepare_state() in includes/class-state.php. Für einige Getter gibt es
 * dort gleichnamige PHP-Closures, damit sie schon beim Rendern auf dem Server
 * stimmen -- deren Logik muss mit der hier übereinstimmen.
 *
 * WICHTIG: Diese Datei exportiert nichts, und die view.js der Blöcke dürfen
 * sie NICHT importieren. Ein Import würde webpack dazu bringen, den ganzen
 * Store in jede view.js hineinzukopieren -- dann läge er mehrfach im Browser.
 * Gemeinsame Werte (z. B. die Höchstlänge des Grusstexts) gehören deshalb in
 * den State, nicht in eine exportierte Konstante.
 */
import { store, getContext } from '@wordpress/interactivity';

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
		// Eigene Preiszeile für die gewählte Variante -- nur als Rückfall, falls
		// der native Preis-Block nicht mitspringen kann (nativePriceSync).
		get matchedVariationPriceText() {
			return state.matchedVariation?.priceText ?? '';
		},
		// Alles gewählt, aber nichts Kaufbares dahinter: entweder gibt es die
		// Kombination nicht (bei mehreren Attributen möglich) oder die Variante
		// ist ausverkauft/nicht kaufbar. Wird sofort angezeigt, nicht erst nach
		// dem Klick -- die Auswahl ist dann ohnehin eine Sackgasse.
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
		// Kartenknopf: ist diese Karte gewählt? Auf dem Server nicht nötig --
		// dort ist noch keine Karte gewählt, und ein undefinierter Wert ergibt
		// korrekt "nicht gewählt".
		get isCardSelected() {
			return getContext().cardId === state.selectedCardId;
		},
		// Variantenknopf: ist dieser Wert für sein Attribut gewählt?
		// (PHP-Gegenstück in class-state.php)
		get isOptionSelected() {
			const { attributeName, value } = getContext();
			return state.selectedAttributes[ attributeName ] === value;
		},
		// Variantenknopf: gibt es zu diesem Wert -- zusammen mit dem, was bei den
		// ANDEREN Attributen schon gewählt ist -- mindestens eine kaufbare
		// Variante? Sonst wird der Knopf ausgegraut und gesperrt.
		// (PHP-Gegenstück in class-state.php)
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
			return `Zeichen verbleibend: ${
				state.maxLength - state.text.length
			}`;
		},
	},
} );
