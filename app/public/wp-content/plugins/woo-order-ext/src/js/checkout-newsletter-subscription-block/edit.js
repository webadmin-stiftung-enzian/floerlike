import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody, CheckboxControl, TextControl } from '@wordpress/components';
import { getSetting } from '@woocommerce/settings';
import './style.scss';

const { optInDefaultText } = getSetting( 'woo-order-ext_data', '' );

export const Edit = ( { attributes, setAttributes } ) => {
	const { text, privacyPolicyUrl } = attributes;
	const blockProps = useBlockProps();

	const previewLabel = privacyPolicyUrl
		? `${ text || optInDefaultText } ${ __( 'Es gelten die Datenschutzbestimmungen.', 'woo-order-ext' ) }`
		: text || optInDefaultText;

	return (
		<div { ...blockProps }>
			<InspectorControls>
				<PanelBody title={ __( 'Block-Optionen', 'woo-order-ext' ) }>
					<TextControl
						__next40pxDefaultSize
						label={ __( 'Opt-in-Text', 'woo-order-ext' ) }
						value={ text || optInDefaultText }
						onChange={ ( value ) => setAttributes( { text: value } ) }
					/>
					<CheckboxControl
						label={ __( 'Standardmässig angehakt', 'woo-order-ext' ) }
						checked={ attributes.optInDefaultChecked }
						onChange={ () =>
							setAttributes( { optInDefaultChecked: ! attributes.optInDefaultChecked } )
						}
					/>
					<TextControl
						__next40pxDefaultSize
						label={ __( 'URL Datenschutzbestimmungen', 'woo-order-ext' ) }
						value={ privacyPolicyUrl || '' }
						onChange={ ( value ) => setAttributes( { privacyPolicyUrl: value } ) }
						placeholder="https://..."
						type="url"
						help={ __(
							'Link erscheint im Checkout neben dem Opt-in-Text. Leer lassen um keinen Link anzuzeigen.',
							'woo-order-ext'
						) }
					/>
				</PanelBody>
			</InspectorControls>
			<CheckboxControl
				label={ previewLabel }
				checked={ attributes.optInDefaultChecked }
				disabled={ true }
				onChange={ () => {} }
			/>
		</div>
	);
};

export const Save = ( { attributes } ) => {
	const { text } = attributes;
	return (
		<div { ...useBlockProps.save() }>
			{ text || optInDefaultText }
		</div>
	);
};
