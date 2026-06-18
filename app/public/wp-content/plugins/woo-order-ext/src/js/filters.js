import { registerCheckoutFilters } from '@woocommerce/blocks-checkout';
import { registerPaymentMethodExtensionCallbacks } from '@woocommerce/blocks-registry';

export const registerFilters = () => {

	

	registerCheckoutFilters( 'woo-order-ext', {
		itemName: ( name ) => `${ name } + extra data!`,
	} );

	registerPaymentMethodExtensionCallbacks( 'woo-order-ext', {
		cod: ( arg ) => arg.billingData.city !== 'Denver',
	} );
};
