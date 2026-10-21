/**
 * Block "Grusskarten-Auswahl": Kartenwahl und Slider.
 *
 * Swiper wird nur hier geladen -- die anderen Kauf-Blöcke brauchen ihn nicht.
 */
import Swiper from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';

import { store, getContext, getElement } from '@wordpress/interactivity';

const { state } = store( 'greeting-card-bundle', {
	actions: {
		// Radio-Verhalten: eine Karte ist gewählt, bis eine andere gewählt wird.
		// Ganz ohne Karte geht es über die Checkbox "Grusskarte hinzufügen".
		selectCard() {
			state.selectedCardId = getContext().cardId;
		},
	},
	callbacks: {
		// ref ist der äussere .slider; Swiper selbst läuft auf dem inneren
		// .swiper. Pfeile und Punkte liegen daneben (gleiche Struktur wie der
		// Slider-Block, siehe main.css "SLIDER") -- daher ":scope >", damit nur
		// die eigenen Elemente gefunden werden.
		initSwiper() {
			const { ref } = getElement();
			// Einstellungen des Blocks, von render.php in den Kontext gelegt.
			const {
				slidesPerView = 1,
				slidesPerViewMobile = 1,
				peekPercent = 0,
			} = getContext();
			// "Letzte Karte anschneiden": z. B. 3 + 0.3 sichtbare Karten.
			const peek = peekPercent / 100;

			// Pfeile und Punkte lassen sich in den Einstellungen abschalten --
			// dann fehlen die Elemente, und Swiper bekommt das Modul gar nicht
			// erst (sonst würde es ins Leere greifen).
			const nextEl = ref.querySelector( ':scope > .swiper-button-next' );
			const prevEl = ref.querySelector( ':scope > .swiper-button-prev' );
			const paginationEl = ref.querySelector(
				':scope > .swiper-pagination'
			);

			const options = {
				modules: [],
				loop: false,
				// Schmale Bildschirme zuerst, ab 600px die Desktop-Anzahl.
				slidesPerView: slidesPerViewMobile + peek,
				spaceBetween: 16,
				breakpoints: {
					600: { slidesPerView: slidesPerView + peek },
				},
				// Kennzeichnet sichtbare Karten (swiper-slide-visible) -- nötig
				// für die Tastatur-Navigation unten.
				watchSlidesProgress: true,
				// Der Block ist beim Laden ausgeblendet (keine Karte gewünscht).
				// Ohne diese Beobachtung würde Swiper seine Masse an einem
				// unsichtbaren Element messen und falsch darstellen, sobald der
				// Block erscheint.
				observer: true,
				observeParents: true,
			};

			if ( nextEl && prevEl ) {
				options.modules.push( Navigation );
				options.navigation = { nextEl, prevEl };
			}

			if ( paginationEl ) {
				options.modules.push( Pagination );
				options.pagination = { el: paginationEl, clickable: true };
			}

			const swiper = new Swiper(
				ref.querySelector( ':scope > .swiper' ),
				options
			);

			// Mit den Pfeiltasten wandert die Auswahl durch die Radio-Gruppe --
			// auch zu Karten, die gerade ausserhalb des Sliders liegen. Dann
			// den Slider mitziehen, damit die gewählte Karte sichtbar ist.
			// Ist sie schon zu sehen (mehrere Karten gleichzeitig), bleibt der
			// Slider stehen.
			ref.addEventListener( 'focusin', ( event ) => {
				const slide = event.target.closest( '.swiper-slide' );
				const index = swiper.slides.indexOf( slide );
				if (
					index >= 0 &&
					! slide.classList.contains( 'swiper-slide-visible' )
				) {
					swiper.slideTo( index );
				}
			} );
		},
	},
} );
