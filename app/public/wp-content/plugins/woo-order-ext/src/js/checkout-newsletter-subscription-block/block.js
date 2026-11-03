import { useState, useEffect, useMemo } from '@wordpress/element';
import { CheckboxControl } from '@woocommerce/blocks-checkout';
import { __ } from '@wordpress/i18n';

// WooCommerce gibt die Einstellungen an der Kasse als einzelne Props weiter
// (aus den data-Attributen der Hülle), nicht als "attributes" wie im Editor.
// Schalter kommen je nach Version als true/false oder als Text "true"/"false".
const Block = ( {
	text = __( 'Subscribe to our newsletter', 'woo-order-ext' ),
	optInDefaultChecked = false,
	privacyPolicyUrl = '',
	checkoutExtensionData,
} ) => {
	const [ checked, setChecked ] = useState(
		optInDefaultChecked === true || optInDefaultChecked === 'true'
	);
	const { setExtensionData } = checkoutExtensionData;

	// Plain-text für die Consent-Dokumentation (URL enthalten als Nachweis)
	const consentText = useMemo( () => {
		if ( privacyPolicyUrl ) {
			return `${ text } ${ __( 'Es gelten die Datenschutzbestimmungen', 'woo-order-ext' ) } (${ privacyPolicyUrl }).`;
		}
		return text;
	}, [ text, privacyPolicyUrl ] );

	useEffect( () => {
		setExtensionData( 'woo-order-ext', 'newsletter_optin', checked );
		setExtensionData( 'woo-order-ext', 'consent_text', checked ? consentText : '' );
	}, [ checked, setExtensionData, consentText ] );

	// JSX-Label mit anklickbarem Link für den Kunden im Checkout
	const label = privacyPolicyUrl ? (
		<>
			{ text }{ ' ' }
			{ __( 'Es gelten die', 'woo-order-ext' ) }{ ' ' }
			<a href={ privacyPolicyUrl } target="_blank" rel="noopener noreferrer nofollow">
				{ __( 'Datenschutzbestimmungen', 'woo-order-ext' ) }
			</a>
			.
		</>
	) : (
		text
	);

	return (
		<CheckboxControl
			id="subscribe-to-newsletter"
			checked={ checked }
			label={ label }
			onChange={ setChecked }
		/>
	);
};

export default Block;
