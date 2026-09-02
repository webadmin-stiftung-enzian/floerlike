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
import { Panel, PanelBody, PanelRow, ColorPalette, Button, ToggleControl, RadioControl, RangeControl, FocalPointPicker, Placeholder } from '@wordpress/components';
import { background, image as imageIcon } from '@wordpress/icons';

/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import './editor.scss';

/**
 * Formats a focal point object as a CSS position string.
 *
 * @param {{x: number, y: number}} focalPoint Focal point value.
 * @return {string} CSS position, e.g. "50% 50%".
 */
const focalPointToPosition = ( focalPoint ) =>
	`${ ( focalPoint?.x ?? 0.5 ) * 100 }% ${ ( focalPoint?.y ?? 0.5 ) * 100 }%`;

/**
 * Converts a "Größe" scale attribute (-200..200, 0 = original size) into a
 * CSS transform scale factor, so the shape grows/shrinks as a whole and can
 * overflow past the block's edges instead of just zooming inside a fixed mask.
 *
 * @param {number} scale Scale attribute value.
 * @return {number} Non-negative scale factor for `transform: scale()`.
 */
const scaleToFactor = ( scale ) => Math.max( 0, 1 + ( Number( scale ) || 0 ) / 100 );

/**
 * Inverse of a scale factor, for cancelling out a parent's `transform: scale()`
 * on a child element (e.g. so a photo doesn't visually zoom while the mask
 * "window" revealing it grows/shrinks). Guards against dividing by zero when
 * the parent is fully scaled down to invisible.
 *
 * @param {number} factor Scale factor (as returned by `scaleToFactor`).
 * @return {number} Counter-scale factor.
 */
const counterScaleFactor = ( factor ) => ( factor > 0 ? 1 / factor : 1 );

/**
 * Builds the style for a mask "box" element sized to fill its container
 * exactly. `mask-size: contain` fits the SVG entirely within it at 0 %
 * scale, whichever axis is the limiting one — unlike forcing the height to
 * 100 % (which clips the sides of an SVG whose aspect ratio is wider than
 * the container's), this never crops anything, regardless of the SVG's
 * proportions. The whole box is then grown/shrunk via `transform: scale()`
 * anchored at the focal point, so it stays proportionally consistent across
 * screen sizes while still being able to bleed past the container's edges.
 *
 * @param {Object}                  props
 * @param {string}                  props.url        Mask image URL.
 * @param {{x: number, y: number}}  props.focalPoint Focal point value.
 * @param {number}                  props.scale      Scale attribute value.
 * @return {Object} React style object.
 */
const buildMaskBoxStyle = ( { url, focalPoint, scale } ) => ( {
	position: 'absolute',
	inset: 0,
	zIndex: 1,
	WebkitMaskImage: `url(${ url })`,
	maskImage: `url(${ url })`,
	WebkitMaskRepeat: 'no-repeat',
	maskRepeat: 'no-repeat',
	WebkitMaskSize: 'contain',
	maskSize: 'contain',
	WebkitMaskPosition: focalPointToPosition( focalPoint ),
	maskPosition: focalPointToPosition( focalPoint ),
	transform: `scale(${ scaleToFactor( scale ) })`,
	transformOrigin: focalPointToPosition( focalPoint ),
} );

/**
 * Builds the style for a solid-color mask "shape" element (background shape
 * or standalone foreground SVG) — a mask box filled with a flat color.
 *
 * @param {Object}                  props
 * @param {string}                  props.url        Mask image URL.
 * @param {string}                  props.fillColor  CSS color.
 * @param {{x: number, y: number}}  props.focalPoint Focal point value.
 * @param {number}                  props.scale      Scale attribute value.
 * @return {Object} React style object.
 */
