/**
 * Produktsammlung mit Stil "Swiper Slider": Swiper starten.
 *
 * Ersetzt assets/js/product-slider.js aus dem Theme. Die Einstellungen
 * (sichtbare Produkte, anschneiden, Pfeile, Punkte) berechnet der Server
 * (includes/class-slider.php) und legt sie als JSON in data-psb-slider an
 * den Block -- hier wird nur noch gelesen (und der Anschnitt addiert).
 *
 * Aufbau nach dem Start, gleich wie bei der Grusskarten-Auswahl und dem
 * Slider-Block, damit main.css ("SLIDER") alle gleich gestaltet:
 *
 *   <div class="wp-block-woocommerce-product-collection is-style-swiper">
 *     <div class="slider slider--controls-start psb-slider">
 *       <div class="swiper">
 *         <ul class="wc-block-product-template">  ← Swiper-Wrapper
 *           <li class="wc-block-product">…</li>   ← Folien
 *       </div>
 *       <div class="swiper-pagination"></div>
 *       <div class="swiper-button-prev"></div>
 *       <div class="swiper-button-next"></div>
 *     </div>
 *     … weitere Innenblöcke der Produktsammlung bleiben, wo sie sind
 *   </div>
 *
 * Die Bedienelemente entstehen hier und nicht auf dem Server: Ohne
 * JavaScript gäbe es nichts, was sie bewegen könnte.
 */
import Swiper from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';

import './style.scss';

const element = ( tag, className ) => {
	const el = document.createElement( tag );
	el.className = className;
	return el;
};

const initSlider = ( block ) => {
	const list = block.querySelector( '.wc-block-product-template' );
	if ( ! list || block.querySelector( '.psb-slider' ) ) {
		return;
	}

	let config = {};
	try {
		config = JSON.parse( block.dataset.psbSlider || '{}' );
	} catch {
		// Kaputtes JSON: mit Standardwerten weiter.
	}

	const {
		slidesPerView = { mobile: 1, tablet: 2, desktop: 4 },
		peekPercent = 0,
		navigation = true,
		pagination = false,
	} = config;

	const peek = peekPercent / 100;

	// slider--controls-start: Pfeile links unter den Folien (main.css).
	const slider = element( 'div', 'slider slider--controls-start psb-slider' );
	const container = element( 'div', 'swiper' );
	list.before( slider );
	container.append( list );
	slider.append( container );

	const options = {
		modules: [],
		wrapperClass: 'wc-block-product-template',
		slideClass: 'wc-block-product',
		spaceBetween: 24,
		// Anteil der angeschnittenen Karte, z. B. 3 + 0.3 sichtbar.
		slidesPerView: slidesPerView.mobile + peek,
		breakpoints: {
			640: { slidesPerView: slidesPerView.tablet + peek },
			1024: { slidesPerView: slidesPerView.desktop + peek },
		},
		// Kennzeichnet sichtbare Folien -- für die Tastatur unten.
		watchSlidesProgress: true,
	};

	if ( pagination ) {
		const el = element( 'div', 'swiper-pagination' );
		slider.append( el );
		options.modules.push( Pagination );
		options.pagination = { el, clickable: true };
	}

	if ( navigation ) {
		const prevEl = element( 'div', 'swiper-button-prev' );
		const nextEl = element( 'div', 'swiper-button-next' );
		slider.append( prevEl, nextEl );
		options.modules.push( Navigation );
		options.navigation = { prevEl, nextEl };
	}

	const swiper = new Swiper( container, options );

	// Mit Tab zu einem Produkt ausserhalb des sichtbaren Bereichs: den
	// Slider mitziehen, damit man sieht, wo der Fokus ist.
	slider.addEventListener( 'focusin', ( event ) => {
		const slide = event.target.closest( '.wc-block-product' );
		const index = swiper.slides.indexOf( slide );
		if ( index >= 0 && ! slide.classList.contains( 'swiper-slide-visible' ) ) {
			swiper.slideTo( index );
		}
	} );
};

document
	.querySelectorAll(
		'.wp-block-woocommerce-product-collection.is-style-swiper[data-psb-slider]'
	)
	.forEach( initSlider );
