/**
 * Helpers for embedding an SVG file's markup directly into the document
 * instead of referencing it from an `<img>`/`mask-image`.
 *
 * Embedding buys three things a referenced SVG cannot have. An `<image>`
 * inside it renders at all: a browser puts an SVG loaded through `<img>` into
 * secure static mode, where external references — a cut-out photo pulled from
 * the media library, say — never load. Color and typography can be handed over
 * to the block's own controls. And a textPath's glyphs stay real text running
 * along their path, so the page's fonts apply to them and the words can be
 * swapped out from the editor. What is embedded is the file cut down to a
 * drawing — see `isEmbeddableUrl` for which files qualify at all and
 * `sanitizeSvg` for what survives of them. The equivalent server-side
 * implementation lives in `render.php` — keep the two in sync.
 */

/**
 * The elements an embedded drawing may consist of, by local name.
 *
 * An allowlist rather than a list of the dangerous ones: a blocklist has to be
 * complete to hold, and SVG keeps handing out new ways to run code — SMIL
 * (`<animate>`, `<set>`) can rewrite an attribute into a `javascript:` URL,
 * `<foreignObject>` opens a hole into HTML. Everything here is static drawing;
 * anything a drawing does not need is not on the list and is dropped with its
 * subtree.
 */
const ALLOWED_ELEMENTS = [
	'svg', 'g', 'defs', 'symbol', 'use', 'switch', 'a', 'title', 'desc', 'style', 'view',
	'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
	'text', 'textpath', 'tspan', 'tref',
	'image',
	'lineargradient', 'radialgradient', 'stop', 'pattern',
	'clippath', 'mask', 'marker',
	'filter', 'fegaussianblur', 'feoffset', 'feblend', 'fecolormatrix',
	'fecomponenttransfer', 'fefuncr', 'fefuncg', 'fefuncb', 'fefunca',
	'fecomposite', 'feconvolvematrix', 'fediffuselighting', 'fedisplacementmap',
	'fedistantlight', 'fedropshadow', 'feflood', 'feimage', 'femerge',
	'femergenode', 'femorphology', 'fepointlight', 'fespecularlighting',
	'fespotlight', 'fetile', 'feturbulence',
];

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/**
 * Tells whether a file may be embedded at all.
 *
 * Embedding runs a file's markup inside the editor, in the session of whoever
 * opens the post — so the file has to come from this site, where uploads pass
 * through the media library's sanitizing. A block attribute is just text in
 * the post, and anyone who may edit a post can point it at a host of their
 * own; a foreign URL is therefore not embedded but left to the `<img>`
 * fallback, which browsers keep in secure static mode.
 *
 * @param {string} url URL to load the drawing from.
 * @return {boolean} Whether it is safe to embed.
 */
export const isEmbeddableUrl = ( url ) => {
	try {
		return new window.URL( url, window.location.href ).origin === window.location.origin;
	} catch {
		return false;
	}
};

/**
 * Tells whether a reference may stay on an embedded element.
 *
 * Browsers ignore control characters and whitespace inside a URL's scheme, so
 * `jav&#9;ascript:alert(1)` runs as `javascript:alert(1)` while a check for a
 * leading `javascript:` sees something harmless. Stripping those characters
 * before comparing is what closes that gap, and an allowlist of schemes is
 * what keeps the next such trick (`vbscript:`, `data:text/html`) from needing
 * its own rule. An absolute reference is how a drawing points at a photo in
 * the media library, so it is allowed — but only to this site.
 *
 * @param {string} value Attribute value.
 * @return {boolean} Whether the reference is safe to keep.
 */
const isSafeHref = ( value ) => {
	const reference = String( value ).replace( /[\u0000-\u0020]+/g, '' );

	if ( '' === reference || reference.startsWith( '#' ) || reference.startsWith( '/' ) ) {
		return true;
	}

	if ( /^https?:\/\//i.test( reference ) ) {
		return isEmbeddableUrl( reference );
	}

	if ( /^data:image\/(png|jpe?g|gif|webp);base64,/i.test( reference ) ) {
		return true;
	}

	// A relative path: no scheme in front of the first separator.
	return ! /^[a-z0-9+.-]*:/i.test( reference );
};

/**
 * Names the class the file's own CSS gets bound to. Derived from the source so
 * that re-preparing the same file yields the same markup.
 *
 * @param {string} source SVG file contents.
 * @return {string} Class name.
 */
const scopeName = ( source ) => {
	let hash = 5381;
	for ( let index = 0; index < source.length; index++ ) {
		hash = ( hash * 33 + source.charCodeAt( index ) ) % 4294967296;
	}
	return `img-svg-block-scope-${ hash.toString( 16 ) }`;
};

