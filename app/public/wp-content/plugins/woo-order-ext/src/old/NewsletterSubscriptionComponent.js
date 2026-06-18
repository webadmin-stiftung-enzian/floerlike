/**
 * External dependencies
 */
import { useEffect, useState } from '@wordpress/element';
import { CheckboxControl } from '@wordpress/components'; // Verwendung der sicheren WP-Core-Component
import { getSetting } from '@woocommerce/settings';
import { useSelect, useDispatch } from '@wordpress/data';

const { optInDefaultText } = getSetting('woo-order-ext_data', '');
const FIELD_ID = 'woo-order-ext/subscribe-newsletter';

export const NewsletterSubscriptionComponent = ({ children, checkoutExtensionData }) => {
    const [checked, setChecked] = useState(false);

    // 1. Hole die Validierungs-Actions
    const { setValidationErrors, clearValidationError } = useDispatch(
        'wc/store/validation'
    );

    // 2. Hole die Checkout-Actions (für den State-Write)
    const checkoutDispatch = useDispatch('wc/store/checkout');

    // Fallback: Nutze die Prop (wenn als Block gerendert), andernfalls das globale Dispatching (im Slot-Fill)
    const setExtensionData = checkoutExtensionData?.setExtensionData
        || checkoutDispatch?.setExtensionData;

    useEffect(() => {
        // 1. Daten an WooCommerce übermitteln
        if (typeof setExtensionData === 'function') {
            setExtensionData('woo-order-ext', 'subscribe-newsletter', checked);
        }

        // 2. Einheitliche Validierung registrieren
        if (!checked) {
            setValidationErrors({
                [FIELD_ID]: {
                    message: 'Bitte bestätigen Sie das Newsletter-Abonnement.',
                    hidden: false,
                },
            });
        } else {
            // Fehler wird im Store gelöscht -> Kaufen-Button wird wieder freigegeben!
            clearValidationError(FIELD_ID);
        }
    }, [checked, setExtensionData]);

    const { validationError } = useSelect((select) => {
        const store = select('wc/store/validation');
        return {
            validationError: store ? store.getValidationError(FIELD_ID) : null,
        };
    });

    return (
        <div style={{ margin: '15px 0' }}>
            {/* Korrektur für @wordpress/components: Label als Prop übergeben */}
            <CheckboxControl
                id="subscribe-to-newsletter"
                checked={checked}
                onChange={setChecked}
                label={children || optInDefaultText}
            />

            {validationError?.hidden === false && (
                <div style={{ color: '#cc1818', marginTop: '5px', fontSize: '0.9em' }}>
                    <span role="img" aria-label="Warning emoji" style={{ marginRight: '5px' }}>
                        ⚠️
                    </span>
                    {validationError?.message}
                </div>
            )}
        </div>
    );
};


