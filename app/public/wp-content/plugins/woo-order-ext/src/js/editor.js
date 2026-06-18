import { registerCheckoutFilters } from '@woocommerce/blocks-checkout';

const modifyAdditionalInnerBlockTypes = ( defaultValue, extensions, args ) => {
	defaultValue.push( 'woo-order-ext/checkout-newsletter-subscription' );
	if ( args?.block === 'woocommerce/checkout-additional-information-block' ) {
		defaultValue.push( 'woo-order-ext/checkout-greeting-card', 'core/gallery' );
	}
	return defaultValue;
};

registerCheckoutFilters( 'woo-order-ext', {
	additionalCartCheckoutInnerBlockTypes: modifyAdditionalInnerBlockTypes,
} );