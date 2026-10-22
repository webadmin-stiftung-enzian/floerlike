<?php
// Theme-Styles auch im Block-Editor laden, damit Blöcke dort wie im Frontend aussehen
function floerlike_setup_editor_styles()
{
    add_theme_support('editor-styles');
    add_editor_style('assets/styles/main.css');
}
add_action('after_setup_theme', 'floerlike_setup_editor_styles');

// SVG-Uploads: bewusst nicht hier freigeschaltet.
//
// Das Safe-SVG-Plugin erlaubt den Upload selbst – aber nur für Rollen, die es
// dürfen, und erst nachdem es die Datei durch seinen Allowlist-Sanitizer
// geschickt hat. Ein eigener upload_mimes-Filter an dieser Stelle würde daran
// nichts verbessern, und ein eigener wp_check_filetype_and_ext-Filter würde die
// Inhaltsprüfung für alles aushebeln, was auf „.svg“ endet: eine beliebige
// Datei könnte sich damit als SVG ausgeben. Bleibt der Upload also aus, ist
// Safe SVG deaktiviert – und dann soll er auch ausbleiben.

// Optional: SVG-Vorschau in der Mediathek anzeigen
function svg_media_thumbnails($response, $attachment)
{
    if ($response['mime'] === 'image/svg+xml') {
        $response['image'] = ['src' => $response['url']];
    }
    return $response;
}
add_filter('wp_prepare_attachment_for_js', 'svg_media_thumbnails', 10, 2);

// Eigenes Stylesheet einbinden
function floerlike_enqueue_assets()
{
    $file = 'assets/styles/main.css';
    wp_enqueue_style(
        'floerlike-main',
        get_theme_file_uri($file),
        [],
        filemtime(get_theme_file_path($file))
    );
}
add_action('wp_enqueue_scripts', 'floerlike_enqueue_assets');

// Produktsammlung als Slider (Stil "Swiper Slider"): Block-Stil, Swiper und
// Start liegen im Plugin product-showcase-block (includes/class-slider.php).
// Das Theme liefert nur die Optik von Pfeilen und Punkten (main.css, SLIDER).

// Stile des Button-Blocks (Voll/Rand auf hell/dunkel). Registriert in JS,
// weil sich nur dort die Kern-Stile "Füllen" und "Umriss" umbenennen lassen.
add_action('enqueue_block_editor_assets', function () {
    $file = 'assets/js/editor-button-styles.js';
    wp_enqueue_script(
        'floerlike-editor-button-styles',
        get_theme_file_uri($file),
        ['wp-blocks', 'wp-dom-ready'],
        filemtime(get_theme_file_path($file)),
        true
    );
});

// Stile für Überschriften (rechts unter "Stile"): drei Grössen in Frutiger,
// dieselben drei in Montreal Mono. Unabhängig von der Ebene (h1–h6) -- die
// bleibt die Gliederung, der Stil die Optik. Ohne gewählten Stil gilt der
// Standard je Ebene aus theme.json (styles.elements.h1–h6). Werte:
// theme.json settings.custom.heading, Aussehen: main.css (ÜBERSCHRIFTEN).
add_action('init', function () {
    $styles = [
        'gross'       => 'Gross',
        'mittel'      => 'Mittel',
        'klein'       => 'Klein',
        'mono-gross'  => 'Mono Gross',
        'mono-mittel' => 'Mono Mittel',
        'mono-klein'  => 'Mono Klein',
    ];
    foreach (['core/heading', 'core/post-title', 'core/query-title'] as $block) {
        foreach ($styles as $name => $label) {
            register_block_style($block, ['name' => $name, 'label' => $label]);
        }
    }
});

// ---------------------------------------------------------------------------
// Block "Produkt" (woocommerce/single-product) mit fester Variante.
// Im Editor wählt man die Variante in der Seitenleiste und sieht sie dort
// auch (assets/js/editor-product-variation.js). Gespeichert wird sie im
// Attribut variationId, productId bleibt das variable Produkt.
// ---------------------------------------------------------------------------

