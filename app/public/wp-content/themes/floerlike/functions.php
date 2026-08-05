<?php
// SVG-Upload erlauben
function allow_svg_upload($mimes)
{
    $mimes['svg']  = 'image/svg+xml';
    $mimes['svgz'] = 'image/svg+xml';
    return $mimes;
}
add_filter('upload_mimes', 'allow_svg_upload');

// MIME-Check von WordPress für SVG korrigieren
function fix_svg_mime_check($data, $file, $filename, $mimes)
{
    if (str_ends_with(strtolower($filename), '.svg')) {
        $data['ext']  = 'svg';
        $data['type'] = 'image/svg+xml';
    }
    return $data;
}
add_filter('wp_check_filetype_and_ext', 'fix_svg_mime_check', 10, 4);

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
