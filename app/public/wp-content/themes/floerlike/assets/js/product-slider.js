document.querySelectorAll('.wp-block-woocommerce-product-collection.is-style-swiper').forEach((block) => {
    const wrapper = block.querySelector('.wc-block-product-template');
    if (!wrapper) return;

    // Editor-Einstellungen auslesen
    const layout  = JSON.parse(block.dataset.displayLayout || '{}');
    const columns = layout.columns || 4;

    const container = document.createElement('div');
    container.className = 'swiper';
    wrapper.before(container);
    container.append(wrapper);

    new Swiper(container, {
        wrapperClass: 'wc-block-product-template',
        slideClass:   'wc-block-product',
        spaceBetween: 24,
        slidesPerView: 1,
        breakpoints: {
            640:  { slidesPerView: Math.min(2, columns) },
            1024: { slidesPerView: columns },
        },
        navigation: {
            nextEl: block.querySelector('.swiper-button-next'),
            prevEl: block.querySelector('.swiper-button-prev'),
        },
        pagination: {
            el: block.querySelector('.swiper-pagination'),
            clickable: true,
        },
    });
});