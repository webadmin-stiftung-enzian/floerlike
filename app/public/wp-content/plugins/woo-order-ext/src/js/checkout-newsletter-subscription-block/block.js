import { useState } from '@wordpress/element';
import { CheckboxControl } from '@woocommerce/blocks-checkout';

const Block = ( { attributes = {}, checkoutExtensionData } ) => {
	const { text = 'Subscribe to our newsletter', optInDefaultChecked = false } = attributes;
	const [ checked, setChecked ] = useState( optInDefaultChecked );
	const { setExtensionData } = checkoutExtensionData;

	const handleChange = ( newValue ) => {
		setChecked( newValue );
		setExtensionData( 'woo-order-ext', 'newsletter_optin', newValue );
	};

	return (
		<CheckboxControl
			id="subscribe-to-newsletter"
			checked={ checked }
			label={ text || 'Subscribe to our newsletter' }
			onChange={ handleChange }
		/>
	);
};

export default Block;
