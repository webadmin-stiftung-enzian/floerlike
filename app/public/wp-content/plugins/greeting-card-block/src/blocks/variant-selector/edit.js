/**
 * Editor: Block "Variantenauswahl" -- Vorschau und Einstellungen.
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';

import { BlockPreview } from '../../shared/placeholder';
import metadata from './block.json';

export default function Edit( { attributes, setAttributes, context } ) {
	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Einstellungen', 'greeting-card-block' ) }
				>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __(
							'Beschreibung in den Knöpfen anzeigen',
							'greeting-card-block'
						) }
						help={ __(
							'Zeigt unter dem Wert die Beschreibung der Variante, z. B. „ca. 35 cm Ø“.',
							'greeting-card-block'
						) }
						checked={ attributes.showDescription }
						onChange={ ( showDescription ) =>
							setAttributes( { showDescription } )
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __(
							'Eigene Preiszeile anzeigen',
							'greeting-card-block'
						) }
						help={ __(
							'Nur nötig, wenn der Preis-Block von WooCommerce nicht auf der Seite steht. Sonst springt dessen Preis ohnehin mit der Auswahl um.',
							'greeting-card-block'
						) }
						checked={ attributes.showOwnPrice }
						onChange={ ( showOwnPrice ) =>
							setAttributes( { showOwnPrice } )
						}
					/>
				</PanelBody>
			</InspectorControls>
			<BlockPreview
				name={ metadata.name }
				title={ metadata.title }
				description={ __(
					'Hier erscheinen die Varianten des Produkts als Knöpfe (z. B. klein, mittel, gross). Nur bei variablen Produkten.',
					'greeting-card-block'
				) }
				attributes={ attributes }
				context={ context }
			/>
		</>
	);
}
