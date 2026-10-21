/**
 * Editor: Block "Grusskarten-Auswahl" -- Vorschau und Einstellungen.
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	RangeControl,
	ToggleControl,
	TextControl,
} from '@wordpress/components';

import { BlockPreview } from '../../shared/placeholder';
import metadata from './block.json';

export default function Edit( { attributes, setAttributes, context } ) {
	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Sichtbare Karten', 'greeting-card-block' ) }
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
							'Grusskarte auswählen',
							'greeting-card-block'
						) }
						value={ attributes.titel }
						onChange={ ( titel ) => setAttributes( { titel } ) }
					/>
					<RangeControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __( 'Desktop', 'greeting-card-block' ) }
						help={ __(
							'Wie viele Karten der Slider gleichzeitig zeigt.',
							'greeting-card-block'
						) }
						min={ 1 }
						max={ 6 }
						value={ attributes.slidesPerView }
						onChange={ ( slidesPerView ) =>
							setAttributes( { slidesPerView } )
						}
					/>
					<RangeControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __(
							'Mobil (schmaler als 600px)',
							'greeting-card-block'
						) }
						min={ 1 }
						max={ 3 }
						value={ attributes.slidesPerViewMobile }
						onChange={ ( slidesPerViewMobile ) =>
							setAttributes( { slidesPerViewMobile } )
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __(
							'Letzte Karte anschneiden',
							'greeting-card-block'
						) }
						help={ __(
							'Am rechten Rand schaut ein Stück der nächsten Karte hervor – ein Hinweis, dass es weitergeht. Gleiche Einstellung wie beim Produkt-Slider.',
							'greeting-card-block'
						) }
						checked={ attributes.peek }
						onChange={ ( peek ) => setAttributes( { peek } ) }
					/>
				</PanelBody>
				<PanelBody title={ __( 'Anzeige', 'greeting-card-block' ) }>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Preis anzeigen', 'greeting-card-block' ) }
						checked={ attributes.showPrice }
						onChange={ ( showPrice ) =>
							setAttributes( { showPrice } )
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Pfeile anzeigen', 'greeting-card-block' ) }
						checked={ attributes.showNavigation }
						onChange={ ( showNavigation ) =>
							setAttributes( { showNavigation } )
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Punkte anzeigen', 'greeting-card-block' ) }
						checked={ attributes.showPagination }
						onChange={ ( showPagination ) =>
							setAttributes( { showPagination } )
						}
					/>
				</PanelBody>
			</InspectorControls>
			<BlockPreview
				name={ metadata.name }
				title={ metadata.title }
				description={ __(
					'Hier erscheint der Slider mit den Grusskarten, sobald „Grusskarte hinzufügen“ angehakt ist.',
					'greeting-card-block'
				) }
				attributes={ attributes }
				context={ context }
			/>
		</>
	);
}
