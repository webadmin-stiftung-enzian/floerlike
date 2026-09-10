<?php
/**
 * PHP file to use when rendering the block type on the server to show on the front end.
 *
 * The following variables are exposed to the file:
 *     $attributes (array): The block attributes.
 *     $content (string): The block default content.
 *     $block (WP_Block): The block instance.
 *
 * @see https://github.com/WordPress/gutenberg/blob/trunk/docs/reference-guides/block-api/block-metadata.md#render
 */

if ( ! function_exists( 'img_svg_block_focal_point_position' ) ) {
	/**
	 * Formats a focal point attribute as a CSS position string.
	 *
	 * @param array|null $focal_point Focal point with 'x' and 'y' keys (0-1).
	 * @return string CSS position, e.g. "50% 50%".
	 */
	function img_svg_block_focal_point_position( $focal_point ) {
		$x = isset( $focal_point['x'] ) ? (float) $focal_point['x'] : 0.5;
		$y = isset( $focal_point['y'] ) ? (float) $focal_point['y'] : 0.5;
		return sprintf( '%s%% %s%%', $x * 100, $y * 100 );
	}
}

if ( ! function_exists( 'img_svg_block_scale_factor' ) ) {
	/**
	 * Converts a "Größe" scale attribute (-200..200, 0 = container height) into
	 * a CSS transform scale factor, so the shape grows/shrinks as a whole and
	 * can overflow past the block's edges instead of just zooming inside a
	 * fixed mask.
	 *
	 * @param int|float|null $scale Scale attribute value.
	 * @return float Non-negative scale factor for `transform: scale()`.
	 */
	function img_svg_block_scale_factor( $scale ) {
		return max( 0, 1 + ( (float) $scale ) / 100 );
	}
}

if ( ! function_exists( 'img_svg_block_counter_scale_factor' ) ) {
	/**
	 * Inverse of a scale factor, for cancelling out a parent's
	 * `transform: scale()` on a child element (e.g. so a photo doesn't
	 * visually zoom while the mask "window" revealing it grows/shrinks).
	 * Guards against dividing by zero when the parent is fully scaled down
	 * to invisible.
	 *
	 * @param float $factor Scale factor (as returned by img_svg_block_scale_factor()).
	 * @return float Counter-scale factor.
	 */
	function img_svg_block_counter_scale_factor( $factor ) {
		return $factor > 0 ? 1 / $factor : 1;
	}
}

if ( ! function_exists( 'img_svg_block_mask_box_style' ) ) {
	/**
	 * Builds the style for a mask "box" element sized to fill its container
	 * exactly. `mask-size: contain` fits the SVG entirely within it at 0 %
	 * scale, whichever axis is the limiting one — unlike forcing the height
	 * to 100 % (which clips the sides of an SVG whose aspect ratio is wider
	 * than the container's), this never crops anything, regardless of the
	 * SVG's proportions. The whole box is then grown/shrunk via
	 * `transform: scale()` anchored at the focal point, so it stays
	 * proportionally consistent across screen sizes while still being able
	 * to bleed past the container's edges.
	 *
	 * @param string     $url         Mask image URL.
	 * @param array|null $focal_point Focal point with 'x' and 'y' keys (0-1).
	 * @param int|float  $scale       Scale attribute value.
	 * @return string Inline CSS declarations.
	 */
	function img_svg_block_mask_box_style( $url, $focal_point, $scale ) {
		$position = img_svg_block_focal_point_position( $focal_point );

		return sprintf(
			" position: absolute; inset: 0; z-index: 1; -webkit-mask-image: url('%1\$s'); mask-image: url('%1\$s'); -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-size: contain; mask-size: contain; -webkit-mask-position: %2\$s; mask-position: %2\$s; transform: scale(%3\$s); transform-origin: %2\$s;",
			esc_url( $url ),
			esc_attr( $position ),
			esc_attr( img_svg_block_scale_factor( $scale ) )
		);
	}
}

