import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { dispatch, select } from '@wordpress/data';

export const DatePickerComponent = () => {
    const [ date, setDate ] = useState( '' );

    // Synchronisiere das Datum über die WordPress/WooCommerce Data-Registry
    useEffect( () => {
        // Das WooCommerce-Blocks-Checkout-Store-Registry-Namespace lautet 'wc/store/checkout'
        const checkoutStore = dispatch( 'wc/store/checkout' );
        
        if ( checkoutStore && typeof checkoutStore.setExtensionData === 'function' ) {
            checkoutStore.setExtensionData( 'woo-order-ext', 'delivery-date', date );
        }
    }, [ date ] );

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
                min={ new Date().toISOString().split('T')[0] }
            />
        </div>
    );
};