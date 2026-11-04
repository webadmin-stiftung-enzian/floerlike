<?php
/**
 * Moves photos embedded in an SVG out into files of their own.
 *
 * A drawing program embeds a placed photo as base64 unless told to link it —
 * and linking is impractical: the link points at a file on the designer's
 * computer, and photo and drawing then have to be kept in step by hand. So the
 * file is uploaded as it is, and the block splits it: every large embedded
 * photo is written next to the SVG as an image file (WebP where the server can,
 * transparency kept), and the SVG references that file instead. The drawing
 * stays one file in the media library and looks the same; it just no longer
 * carries megabytes of base64 into every page that embeds it — which is what
 * exhausted PHP's memory on a 128 MB host.
 *
 * Runs when the SVG is picked in the block (REST route below, called by
 * edit.js), and as a fallback when a page embeds a file that was picked before
 * this existed (render.php). The SVG file is rewritten in place; the photos
 * are listed in the attachment's meta and deleted with it.
 *
 * @package StiftungEnzian
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Embedded images shorter than this stay inline: textures and icons cost
 * little, and a file of their own would not be worth it.
 */
const IMG_SVG_BLOCK_EXTERNALIZE_MIN_LENGTH = 50 * 1024;

/**
 * Longest edge an extracted photo is scaled down to. Drawings are exported at
 * print resolution; the page never shows them larger than this.
 */
const IMG_SVG_BLOCK_EXTERNALIZE_MAX_EDGE = 2400;

/**
 * Meta key on the SVG attachment listing the photos taken out of it.
 */
const IMG_SVG_BLOCK_EXTERNALIZE_META = '_img_svg_block_images';

/**
 * Meta key remembering which version of the file (its modification time) was
 * last searched, so a large drawing without photos is not read on every page.
 */
const IMG_SVG_BLOCK_EXTERNALIZE_CHECKED = '_img_svg_block_checked';

/**
 * The photos already taken out of an SVG attachment.
 *
 * @param int $attachment_id SVG attachment.
 * @return string[] Root-relative URLs.
 */
function img_svg_block_extracted_images( $attachment_id ) {
	$listed = get_post_meta( $attachment_id, IMG_SVG_BLOCK_EXTERNALIZE_META, true );
	return is_array( $listed ) ? array_values( array_filter( $listed ) ) : array();
}

/**
 * Tells whether a file probably still carries a large embedded photo — cheap
 * enough to ask on every render: only the size on disk is looked at.
 *
 * @param string $path SVG file path.
 * @return bool Whether splitting it is worth trying.
 */
function img_svg_block_may_need_externalizing( $path ) {
	return is_readable( $path ) && filesize( $path ) > IMG_SVG_BLOCK_EXTERNALIZE_MIN_LENGTH;
}

/**
 * Writes one decoded photo next to the SVG and returns its URL path.
 *
 * @param string $data     Decoded image bytes.
 * @param string $svg_path Path of the SVG the photo came from.
 * @param int    $index    Running number within that SVG.
 * @return string Root-relative URL of the written file, or '' on failure.
 */