if ( ! function_exists( 'img_svg_block_shape_style' ) ) {
	/**
	 * Builds the style for a solid-color mask "shape" element (background
	 * shape or standalone foreground SVG) — a mask box filled with a flat
	 * color.
	 *
	 * @param string     $url         Mask image URL.
	 * @param string     $fill_color  CSS color.
	 * @param array|null $focal_point Focal point with 'x' and 'y' keys (0-1).
	 * @param int|float  $scale       Scale attribute value.
	 * @return string Inline CSS declarations.
	 */
	function img_svg_block_shape_style( $url, $fill_color, $focal_point, $scale ) {
		return sprintf( ' background-color: %s;', esc_attr( $fill_color ) ) . img_svg_block_mask_box_style( $url, $focal_point, $scale );
	}
}

if ( ! function_exists( 'img_svg_block_fit_style' ) ) {
	/**
	 * Builds the style for a foreground element that is rendered as-is — an
	 * `<img>` holding a vector graphic, or an inlined textPath SVG. Unlike a
	 * masked shape it keeps its own artwork (colors, gradients, strokes), so
	 * it only needs fitting into the block: `contain` shows the whole drawing
	 * at 0 %, the focal point decides which part stays put, and
	 * `transform: scale()` grows or shrinks it from there.
	 *
	 * @param array|null $focal_point Focal point with 'x' and 'y' keys (0-1).
	 * @param int|float  $scale       Scale attribute value.
	 * @return string Inline CSS declarations.
	 */
	function img_svg_block_fit_style( $focal_point, $scale ) {
		$position = img_svg_block_focal_point_position( $focal_point );

		return sprintf(
			' object-position: %1$s; transform: scale(%2$s); transform-origin: %1$s;',
			esc_attr( $position ),
			esc_attr( img_svg_block_scale_factor( $scale ) )
		);
	}
}

if ( ! function_exists( 'img_svg_block_preserve_aspect_ratio' ) ) {
	/**
	 * Maps a focal point onto an SVG `preserveAspectRatio` alignment. An
	 * inlined SVG has no `object-position`; the nearest equivalent is which
	 * corner of its viewBox is pinned when the drawing is fitted ("meet",
	 * i.e. contain) into a box of a different aspect ratio. The picker's
	 * continuous position is therefore quantised to the nine alignments SVG
	 * offers.
	 *
	 * @param array|null $focal_point Focal point with 'x' and 'y' keys (0-1).
	 * @return string `preserveAspectRatio` value.
	 */
	function img_svg_block_preserve_aspect_ratio( $focal_point ) {
		$third = static function ( $value ) {
			if ( $value < 1 / 3 ) {
				return 'Min';
			}
			return $value > 2 / 3 ? 'Max' : 'Mid';
		};

		return sprintf(
			'x%sY%s meet',
			$third( isset( $focal_point['x'] ) ? (float) $focal_point['x'] : 0.5 ),
			$third( isset( $focal_point['y'] ) ? (float) $focal_point['y'] : 0.5 )
		);
	}
}

if ( ! function_exists( 'img_svg_block_is_text_element' ) ) {
	/**
	 * Tells whether an element's fill paints glyphs. Those are the one
	 * exception to the value kept below: on a shape `fill: none` means an
	 * outline, but a drawing program routinely leaves it on the `<text>` of a
	 * textPath — the words are then stroked, or simply invisible in the file —
	 * and keeping it would draw nothing at all where the block expects its own
	 * text.
	 *
	 * @param DOMElement|null $element Element carrying the declaration.
	 * @return bool Whether it is a text element.
	 */
	function img_svg_block_is_text_element( $element ) {
		return $element instanceof DOMElement
			&& in_array( strtolower( $element->localName ), array( 'text', 'textpath', 'tspan', 'tref' ), true );
	}
}

if ( ! function_exists( 'img_svg_block_kept_value' ) ) {
	/**
	 * The value that survives a property being taken over: `fill: none` marks
	 * an outline, and filling it in would turn the drawing into a silhouette.
	 *
	 * @param string          $property CSS property.
	 * @param DOMElement|null $element  Element carrying the declaration, when known.
	 * @return string Value to keep, or an empty string when none is.
	 */
	function img_svg_block_kept_value( $property, $element = null ) {
		if ( 'fill' !== $property || img_svg_block_is_text_element( $element ) ) {
			return '';
		}
		return 'none';
	}
}

