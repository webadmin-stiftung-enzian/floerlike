/**
 * Das Bild an der Kasse -- nur, wenn "Im Laden abholen" gewählt ist.
 *
 * Die Wahl steht im Checkout-Speicher von WooCommerce (prefersCollection):
 * true, sobald der Kunde im Block "Lieferung" auf "Im Laden abholen" klickt.
 * useSelect rendert neu, wenn sie wechselt.
 */
import { useSelect } from '@wordpress/data';
import './style.scss';

// WooCommerce gibt die Einstellungen an der Kasse als einzelne Props weiter
// (aus den data-Attributen der Hülle), nicht als "attributes" wie im Editor.
// Nicht gespeicherte Werte fehlen -- dann gelten die Standards hier.
// Schalter kommen dabei je nach WooCommerce-Version als true/false oder
// als Text "true"/"false" an; "false" wäre als Text wahr.
const Block = ( { enabled = true, url = '', alt = '', linkUrl = '' } ) => {
	const isEnabled = enabled !== false && enabled !== 'false';

	const prefersCollection = useSelect(
		( select ) => select( 'wc/store/checkout' ).prefersCollection(),
		[]
	);

	if ( ! isEnabled || ! url || ! prefersCollection ) {
		return null;
	}

	const image = <img src={ url } alt={ alt } loading="lazy" />;

	return (
		<figure className="wp-block-woo-order-ext-checkout-pickup-image woo-order-ext-pickup-image">
			{ linkUrl ? (
				<a href={ linkUrl } target="_blank" rel="noopener noreferrer">
					{ image }
				</a>
			) : (
				image
			) }
		</figure>
	);
};

export default Block;
