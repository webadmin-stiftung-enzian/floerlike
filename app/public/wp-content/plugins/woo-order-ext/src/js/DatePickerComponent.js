import { useState, useEffect } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { Icon, cautionFilled } from '@wordpress/icons';

export const DatePickerComponent = () => {
    const [date, setDate] = useState('');
    const { setExtensionData } = useDispatch('wc/store/checkout');
    const { setValidationErrors, clearValidationError } = useDispatch('wc/store/validation');

    useEffect(() => {
        // Nur einen echten Datumswert senden – leerer String würde den Validierungs-
        // Hook auf PHP-Seite bei strtotime() korrekt durchlaufen (empty check dort).
        setExtensionData('woo-order-ext', { 'delivery-date': date });

        // Validierung: Wenn das Datum leer ist, einen Fehler setzen, sonst Fehler löschen.
        if (!date) {
            setValidationErrors({
                'woo-order-ext-delivery-date': {
                    message: __('Bitte wählen Sie ein Lieferdatum.', 'woo-order-ext'),
                    hidden: true,  // still bis Submit-Versuch, dann macht WC es sichtbar 
                }
            });
        } else {
            clearValidationError('woo-order-ext-delivery-date');
        }
    }, [date, setExtensionData, setValidationErrors, clearValidationError]);

    const { validationError } = useSelect( ( select ) => {
		const store = select( 'wc/store/validation' );
		return {
			validationError: store.getValidationError( 'woo-order-ext-delivery-date' ),
		};
	} );

    return (
        <div className="woo-order-ext-datepicker-wrapper" style={{ margin: '20px 0' }}>
            <label
                htmlFor="woo-order-ext-delivery-date"
                style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}
            >
                {__('Wählen Sie Ihr Lieferdatum:', 'woo-order-ext')}
            </label>
            <input
                id="woo-order-ext-delivery-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${ validationError && !validationError.hidden ? '#cc1818' : '#ccc' }`,
                    borderRadius: '4px'
                }}
                min={new Date().toISOString().split('T')[0]}
            />
            { validationError && !validationError.hidden && (
                <div style={{ color: '#cc1818', fontSize: '0.875em', marginTop: '4px', display: 'flex', alignItems: 'center' }}>
                    <Icon icon={cautionFilled} style={{ marginRight: '4px', fill: '#cc1818' }} />
                    { validationError.message }
                </div>
            ) }
        </div>
    );
};
    