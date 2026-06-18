/**
 * External dependencies
 */
import { registerPlugin } from '@wordpress/plugins';
import {
	ExperimentalOrderLocalPickupPackages,
	ExperimentalOrderShippingPackages,
	ExperimentalOrderMeta,
} from '@woocommerce/blocks-checkout';
import { getSetting } from '@woocommerce/settings';
import { useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import './style.scss';

import { registerFilters } from './filters';
import { DatePickerComponent } from './DatePickerComponent';
// import { NewsletterSubscriptionComponent } from './NewsletterSubscriptionComponent';

const exampleDataFromSettings = getSetting('woo-order-ext_data');

/**
 * Ein kontrollierter Wrapper für unseren DatePicker.
 * Prüft den Validierungs-Store von WooCommerce on-the-fly.
 */
const ConditionalDatePicker = () => {
	const hasShippingErrors = useSelect((select) => {
		// 1. Hole den Validierungs-Store von WooCommerce Blocks
		const validationStore = select('wc/store/validation');
		if (!validationStore) {
			return false;
		}

		// 2. Rufe alle aktuellen Validierungsfehler ab
		const errors = validationStore.getValidationErrors();

		// 3. Filtere nach typischen Fehler-IDs des Versandadress-Abschnitts.
		// WooCommerce-IDs für die Versandadresse beginnen in der Regel mit 'shipping-' (z.B. 'shipping-address_1', 'shipping-postcode')
		const shippingErrorKeys = Object.keys(errors).filter((key) =>
			key.startsWith('shipping-')
		);

		return shippingErrorKeys.length > 0;
	}, []);

	// Wenn Fehler in der Versandadresse vorhanden sind, blende den DatePicker komplett aus!
	if (hasShippingErrors) {
		return null;
	}

	return <DatePickerComponent />;
};

const render = () => {
	return (
		<>
			<ExperimentalOrderLocalPickupPackages>
				<ConditionalDatePicker />
			</ExperimentalOrderLocalPickupPackages>
			<ExperimentalOrderShippingPackages>
				<ConditionalDatePicker />
			</ExperimentalOrderShippingPackages>
			<ExperimentalOrderMeta>
				{/* <NewsletterSubscriptionComponent /> */}
			</ExperimentalOrderMeta>
		</>
	);
};

registerPlugin('woo-order-ext', {
	render,
	scope: 'woocommerce-checkout',
});
document.addEventListener('DOMContentLoaded', function () {
	registerFilters();
});
