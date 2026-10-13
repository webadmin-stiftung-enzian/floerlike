/**
 * Editor: Block "Grusskarte hinzufügen" -- Vorschau und Einstellungen.
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

import { BlockPreview } from '../../shared/placeholder';
import metadata from './block.json';

// Standardtext -- muss mit render.php übereinstimmen.
const DEFAULT_LABEL = __(
	'Möchten Sie eine Grusskarte hinzufügen?',
	'greeting-card-block'
);

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
				</PanelBody>
			</InspectorControls>
			<BlockPreview
				name={ metadata.name }
				title={ metadata.title }
				description={ __(
					'Hier erscheint die Checkbox „Möchten Sie eine Grusskarte hinzufügen?“. Nur bei Produkten mit verknüpften Grusskarten.',
					'greeting-card-block'
				) }
				attributes={ attributes }
				context={ context }
			/>
		</>
	);
}