if ( ! function_exists( 'img_svg_block_strip_declaration' ) ) {
	/**
	 * Removes one property's declaration from an inline `style` value.
	 *
	 * @param string          $style    Inline style value.
	 * @param string          $property CSS property to remove.
	 * @param DOMElement|null $element  Element carrying the style, when known.
	 * @return string Style value without that declaration.
	 */
	function img_svg_block_strip_declaration( $style, $property, $element = null ) {
		$kept_value = img_svg_block_kept_value( $property, $element );
		$kept       = array();

		foreach ( explode( ';', $style ) as $declaration ) {
			$parts = explode( ':', $declaration, 2 );
			$value = isset( $parts[1] ) ? strtolower( trim( $parts[1] ) ) : '';
			if ( $property !== strtolower( trim( $parts[0] ) ) || ( '' !== $kept_value && $kept_value === $value ) ) {
				$kept[] = $declaration;
			}
		}

		return implode( ';', $kept );
	}
}

if ( ! function_exists( 'img_svg_block_take_over_property' ) ) {
	/**
	 * Removes everything the file says about one inherited property —
	 * presentation attribute, inline style and `<style>` rule alike, since
	 * class-based declarations are how Illustrator and Figma usually export —
	 * so that the value the block sets on the container is what the drawing
	 * inherits. Every property handled here (`fill`, and the typography ones)
	 * is inherited in SVG, so clearing the descendants is enough for the
	 * block's value to reach them.
	 *
	 * @param DOMDocument $dom      Parsed SVG document (mutated in place).
	 * @param DOMXPath    $xpath    XPath over that document.
	 * @param string      $property CSS property the block takes over.
	 */
	function img_svg_block_take_over_property( $dom, $xpath, $property ) {
		$kept_value = img_svg_block_kept_value( $property );
		$guard      = '' !== $kept_value ? '(?!\s*' . $kept_value . ')' : '';
		$rule       = '/' . $property . '\s*:\s*' . $guard . '[^;}]+;?/i';

		foreach ( iterator_to_array( $xpath->query( "//*[local-name()='style']" ) ) as $style ) {
			$style->textContent = preg_replace( $rule, '', $style->textContent );
		}

		foreach ( iterator_to_array( $xpath->query( '//*' ) ) as $element ) {
			$element_kept_value = img_svg_block_kept_value( $property, $element );
			if ( '' === $element_kept_value || $element_kept_value !== strtolower( trim( $element->getAttribute( $property ) ) ) ) {
				$element->removeAttribute( $property );
			}
			if ( $element->hasAttribute( 'style' ) ) {
				$element->setAttribute( 'style', img_svg_block_strip_declaration( $element->getAttribute( 'style' ), $property, $element ) );
			}
		}
	}
}

if ( ! function_exists( 'img_svg_block_safe_css_value' ) ) {
	/**
	 * Passes a block attribute through only when it is a single CSS value.
	 *
	 * These values end up in a `style` attribute, where escaping keeps them
	 * from breaking out of the attribute but not from adding declarations of
	 * their own — `x; background: url(https://evil.example/beacon)` would leak
	 * every visitor's IP to a foreign host. Presets (`var(--wp--preset--…)`)
	 * and fluid sizes (`clamp(…)`) have to survive, so what is checked is not
	 * the shape of a value but the absence of anything that could end the
	 * declaration, start a rule or pull in a remote resource.
	 *
	 * @param mixed $value Attribute value.
	 * @return string The value, or an empty string when it is not one.
	 */
	function img_svg_block_safe_css_value( $value ) {
		$value = trim( (string) $value );

		if ( '' === $value || strlen( $value ) > 200 ) {
			return '';
		}

		return preg_match( '/[;{}\\\\<>]|url\s*\(|expression\s*\(|@import|\/\*/i', $value ) ? '' : $value;
	}
}