add_action('enqueue_block_editor_assets', function () {
    $file = 'assets/js/editor-product-variation.js';
    wp_enqueue_script(
        'floerlike-editor-product-variation',
        get_theme_file_uri($file),
        ['wp-hooks', 'wp-compose', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-api-fetch'],
        filemtime(get_theme_file_path($file)),
        // Im <head>: der Attribut-Filter muss stehen, bevor WooCommerce den
        // Block registriert.
        false
    );
});

// Das Attribut auch auf dem Server bekannt machen (z. B. für die REST-API).
add_filter('register_block_type_args', function ($args, $name) {
    if ('woocommerce/single-product' === $name) {
        $args['attributes']['variationId'] = ['type' => 'number'];
    }
    return $args;
}, 10, 2);

// Vor dem Rendern productId gegen die Variante tauschen. WooCommerce reicht
// productId als Kontext an Titel, Preis, Bild und Knopf weiter, und alle
// kommen mit einer Varianten-ID zurecht. render_block_data läuft vor diesem
// Weiterreichen.
//
// Nur wenn die Variante wirklich zu diesem Produkt gehört und aktiviert ist
// (Status "publish"). Sonst bleibt es beim Produkt mit Preisspanne, statt
// dass der Block leer bleibt.
add_filter('render_block_data', function ($parsed_block) {
    if (
        'woocommerce/single-product' !== ($parsed_block['blockName'] ?? '')
        || empty($parsed_block['attrs']['variationId'])
        || ! function_exists('wc_get_product')
    ) {
        return $parsed_block;
    }

    $variation = wc_get_product(absint($parsed_block['attrs']['variationId']));
    $parent_id = absint($parsed_block['attrs']['productId'] ?? 0);

    if (
        $variation
        && $variation->is_type('variation')
        && $variation->get_parent_id() === $parent_id
        && 'publish' === $variation->get_status()
    ) {
        $parsed_block['attrs']['productId'] = $variation->get_id();
    }

    return $parsed_block;
});

// ---------------------------------------------------------------------------
// Block "Produktbild" (woocommerce/product-image): Kreis hinter dem Bild.
// Einstellungen im Editor: assets/js/editor-product-image-circle.js.
// Gezeichnet wird der Kreis per CSS (main.css, "Kreis hinter dem
// Produktbild") aus der Klasse floerlike-image-circle und zwei Variablen.
// ---------------------------------------------------------------------------

// Standardwerte -- gleich in editor-product-image-circle.js.
const FLOERLIKE_IMAGE_CIRCLE_COLOR = 'main-2-deluge';
const FLOERLIKE_IMAGE_CIRCLE_SIZE  = 75;

add_action('enqueue_block_editor_assets', function () {
    $file = 'assets/js/editor-product-image-circle.js';
    wp_enqueue_script(
        'floerlike-editor-product-image-circle',
        get_theme_file_uri($file),
        ['wp-hooks', 'wp-compose', 'wp-element', 'wp-block-editor', 'wp-components'],
        filemtime(get_theme_file_path($file)),
        // Im <head>: der Attribut-Filter muss stehen, bevor WooCommerce den
        // Block registriert.
        false
    );
});

add_filter('register_block_type_args', function ($args, $name) {
    if ('woocommerce/product-image' === $name) {
        $args['attributes']['floerlikeCircle']      = ['type' => 'boolean', 'default' => false];
        $args['attributes']['floerlikeCircleColor'] = ['type' => 'string', 'default' => FLOERLIKE_IMAGE_CIRCLE_COLOR];
        $args['attributes']['floerlikeCircleSize']  = ['type' => 'number', 'default' => FLOERLIKE_IMAGE_CIRCLE_SIZE];
    }
    return $args;
}, 10, 2);

// Klasse und Variablen an das Produktbild hängen, wenn der Kreis an ist.
add_filter('render_block_woocommerce/product-image', function ($content, $block) {
    $attrs = $block['attrs'] ?? [];
    if (empty($attrs['floerlikeCircle'])) {
        return $content;
    }

    // Slug einer Palettenfarbe, z. B. "main-2-deluge"; Grösse 30–100 %.
    $color = sanitize_key($attrs['floerlikeCircleColor'] ?? FLOERLIKE_IMAGE_CIRCLE_COLOR) ?: FLOERLIKE_IMAGE_CIRCLE_COLOR;
    $size  = max(30, min(100, (int) ($attrs['floerlikeCircleSize'] ?? FLOERLIKE_IMAGE_CIRCLE_SIZE)));

    $p = new WP_HTML_Tag_Processor($content);
    if (! $p->next_tag(['class_name' => 'wc-block-components-product-image'])) {
        return $content;
    }
    $p->add_class('floerlike-image-circle');
    $style = trim((string) $p->get_attribute('style'));
    $p->set_attribute('style', ltrim(sprintf(
        '%s%s--floerlike-circle-color: var(--wp--preset--color--%s); --floerlike-circle-size: %d%%;',
        $style,
        $style && ! str_ends_with($style, ';') ? ';' : '',
        $color,
        $size
    )));

    return $p->get_updated_html();
}, 10, 2);

// Block bindings source for product permalink
add_action('init', function () {
    register_block_bindings_source('ja/product-permalink', array(
        'label'              => __('Produkt-Link', 'ja'),
        'uses_context'       => array('postId'),
        'get_value_callback' => function (array $source_args, WP_Block $block) {
            $post_id = $block->context['postId'] ?? 0;
            return $post_id ? get_permalink($post_id) : null;
        },
    ));
});

// GSAP und ScrollTrigger einbinden
wp_enqueue_script('gsap', get_template_directory_uri() . '/assets/libs/gsap.min.js', [], '3.12.5', true);
wp_enqueue_script('gsap-scrolltrigger', get_template_directory_uri() . '/assets/libs/ScrollTrigger.min.js', ['gsap'], '3.12.5', true);
wp_enqueue_script('navbar-animation', get_template_directory_uri() . '/assets/js/navbar-animation.js', ['gsap', 'gsap-scrolltrigger'], '1.0', true);