/**
 * Binds a `<style>` element's rules to the drawing it came with.
 *
 * CSS inside an SVG that is *embedded* is not scoped to that SVG the way a
 * referenced file's is — it applies to the whole page, so `body{display:none}`
 * in an uploaded drawing takes the editor down with it and an attribute
 * selector can read values off the page and post them to a foreign host
 * through a background URL. Every selector is therefore prefixed with the
 * class the embedding step puts on the drawing's root, at-rules (which have no
 * selector to prefix) and `url()` are dropped, and what an export actually
 * relies on — the `.cls-1{fill:…}` rules Illustrator and Figma write — keeps
 * working.
 *
 * @param {string} css   Style element contents.
 * @param {string} scope Class name on the drawing's root element.
 * @return {string} Scoped CSS.
 */
const scopeCss = ( css, scope ) =>
	css
		.replace( /@[^;{}]*;/g, '' )
		.replace( /@[^{}]*\{(?:[^{}]*\{[^{}]*\}\s*)*[^{}]*\}/g, '' )
		.replace( /url\s*\([^)]*\)/gi, '' )
		.replace( /(^|\})([^{}]+)\{/g, ( match, before, selectors ) => {
			const scoped = selectors
				.split( ',' )
				.map( ( selector ) => selector.trim() )
				.filter( Boolean )
				.map( ( selector ) => `.${ scope } ${ selector }` );
			return `${ before }${ scoped.join( ',' ) }{`;
		} );

/**
 * Reduces a parsed SVG to what a drawing needs: allowed elements, no event
 * handlers, no unsafe references, and its own CSS bound to itself.
 *
 * SVG uploads are sanitized on their way into the media library already — this
 * is the second line of defence, and the only one on the path the block itself
 * opens by embedding a file's markup into the page.
 *
 * @param {SVGElement} svg   Root SVG element (mutated in place).
 * @param {string}     scope Class name to bind the file's own CSS to.
 */
const sanitizeSvg = ( svg, scope ) => {
	svg.querySelectorAll( '*' ).forEach( ( element ) => {
		const isSvgElement =
			null === element.namespaceURI || SVG_NAMESPACE === element.namespaceURI;

		if ( ! isSvgElement || ! ALLOWED_ELEMENTS.includes( element.localName.toLowerCase() ) ) {
			element.remove();
		}
	} );

	[ svg, ...svg.querySelectorAll( '*' ) ].forEach( ( element ) => {
		[ ...element.attributes ].forEach( ( attribute ) => {
			const name = attribute.name.toLowerCase();

			if ( name.startsWith( 'on' ) || ( name.includes( 'href' ) && ! isSafeHref( attribute.value ) ) ) {
				element.removeAttributeNode( attribute );
			}
		} );
	} );

	svg.querySelectorAll( 'style' ).forEach( ( style ) => {
		style.textContent = scopeCss( style.textContent, scope );
	} );
};

/**
 * Values that survive a property being taken over: `fill: none` marks an
 * outline, and filling it in would turn the drawing into a silhouette.
 */
const KEPT_VALUES = { fill: 'none' };

/**
 * The elements whose fill paints glyphs, and the one exception to the rule
 * above: on a shape `fill: none` means an outline, but a drawing program
 * routinely leaves it on the `<text>` of a textPath — the words are then
 * stroked, or simply invisible in the file — and keeping it would draw
 * nothing at all where the block expects its own text.
 */
const TEXT_ELEMENTS = [ 'text', 'textpath', 'tspan', 'tref' ];

/**
 * Tells whether one element's value for the property being taken over must
 * survive.
 *
 * @param {Element} element  Element carrying the declaration.
 * @param {string}  property CSS property being taken over.
 * @return {Function} Predicate over the declared value.
 */
const keepsValue = ( element, property ) => ( value ) => {
	const kept = KEPT_VALUES[ property ];
	return (
		!! kept &&
		value.trim().toLowerCase() === kept &&
		! TEXT_ELEMENTS.includes( element.tagName.toLowerCase() )
	);
};

/**
 * Removes one property's declaration from an inline `style` value.
 *
 * @param {string}   style    Inline style value.
 * @param {string}   property CSS property to remove.
 * @param {Function} isKept   Tells whether a value must survive.
 * @return {string} Style value without that declaration.
 */
const stripDeclaration = ( style, property, isKept ) =>
	style
		.split( ';' )
		.filter( ( declaration ) => {
			const [ name, value = '' ] = declaration.split( ':' );
			return name.trim().toLowerCase() !== property || isKept( value );
		} )
		.join( ';' );

