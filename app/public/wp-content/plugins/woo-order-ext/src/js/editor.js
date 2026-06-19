import { registerCheckoutFilters } from '@woocommerce/blocks-checkout';

const modifyAdditionalInnerBlockTypes = ( defaultValue, extensions, args ) => {
	defaultValue.push( 'woo-order-ext/checkout-newsletter-subscription', 'woo-order-ext/checkout-greeting-card' );
	return defaultValue;
};

registerCheckoutFilters( 'woo-order-ext', {
	additionalCartCheckoutInnerBlockTypes: modifyAdditionalInnerBlockTypes,
} );