if ( ! function_exists( 'img_svg_block_svg_path' ) ) {
	/**
	 * Resolves the block's SVG attribute onto a file on disk, and refuses
	 * everything that is not an SVG in this site's media library.
	 *
	 * Embedding hands a file's markup to the browser as part of the page, so
	 * the file has to be one that came through the media library's own upload
	 * sanitizing (Safe SVG and friends). Two things would otherwise get past
	 * it: a payload uploaded under a mime type nobody sanitizes (`text/plain`
	 * is uploadable by every author) and simply pointed at from the block, and
	 * a `..` in the URL, which the old concatenation of upload path and URL
	 * remainder followed out of the uploads directory. Hence: the attachment
	 * decides, its mime type must be `image/svg+xml`, and the resolved path
	 * must still be inside the uploads directory.
	 *
	 * @param string|int $attachment_id Attachment ID of the SVG.
	 * @param string     $url           SVG file URL, used when the ID is unknown.
	 * @return string Readable path to the file, or an empty string.
	 */
	function img_svg_block_svg_path( $attachment_id, $url ) {
		$attachment_id = (int) $attachment_id;

		if ( ! $attachment_id && $url ) {
			$attachment_id = attachment_url_to_postid( $url );
		}

		if ( ! $attachment_id || 'image/svg+xml' !== get_post_mime_type( $attachment_id ) ) {
			return '';
		}

		$path    = realpath( (string) get_attached_file( $attachment_id ) );
		$uploads = wp_get_upload_dir();
		$base    = empty( $uploads['basedir'] ) ? false : realpath( $uploads['basedir'] );

		if ( ! $path || ! $base || 0 !== strpos( $path, $base . DIRECTORY_SEPARATOR ) ) {
			return '';
		}

		return is_readable( $path ) ? $path : '';
	}
}

if ( ! function_exists( 'img_svg_block_allowed_elements' ) ) {
	/**
	 * The elements an embedded drawing may consist of, by local name.
	 *
	 * An allowlist rather than a list of the dangerous ones: a blocklist has
	 * to be complete to hold, and SVG keeps handing out new ways to run code —
	 * SMIL (`<animate>`, `<set>`) can rewrite an attribute into a
	 * `javascript:` URL, `<foreignObject>` opens a hole into HTML. Everything
	 * here is static drawing; anything a drawing does not need is not on the
	 * list and is dropped with its subtree.
	 *
	 * @return array Allowed local names, lowercase.
	 */
	function img_svg_block_allowed_elements() {
		return array(
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
		);
	}
}

if ( ! function_exists( 'img_svg_block_is_safe_href' ) ) {
	/**
	 * Tells whether a reference may stay on an embedded element.
	 *
	 * Browsers ignore control characters and whitespace inside a URL's scheme,
	 * so `jav&#9;ascript:alert(1)` runs as `javascript:alert(1)` while a check
	 * for a leading `javascript:` sees something harmless. Stripping those
	 * characters before comparing is what closes that gap, and an allowlist of
	 * schemes is what keeps the next such trick (`vbscript:`, `data:text/html`)
	 * from needing its own rule.
	 *
	 * @param string $value Attribute value.
	 * @return bool Whether the reference is safe to keep.
	 */
	function img_svg_block_is_safe_href( $value ) {
		$value = preg_replace( '/[\x00-\x20]+/', '', (string) $value );

		if ( '' === $value || '#' === $value[0] || '/' === $value[0] ) {
			return true;
		}

		if ( preg_match( '#^https?://#i', $value ) ) {
			// An absolute reference is how a drawing points at a photo in the
			// media library, so it is allowed — but only to this site. A
			// reference to a foreign host would hand every visitor's IP
			// address to whoever the file names, and let them swap what is
			// shown after the fact.
			$host = wp_parse_url( $value, PHP_URL_HOST );
			$site = wp_parse_url( home_url(), PHP_URL_HOST );

			return $host && $site && strtolower( $host ) === strtolower( $site );
		}

		if ( preg_match( '#^data:image/(png|jpe?g|gif|webp);base64,#i', $value ) ) {
			return true;
		}

		// A relative path: no scheme in front of the first separator.
		return ! preg_match( '/^[a-z0-9+.-]*:/i', $value );
	}
}

