/**
 * Editor: Block "In den Warenkorb" -- Vorschau und Einstellungen.
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';

import { BlockPreview } from '../../shared/placeholder';
import metadata from './block.json';

// Standardtext -- muss mit render.php übereinstimmen.
const DEFAULT_LABEL = __( 'In den Warenkorb', 'greeting-card-block' );

export default function Edit( { attributes, setAttributes, context } ) {
	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Einstellungen', 'greeting-card-block' ) }
				>
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __( 'Beschriftung', 'greeting-card-block' ) }
						help={ __(
							'Leer lassen für den Standardtext.',
							'greeting-card-block'
						) }
						placeholder={ DEFAULT_LABEL }
						value={ attributes.label }
						onChange={ ( label ) => setAttributes( { label } ) }
					/>
					<SelectControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __( 'Stil', 'greeting-card-block' ) }
						help={ __(
							'Die Theme-Klassen „button outline“ bzw. „button solid“.',
							'greeting-card-block'
						) }
						value={ attributes.buttonStyle }
						options={ [
							{
								label: __(
									'Kontur (outline)',
									'greeting-card-block'
								),
								value: 'outline',
							},
							{
								label: __(
									'Gefüllt (solid)',
									'greeting-card-block'
								),
								value: 'solid',
							},
						] }
						onChange={ ( buttonStyle ) =>
							setAttributes( { buttonStyle } )
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __(
							'Warenkorb-Symbol anzeigen',
							'greeting-card-block'
						) }
						checked={ attributes.showIcon }
						onChange={ ( showIcon ) =>
							setAttributes( { showIcon } )
						}
					/>
				</PanelBody>
			</InspectorControls>
			<BlockPreview
				name={ metadata.name }
				title={ metadata.title }
				description={ __(
					'Hier erscheint der Knopf „In den Warenkorb“.',
					'greeting-card-block'
				) }
				attributes={ attributes }
				context={ context }
			/>
		</>
	);
}
