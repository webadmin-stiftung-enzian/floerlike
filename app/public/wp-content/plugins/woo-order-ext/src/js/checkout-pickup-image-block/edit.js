/**
 * Editor-Ansicht: Bild wählen, Alternativtext und Link in der Seitenleiste,
 * Schalter "Bild anzeigen".
 *
 * Gespeichert wird nur eine leere Hülle (Save). Die Einstellungen schreibt
 * WooCommerce beim Ausgeben als data-Attribute an diese Hülle; daraus baut
 * block.js an der Kasse das Bild.
 */
import { __ } from '@wordpress/i18n';
import {
	BlockControls,
	InspectorControls,
	MediaPlaceholder,
	MediaReplaceFlow,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	Button,
	PanelBody,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { mapMarker } from '@wordpress/icons';
import './style.scss';

const HINT = __(
	'Erscheint an der Kasse nur, wenn „Im Laden abholen“ gewählt ist.',
	'woo-order-ext'
);

// Für die Kasse genügt eine grosse Variante; das Original kann sehr gross sein.
const imageUrl = ( media ) =>
	media?.sizes?.large?.url || media?.media_details?.sizes?.large?.source_url || media?.url || '';

export const Edit = ( { attributes, setAttributes } ) => {
	const { enabled, mediaId, url, alt, linkUrl } = attributes;
	const blockProps = useBlockProps( {
		className: enabled ? undefined : 'is-disabled',
	} );

	const onSelect = ( media ) =>
		setAttributes( {
			mediaId: media?.id || 0,
			url: imageUrl( media ),
			// Den Alternativtext aus der Mediathek übernehmen, solange keiner
			// eingetragen ist.
			alt: alt || media?.alt || '',
		} );

	const onRemove = () => setAttributes( { mediaId: 0, url: '', alt: '' } );

	let content;
	if ( ! url ) {
		content = (
			<MediaPlaceholder
				icon={ mapMarker }
				labels={ {
					title: __( 'Bild bei Abholung', 'woo-order-ext' ),
					instructions: `${ __(
						'Z. B. ein Kartenausschnitt mit dem Laden.',
						'woo-order-ext'
					) } ${ HINT }`,
				} }
				accept="image/*"
				allowedTypes={ [ 'image' ] }
				onSelect={ onSelect }
			/>
		);
	} else {
		content = (
			<>
				<figure className="woo-order-ext-pickup-image">
					<img src={ url } alt={ alt } />
				</figure>
				<p className="woo-order-ext-pickup-image__hint">
					{ enabled
						? HINT
						: __(
								'Ausgeschaltet – das Bild bleibt hinterlegt, erscheint aber nicht an der Kasse.',
								'woo-order-ext'
						  ) }
				</p>
			</>
		);
	}

	return (
		<div { ...blockProps }>
			{ url && (
				<BlockControls group="other">
					<MediaReplaceFlow
						mediaId={ mediaId }
						mediaURL={ url }
						accept="image/*"
						allowedTypes={ [ 'image' ] }
						onSelect={ onSelect }
						name={ __( 'Ersetzen', 'woo-order-ext' ) }
					/>
				</BlockControls>
			) }
			<InspectorControls>
				<PanelBody title={ __( 'Bild bei Abholung', 'woo-order-ext' ) }>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Bild anzeigen', 'woo-order-ext' ) }
						help={ __(
							'Aus: Das Bild bleibt hinterlegt, erscheint aber nicht an der Kasse.',
							'woo-order-ext'
						) }
						checked={ enabled }
						onChange={ ( next ) => setAttributes( { enabled: next } ) }
					/>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Alternativtext', 'woo-order-ext' ) }
						help={ __(
							'Beschreibt das Bild für Screenreader, z. B. „Karte: Laden an der Hagenholzstrasse 65, Zürich“.',
							'woo-order-ext'
						) }
						value={ alt }
						onChange={ ( next ) => setAttributes( { alt: next } ) }
					/>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						type="url"
						label={ __( 'Link (optional)', 'woo-order-ext' ) }
						help={ __(
							'Z. B. die Adresse in Google Maps. Das Bild wird dann anklickbar und öffnet den Link in einem neuen Tab.',
							'woo-order-ext'
						) }
						placeholder="https://"
						value={ linkUrl }
						onChange={ ( next ) => setAttributes( { linkUrl: next } ) }
					/>
					{ url && (
						<Button
							__next40pxDefaultSize
							variant="secondary"
							isDestructive
							onClick={ onRemove }
						>
							{ __( 'Bild entfernen', 'woo-order-ext' ) }
						</Button>
					) }
				</PanelBody>
			</InspectorControls>
			{ content }
		</div>
	);
};

export const Save = () => <div { ...useBlockProps.save() } />;
