/**
 * Editor: Block "Grusstext" -- Vorschau und Einstellungen.
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, RangeControl, TextControl } from '@wordpress/components';

import { BlockPreview } from '../../shared/placeholder';
import metadata from './block.json';

// Standardtext -- muss mit render.php übereinstimmen.
const DEFAULT_LABEL = __(
	'Nachricht auf der Grusskarte:',
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
						label={ __( 'Titel', 'greeting-card-block' ) }
						help={ __(
							'Leer lassen für den Standardtitel.',
							'greeting-card-block'
						) }
						placeholder={ __(
							'Grusstext eingeben',
							'greeting-card-block'
						) }
						value={ attributes.titel }
						onChange={ ( titel ) => setAttributes( { titel } ) }
					/>
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
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __(
							'Platzhalter im Textfeld',
							'greeting-card-block'
						) }
						help={ __(
							'Grauer Beispieltext, solange nichts eingegeben ist.',
							'greeting-card-block'
						) }
						value={ attributes.placeholder }
						onChange={ ( placeholder ) =>
							setAttributes( { placeholder } )
						}
					/>
					<RangeControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __(
							'Höchstlänge (Zeichen)',
							'greeting-card-block'
						) }
						help={ __(
							'Höchstens 300 – mehr nimmt der Server ohnehin nicht an.',
							'greeting-card-block'
						) }
						min={ 1 }
						max={ 300 }
						value={ attributes.maxLength }
						onChange={ ( maxLength ) =>
							setAttributes( { maxLength } )
						}
					/>
				</PanelBody>
			</InspectorControls>
			<BlockPreview
				name={ metadata.name }
				title={ metadata.title }
				description={ __(
					'Hier erscheint das Textfeld für den Grusstext, sobald „Grusskarte hinzufügen“ angehakt ist. Pflicht, sobald eine Karte gewünscht ist.',
					'greeting-card-block'
				) }
				attributes={ attributes }
				context={ context }
			/>
		</>
	);
}
