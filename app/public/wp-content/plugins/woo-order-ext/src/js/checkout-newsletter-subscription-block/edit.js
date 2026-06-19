/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	RichText,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody, CheckboxControl, TextControl } from '@wordpress/components';
// import { CheckboxControl } from '@woocommerce/blocks-checkout';
import { getSetting } from '@woocommerce/settings';
/**
 * Internal dependencies
 */
import './style.scss';
const { optInDefaultText } = getSetting('woo-order-ext_data', '');

export const Edit = ({ attributes, setAttributes }) => {
	const { text } = attributes;
	const blockProps = useBlockProps();

	return (
		<div {...blockProps}>
			<InspectorControls>
				<PanelBody title={__('Block options', 'woo-order-ext')}>
					<TextControl
						__next40pxDefaultSize
						label={__('Newsletter opt-in text', 'woo-order-ext')}
						value={text || optInDefaultText}
						onChange={(value) => setAttributes({ text: value })}
					/>
					<CheckboxControl
						label={__('Newsletter opt-in checked per default', 'woo-order-ext')}
						checked={attributes.optInDefaultChecked}
						disabled={false}
						onChange={() => setAttributes({ optInDefaultChecked: !attributes.optInDefaultChecked })}
					/>
				</PanelBody>
			</InspectorControls>
			<CheckboxControl
				label={text || optInDefaultText}
				checked={attributes.optInDefaultChecked}
				disabled={true}
				onChange={() => {}}
			/>
		</div>
	);
};

export const Save = ({ attributes }) => {
	const { text } = attributes;
	return (
		<div {...useBlockProps.save()}>
			<RichText.Content value={text || optInDefaultText} />
		</div>
	);
};
