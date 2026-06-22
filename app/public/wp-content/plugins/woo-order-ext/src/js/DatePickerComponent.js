import { useState, useEffect } from '@wordpress/element';
import { useDispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

export const DatePickerComponent = () => {
    const [ date, setDate ] = useState( '' );
    const { setExtensionData } = useDispatch( 'wc/store/checkout' );

    useEffect( () => {
        // Nur einen echten Datumswert senden – leerer String würde den Validierungs-
        // Hook auf PHP-Seite bei strtotime() korrekt durchlaufen (empty check dort).
        setExtensionData( 'woo-order-ext', 'delivery-date', date );
    }, [ date, setExtensionData ] );

    return (
        <div className="woo-order-ext-datepicker-wrapper" style={{ margin: '20px 0' }}>
            <label
                htmlFor="woo-order-ext-delivery-date"
                style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}
            >
                { __( 'Wählen Sie Ihr Lieferdatum:', 'woo-order-ext' ) }
            </label>
            <input
                id="woo-order-ext-delivery-date"
                type="date"
                value={ date }
                onChange={ ( e ) => setDate( e.target.value ) }
                style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                }}
                min={ new Date().toISOString().split( 'T' )[ 0 ] }
            />
        </div>
    );
};