function img_svg_block_write_extracted_image( $data, $svg_path, $index ) {
	$dir  = dirname( $svg_path );
	$base = pathinfo( $svg_path, PATHINFO_FILENAME ) . '-bild-' . $index;

	// wp_tempnam() lives with the admin's file helpers; a page render has not
	// loaded them.
	require_once ABSPATH . 'wp-admin/includes/file.php';

	$temp = wp_tempnam( $base );
	if ( ! $temp || false === file_put_contents( $temp, $data ) ) { // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		return '';
	}

	$size = @getimagesize( $temp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- not an image is an expected answer.
	if ( ! $size || ! in_array( $size['mime'], array( 'image/png', 'image/jpeg', 'image/gif', 'image/webp' ), true ) ) {
		wp_delete_file( $temp );
		return '';
	}

	$target = '';
	$editor = wp_get_image_editor( $temp );
	if ( ! is_wp_error( $editor ) ) {
		$editor->resize( IMG_SVG_BLOCK_EXTERNALIZE_MAX_EDGE, IMG_SVG_BLOCK_EXTERNALIZE_MAX_EDGE );
		$webp   = wp_image_editor_supports( array( 'mime_type' => 'image/webp' ) );
		$mime   = $webp ? 'image/webp' : $size['mime'];
		$ext    = $webp ? 'webp' : wp_get_default_extension_for_mime_type( $size['mime'] );
		$editor->set_quality( 85 );
		$saved = $editor->save( $dir . '/' . wp_unique_filename( $dir, $base . '.' . $ext ), $mime );
		if ( ! is_wp_error( $saved ) && ! empty( $saved['path'] ) ) {
			$target = $saved['path'];
		}
	}

	if ( ! $target ) {
		// No image editor: keep the bytes as they came.
		$target = $dir . '/' . wp_unique_filename( $dir, $base . '.' . wp_get_default_extension_for_mime_type( $size['mime'] ) );
		if ( ! copy( $temp, $target ) ) {
			$target = '';
		}
	}
	wp_delete_file( $temp );

	if ( ! $target ) {
		return '';
	}

	$uploads = wp_get_upload_dir();
	$url     = $uploads['baseurl'] . '/' . ltrim( str_replace( wp_normalize_path( $uploads['basedir'] ), '', wp_normalize_path( $target ) ), '/' );

	// Root-relative: the same file works on every host the site moves to —
	// the database's URLs get rewritten on a move, an SVG file's do not.
	return wp_make_link_relative( $url );
}

/**
 * Splits the large embedded photos out of an SVG attachment.
 *
 * Works on the raw file rather than a parsed document: parsing first would
 * hold the megabytes of base64 several times over, which is the very problem.
 * The regular expression's possessive quantifier keeps PCRE from backtracking
 * through them.
 *
 * @param int $attachment_id SVG attachment.
 * @return array{changed: int, files: string[]}|WP_Error Photos moved out (0 when
 *                                                       there was nothing to do).
 */
function img_svg_block_externalize_images( $attachment_id ) {
	$attachment_id = (int) $attachment_id;
	if ( 'image/svg+xml' !== get_post_mime_type( $attachment_id ) ) {
		return new WP_Error( 'img_svg_block_not_svg', __( 'Keine SVG-Datei.', 'img-svg-block' ) );
	}

	$path    = realpath( (string) get_attached_file( $attachment_id ) );
	$uploads = wp_get_upload_dir();
	$base    = empty( $uploads['basedir'] ) ? false : realpath( $uploads['basedir'] );
	if ( ! $path || ! $base || 0 !== strpos( $path, $base . DIRECTORY_SEPARATOR ) || ! is_writable( $path ) ) {
		return new WP_Error( 'img_svg_block_not_writable', __( 'Die SVG-Datei lässt sich nicht bearbeiten.', 'img-svg-block' ) );
	}

	$result = array( 'changed' => 0, 'files' => array() );
	if (
		! img_svg_block_may_need_externalizing( $path )
		|| (string) filemtime( $path ) === (string) get_post_meta( $attachment_id, IMG_SVG_BLOCK_EXTERNALIZE_CHECKED, true )
	) {
		return $result;
	}

	// Decoding and converting a photo is image processing like any upload to
	// the media library, and gets the same raised memory limit (256 MB by
	// default, where the host allows it).
	wp_raise_memory_limit( 'image' );

	$source = file_get_contents( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local file.
	if ( false === $source ) {
		return new WP_Error( 'img_svg_block_unreadable', __( 'Die SVG-Datei lässt sich nicht lesen.', 'img-svg-block' ) );
	}

	$index  = count( img_svg_block_extracted_images( $attachment_id ) );
	$output = preg_replace_callback(
		'/((?:xlink:)?href)(\s*=\s*)(["\'])\s*data:image\/(?:png|jpe?g|gif|webp);base64,([^"\']*+)\3/i',
		static function ( $match ) use ( $path, &$index, &$result ) {
			if ( strlen( $match[4] ) < IMG_SVG_BLOCK_EXTERNALIZE_MIN_LENGTH ) {
				return $match[0];
			}
			// Inkscape wraps long base64 with escaped line breaks (&#10;).
			$data = base64_decode( preg_replace( '/&#x?[0-9a-f]+;|\s+/i', '', $match[4] ), true );
			if ( false === $data ) {
				return $match[0];
			}
			$url = img_svg_block_write_extracted_image( $data, $path, ++$index );
			if ( ! $url ) {
				return $match[0];
			}
			++$result['changed'];
			$result['files'][] = $url;
			return $match[1] . $match[2] . $match[3] . esc_attr( $url ) . $match[3];
		},
		$source
	);
	unset( $source );

	if ( null === $output ) {
		return new WP_Error( 'img_svg_block_regex', __( 'Die SVG-Datei ist zu gross, um sie zu zerlegen.', 'img-svg-block' ) );
	}

	if ( $result['changed'] ) {
		file_put_contents( $path, $output ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		clearstatcache( true, $path );
		update_post_meta( $attachment_id, IMG_SVG_BLOCK_EXTERNALIZE_META, array_merge( img_svg_block_extracted_images( $attachment_id ), $result['files'] ) );

		$meta = wp_get_attachment_metadata( $attachment_id );
		if ( is_array( $meta ) ) {
			$meta['filesize'] = strlen( $output );
			wp_update_attachment_metadata( $attachment_id, $meta );
		}
	}

	update_post_meta( $attachment_id, IMG_SVG_BLOCK_EXTERNALIZE_CHECKED, (string) filemtime( $path ) );

	return $result;
}

/**
 * REST route the editor calls as soon as an SVG is picked in the block.
 */
add_action(
	'rest_api_init',
	static function () {
		register_rest_route(
			'img-svg-block/v1',
			'/externalize/(?P<id>\d+)',
			array(
				'methods'             => 'POST',
				'permission_callback' => static function ( WP_REST_Request $request ) {
					return current_user_can( 'upload_files' ) && current_user_can( 'edit_post', (int) $request['id'] );
				},
				'callback'            => static function ( WP_REST_Request $request ) {
					$result = img_svg_block_externalize_images( (int) $request['id'] );
					return is_wp_error( $result ) ? $result : rest_ensure_response( $result );
				},
			)
		);
	}
);

/**
 * The photos go when their SVG goes.
 */
add_action(
	'delete_attachment',
	static function ( $attachment_id ) {
		$uploads = wp_get_upload_dir();
		foreach ( img_svg_block_extracted_images( $attachment_id ) as $url ) {
			$relative = ltrim( (string) wp_parse_url( $uploads['baseurl'], PHP_URL_PATH ), '/' );
			$file     = $uploads['basedir'] . '/' . ltrim( substr( ltrim( $url, '/' ), strlen( $relative ) ), '/' );
			$real     = realpath( $file );
			if ( $real && 0 === strpos( $real, realpath( $uploads['basedir'] ) . DIRECTORY_SEPARATOR ) ) {
				wp_delete_file( $real );
			}
		}
	}
);
