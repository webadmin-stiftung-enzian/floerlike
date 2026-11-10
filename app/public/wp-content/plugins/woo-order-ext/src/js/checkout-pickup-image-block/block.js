/**
 * Das Bild an der Kasse.
 *
 * Der Block steht im Block "Abholart" (woocommerce/checkout-pickup-options-block)
 * -- und den zeigt WooCommerce nur, wenn "Im Laden abholen" gewählt ist. Wann
 * das Bild erscheint, entscheidet also der Elternblock; hier geht es nur um
 * das Bild selbst.
 */
import './style.scss';

// WooCommerce gibt die Einstellungen an der Kasse als einzelne Props weiter
// (aus den data-Attributen der Hülle), nicht als "attributes" wie im Editor.
// Nicht gespeicherte Werte fehlen -- dann gelten die Standards hier.
// Schalter kommen dabei je nach WooCommerce-Version als true/false oder
// als Text "true"/"false" an; "false" wäre als Text wahr.
const Block = ( { enabled = true, url = '', alt = '', linkUrl = '' } ) => {
	const isEnabled = enabled !== false && enabled !== 'false';

	if ( ! isEnabled || ! url ) {
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