if ( ! function_exists( 'img_svg_block_scope_css' ) ) {
	/**
	 * Binds a `<style>` element's rules to the drawing it came with.
	 *
	 * CSS inside an SVG that is *embedded* is not scoped to that SVG the way a
	 * referenced file's is — it applies to the whole page, so `body{display:none}`
	 * in an uploaded drawing takes the page down with it and an attribute
	 * selector can read values off the page and post them to a foreign host
	 * through a background URL. Every selector is therefore prefixed with the
	 * class the embedding step puts on the drawing's root, at-rules and `url()`
	 * are dropped, and what an export actually relies on — the `.cls-1{fill:…}`
	 * rules Illustrator and Figma write — keeps working.
	 *
	 * @param string $css   Style element contents.
	 * @param string $scope Class name on the drawing's root element.
	 * @return string Scoped CSS.
	 */
	function img_svg_block_scope_css( $css, $scope ) {
		$css = preg_replace( '/@[^;{}]*;/', '', $css );
		$css = preg_replace( '/@[^{}]*\{(?:[^{}]*\{[^{}]*\}\s*)*[^{}]*\}/', '', $css );
		$css = preg_replace( '/url\s*\([^)]*\)/i', '', $css );

		return preg_replace_callback(
			'/(^|\})([^{}]+)\{/',
			static function ( $matches ) use ( $scope ) {
				$selectors = array();
				foreach ( explode( ',', $matches[2] ) as $selector ) {
					$selector = trim( $selector );
					if ( '' !== $selector ) {
						$selectors[] = '.' . $scope . ' ' . $selector;
					}
				}
				return $matches[1] . implode( ',', $selectors ) . '{';
			},
			(string) $css
		);
	}
}

if ( ! function_exists( 'img_svg_block_sanitize_svg' ) ) {
	/**
	 * Reduces a parsed SVG to what a drawing needs: allowed elements, no event
	 * handlers, no unsafe references, and its own CSS bound to itself.
	 *
	 * SVG uploads are sanitized on their way into the media library already —
	 * this is the second line of defence, and the only one on the path the
	 * block itself opens by embedding a file's markup into the page. The
	 * editor-side counterpart lives in `inline-svg.js` — keep the two in sync.
	 *
	 * @param DOMDocument $dom   Parsed SVG document (mutated in place).
	 * @param DOMXPath    $xpath XPath over that document.
	 * @param string      $scope Class name to bind the file's own CSS to.
	 */
	function img_svg_block_sanitize_svg( $dom, $xpath, $scope ) {
		$allowed = img_svg_block_allowed_elements();

		foreach ( iterator_to_array( $xpath->query( '//*' ) ) as $element ) {
			$is_svg = null === $element->namespaceURI || 'http://www.w3.org/2000/svg' === $element->namespaceURI;

			if ( ( ! $is_svg || ! in_array( strtolower( $element->localName ), $allowed, true ) ) && $element->parentNode ) {
				$element->parentNode->removeChild( $element );
			}
		}

		foreach ( iterator_to_array( $xpath->query( '//@*' ) ) as $attribute ) {
			$name = strtolower( $attribute->nodeName );

			if ( 0 === strpos( $name, 'on' ) || ( false !== strpos( $name, 'href' ) && ! img_svg_block_is_safe_href( $attribute->value ) ) ) {
				$attribute->ownerElement->removeAttributeNode( $attribute );
			}
		}

		foreach ( iterator_to_array( $xpath->query( "//*[local-name()='style']" ) ) as $style ) {
			$style->textContent = img_svg_block_scope_css( $style->textContent, $scope );
		}
	}
}

