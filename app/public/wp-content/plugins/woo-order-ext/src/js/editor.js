import { registerCheckoutFilters } from '@woocommerce/blocks-checkout';

const modifyAdditionalInnerBlockTypes = ( defaultValue, extensions, args ) => {
	defaultValue.push( 'woo-order-ext/checkout-newsletter-subscription', 'woo-order-ext/placeholder-block' );
	return defaultValue;
};

registerCheckoutFilters( 'woo-order-ext', {
	additionalCartCheckoutInnerBlockTypes: modifyAdditionalInnerBlockTypes,
} );