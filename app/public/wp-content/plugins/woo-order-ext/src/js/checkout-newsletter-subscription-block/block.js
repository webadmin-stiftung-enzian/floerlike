import { useState, useEffect } from '@wordpress/element';
import { CheckboxControl } from '@woocommerce/blocks-checkout';

const Block = ( { attributes = {}, checkoutExtensionData } ) => {
	const { text = 'Subscribe to our newsletter', optInDefaultChecked = false } = attributes;
	const [ checked, setChecked ] = useState( optInDefaultChecked );
	const { setExtensionData } = checkoutExtensionData;
	

	useEffect( () => {
		setExtensionData( 'woo-order-ext', 'newsletter_optin', checked );
	}, [ checked, setExtensionData ] );

	return (
		<CheckboxControl
			id="subscribe-to-newsletter"
			checked={ checked }
			label={ text || 'Subscribe to our newsletter' }
			onChange={ setChecked }
		/>
	);
};

export default Block;
