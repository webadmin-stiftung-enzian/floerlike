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
import {
	useBlockProps,
	MediaUpload,
	MediaUploadCheck,
	InspectorControls,
	useSettings,
	ColorPaletteControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis -- WordPress exports no stable equivalent of these two.
	__experimentalFontFamilyControl as FontFamilyControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis -- ditto.
	__experimentalLetterSpacingControl as LetterSpacingControl,
} from '@wordpress/block-editor';
import { Panel, PanelBody, PanelRow, ColorPalette, Button, ToggleControl, RadioControl, RangeControl, TextControl, FontSizePicker, FocalPointPicker, Placeholder, Spinner, Notice } from '@wordpress/components';
import { background, image as imageIcon } from '@wordpress/icons';
import { useEffect, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { focalPointToPreserveAspectRatio, isEmbeddableUrl, prepareInlineSvg } from './inline-svg';

/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import './editor.scss';

/**
 * Passes a block attribute through only when it is a single CSS value.
 *
 * These values end up in a `style` attribute, where escaping keeps them from
 * breaking out of the attribute but not from adding declarations of their own —
 * `x; background: url(https://evil.example/beacon)` would leak every visitor's
 * IP to a foreign host. Presets (`var(--wp--preset--…)`) and fluid sizes
 * (`clamp(…)`) have to survive, so what is checked is not the shape of a value
 * but the absence of anything that could end the declaration, start a rule or
 * pull in a remote resource. The server-side counterpart is
 * `img_svg_block_safe_css_value()` in `render.php`.
 *
 * @param {string} value Attribute value.
 * @return {?string} The value, or undefined when it is not one.
 */
const safeCssValue = ( value ) => {
	const candidate = String( value ?? '' ).trim();

	if ( ! candidate || candidate.length > 200 ) {
		return undefined;
	}

	return /[;{}\\<>]|url\s*\(|expression\s*\(|@import|\/\*/i.test( candidate )
		? undefined
		: candidate;
};

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
 * Builds the style for a foreground element that is rendered as-is — an
 * `<img>` holding a vector graphic, or an inlined textPath SVG. Unlike a
 * masked shape it keeps its own artwork (colors, gradients, strokes), so it
 * only needs fitting into the block: `contain` shows the whole drawing at
 * 0 %, the focal point decides which part stays put, and `transform: scale()`
 * grows or shrinks it from there.
 *
 * @param {Object}                 props
 * @param {{x: number, y: number}} props.focalPoint Focal point value.
 * @param {number}                 props.scale      Scale attribute value.
 * @return {Object} React style object.
 */
const buildFitStyle = ( { focalPoint, scale } ) => ( {
	objectPosition: focalPointToPosition( focalPoint ),
	transform: `scale(${ scaleToFactor( scale ) })`,
	transformOrigin: focalPointToPosition( focalPoint ),
} );

/**
 * Loads an SVG file and prepares it for embedding, re-running whenever the
 * file, the fitting, the coloring or the text changes.
 *
 * @param {string} url                 SVG file URL, empty when none is selected.
 * @param {string} preserveAspectRatio How the drawing is fitted into the block.
 * @param {string} overrides           CSS properties the block sets, comma-separated
 *                                     so the effect stays a stable dependency.
 * @param {string} text                Replaces the words drawn along a path.
 * @return {{markup: ?string, ownText: string, isLoading: boolean, hasError: boolean}} Load state.
 */
const useInlineSvg = ( url, preserveAspectRatio, overrides, text ) => {
	const [ state, setState ] = useState( { markup: null, ownText: '', isLoading: false, hasError: false } );

	useEffect( () => {
		if ( ! url ) {
			setState( { markup: null, ownText: '', isLoading: false, hasError: false } );
			return undefined;
		}

		if ( ! isEmbeddableUrl( url ) ) {
			// A file from somewhere else is never embedded — see
			// `isEmbeddableUrl` in `inline-svg.js`. Reported as an error so the
			// block falls back to the `<img>` a browser keeps in secure static
			// mode.
			setState( { markup: null, ownText: '', isLoading: false, hasError: true } );
			return undefined;
		}

		let isCurrent = true;
		setState( ( previous ) => ( { ...previous, isLoading: true, hasError: false } ) );

		window
			.fetch( url )
			.then( ( response ) => {
				if ( ! response.ok ) {
					throw new Error( response.statusText );
				}
				return response.text();
			} )
			.then( ( source ) => {
				if ( ! isCurrent ) {
					return;
				}
				const prepared = prepareInlineSvg( source, {
					preserveAspectRatio,
					overrides: overrides ? overrides.split( ',' ) : [],
					text,
				} );
				setState( {
					markup: prepared?.markup ?? null,
					ownText: prepared?.text ?? '',
					isLoading: false,
					hasError: ! prepared,
				} );
			} )
			.catch( () => {
				if ( isCurrent ) {
					setState( { markup: null, ownText: '', isLoading: false, hasError: true } );
				}
			} );

		return () => {
			isCurrent = false;
		};
	}, [ url, preserveAspectRatio, overrides, text ] );

	return state;
};

/**
 * Reads a preset setting as the flat array every control expects. A site that
 * defines presets at more than one origin hands them over keyed by origin
 * instead — `{ theme: [...], custom: [...] }` — which WordPress's own controls
 * do not all guard against: FontFamilyControl's emptiness check passes an
 * object straight through to `.map()`.
 *
 * @param {Array|Object|undefined} setting Setting as `useSettings` returns it.
 * @return {Array} The presets, flattened across origins.
 */
const toPresets = ( setting ) => {
	if ( Array.isArray( setting ) ) {
		return setting;
	}
	return Object.values( setting ?? {} ).flat();
};

/**
 * How the textPath layer is fitted into the block: whole and centred, since it
 * frames the foreground rather than being framed with it.
 */
const TEXTPATH_ASPECT_RATIO = 'xMidYMid meet';

/**
 * Renders an embedded SVG, or a placeholder while it is being loaded. The
 * markup is injected rather than referenced so an `<image>` inside it loads
 * and its fills can inherit the CSS `color` set here — see `inline-svg.js`.
 *
 * @param {Object}  props
 * @param {string}  props.className Class name for the wrapper.
 * @param {?string} props.markup    Sanitized SVG markup, null while unavailable.
 * @param {boolean} props.isLoading Whether the file is still being fetched.
 * @param {string}  props.alt       Alternative text.
 * @param {Object}  props.style     Styles the embedded SVG inherits.
 * @return {Element} Element to render.
 */
const InlineSvg = ( { className, markup, isLoading, alt, style } ) => {
	if ( ! markup ) {
		return <span className={ className }>{ isLoading && <Spinner /> }</span>;
	}

	return (
		<span
			className={ className }
			style={ style }
			role="img"
			aria-label={ alt || '' }
			// Sanitized by `prepareInlineSvg`: no scripts, event handlers or
			// `javascript:` URLs survive it.
			dangerouslySetInnerHTML={ { __html: markup } }
		/>
	);
};

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
		'fg-svg-color': fgSvgColor,
		'fg-textpath-enable': fgTextpathEnable,
		'fg-textpath-url': fgTextpathUrl,
		'fg-textpath-alt': fgTextpathAlt,
		'fg-textpath-id': fgTextpathId,
		'fg-textpath-text': fgTextpathText,
		'fg-textpath-color': fgTextpathColor,
		'fg-textpath-font-family': fgTextpathFontFamily,
		'fg-textpath-font-size': fgTextpathFontSize,
		'fg-textpath-letter-spacing': fgTextpathLetterSpacing,
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

	const [ palette, fontFamilySetting, fontSizeSetting ] = useSettings(
		'color.palette',
		'typography.fontFamilies',
		'typography.fontSizes'
	);
	const colorPalette = toPresets( palette );
	const fontFamilies = toPresets( fontFamilySetting );
	const fontSizes = toPresets( fontSizeSetting );

	const isPixelForeground = fgType !== 'svg';
	const hasForeground = isPixelForeground ? !! imgUrl : !! fgSvgUrl;
	const foregroundPreviewUrl = isPixelForeground ? imgUrl : fgSvgUrl;
	const hasTextpath = ! isPixelForeground && !! fgTextpathEnable && !! fgTextpathUrl;

	// The foreground SVG is embedded rather than referenced: an `<img>` would
	// put it into secure static mode, where an `<image>` inside it — a cut-out
	// photo from the media library — never loads.
	const foregroundSvg = useInlineSvg(
		isPixelForeground ? '' : fgSvgUrl,
		focalPointToPreserveAspectRatio( fgFocalPoint ),
		fgSvgColor ? 'fill' : ''
	);

	// The textPath layer sits over the whole block rather than following the
	// foreground's size and focal point, so the words keep running around it.
	// Whatever the block styles, the file must stop dictating — see
	// `takeOverProperty` in `inline-svg.js`.
	const textpathStyle = {
		color: safeCssValue( fgTextpathColor ),
		fontFamily: safeCssValue( fgTextpathFontFamily ),
		fontSize: safeCssValue( fgTextpathFontSize ),
		letterSpacing: safeCssValue( fgTextpathLetterSpacing ),
	};
	const textpathOverrides = [
		// `fill` always: the layer is there to draw the block's words, so the
		// glyphs follow the block's color — the file's own fill (`none` in an
		// Inkscape export, which would draw nothing) is never the wanted one.
		'fill',
		fgTextpathFontFamily && 'font-family',
		fgTextpathFontSize && 'font-size',
		fgTextpathLetterSpacing && 'letter-spacing',
	]
		.filter( Boolean )
		.join( ',' );

	const textpathSvg = useInlineSvg(
		hasTextpath ? fgTextpathUrl : '',
		TEXTPATH_ASPECT_RATIO,
		textpathOverrides,
		fgTextpathText
	);

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

	const onSelectTextpathSvg = ( media ) => {
		setAttributes( {
			'fg-textpath-url': media.url,
			'fg-textpath-id': String( media.id ),
			'fg-textpath-alt': media.alt || '',
		} );
	};

	const onRemoveTextpathSvg = () => {
		setAttributes( { 'fg-textpath-url': '', 'fg-textpath-id': '', 'fg-textpath-alt': '' } );
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

	// What the empty-state placeholder offers, per foreground format.
	const foregroundMedia = isPixelForeground
		? {
			onSelect: onSelectImage,
			value: imgId,
			allowedTypes: [ 'image' ],
			label: __( 'Bild auswählen', 'img-svg-block' ),
			instructions: __( 'Wähle ein Bild aus der Mediathek aus.', 'img-svg-block' ),
		}
		: {
			onSelect: onSelectForegroundSvg,
			value: fgSvgId,
			allowedTypes: [ 'image/svg+xml' ],
			label: __( 'SVG-Datei auswählen', 'img-svg-block' ),
			instructions: __( 'Wähle eine SVG-Datei aus der Mediathek aus.', 'img-svg-block' ),
		};

	// Falling back to a reference when the file cannot be embedded: the
	// artwork still shows, only the color and the text stay as the file has
	// them.
	const svgForeground = foregroundSvg.hasError ? (
		<img
			className="img-svg-block__image img-svg-block__image--svg"
			src={ fgSvgUrl }
			alt={ fgSvgAlt || '' }
			style={ buildFitStyle( { focalPoint: fgFocalPoint, scale: fgSvgScale } ) }
		/>
	) : (
		<InlineSvg
			className="img-svg-block__image img-svg-block__inline-svg"
			markup={ foregroundSvg.markup }
			isLoading={ foregroundSvg.isLoading }
			alt={ fgSvgAlt }
			style={ {
				color: safeCssValue( fgSvgColor ),
				transform: `scale(${ scaleToFactor( fgSvgScale ) })`,
				transformOrigin: focalPointToPosition( fgFocalPoint ),
			} }
		/>
	);

	const textpathLayer = textpathSvg.hasError ? (
		<img className="img-svg-block__textpath" src={ fgTextpathUrl } alt={ fgTextpathAlt || '' } />
	) : (
		<InlineSvg
			className="img-svg-block__textpath img-svg-block__inline-svg"
			markup={ textpathSvg.markup }
			isLoading={ textpathSvg.isLoading }
			alt={ fgTextpathAlt }
			style={ textpathStyle }
		/>
	);

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
								{ foregroundSvg.hasError && (
									<PanelRow>
										<Notice status="warning" isDismissible={ false }>
											{ __( 'Die SVG-Datei konnte nicht eingebettet werden – Farbe und Text lassen sich daher nicht anpassen.', 'img-svg-block' ) }
										</Notice>
									</PanelRow>
								) }
								<PanelRow>
									<ColorPalette
										colors={ colorPalette }
										value={ fgSvgColor }
										onChange={ ( color ) => setAttributes( { 'fg-svg-color': color } ) }
									/>
								</PanelRow>
								<PanelRow>
									<p className="components-base-control__help">
										{ __( 'Ohne Farbauswahl behält die Grafik ihre eigenen Farben. Ein Bild (image-Tag) im SVG bleibt davon immer unberührt.', 'img-svg-block' ) }
									</p>
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
						{ ! isPixelForeground && (
							<>
								<PanelRow>
									<ToggleControl
										label={ __( 'Zusätzliches SVG mit Textpfad', 'img-svg-block' ) }
										help={ __( 'Legt ein zweites SVG über den Vordergrund – z. B. ein umlaufender Text um die freigestellte Grafik.', 'img-svg-block' ) }
										checked={ !! fgTextpathEnable }
										onChange={ ( value ) => setAttributes( { 'fg-textpath-enable': value } ) }
									/>
								</PanelRow>
								{ fgTextpathEnable && (
									<>
										<PanelRow>
											<MediaUploadCheck>
												<MediaUpload
													onSelect={ onSelectTextpathSvg }
													allowedTypes={ [ 'image/svg+xml' ] }
													value={ fgTextpathId }
													render={ ( { open } ) => (
														<Button onClick={ open } variant="secondary">
															{ fgTextpathUrl
																? __( 'Textpfad-SVG ändern', 'img-svg-block' )
																: __( 'Textpfad-SVG auswählen', 'img-svg-block' ) }
														</Button>
													) }
												/>
											</MediaUploadCheck>
										</PanelRow>
										{ fgTextpathUrl && (
											<PanelRow>
												<Button onClick={ onRemoveTextpathSvg } variant="link" isDestructive>
													{ __( 'Textpfad-SVG entfernen', 'img-svg-block' ) }
												</Button>
											</PanelRow>
										) }
										{ textpathSvg.hasError && (
											<PanelRow>
												<Notice status="warning" isDismissible={ false }>
													{ __( 'Die SVG-Datei konnte nicht eingebettet werden – Text, Schrift und Farbe lassen sich daher nicht anpassen.', 'img-svg-block' ) }
												</Notice>
											</PanelRow>
										) }
										{ hasTextpath && ! textpathSvg.hasError && (
											<>
												<TextControl
													label={ __( 'Text', 'img-svg-block' ) }
													help={ __( 'Leer lassen, um den Text aus der SVG-Datei zu verwenden.', 'img-svg-block' ) }
													placeholder={ textpathSvg.ownText }
													value={ fgTextpathText || '' }
													onChange={ ( value ) => setAttributes( { 'fg-textpath-text': value } ) }
												/>
												<FontFamilyControl
													fontFamilies={ fontFamilies }
													value={ fgTextpathFontFamily }
													onChange={ ( value ) => setAttributes( { 'fg-textpath-font-family': value } ) }
												/>
												<FontSizePicker
													fontSizes={ fontSizes }
													value={ fgTextpathFontSize }
													onChange={ ( value ) => setAttributes( { 'fg-textpath-font-size': value } ) }
													withSlider
												/>
												<LetterSpacingControl
													value={ fgTextpathLetterSpacing }
													onChange={ ( value ) => setAttributes( { 'fg-textpath-letter-spacing': value } ) }
												/>
												<p className="components-base-control__help">
													{ __( 'Schriftgröße und Laufweite skalieren mit der Grafik: sie gelten im Koordinatensystem der SVG-Datei, nicht in Bildschirmpixeln.', 'img-svg-block' ) }
												</p>
												<ColorPaletteControl
													label={ __( 'Farbe', 'img-svg-block' ) }
													colors={ colorPalette }
													value={ fgTextpathColor }
													onChange={ ( color ) => setAttributes( { 'fg-textpath-color': color } ) }
												/>
											</>
										) }
									</>
								) }
							</>
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
						instructions={ foregroundMedia.instructions }
					>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ foregroundMedia.onSelect }
								allowedTypes={ foregroundMedia.allowedTypes }
								value={ foregroundMedia.value }
								render={ ( { open } ) => (
									<Button onClick={ open } variant="primary">
										{ foregroundMedia.label }
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
									fillColor: safeCssValue( svgFillColor ),
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
							svgForeground
						) }
						{ hasTextpath && textpathLayer }
					</>
				) }
			</figure>
		</>
	);
}