/**
 * Removes everything the file says about one inherited property — presentation
 * attribute, inline style and `<style>` rule alike, since class-based
 * declarations are how Illustrator and Figma usually export — so that the
 * value the block sets on the container is what the drawing inherits. Every
 * property handled here (`fill`, and the typography ones) is inherited in SVG,
 * so clearing the descendants is enough for the block's value to reach them.
 *
 * @param {SVGElement} svg      Root SVG element (mutated in place).
 * @param {string}     property CSS property the block takes over.
 */
const takeOverProperty = ( svg, property ) => {
	const kept = KEPT_VALUES[ property ];
	const rule = new RegExp( `${ property }\\s*:\\s*${ kept ? `(?!\\s*${ kept })` : '' }[^;}]+;?`, 'gi' );

	svg.querySelectorAll( 'style' ).forEach( ( style ) => {
		style.textContent = style.textContent.replace( rule, '' );
	} );

	[ svg, ...svg.querySelectorAll( '*' ) ].forEach( ( element ) => {
		const isKept = keepsValue( element, property );
		const attribute = element.getAttribute( property );
		if ( null !== attribute && ! isKept( attribute ) ) {
			element.removeAttribute( property );
		}

		const style = element.getAttribute( 'style' );
		if ( style ) {
			element.setAttribute( 'style', stripDeclaration( style, property, isKept ) );
		}
	} );
};

/**
 * Finds the text a textPath SVG draws along its path. A file may hold several
 * runs; the first is the one the block exposes for editing.
 *
 * @param {SVGElement} svg Root SVG element.
 * @return {?Element} The `<textPath>`, its `<text>` when the file has no
 *                    textPath, or null when it carries no text at all.
 */
const findTextNode = ( svg ) => svg.querySelector( 'textPath' ) || svg.querySelector( 'text' );

/**
 * Maps a focal point onto an SVG `preserveAspectRatio` alignment. An inline
 * SVG has no `object-position`; the nearest equivalent is which corner of its
 * viewBox is pinned when the drawing is fitted ("meet", i.e. contain) into a
 * box of a different aspect ratio. The picker's continuous position is
 * therefore quantised to the nine alignments SVG offers.
 *
 * @param {{x: number, y: number}} focalPoint Focal point value.
 * @return {string} `preserveAspectRatio` value.
 */
export const focalPointToPreserveAspectRatio = ( focalPoint ) => {
	const third = ( value ) => {
		if ( value < 1 / 3 ) {
			return 'Min';
		}
		return value > 2 / 3 ? 'Max' : 'Mid';
	};
	return `x${ third( focalPoint?.x ?? 0.5 ) }Y${ third( focalPoint?.y ?? 0.5 ) } meet`;
};

/**
 * Parses an SVG file's source into markup that is safe to inject, optionally
 * handing some of its properties over to the block's own styling and replacing
 * the words it draws along a path.
 *
 * @param {string}   source                      SVG file contents.
 * @param {Object}   options
 * @param {string}   options.preserveAspectRatio How the drawing is fitted into the block.
 * @param {string[]} options.overrides           CSS properties the block sets on
 *                                               the container and the drawing
 *                                               must therefore inherit, e.g.
 *                                               `fill` or `font-family`.
 * @param {string}   options.text                Replaces the words drawn along the
 *                                               path; empty keeps the file's own.
 * @return {?{markup: string, text: string}} The sanitized `<svg>` and the text
 *                                           the file itself carries, or null
 *                                           when the source is not SVG.
 */
export const prepareInlineSvg = ( source, { preserveAspectRatio, overrides = [], text } = {} ) => {
	const parsed = new window.DOMParser().parseFromString( source, 'image/svg+xml' );
	const svg = parsed.querySelector( 'svg' );

	if ( ! svg || parsed.querySelector( 'parsererror' ) ) {
		return null;
	}

	const scope = scopeName( source );
	sanitizeSvg( svg, scope );
	svg.setAttribute( 'class', `${ svg.getAttribute( 'class' ) ?? '' } ${ scope }`.trim() );

	overrides.forEach( ( property ) => takeOverProperty( svg, property ) );

	if ( overrides.includes( 'fill' ) ) {
		// `fill` is the one property with no CSS keyword for "whatever the
		// container says", so it needs pointing at the inherited color.
		svg.setAttribute( 'fill', 'currentColor' );
	}

	const textNode = findTextNode( svg );
	const ownText = textNode ? textNode.textContent.trim() : '';

	if ( textNode && text ) {
		textNode.textContent = text;
	}

	if ( preserveAspectRatio ) {
		svg.setAttribute( 'preserveAspectRatio', preserveAspectRatio );
	}
	svg.removeAttribute( 'width' );
	svg.removeAttribute( 'height' );

	return { markup: svg.outerHTML, text: ownText };
};