if ( ! function_exists( 'img_svg_block_inline_svg' ) ) {
	/**
	 * Reads an SVG file and prepares its markup for embedding directly into
	 * the page.
	 *
	 * Embedding buys three things a referenced SVG cannot have. An `<image>`
	 * inside it renders at all: a browser puts an SVG loaded through `<img>`
	 * into secure static mode, where external references — a cut-out photo
	 * pulled from the media library, say — never load. Each property in
	 * $overrides stops being dictated by the file, so the drawing inherits
	 * what the block sets on its container; everything left out keeps the
	 * artwork's own value. And a textPath's glyphs stay real text running
	 * along their path, so the page's fonts apply to them and $text can
	 * replace the words. What is embedded is the file cut down to a drawing —
	 * see img_svg_block_svg_path() for which files qualify at all and
	 * img_svg_block_sanitize_svg() for what survives of them. The editor-side
	 * counterpart lives in `inline-svg.js` — keep the two in sync.
	 *
	 * @param string $attachment_id         Attachment ID of the SVG.
	 * @param string $url                   SVG file URL, used when the attachment ID is unknown.
	 * @param string $preserve_aspect_ratio How the drawing is fitted into the block.
	 * @param array  $overrides             CSS properties the block sets on the
	 *                                      container and the drawing must inherit.
	 * @param string $text                  Replaces the words drawn along a path.
	 * @return string Sanitized `<svg>` markup, or an empty string when the file
	 *                cannot be read or parsed.
	 */
	function img_svg_block_inline_svg( $attachment_id, $url, $preserve_aspect_ratio, $overrides = array(), $text = '' ) {
		$path = img_svg_block_svg_path( $attachment_id, $url );

		if ( ! $path ) {
			return '';
		}

		static $cache = array();
		$cache_key = $path . '|' . filemtime( $path ) . '|' . $preserve_aspect_ratio . '|' . implode( ' ', $overrides ) . '|' . $text;
		if ( isset( $cache[ $cache_key ] ) ) {
			return $cache[ $cache_key ];
		}

		$source = file_get_contents( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local file, not a remote request.

		$dom = new DOMDocument();
		$previous_errors = libxml_use_internal_errors( true );
		$loaded = $source && $dom->loadXML( $source, LIBXML_NONET );
		libxml_clear_errors();
		libxml_use_internal_errors( $previous_errors );

		if ( ! $loaded || ! $dom->documentElement || 'svg' !== strtolower( $dom->documentElement->localName ) ) {
			$cache[ $cache_key ] = '';
			return '';
		}

		$xpath = new DOMXPath( $dom );
		$scope = 'img-svg-block-scope-' . substr( md5( $path ), 0, 8 );

		img_svg_block_sanitize_svg( $dom, $xpath, $scope );

		foreach ( $overrides as $property ) {
			img_svg_block_take_over_property( $dom, $xpath, $property );
		}

		if ( '' !== $text ) {
			// A file may hold several runs; the first is the one the block
			// exposes for editing.
			$text_nodes = $xpath->query( "//*[local-name()='textPath']" );
			if ( ! $text_nodes->length ) {
				$text_nodes = $xpath->query( "//*[local-name()='text']" );
			}
			if ( $text_nodes->length ) {
				// Via a text node, not nodeValue: the latter is parsed as
				// markup, so an "&" in the text would break the document.
				$text_node = $text_nodes->item( 0 );
				while ( $text_node->firstChild ) {
					$text_node->removeChild( $text_node->firstChild );
				}
				$text_node->appendChild( $dom->createTextNode( $text ) );
			}
		}

		$svg = $dom->documentElement;
		$svg->setAttribute( 'class', trim( $svg->getAttribute( 'class' ) . ' ' . $scope ) );
		if ( in_array( 'fill', $overrides, true ) ) {
			// `fill` is the one property with no CSS keyword for "whatever the
			// container says", so it needs pointing at the inherited color.
			$svg->setAttribute( 'fill', 'currentColor' );
		}
		$svg->setAttribute( 'preserveAspectRatio', $preserve_aspect_ratio );
		$svg->removeAttribute( 'width' );
		$svg->removeAttribute( 'height' );

		$cache[ $cache_key ] = $dom->saveXML( $svg );

		return $cache[ $cache_key ];
	}
}

$fg_type          = $attributes['fg-type'] ?? 'pixel';
$is_pixel_fg      = 'svg' !== $fg_type;

$img_url          = $attributes['img-url'] ?? '';
$img_alt          = $attributes['img-alt'] ?? '';
$img_width        = $attributes['img-width'] ?? 0;
$img_height       = $attributes['img-height'] ?? 0;

$fg_svg_url       = $attributes['fg-svg-url'] ?? '';
$fg_svg_alt       = $attributes['fg-svg-alt'] ?? '';
$fg_svg_id        = $attributes['fg-svg-id'] ?? '';
$fg_svg_color     = img_svg_block_safe_css_value( $attributes['fg-svg-color'] ?? '' );
$fg_svg_scale     = $attributes['fg-svg-scale'] ?? 0;
$fg_focal_point   = $attributes['fg-focal-point'] ?? array( 'x' => 0.5, 'y' => 0.5 );

$fg_textpath_url  = $attributes['fg-textpath-url'] ?? '';
$fg_textpath_alt  = $attributes['fg-textpath-alt'] ?? '';
$fg_textpath_id   = $attributes['fg-textpath-id'] ?? '';
$fg_textpath_text = $attributes['fg-textpath-text'] ?? '';
$fg_textpath_color = img_svg_block_safe_css_value( $attributes['fg-textpath-color'] ?? '' );
$fg_textpath_font_family    = img_svg_block_safe_css_value( $attributes['fg-textpath-font-family'] ?? '' );
$fg_textpath_font_size      = img_svg_block_safe_css_value( $attributes['fg-textpath-font-size'] ?? '' );
$fg_textpath_letter_spacing = img_svg_block_safe_css_value( $attributes['fg-textpath-letter-spacing'] ?? '' );
$has_textpath     = ! $is_pixel_fg && ! empty( $attributes['fg-textpath-enable'] ) && $fg_textpath_url;

// How the textPath layer is fitted into the block: whole and centred, since
// it frames the foreground rather than being framed with it.
$textpath_aspect_ratio = 'xMidYMid meet';

$svg_url          = $attributes['svg-url'] ?? '';
// Only single CSS values reach a `style` attribute — see img_svg_block_safe_css_value().
$svg_color        = img_svg_block_safe_css_value( $attributes['svg-fill-color'] ?? '' );
$svg_color        = '' === $svg_color ? '#000000' : $svg_color;
$svg_enable       = ! empty( $attributes['svg-enable'] );
$img_mask_enable  = $is_pixel_fg && ! empty( $attributes['img-mask-enable'] );
$svg_scale        = $attributes['svg-scale'] ?? 0;
$svg_focal_point  = $attributes['svg-focal-point'] ?? array( 'x' => 0.5, 'y' => 0.5 );

$has_foreground = $is_pixel_fg ? (bool) $img_url : (bool) $fg_svg_url;

if ( ! $has_foreground ) {
	return;
}

$fg_position = img_svg_block_focal_point_position( $fg_focal_point );

$wrapper_style = '';
if ( $is_pixel_fg && $img_width && $img_height ) {
	$wrapper_style = sprintf( 'aspect-ratio: %d / %d;', (int) $img_width, (int) $img_height );
}

$wrapper_attributes = get_block_wrapper_attributes( array(
	'style' => $wrapper_style,
) );
?>
<figure <?php echo $wrapper_attributes; ?>>
	<?php if ( $svg_enable && $svg_url ) : ?>
		<span
			class="img-svg-block__shape"
			style="<?php echo esc_attr( img_svg_block_shape_style( $svg_url, $svg_color, $svg_focal_point, $svg_scale ) ); ?>"
			aria-hidden="true"
		></span>
	<?php endif; ?>
	<?php if ( $is_pixel_fg ) : ?>
		<?php if ( $img_mask_enable && $svg_url ) : ?>
			<span
				class="img-svg-block__mask-wrapper"
				style="<?php echo esc_attr( img_svg_block_mask_box_style( $svg_url, $svg_focal_point, $svg_scale ) ); ?>"
			>
				<img
					class="img-svg-block__image img-svg-block__image--masked"
					src="<?php echo esc_url( $img_url ); ?>"
					alt="<?php echo esc_attr( $img_alt ); ?>"
					style="position: absolute; inset: 0; object-position: <?php echo esc_attr( $fg_position ); ?>; transform: scale(<?php echo esc_attr( img_svg_block_counter_scale_factor( img_svg_block_scale_factor( $svg_scale ) ) ); ?>); transform-origin: <?php echo esc_attr( img_svg_block_focal_point_position( $svg_focal_point ) ); ?>;"
				/>
			</span>
		<?php else : ?>
			<img
				class="img-svg-block__image"
				src="<?php echo esc_url( $img_url ); ?>"
				alt="<?php echo esc_attr( $img_alt ); ?>"
				style="object-position: <?php echo esc_attr( $fg_position ); ?>;"
			/>
		<?php endif; ?>
	<?php else : ?>
		<?php
		// Embedded rather than referenced: an `<img>` would put the SVG into
		// secure static mode, where an `<image>` inside it — a cut-out photo
		// from the media library — never loads.
		$inline_svg = img_svg_block_inline_svg(
			$fg_svg_id,
			$fg_svg_url,
			img_svg_block_preserve_aspect_ratio( $fg_focal_point ),
			$fg_svg_color ? array( 'fill' ) : array()
		);

		// The embedded SVG inherits this `color` for every fill that named a
		// color — see img_svg_block_inline_svg().
		$inline_svg_style  = $fg_svg_color ? sprintf( 'color: %s;', $fg_svg_color ) : '';
		$inline_svg_style .= sprintf(
			' transform: scale(%1$s); transform-origin: %2$s;',
			img_svg_block_scale_factor( $fg_svg_scale ),
			img_svg_block_focal_point_position( $fg_focal_point )
		);
		?>
		<?php if ( $inline_svg ) : ?>
			<span
				class="img-svg-block__image img-svg-block__inline-svg"
				style="<?php echo esc_attr( $inline_svg_style ); ?>"
				role="img"
				aria-label="<?php echo esc_attr( $fg_svg_alt ); ?>"
			><?php echo $inline_svg; // phpcs:ignore WordPress.Security.EscapingOutput.OutputNotEscaped -- Sanitized in img_svg_block_inline_svg(). ?></span>
		<?php else : ?>
			<?php // The file could not be embedded: the artwork still shows, only the color and the text stay as the file has them. ?>
			<img
				class="img-svg-block__image img-svg-block__image--svg"
				src="<?php echo esc_url( $fg_svg_url ); ?>"
				alt="<?php echo esc_attr( $fg_svg_alt ); ?>"
				style="<?php echo esc_attr( img_svg_block_fit_style( $fg_focal_point, $fg_svg_scale ) ); ?>"
			/>
		<?php endif; ?>
	<?php endif; ?>
	<?php if ( $has_textpath ) : ?>
		<?php
		// Whatever the block styles, the file must stop dictating — see
		// img_svg_block_take_over_property().
		$textpath_styles = array(
			'color'          => $fg_textpath_color,
			'font-family'    => $fg_textpath_font_family,
			'font-size'      => $fg_textpath_font_size,
			'letter-spacing' => $fg_textpath_letter_spacing,
		);
		$textpath_styles = array_filter( $textpath_styles );

		// `fill` always: the layer is there to draw the block's words, so the
		// glyphs follow the block's color — the file's own fill (`none` in an
		// Inkscape export, which would draw nothing) is never the wanted one.
		$textpath_overrides = array( 'fill' );
		foreach ( array_keys( $textpath_styles ) as $property ) {
			if ( 'color' !== $property ) {
				$textpath_overrides[] = $property;
			}
		}

		$textpath_style = '';
		foreach ( $textpath_styles as $property => $value ) {
			$textpath_style .= sprintf( '%s: %s;', $property, $value );
		}

		$inline_textpath = img_svg_block_inline_svg(
			$fg_textpath_id,
			$fg_textpath_url,
			$textpath_aspect_ratio,
			$textpath_overrides,
			$fg_textpath_text
		);
		?>
		<?php if ( $inline_textpath ) : ?>
			<span
				class="img-svg-block__textpath img-svg-block__inline-svg"
				style="<?php echo esc_attr( $textpath_style ); ?>"
				role="img"
				aria-label="<?php echo esc_attr( $fg_textpath_alt ); ?>"
			><?php echo $inline_textpath; // phpcs:ignore WordPress.Security.EscapingOutput.OutputNotEscaped -- Sanitized in img_svg_block_inline_svg(). ?></span>
		<?php else : ?>
			<img
				class="img-svg-block__textpath"
				src="<?php echo esc_url( $fg_textpath_url ); ?>"
				alt="<?php echo esc_attr( $fg_textpath_alt ); ?>"
			/>
		<?php endif; ?>
	<?php endif; ?>
</figure>
