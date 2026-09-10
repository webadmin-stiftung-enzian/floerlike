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

add_action('init', function () {
    register_block_style('woocommerce/product-collection', [
        'name'  => 'swiper',
        'label' => 'Swiper Slider',
    ]);
});

// Eigenes JS für den Swiper-Slider einbinden
function floerlike_enqueue_slider_assets()
{
    wp_enqueue_script(
        'floerlike-product-slider',
        get_theme_file_uri('assets/js/product-slider.js'),
        ['swiper'],
        filemtime(get_theme_file_path('assets/js/product-slider.js')),
        true
    );
}

add_action('wp_enqueue_scripts', function () {
    $uri = get_stylesheet_directory_uri();
    wp_enqueue_style('swiper', $uri . '/assets/swiper/swiper-bundle.min.css', [], '11.0');
    wp_enqueue_script('swiper', $uri . '/assets/swiper/swiper-bundle.min.js', [], '11.0', true);
    wp_enqueue_script('product-slider', $uri . '/assets/js/product-slider.js', ['swiper'], '1.0', true);
});

add_filter('render_block_woocommerce/product-collection', function ($content, $block) {
    $class = $block['attrs']['className'] ?? '';
    if (! str_contains($class, 'is-style-swiper')) {
        return $content;
    }
    // Navigation/Pagination vor dem schließenden Wrapper-Div einfügen
    $controls = '<div class="swiper-button-prev"></div><div class="swiper-button-next"></div><div class="swiper-pagination"></div>';
    return preg_replace('/<\/div>\s*$/', $controls . '</div>', $content, 1);
}, 10, 2);

// GSAP und ScrollTrigger einbinden
wp_enqueue_script('gsap', get_template_directory_uri() . '/assets/libs/gsap.min.js', [], '3.12.5', true);
wp_enqueue_script('gsap-scrolltrigger', get_template_directory_uri() . '/assets/libs/ScrollTrigger.min.js', ['gsap'], '3.12.5', true);
wp_enqueue_script('navbar-animation', get_template_directory_uri() . '/assets/js/navbar-animation.js', ['gsap', 'gsap-scrolltrigger'], '1.0', true);