const buildShapeStyle = ( { url, fillColor, focalPoint, scale } ) => ( {
	...buildMaskBoxStyle( { url, focalPoint, scale } ),
	backgroundColor: fillColor || '#000000',
} );

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
		'fg-type': fgType,
		'img-url': imgUrl,
		'img-alt': imgAlt,
		'img-id': imgId,
		'img-width': imgWidth,
		'img-height': imgHeight,
		'fg-svg-url': fgSvgUrl,
		'fg-svg-alt': fgSvgAlt,
		'fg-svg-id': fgSvgId,
		'fg-svg-fill-color': fgSvgFillColor,
		'fg-svg-scale': fgSvgScale,
		'fg-focal-point': fgFocalPoint,
		'svg-url': svgUrl,
		'svg-alt': svgAlt,
		'svg-id': svgId,
		'svg-fill-color': svgFillColor,
		'svg-enable': svgEnable,
		'img-mask-enable': imgMaskEnable,
		'svg-scale': svgScale,
		'svg-focal-point': svgFocalPoint,
	} = attributes;

	const [ colorPalette ] = useSettings( 'color.palette' );

	const isPixelForeground = fgType !== 'svg';
	const hasForeground = isPixelForeground ? !! imgUrl : !! fgSvgUrl;
	const foregroundPreviewUrl = isPixelForeground ? imgUrl : fgSvgUrl;

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

	const onSelectForegroundSvg = ( media ) => {
		setAttributes( {
			'fg-svg-url': media.url,
			'fg-svg-id': String( media.id ),
			'fg-svg-alt': media.alt || '',
		} );
	};

	const onRemoveForegroundSvg = () => {
		setAttributes( { 'fg-svg-url': '', 'fg-svg-id': '', 'fg-svg-alt': '' } );
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
					<PanelBody title={ __( 'Hintergrund', 'img-svg-block' ) } icon={ background } initialOpen={ true }>
						<PanelRow>
							<ToggleControl
								label={ __( 'Hintergrundform anzeigen', 'img-svg-block' ) }
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
						{ isPixelForeground && (
							<PanelRow>
								<ToggleControl
									label={ __( 'Vordergrund-Bild in Hintergrundform anzeigen', 'img-svg-block' ) }
									help={ __( 'Schneidet das Vordergrundbild in die Form des SVGs (Maske).', 'img-svg-block' ) }
									checked={ !! imgMaskEnable }
									onChange={ ( value ) => setAttributes( { 'img-mask-enable': value } ) }
								/>
							</PanelRow>
						) }
						<RangeControl
							label={ __( 'Größe', 'img-svg-block' ) }
							help={ __( '0 % = Form ist vollständig sichtbar, ohne Beschnitt. Negative Werte verkleinern, positive vergrößern die Form – vom Fokuspunkt aus.', 'img-svg-block' ) }
							value={ svgScale }
							onChange={ ( value ) => setAttributes( { 'svg-scale': value } ) }
							min={ -200 }
							max={ 400 }
							step={ 1 }
						/>
						{ svgUrl && (
							<PanelRow>
								<FocalPointPicker
									label={ __( 'Fokuspunkt der Form', 'img-svg-block' ) }
									url={ svgUrl }
									value={ svgFocalPoint }
									onChange={ ( value ) => setAttributes( { 'svg-focal-point': value } ) }
								/>
							</PanelRow>
						) }
					</PanelBody>
					<PanelBody title={ __( 'Vordergrund', 'img-svg-block' ) } icon={ imageIcon } initialOpen={ true }>
						<PanelRow>
							<RadioControl
								label={ __( 'Format', 'img-svg-block' ) }
								selected={ fgType || 'pixel' }
								options={ [
									{ label: __( 'Pixelbild', 'img-svg-block' ), value: 'pixel' },
									{ label: __( 'Vektorgrafik (SVG)', 'img-svg-block' ), value: 'svg' },
								] }
								onChange={ ( value ) => setAttributes( { 'fg-type': value } ) }
							/>
						</PanelRow>
						{ isPixelForeground ? (
							<>
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
							</>
						) : (
							<>
								<PanelRow>
									<MediaUploadCheck>
										<MediaUpload
											onSelect={ onSelectForegroundSvg }
											allowedTypes={ [ 'image/svg+xml' ] }
											value={ fgSvgId }
											render={ ( { open } ) => (
												<Button onClick={ open } variant="primary">
													{ fgSvgUrl
														? __( 'SVG ändern', 'img-svg-block' )
														: __( 'SVG-Datei auswählen', 'img-svg-block' ) }
												</Button>
											) }
										/>
									</MediaUploadCheck>
								</PanelRow>
								{ fgSvgUrl && (
									<PanelRow>
										<Button onClick={ onRemoveForegroundSvg } variant="link" isDestructive>
											{ __( 'SVG entfernen', 'img-svg-block' ) }
										</Button>
									</PanelRow>
								) }
								<PanelRow>
									<ColorPalette
										colors={ colorPalette }
										value={ fgSvgFillColor }
										onChange={ ( color ) => setAttributes( { 'fg-svg-fill-color': color } ) }
									/>
								</PanelRow>
								<RangeControl
									label={ __( 'Größe', 'img-svg-block' ) }
									help={ __( '0 % = Form ist vollständig sichtbar, ohne Beschnitt. Negative Werte verkleinern, positive vergrößern die Form – vom Fokuspunkt aus.', 'img-svg-block' ) }
									value={ fgSvgScale }
									onChange={ ( value ) => setAttributes( { 'fg-svg-scale': value } ) }
									min={ -200 }
									max={ 200 }
									step={ 1 }
								/>
							</>
						) }
						{ hasForeground && (
							<PanelRow>
								<FocalPointPicker
									label={ __( 'Fokuspunkt', 'img-svg-block' ) }
									url={ foregroundPreviewUrl }
									value={ fgFocalPoint }
									onChange={ ( value ) => setAttributes( { 'fg-focal-point': value } ) }
								/>
							</PanelRow>
						) }
					</PanelBody>
				</Panel>
			</InspectorControls>
			<figure
				{ ...blockProps }
				style={ {
					...blockProps.style,
					aspectRatio: isPixelForeground && imgWidth && imgHeight ? `${ imgWidth } / ${ imgHeight }` : undefined,
				} }
			>
				{ ! hasForeground ? (
					<Placeholder
						icon={ imageIcon }
						label={ __( 'Bild mit SVG-Hintergrund', 'img-svg-block' ) }
						instructions={
							isPixelForeground
								? __( 'Wähle ein Bild aus der Mediathek aus.', 'img-svg-block' )
								: __( 'Wähle eine SVG-Datei aus der Mediathek aus.', 'img-svg-block' )
						}
					>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ isPixelForeground ? onSelectImage : onSelectForegroundSvg }
								allowedTypes={ isPixelForeground ? [ 'image' ] : [ 'image/svg+xml' ] }
								value={ isPixelForeground ? imgId : fgSvgId }
								render={ ( { open } ) => (
									<Button onClick={ open } variant="primary">
										{ isPixelForeground
											? __( 'Bild auswählen', 'img-svg-block' )
											: __( 'SVG-Datei auswählen', 'img-svg-block' ) }
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
								style={ buildShapeStyle( {
									url: svgUrl,
									fillColor: svgFillColor,
									focalPoint: svgFocalPoint,
									scale: svgScale,
								} ) }
								aria-hidden="true"
							/>
						) }
						{ isPixelForeground ? (
							imgMaskEnable && svgUrl ? (
								<span
									className="img-svg-block__mask-wrapper"
									style={ buildMaskBoxStyle( {
										url: svgUrl,
										focalPoint: svgFocalPoint,
										scale: svgScale,
									} ) }
								>
									<img
										className="img-svg-block__image img-svg-block__image--masked"
										src={ imgUrl }
										alt={ imgAlt || '' }
										style={ {
											position: 'absolute',
											inset: 0,
											objectPosition: focalPointToPosition( fgFocalPoint ),
											transform: `scale(${ counterScaleFactor( scaleToFactor( svgScale ) ) })`,
											transformOrigin: focalPointToPosition( svgFocalPoint ),
										} }
									/>
								</span>
							) : (
								<img
									className="img-svg-block__image"
									src={ imgUrl }
									alt={ imgAlt || '' }
									style={ { objectPosition: focalPointToPosition( fgFocalPoint ) } }
								/>
							)
						) : (
							<span
								className="img-svg-block__image img-svg-block__image--svg"
								style={ buildShapeStyle( {
									url: fgSvgUrl,
									fillColor: fgSvgFillColor,
									focalPoint: fgFocalPoint,
									scale: fgSvgScale,
								} ) }
								role="img"
								aria-label={ fgSvgAlt || '' }
							/>
						) }
					</>
				) }
			</figure>
		</>
	);
}
