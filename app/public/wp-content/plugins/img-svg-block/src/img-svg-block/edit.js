/**
 * Retrieves the translation of text.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';

/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps, MediaUpload, MediaUploadCheck, InspectorControls, useSettings } from '@wordpress/block-editor';
import { Panel, PanelBody, PanelRow, ColorPalette, Button, ToggleControl, RangeControl, Placeholder } from '@wordpress/components';
import { background, image as imageIcon } from '@wordpress/icons';

/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import './editor.scss';

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @return {Element} Element to render.
 */
export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps();
	const {
		'svg-url': svgUrl,
		'svg-alt': svgAlt,
		'svg-id': svgId,
		'svg-fill-color': svgFillColor,
		'svg-enable': svgEnable,
		'img-mask-enable': imgMaskEnable,
		'img-url': imgUrl,
		'img-alt': imgAlt,
		'img-id': imgId,
		'img-width': imgWidth,
		'img-height': imgHeight,
		'svg-scale': svgScale,
	} = attributes;

	const [ colorPalette ] = useSettings( 'color.palette' );

	const onSelectImage = ( media ) => {
		setAttributes( {
			'img-url': media.url,
			'img-id': String( media.id ),
			'img-alt': media.alt || '',
			'img-width': media.width || undefined,
			'img-height': media.height || undefined,
		} );
	};

	const onRemoveImage = () => {
		setAttributes( {
			'img-url': '',
			'img-id': '',
			'img-alt': '',
			'img-width': undefined,
			'img-height': undefined,
		} );
	};

	const onSelectSvg = ( media ) => {
		setAttributes( {
			'svg-url': media.url,
			'svg-id': String( media.id ),
			'svg-alt': media.alt || '',
		} );
	};

	const onRemoveSvg = () => {
		setAttributes( { 'svg-url': '', 'svg-id': '', 'svg-alt': '' } );
	};

	return (
		<>
			<InspectorControls>
				<Panel>
					<PanelBody title={ __( 'Bild', 'img-svg-block' ) } icon={ imageIcon } initialOpen={ true }>
						<PanelRow>
							<MediaUploadCheck>
								<MediaUpload
									onSelect={ onSelectImage }
									allowedTypes={ [ 'image' ] }
									value={ imgId }
									render={ ( { open } ) => (
										<Button onClick={ open } variant="primary">
											{ imgUrl
												? __( 'Bild ändern', 'img-svg-block' )
												: __( 'Bild auswählen', 'img-svg-block' ) }
										</Button>
									) }
								/>
							</MediaUploadCheck>
						</PanelRow>
						{ imgUrl && (
							<PanelRow>
								<Button onClick={ onRemoveImage } variant="link" isDestructive>
									{ __( 'Bild entfernen', 'img-svg-block' ) }
								</Button>
							</PanelRow>
						) }
					</PanelBody>
					<PanelBody title={ __( 'Hintergrundform (SVG)', 'img-svg-block' ) } icon={ background } initialOpen={ false }>
						<PanelRow>
							<ToggleControl
								label={ __( 'SVG-Hintergrund anzeigen', 'img-svg-block' ) }
								checked={ !! svgEnable }
								onChange={ ( value ) => setAttributes( { 'svg-enable': value } ) }
							/>
						</PanelRow>
						<PanelRow>
							<MediaUploadCheck>
								<MediaUpload
									onSelect={ onSelectSvg }
									allowedTypes={ [ 'image/svg+xml' ] }
									value={ svgId }
									render={ ( { open } ) => (
										<Button onClick={ open } variant="secondary">
											{ svgUrl
												? __( 'SVG ändern', 'img-svg-block' )
												: __( 'SVG-Datei auswählen', 'img-svg-block' ) }
										</Button>
									) }
								/>
							</MediaUploadCheck>
						</PanelRow>
						{ svgUrl && (
							<PanelRow>
								<Button onClick={ onRemoveSvg } variant="link" isDestructive>
									{ __( 'SVG entfernen', 'img-svg-block' ) }
								</Button>
							</PanelRow>
						) }
						<PanelRow>
							<ColorPalette
								colors={ colorPalette }
								value={ svgFillColor }
								onChange={ ( color ) => setAttributes( { 'svg-fill-color': color } ) }
							/>
						</PanelRow>
						<PanelRow>
							<ToggleControl
								label={ __( 'Bild in SVG-Form anzeigen', 'img-svg-block' ) }
								help={ __( 'Schneidet das ausgewählte Bild in die Form des SVGs (Maske).', 'img-svg-block' ) }
								checked={ !! imgMaskEnable }
								onChange={ ( value ) => setAttributes( { 'img-mask-enable': value } ) }
							/>
						</PanelRow>
						<RangeControl
							label={ __( 'SVG-Größe', 'img-svg-block' ) }
							help={ __( '0 % = Containerhöhe. Negative Werte verkleinern, positive vergrößern die Form (vom Zentrum aus).', 'img-svg-block' ) }
							value={ svgScale }
							onChange={ ( value ) => setAttributes( { 'svg-scale': value } ) }
							min={ -20 }
							max={ 100 }
							step={ 1 }
						/>
					</PanelBody>
				</Panel>
			</InspectorControls>
			<figure
				{ ...blockProps }
				style={ {
					...blockProps.style,
					aspectRatio: imgWidth && imgHeight ? `${ imgWidth } / ${ imgHeight }` : undefined,
				} }
			>
				{ ! imgUrl ? (
					<Placeholder
						icon={ imageIcon }
						label={ __( 'Bild mit SVG-Hintergrund', 'img-svg-block' ) }
						instructions={ __( 'Wähle ein Bild aus der Mediathek aus.', 'img-svg-block' ) }
					>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ onSelectImage }
								allowedTypes={ [ 'image' ] }
								value={ imgId }
								render={ ( { open } ) => (
									<Button onClick={ open } variant="primary">
										{ __( 'Bild auswählen', 'img-svg-block' ) }
									</Button>
								) }
							/>
						</MediaUploadCheck>
					</Placeholder>
				) : (
					<>
						{ svgEnable && svgUrl && (
							<span
								className="img-svg-block__shape"
								style={ {
									backgroundColor: svgFillColor || '#000000',
									WebkitMaskImage: `url(${ svgUrl })`,
									maskImage: `url(${ svgUrl })`,
									WebkitMaskSize: `auto calc(100% + ${ svgScale }%)`,
									maskSize: `auto calc(100% + ${ svgScale }%)`,
								} }
								aria-hidden="true"
							/>
						) }
						<img
							className={ `img-svg-block__image${ imgMaskEnable && svgUrl ? ' img-svg-block__image--masked' : '' }` }
							src={ imgUrl }
							alt={ imgAlt || '' }
							style={
								imgMaskEnable && svgUrl
									? {
											WebkitMaskImage: `url(${ svgUrl })`,
											maskImage: `url(${ svgUrl })`,
											WebkitMaskSize: `auto calc(100% + ${ svgScale }%)`,
											maskSize: `auto calc(100% + ${ svgScale }%)`,
									  }
									: undefined
							}
						/>
					</>
				) }
			</figure>
		</>
	);
}
