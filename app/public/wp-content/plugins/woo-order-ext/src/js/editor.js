import { registerCheckoutFilters } from '@woocommerce/blocks-checkout';

const modifyAdditionalInnerBlockTypes = ( defaultValue, extensions, args ) => {
	if ( args?.block === 'woocommerce/checkout-additional-information-block' ) {
		defaultValue.push( 'woo-order-ext/checkout-greeting-card','core/gallery' );
	}
	defaultValue.push( 'woo-order-ext/checkout-newsletter-subscription' );
	return defaultValue;
};

registerCheckoutFilters( 'woo-order-ext', {
	additionalCartCheckoutInnerBlockTypes: modifyAdditionalInnerBlockTypes,
} );